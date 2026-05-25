import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface CaSmogRecord {
  date?: string;
  result?: string;
  station?: string;
}

interface CaSmogParsed {
  data_available: boolean;
  records: CaSmogRecord[];
  record_count: number;
  last_smog_date?: string;
  raw_text?: string;
}

const BAR_URL = 'https://www.bar.ca.gov/services/vehicle-test-history';

export const caSmogCheckWorker: ScrapeWorker<CaSmogParsed> = {
  key: 'usa_st_ca_smogcheck',
  async run(input): Promise<ScrapeResult<CaSmogParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    const { vin, plate } = parsed.data;
    if (!vin && !plate) {
      return {
        status: 'not_applicable',
        errorCode: 'vin_or_plate_required',
        errorMessage: 'CA BAR smog history requires a VIN or license plate',
      };
    }

    try {
      return await withPage<ScrapeResult<CaSmogParsed>>(async (page) => {
        await page.goto(BAR_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });

        // BAR accepts either VIN or plate. Prefer VIN when available.
        if (vin) {
          const vinInput = page
            .locator('input[name*="vin" i], input[id*="vin" i], input[placeholder*="VIN" i]')
            .first();
          if (await vinInput.count().catch(() => 0)) {
            await vinInput.fill(vin).catch(() => undefined);
          }
        } else if (plate) {
          const plateInput = page
            .locator(
              'input[name*="plate" i], input[name*="license" i], input[id*="plate" i], input[placeholder*="plate" i]',
            )
            .first();
          if (await plateInput.count().catch(() => 0)) {
            await plateInput.fill(plate).catch(() => undefined);
          }
        }

        const submit = page
          .locator(
            'button:has-text("Search"), button:has-text("Submit"), button:has-text("Get"), input[type="submit"], button[type="submit"]',
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
          lower.includes('no test') ||
          lower.includes('not found') ||
          lower.includes('no history');

        const records: CaSmogRecord[] = [];
        const rows = await page
          .locator('table tr, [class*="result"] tr, [class*="history"] li')
          .all()
          .catch(() => []);
        for (const row of rows.slice(0, 60)) {
          const text = (await row.innerText().catch(() => '')).trim();
          if (!text) continue;
          const date = /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/.exec(text)?.[1];
          if (!date) continue;
          records.push({
            date,
            result: /(pass|fail)/i.exec(text)?.[1],
            station: /station[^\n]*?[:#]?\s*([^\n]+)/i.exec(text)?.[1]?.trim(),
          });
        }

        // Most recent date.
        const sorted = [...records].sort((a, b) => {
          const da = a.date ? Date.parse(a.date) : 0;
          const db = b.date ? Date.parse(b.date) : 0;
          return db - da;
        });
        const lastSmogDate = sorted[0]?.date;

        if (noResults && records.length === 0) {
          return {
            status: 'success',
            parsedData: {
              data_available: true,
              records: [],
              record_count: 0,
              raw_text: bodyText.slice(0, 4000),
            },
            normalizedFacts: [
              { key: 'ca_smog_records', value: 0, confidence: 85 },
              { key: 'ca_last_smog_date', value: null, confidence: 85 },
            ],
            costUsd: 0,
          };
        }

        return {
          status: records.length ? 'success' : 'partial',
          parsedData: {
            data_available: true,
            records: records.slice(0, 30),
            record_count: records.length,
            last_smog_date: lastSmogDate,
            raw_text: bodyText.slice(0, 4000),
          },
          normalizedFacts: [
            { key: 'ca_smog_records', value: records.length, confidence: records.length ? 80 : 60 },
            { key: 'ca_last_smog_date', value: lastSmogDate ?? null, confidence: 80 },
          ],
          costUsd: 0,
        };
      });
    } catch (err) {
      logger.error({ err }, 'usa_st_ca_smogcheck: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
