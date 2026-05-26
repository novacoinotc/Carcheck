import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { solveReCaptchaV2 } from '../../lib/captcha';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface NicbParsed {
  data_available: boolean;
  vin: string;
  theft_record: boolean;
  salvage_record: boolean;
  raw_text?: string;
}

const NICB_URL = 'https://www.nicb.org/vincheck';
// Stable sitekey read from the live page (also re-read at runtime as a fallback).
const NICB_SITEKEY = '6LcYETIUAAAAAKz6T9MxMEllN8yw0ffsErIbAGS-';

export const nicbVinCheckWorker: ScrapeWorker<NicbParsed> = {
  key: 'usa_fed_nicb_vincheck',
  async run(input): Promise<ScrapeResult<NicbParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    const vin = parsed.data.vin;
    if (!vin) {
      return { status: 'not_applicable', errorCode: 'vin_required', errorMessage: 'NICB VINCheck requires the VIN' };
    }
    if (!process.env.TWOCAPTCHA_API_KEY) {
      return { status: 'skipped', errorCode: 'captcha_unconfigured', errorMessage: 'NICB requires reCAPTCHA; TWOCAPTCHA_API_KEY not set' };
    }

    try {
      // 5/day/IP rate limit → always route via rotating proxy.
      return await withPage<ScrapeResult<NicbParsed>>(
        async (page) => {
          await page.goto(NICB_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

          // The page has a site-search box too; target the VINCheck field by name.
          const vinInput = page.locator('input[name="vin"]').first();
          await vinInput.waitFor({ state: 'visible', timeout: 15_000 });
          await vinInput.fill(vin);

          // Accept terms (named checkbox in the Drupal form).
          await page.locator('input[name="agree_terms"]').check({ timeout: 5_000 }).catch(() => undefined);
          // Any consent modal "Continue".
          await page.locator('button:has-text("Continue")').first().click({ timeout: 2_000 }).catch(() => undefined);

          const siteKey =
            (await page.locator('.g-recaptcha, [data-sitekey]').first().getAttribute('data-sitekey').catch(() => null)) ||
            NICB_SITEKEY;

          const token = await solveReCaptchaV2({ siteKey, pageUrl: NICB_URL });
          await page.evaluate((t) => {
            document.querySelectorAll<HTMLTextAreaElement>('textarea[name="g-recaptcha-response"], textarea#g-recaptcha-response').forEach((el) => {
              el.value = t;
              el.style.display = 'block';
            });
          }, token);

          const submit = page
            .locator('button:has-text("Search VIN"), input[type="submit"][value*="Search" i], button[type="submit"]')
            .first();
          await Promise.all([
            page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined),
            submit.click({ timeout: 10_000 }).catch(() => undefined),
          ]);

          // Results render via Drupal AJAX into a panel — poll up to 20s for it.
          await page
            .waitForFunction(
              (v) => {
                const t = document.body.innerText || '';
                return /results\s+for|theft\s+records?\s*:|total\s+loss\s+records?\s*:|no\s+records/i.test(t) || t.toUpperCase().includes(String(v).toUpperCase() + '');
              },
              vin,
              { timeout: 20_000, polling: 1000 },
            )
            .catch(() => undefined);
          await page.waitForTimeout(1500);

          const bodyText = await page.locator('body').innerText({ timeout: 10_000 }).catch(() => '');

          // Only trust the result when NICB actually rendered a results panel for
          // THIS VIN. Otherwise we're still looking at the form/instructions and any
          // "salvage"/"theft" word match is boilerplate — report partial, not a record.
          const resultsRendered =
            (/vincheck\W*results|results\s+for/i.test(bodyText) && bodyText.toUpperCase().includes(vin.toUpperCase())) ||
            /\b(theft|total\s+loss)\s+records?\s*:/i.test(bodyText);

          if (!resultsRendered) {
            return {
              status: 'partial',
              parsedData: { data_available: false, vin, theft_record: false, salvage_record: false, raw_text: bodyText.slice(0, 2000) },
              errorCode: 'no_results_rendered',
              errorMessage: 'NICB did not render a results panel (captcha rejected or rate-limited)',
              costUsd: 0.003,
            };
          }

          const theftRecord = /theft\s+records?\s*:?\s*(?!no\b|0\b)/i.test(bodyText) && !/no\s+theft\s+record|theft\s+records?\s*:\s*(no|0)/i.test(bodyText);
          const salvageRecord =
            !/no\s+(salvage|total\s+loss)|(salvage|total\s+loss)\s+records?\s*:\s*(no|0)/i.test(bodyText) &&
            /(salvage|total\s+loss)\s+records?\s*:?/i.test(bodyText) &&
            /found|reported|yes|\b[1-9]\b/i.test(bodyText);

          return {
            status: 'success',
            parsedData: { data_available: true, vin, theft_record: theftRecord, salvage_record: salvageRecord, raw_text: bodyText.slice(0, 4000) },
            normalizedFacts: [
              { key: 'nicb_theft_record', value: theftRecord, confidence: 85 },
              { key: 'nicb_salvage_record', value: salvageRecord, confidence: 85 },
            ],
            costUsd: 0.003,
          };
        },
        { proxy: 'always' },
      );
    } catch (err) {
      logger.error({ err }, 'usa_fed_nicb_vincheck: scrape failed');
      return { status: 'failed', errorCode: 'scrape_error', errorMessage: err instanceof Error ? err.message : String(err) };
    }
  },
};
