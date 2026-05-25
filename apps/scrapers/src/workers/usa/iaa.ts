import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface IaaParsed {
  data_available: boolean;
  vin: string;
  found: boolean;
  damage?: string;
  photo_count: number;
  sale_price?: string;
  sale_date?: string;
  raw_text?: string;
}

const IAA_BASE = 'https://www.iaai.com';

export const iaaWorker: ScrapeWorker<IaaParsed> = {
  key: 'auction_iaa',
  async run(input): Promise<ScrapeResult<IaaParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    const vin = parsed.data.vin;
    if (!vin) {
      return {
        status: 'not_applicable',
        errorCode: 'vin_required',
        errorMessage: 'IAA auction lookup requires the VIN',
      };
    }

    try {
      // IAAI blocks datacenter IPs — always route via proxy.
      return await withPage<ScrapeResult<IaaParsed>>(
        async (page) => {
          const searchUrl = `${IAA_BASE}/Search?Keyword=${encodeURIComponent(vin)}`;
          await page
            .goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 })
            .catch(() => undefined);

          const searchBox = page
            .locator('input[name*="keyword" i], input[id*="search" i], input[placeholder*="VIN" i]')
            .first();
          if (await searchBox.count().catch(() => 0)) {
            await searchBox.fill(vin).catch(() => undefined);
            await searchBox.press('Enter').catch(() => undefined);
            await page.waitForTimeout(2500);
          }
          await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);

          const bodyText = await page
            .locator('body')
            .innerText({ timeout: 10_000 })
            .catch(() => '');
          const lower = bodyText.toLowerCase();

          const noResults =
            lower.includes('no results') ||
            lower.includes('no records') ||
            lower.includes('0 results') ||
            lower.includes('no vehicles') ||
            lower.includes('did not match');

          const photoCount = await page
            .locator('img[src*="iaai" i], [class*="thumbnail" i] img, [class*="gallery" i] img')
            .count()
            .catch(() => 0);

          const damage =
            /(?:primary\s+damage|loss\s+type|damage)[^\n:]*:?\s*([A-Za-z /&]+)/i
              .exec(bodyText)?.[1]
              ?.trim();
          const salePrice =
            /(?:sale\s+price|final\s+bid|sold\s+for|high\s+bid)[^\n$]*\$\s*([\d,]+)/i
              .exec(bodyText)?.[1]
              ?.trim();
          const saleDate = /(?:sale\s+date|auction\s+date)[^\n]*?(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(
            bodyText,
          )?.[1];

          const found = !noResults && (photoCount > 0 || Boolean(damage) || Boolean(salePrice));

          return {
            status: 'success',
            parsedData: {
              data_available: true,
              vin,
              found,
              damage,
              photo_count: photoCount,
              sale_price: salePrice ? `$${salePrice}` : undefined,
              sale_date: saleDate,
              raw_text: bodyText.slice(0, 4000),
            },
            normalizedFacts: [
              { key: 'iaa_found', value: found, confidence: found ? 80 : 75 },
              { key: 'iaa_damage', value: damage ?? null, confidence: 70 },
            ],
            costUsd: 0.5,
          };
        },
        { proxy: 'always' },
      );
    } catch (err) {
      logger.error({ err }, 'auction_iaa: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
