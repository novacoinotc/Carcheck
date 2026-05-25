import { withPage } from './browser-pool';

export interface InspectResult {
  url: string;
  ok: boolean;
  status: 'loaded' | 'blocked' | 'timeout' | 'error';
  finalUrl?: string;
  title?: string;
  httpBlocked?: boolean;
  captchaDetected?: boolean;
  captchaType?: string;
  inputs?: Array<{ name: string; id: string; type: string; placeholder: string }>;
  buttons?: Array<{ text: string; type: string; id: string }>;
  selects?: Array<{ name: string; id: string }>;
  forms?: Array<{ action: string; method: string }>;
  iframes?: string[];
  bodyTextSnippet?: string;
  error?: string;
}

/**
 * Diagnostic: navigate to a URL and dump the real page structure so we can write
 * accurate selectors instead of guessing. Tries direct first, then proxy on failure.
 */
export async function inspectUrl(url: string, useProxy: boolean): Promise<InspectResult> {
  try {
    return await withPage<InspectResult>(
      async (page) => {
        const resp = await page
          .goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
          .catch(() => null);
        await page.waitForTimeout(1500);

        const httpStatus = resp?.status() ?? 0;
        const title = await page.title().catch(() => '');
        const bodyText = await page
          .locator('body')
          .innerText({ timeout: 5000 })
          .catch(() => '');

        const inputs = await page
          .locator('input, textarea')
          .evaluateAll((els) =>
            els.slice(0, 40).map((e) => ({
              name: (e as HTMLInputElement).name || '',
              id: e.id || '',
              type: (e as HTMLInputElement).type || 'text',
              placeholder: (e as HTMLInputElement).placeholder || '',
            })),
          )
          .catch(() => []);

        const buttons = await page
          .locator('button, input[type=submit], a[role=button]')
          .evaluateAll((els) =>
            els.slice(0, 25).map((e) => ({
              text: (e.textContent || (e as HTMLInputElement).value || '').trim().slice(0, 40),
              type: (e as HTMLInputElement).type || '',
              id: e.id || '',
            })),
          )
          .catch(() => []);

        const selects = await page
          .locator('select')
          .evaluateAll((els) =>
            els.slice(0, 15).map((e) => ({ name: (e as HTMLSelectElement).name || '', id: e.id || '' })),
          )
          .catch(() => []);

        const forms = await page
          .locator('form')
          .evaluateAll((els) =>
            els.slice(0, 10).map((e) => ({
              action: (e as HTMLFormElement).action || '',
              method: (e as HTMLFormElement).method || '',
            })),
          )
          .catch(() => []);

        const iframes = await page
          .locator('iframe')
          .evaluateAll((els) => els.slice(0, 10).map((e) => (e as HTMLIFrameElement).src || ''))
          .catch(() => []);

        const lower = bodyText.toLowerCase();
        const captchaDetected =
          lower.includes('captcha') ||
          lower.includes('no soy un robot') ||
          (await page.locator('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]').count().catch(() => 0)) > 0;
        const httpBlocked = httpStatus === 403 || httpStatus === 429 || lower.includes('access denied') || lower.includes('forbidden');

        return {
          url,
          ok: httpStatus > 0 && httpStatus < 400,
          status: httpStatus === 0 ? 'error' : httpBlocked ? 'blocked' : 'loaded',
          finalUrl: page.url(),
          title,
          httpBlocked,
          captchaDetected,
          captchaType: captchaDetected ? (lower.includes('recaptcha') ? 'recaptcha' : 'unknown') : undefined,
          inputs,
          buttons,
          selects,
          forms,
          iframes: iframes.filter(Boolean),
          bodyTextSnippet: bodyText.slice(0, 600),
        };
      },
      { proxy: useProxy ? 'always' : 'off', blockHeavyResources: true },
    );
  } catch (err) {
    return {
      url,
      ok: false,
      status: err instanceof Error && err.name === 'TimeoutError' ? 'timeout' : 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
