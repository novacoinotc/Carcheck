import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import pLimit from 'p-limit';
import { logger } from './logger.js';

// On memory-constrained hosts we launch a fresh browser per request and tear it
// down immediately. Slightly slower than a persistent pool but avoids the OOM
// crashes a long-lived Chromium accumulates. Concurrency is capped by env.
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_BROWSERS ?? 2);
const limit = pLimit(MAX_CONCURRENT);

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-blink-features=AutomationControlled',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-sync',
  '--no-first-run',
  // HTTP proxies (Webshare) break Chromium's HTTP/2 negotiation → ERR_HTTP2_PROTOCOL_ERROR.
  // Force HTTP/1.1 so proxied requests work and don't hang on failed h2 handshakes.
  '--disable-http2',
  '--js-flags=--max-old-space-size=512',
];

export interface PageRunOptions {
  /**
   * 'always'/'auto' route through the datacenter proxy pool; 'residential' uses
   * the residential pool (for CDN/bot-walled sites — ANAM, marketplaces, OEM CDN);
   * 'off' connects directly.
   */
  proxy?: 'always' | 'auto' | 'off' | 'residential';
  userAgent?: string;
  locale?: string;
  timezoneId?: string;
  /** Block images/media/fonts to save memory + bandwidth. Default true. */
  blockHeavyResources?: boolean;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Provider-agnostic proxy config with list rotation. Reads generic PROXY_* env
 * vars so it works with Webshare (proxy list or rotating endpoint), Bright Data, etc.
 *
 *   PROXY_LIST     comma/newline separated `host:port` pairs (Webshare proxy list).
 *                  A random entry is picked per request for IP rotation.
 *   PROXY_SERVER   single endpoint e.g. http://p.webshare.io:80 (used if no PROXY_LIST)
 *   PROXY_USERNAME shared username for all proxies
 *   PROXY_PASSWORD shared password
 *
 * Legacy BRIGHTDATA_* vars are still honored as a fallback.
 */
const _proxyListCache: Record<string, string[]> = {};

function parseList(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => /^[\w.-]+:\d+$/.test(s));
}

function getProxyList(envVar: string): string[] {
  if (_proxyListCache[envVar]) return _proxyListCache[envVar]!;
  _proxyListCache[envVar] = parseList(process.env[envVar] ?? '');
  return _proxyListCache[envVar]!;
}

type ProxyPool = 'datacenter' | 'residential';

function proxyConfig(pool: ProxyPool = 'datacenter'): { server: string; username?: string; password?: string } | undefined {
  if (pool === 'residential') {
    const username = process.env.RESIDENTIAL_PROXY_USERNAME;
    const password = process.env.RESIDENTIAL_PROXY_PASSWORD;
    const list = getProxyList('RESIDENTIAL_PROXY_LIST');
    if (!username || list.length === 0) return undefined;
    const pick = list[Math.floor(Math.random() * list.length)]!;
    return { server: `http://${pick}`, username, password };
  }

  const username = process.env.PROXY_USERNAME ?? process.env.BRIGHTDATA_USERNAME;
  const password = process.env.PROXY_PASSWORD ?? process.env.BRIGHTDATA_PASSWORD;
  // Auth is required — an auth-less proxy endpoint hangs the connection. Direct otherwise.
  if (!username) return undefined;

  const list = getProxyList('PROXY_LIST');
  if (list.length > 0) {
    const pick = list[Math.floor(Math.random() * list.length)]!;
    return { server: `http://${pick}`, username, password };
  }

  const server =
    process.env.PROXY_SERVER ??
    (process.env.BRIGHTDATA_HOST
      ? `http://${process.env.BRIGHTDATA_HOST}:${process.env.BRIGHTDATA_PORT ?? '22225'}`
      : undefined);
  if (!server) return undefined;
  return { server, username, password };
}

export function isProxyConfigured(): boolean {
  return Boolean(proxyConfig());
}

export function isResidentialConfigured(): boolean {
  return Boolean(proxyConfig('residential'));
}

export async function withPage<T>(
  fn: (page: Page) => Promise<T>,
  options: PageRunOptions = {},
): Promise<T> {
  return limit(async () => {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    try {
      const mode = options.proxy ?? 'auto';
      let proxy: ReturnType<typeof proxyConfig> | undefined;
      if (mode === 'residential') {
        // Fall back to datacenter if residential isn't configured yet.
        proxy = proxyConfig('residential') ?? proxyConfig('datacenter');
      } else if (mode === 'always' || mode === 'auto') {
        proxy = proxyConfig('datacenter');
      }

      browser = await chromium.launch({
        headless: true,
        args: LAUNCH_ARGS,
        ...(proxy ? { proxy } : {}),
      });
      context = await browser.newContext({
        userAgent: options.userAgent ?? DEFAULT_USER_AGENT,
        locale: options.locale ?? 'es-MX',
        timezoneId: options.timezoneId ?? 'America/Mexico_City',
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);

      if (options.blockHeavyResources ?? true) {
        await page.route('**/*', (route) => {
          const type = route.request().resourceType();
          if (type === 'image' || type === 'media' || type === 'font') {
            void route.abort();
          } else {
            void route.continue();
          }
        });
      }

      return await fn(page);
    } catch (err) {
      logger.error({ err }, 'withPage failed');
      throw err;
    } finally {
      await context?.close().catch(() => undefined);
      await browser?.close().catch(() => undefined);
    }
  });
}
