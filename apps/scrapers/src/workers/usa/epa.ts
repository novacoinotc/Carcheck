import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface EpaParsed {
  data_available: boolean;
  cert_found: boolean;
  searched_for: { make?: string; model?: string; year?: number };
  certificates: Array<{ family?: string; manufacturer?: string; standard?: string }>;
  raw_text?: string;
}

const EPA_URL = 'https://dis.epa.gov/otaqpub/';

export const epaCertificationWorker: ScrapeWorker<EpaParsed> = {
  key: 'usa_fed_epa_certification',
  async run(input): Promise<ScrapeResult<EpaParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    // EPA certification is indexed by make/model/year, not VIN. The orchestrator
    // passes decoded vehicle metadata alongside the query (same as PROFECO).
    const extras = (input ?? {}) as { make?: string; model?: string; year?: number };
    const make = extras.make;
    if (!make) {
      return {
        status: 'not_applicable',
        errorCode: 'make_required',
        errorMessage: 'EPA certification lookup needs decoded make/model/year',
      };
    }

    try {
      return await withPage<ScrapeResult<EpaParsed>>(
        async (page) => {
          await page.goto(EPA_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });

          // Manufacturer / make search field.
          const makeInput = page
            .locator(
              'input[name*="manufacturer" i], input[name*="make" i], input[id*="manufacturer" i], input[type="text"]',
            )
            .first();
          if (await makeInput.count().catch(() => 0)) {
            await makeInput.fill(make).catch(() => undefined);
          }

          // Model year selector / field, if present.
          if (extras.year) {
            const yearField = page
              .locator(
                'input[name*="year" i], select[name*="year" i], input[id*="year" i], select[id*="year" i]',
              )
              .first();
            if (await yearField.count().catch(() => 0)) {
              const tag = await yearField
                .evaluate((el) => el.tagName.toLowerCase())
                .catch(() => 'input');
              if (tag === 'select') {
                await yearField.selectOption(String(extras.year)).catch(() => undefined);
              } else {
                await yearField.fill(String(extras.year)).catch(() => undefined);
              }
            }
          }

          const submit = page
            .locator(
              'button:has-text("Search"), button:has-text("Submit"), input[type="submit"], button[type="submit"]',
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

          const noResults =
            lower.includes('no records') ||
            lower.includes('no results') ||
            lower.includes('no matching') ||
            lower.includes('not found');

          const certificates: Array<{
            family?: string;
            manufacturer?: string;
            standard?: string;
          }> = [];
          const rows = await page
            .locator('table tr, [class*="result"] li, [class*="result"] tr')
            .all()
            .catch(() => []);
          for (const row of rows.slice(0, 50)) {
            const text = (await row.innerText().catch(() => '')).trim();
            if (!text || text.length < 6) continue;
            if (!text.toLowerCase().includes(make.toLowerCase())) continue;
            certificates.push({
              family: /([A-Z0-9]{8,17})/.exec(text)?.[1],
              manufacturer: make,
              standard: /(Tier\s?\d|Bin\s?\d+|LEV\s?\w+|federal|california)/i.exec(text)?.[1],
            });
          }

          const certFound = !noResults && (certificates.length > 0 || lower.includes(make.toLowerCase()));

          return {
            status: 'success',
            parsedData: {
              data_available: true,
              cert_found: certFound,
              searched_for: { make, model: extras.model, year: extras.year },
              certificates: certificates.slice(0, 20),
              raw_text: bodyText.slice(0, 4000),
            },
            normalizedFacts: [
              { key: 'epa_cert_found', value: certFound, confidence: certFound ? 80 : 70 },
            ],
            costUsd: 0,
          };
        },
        { proxy: 'auto' },
      );
    } catch (err) {
      logger.error({ err }, 'usa_fed_epa_certification: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
