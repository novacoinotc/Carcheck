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

export const nicbVinCheckWorker: ScrapeWorker<NicbParsed> = {
  key: 'usa_fed_nicb_vincheck',
  async run(input): Promise<ScrapeResult<NicbParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    const vin = parsed.data.vin;
    if (!vin) {
      return {
        status: 'not_applicable',
        errorCode: 'vin_required',
        errorMessage: 'NICB VINCheck requires the VIN',
      };
    }

    // NICB is protected by reCAPTCHA. Without a 2captcha key we cannot solve it.
    if (!process.env.TWOCAPTCHA_API_KEY) {
      return {
        status: 'skipped',
        errorCode: 'captcha_unconfigured',
        errorMessage: 'NICB requires reCAPTCHA solving; TWOCAPTCHA_API_KEY not set',
      };
    }

    try {
      // 5/day/IP rate limit → always route via rotating proxy.
      return await withPage<ScrapeResult<NicbParsed>>(
        async (page) => {
          await page.goto(NICB_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });

          const vinInput = page
            .locator(
              'input[name*="vin" i], input[id*="vin" i], input[placeholder*="VIN" i], input[type="text"]',
            )
            .first();
          await vinInput.waitFor({ state: 'visible', timeout: 15_000 });
          await vinInput.fill(vin);

          // Accept terms checkbox(es) if present.
          const terms = page.locator('input[type="checkbox"]');
          const termsCount = await terms.count().catch(() => 0);
          for (let i = 0; i < termsCount; i++) {
            await terms.nth(i).check({ timeout: 3_000 }).catch(() => undefined);
          }

          // Discover the reCAPTCHA site key from the rendered widget.
          const siteKey = await page
            .locator('.g-recaptcha, [data-sitekey]')
            .first()
            .getAttribute('data-sitekey')
            .catch(() => null);

          if (siteKey) {
            try {
              const token = await solveReCaptchaV2({ siteKey, pageUrl: NICB_URL });
              // Inject the token into the standard reCAPTCHA response field.
              await page.evaluate((t) => {
                const set = (sel: string) => {
                  document.querySelectorAll<HTMLTextAreaElement>(sel).forEach((el) => {
                    el.value = t;
                    el.style.display = 'block';
                  });
                };
                set('textarea#g-recaptcha-response');
                set('textarea[name="g-recaptcha-response"]');
              }, token);
            } catch (capErr) {
              logger.warn({ capErr }, 'nicb: captcha solve failed');
              return {
                status: 'partial',
                errorCode: 'captcha_failed',
                errorMessage: capErr instanceof Error ? capErr.message : String(capErr),
                costUsd: 0.05,
              };
            }
          }

          const submit = page
            .locator(
              'button:has-text("Search"), button:has-text("Submit"), button[type="submit"], input[type="submit"]',
            )
            .first();
          await Promise.all([
            page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined),
            submit.click({ timeout: 10_000 }).catch(() => undefined),
          ]);
          await page.waitForTimeout(2500);

          const bodyText = await page
            .locator('body')
            .innerText({ timeout: 10_000 })
            .catch(() => '');
          const lower = bodyText.toLowerCase();

          // NICB returns "theft record" / "salvage record" sections.
          const theftRecord =
            /theft\s+record/i.test(bodyText) &&
            !/no\s+theft\s+record/i.test(bodyText) &&
            !lower.includes('no records');
          const salvageRecord =
            /salvage\s+(?:record|total\s+loss)/i.test(bodyText) &&
            !/no\s+salvage/i.test(bodyText) &&
            !lower.includes('no records');

          return {
            status: 'success',
            parsedData: {
              data_available: true,
              vin,
              theft_record: theftRecord,
              salvage_record: salvageRecord,
              raw_text: bodyText.slice(0, 4000),
            },
            normalizedFacts: [
              { key: 'nicb_theft_record', value: theftRecord, confidence: 85 },
              { key: 'nicb_salvage_record', value: salvageRecord, confidence: 85 },
            ],
            costUsd: 0.05,
          };
        },
        { proxy: 'always' },
      );
    } catch (err) {
      logger.error({ err }, 'usa_fed_nicb_vincheck: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
