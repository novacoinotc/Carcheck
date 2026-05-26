import type { Page } from 'playwright';
import { withPage } from '../../lib/browser-pool';
import { decodeVin, getNhtsaRecalls } from '../../lib/vin';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

export interface OemRecallParsed {
  data_available: boolean;
  vin: string;
  make?: string;
  model?: string;
  year?: string;
  source: 'oem_portal' | 'nhtsa_backbone' | 'oem_portal+nhtsa' | 'none';
  open_recalls: number;
  recall_titles: string[];
  recalls: Array<{ campaign?: string; title: string; component?: string; summary?: string }>;
  raw_text?: string;
}

// NHTSA recall campaign IDs look like "22V123", "23V-456", "9V1234" — two-digit
// year + "V" + 3-4 digits. This is the only low-false-positive anchor for a real
// recall on an OEM page; page chrome/boilerplate never matches it.
const CAMPAIGN_RE = /\b\d{2}\s?V[-\s]?\d{3,4}\b/gi;

const NO_RECALL_PHRASES = [
  'no open recall',
  'no recalls',
  'no outstanding',
  'not subject to',
  'no safety recall',
  'no incomplete',
  'no active recall',
  '0 open recall',
  'are up to date',
  'no hay llamados',
  'sin llamados',
  'no se encontraron',
];

/**
 * Fills a VIN into the first plausible text input and submits. Best-effort with
 * fallbacks; throws only if no input is found (so the caller can report honestly).
 */
export async function fillVinAndSubmit(page: Page, vin: string): Promise<void> {
  const vinInput = page
    .locator(
      'input[name*="vin" i]:visible, input[id*="vin" i]:visible, input[placeholder*="VIN" i]:visible, input[aria-label*="VIN" i]:visible, input[type="text"]:visible',
    )
    .first();
  await vinInput.waitFor({ state: 'visible', timeout: 15_000 });
  await vinInput.fill(vin);

  const submit = page
    .locator(
      'button:has-text("Submit"), button:has-text("Search"), button:has-text("Check"), button:has-text("Look up"), button:has-text("Lookup"), button:has-text("Buscar"), button[type="submit"], input[type="submit"]',
    )
    .first();
  await Promise.all([
    page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => undefined),
    submit.click({ timeout: 10_000 }).catch(() => undefined),
  ]);
  await page.waitForTimeout(2500);
}

/**
 * Strict recall extraction. A page is only treated as "0 recalls" when it says so
 * explicitly, and only treated as "N recalls" when N distinct NHTSA campaign IDs
 * are present. Anything else → data_available:false (the page never gave a
 * determinate answer — VIN not accepted, bot-walled, or JS didn't render). This
 * prevents the old failure mode of counting page boilerplate as recalls.
 */
export async function parseOemRecalls(page: Page, vin: string, make?: string): Promise<ScrapeResult<OemRecallParsed>> {
  const bodyText = await page.locator('body').innerText({ timeout: 10_000 }).catch(() => '');
  const lower = bodyText.toLowerCase();

  const campaigns = Array.from(
    new Set((bodyText.match(CAMPAIGN_RE) ?? []).map((c) => c.replace(/\s/g, '').toUpperCase())),
  );
  const explicitNoRecalls = NO_RECALL_PHRASES.some((p) => lower.includes(p));

  if (campaigns.length > 0) {
    // Pair each campaign id with the nearest preceding non-trivial line as a title.
    const lines = bodyText.split('\n').map((l) => l.trim());
    const recalls = campaigns.map((c) => {
      const idx = lines.findIndex((l) => l.replace(/\s/g, '').toUpperCase().includes(c));
      let title = '';
      for (let i = idx; i >= 0 && i > idx - 4; i--) {
        const cand = lines[i]?.replace(CAMPAIGN_RE, '').trim() ?? '';
        if (cand.length > 8 && !/^\d/.test(cand)) {
          title = cand.slice(0, 200);
          break;
        }
      }
      return { campaign: c, title: title || `Campaña ${c}` };
    });
    const titles = recalls.map((r) => r.title);
    return {
      status: 'success',
      parsedData: { data_available: true, vin, make, source: 'oem_portal', open_recalls: campaigns.length, recall_titles: titles, recalls, raw_text: bodyText.slice(0, 4000) },
      normalizedFacts: [
        { key: 'oem_open_recalls', value: campaigns.length, confidence: 90 },
        { key: 'oem_recall_campaigns', value: campaigns, confidence: 90 },
        { key: 'oem_recall_titles', value: titles, confidence: 75 },
      ],
      costUsd: 0,
    };
  }

  if (explicitNoRecalls) {
    return {
      status: 'success',
      parsedData: { data_available: true, vin, make, source: 'oem_portal', open_recalls: 0, recall_titles: [], recalls: [], raw_text: bodyText.slice(0, 2000) },
      normalizedFacts: [{ key: 'oem_open_recalls', value: 0, confidence: 88 }],
      costUsd: 0,
    };
  }

  // No determinate answer. Do NOT claim 0 or N.
  return {
    status: 'partial',
    parsedData: { data_available: false, vin, make, source: 'oem_portal', open_recalls: 0, recall_titles: [], recalls: [], raw_text: bodyText.slice(0, 2000) },
    errorCode: 'no_determinate_result',
    errorMessage: 'OEM page did not return a determinate recall result (VIN may not be accepted or page is bot-walled)',
    costUsd: 0,
  };
}

function isBlockedError(msg: string): boolean {
  return /ERR_EMPTY_RESPONSE|ERR_CONNECTION|ERR_TIMED_OUT|ERR_HTTP2|ERR_NAME_NOT_RESOLVED|net::|Timeout .* exceeded|403|429/i.test(msg);
}

export interface OemWorkerConfig {
  key: string;
  url: string;
  /** NHTSA canonical makes (upper-case) this portal covers. */
  makes: string[];
  /** Some portals take the VIN as a query param instead of a form field. */
  vinQueryParam?: string;
  proxy?: 'always' | 'auto' | 'off' | 'residential';
}

/**
 * Builds a make-aware OEM recall worker. It decodes the VIN's make first and
 * returns `not_applicable` unless the make matches this portal — so e.g. the
 * Honda worker never reports on a Ford. Network/bot blocks are reported honestly
 * (errorCode `site_blocked`) instead of being swallowed into a fake "0 recalls".
 */
export function makeOemRecallWorker(cfg: OemWorkerConfig): ScrapeWorker<OemRecallParsed> {
  return {
    key: cfg.key,
    async run(input): Promise<ScrapeResult<OemRecallParsed>> {
      const parsed = scrapeRequestSchema.safeParse(input);
      if (!parsed.success) {
        return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
      }
      const vin = parsed.data.vin;
      if (!vin) {
        return { status: 'not_applicable', errorCode: 'vin_required', errorMessage: 'OEM recall lookup requires the VIN' };
      }

      const decoded = await decodeVin(vin);
      const make = decoded?.make;
      if (make && !cfg.makes.includes(make)) {
        return {
          status: 'not_applicable',
          errorCode: 'make_mismatch',
          errorMessage: `VIN make ${make} is not covered by ${cfg.key} (covers ${cfg.makes.join('/')})`,
          parsedData: { data_available: false, vin, make, source: 'none', open_recalls: 0, recall_titles: [], recalls: [] },
        };
      }

      // Backbone: authoritative recall data by make/model/year (free, never blocked).
      const nhtsa = decoded ? await getNhtsaRecalls(decoded.make, decoded.model, decoded.year) : null;

      // Best-effort: the OEM portal can confirm VIN-specific remedy status. Never
      // let a portal block fail the worker — we still have the NHTSA backbone.
      let portalText: string | undefined;
      let portalBlocked = false;
      try {
        portalText = await withPage<string>(
          async (page) => {
            const url = cfg.vinQueryParam ? `${cfg.url}?${cfg.vinQueryParam}=${encodeURIComponent(vin)}` : cfg.url;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 });
            if (!cfg.vinQueryParam) await fillVinAndSubmit(page, vin);
            else await page.waitForTimeout(3000);
            return page.locator('body').innerText({ timeout: 8000 }).catch(() => '');
          },
          { proxy: cfg.proxy ?? 'off' },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        portalBlocked = isBlockedError(msg);
        logger.warn({ key: cfg.key, msg: msg.slice(0, 120) }, 'oem portal supplement unavailable');
      }

      const portalCampaigns = portalText
        ? Array.from(new Set((portalText.match(CAMPAIGN_RE) ?? []).map((c) => c.replace(/\s/g, '').toUpperCase())))
        : [];

      if (nhtsa && nhtsa.length >= 0) {
        const recalls = nhtsa.map((r) => ({
          campaign: r.campaign,
          title: r.component || r.summary.slice(0, 80),
          component: r.component,
          summary: r.summary.slice(0, 600),
        }));
        const titles = recalls.map((r) => r.title);
        const source: OemRecallParsed['source'] = portalCampaigns.length ? 'oem_portal+nhtsa' : 'nhtsa_backbone';
        return {
          status: 'success',
          parsedData: {
            data_available: true,
            vin,
            make: decoded?.make,
            model: decoded?.model,
            year: decoded?.year,
            source,
            open_recalls: recalls.length,
            recall_titles: titles,
            recalls: recalls.slice(0, 25),
            raw_text: portalText?.slice(0, 2000),
          },
          normalizedFacts: [
            { key: 'oem_open_recalls', value: recalls.length, confidence: 92 },
            { key: 'oem_recall_campaigns', value: recalls.map((r) => r.campaign), confidence: 92 },
            { key: 'oem_recall_titles', value: titles, confidence: 85 },
            ...(portalCampaigns.length
              ? [{ key: 'oem_portal_confirmed_campaigns', value: portalCampaigns, confidence: 80 }]
              : []),
          ],
          costUsd: 0,
        };
      }

      // No NHTSA data (e.g. non-US-market make) — fall back to portal text only.
      if (portalText) {
        const fake = { locator: () => ({ innerText: async () => portalText! }) } as unknown as Page;
        const parsedPortal = await parseOemRecalls(fake, vin, make);
        if (parsedPortal.parsedData) parsedPortal.parsedData.source = 'oem_portal';
        return parsedPortal;
      }

      return {
        status: portalBlocked ? 'failed' : 'partial',
        errorCode: portalBlocked ? 'site_blocked' : 'no_data',
        errorMessage: portalBlocked
          ? `${cfg.key} blocks datacenter IPs and NHTSA had no record — needs residential proxy`
          : `No recall data found for ${make ?? 'this VIN'}`,
        parsedData: { data_available: false, vin, make, source: 'none', open_recalls: 0, recall_titles: [], recalls: [] },
      };
    },
  };
}
