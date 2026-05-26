import { withPage } from '../../lib/browser-pool';
import { logger } from '../../lib/logger';
import { resolveVehicle } from '../../lib/vin';
import { isBotWalled } from './_shared';
import { scrapeRequestSchema, type ScrapeResult, type ScrapeWorker } from '../types';

interface Listing {
  title?: string;
  price_mxn?: number;
  year?: number;
  url?: string;
}

interface MarketParsed {
  data_available: boolean;
  listing_count: number;
  price_min_mxn?: number;
  price_max_mxn?: number;
  price_avg_mxn?: number;
  listings: Listing[];
  searched_for: { make?: string; model?: string; year?: number };
}

const AUTOCOSMOS_BASE = 'https://www.autocosmos.com.mx';

// US (NHTSA) model names differ from MX commercial names. Map the common renames
// so the MX marketplace URL resolves (e.g. Ford F-150 is sold as "Lobo" in Mexico).
const US_TO_MX_MODEL: Record<string, string> = {
  'f-150': 'lobo',
  f150: 'lobo',
  'f-250': 'f-250-super-duty',
  ranger: 'ranger',
  'cr-v': 'cr-v',
  'hr-v': 'hr-v',
  versa: 'versa',
  sentra: 'sentra',
};

function parsePriceMxn(text: string): number | undefined {
  const m = /\$?\s*([\d.,]{4,})/.exec(text.replace(/\s+/g, ''));
  if (!m || !m[1]) return undefined;
  const n = Number(m[1].replace(/[.,]/g, ''));
  return Number.isFinite(n) && n > 1000 ? n : undefined;
}

export const autocosmosWorker: ScrapeWorker<MarketParsed> = {
  key: 'mkt_mx_autocosmos',
  async run(input): Promise<ScrapeResult<MarketParsed>> {
    const parsed = scrapeRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 'failed', errorCode: 'invalid_input', errorMessage: parsed.error.message };
    }
    const extras = await resolveVehicle(input);
    const make = extras.make;
    if (!make) {
      return {
        status: 'not_applicable',
        errorCode: 'make_required',
        errorMessage: 'Marketplace search needs decoded make/model/year',
      };
    }

    // Autocosmos browses used listings by path: /auto/usado/<make>/<model> (slugged,
    // MX commercial model name).
    const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const pathParts = ['auto', 'usado', slug(make)];
    if (extras.model) {
      const mslug = slug(extras.model);
      pathParts.push(US_TO_MX_MODEL[mslug] ?? mslug);
    }
    const searchUrl = `${AUTOCOSMOS_BASE}/${pathParts.join('/')}`;

    try {
      return await withPage<ScrapeResult<MarketParsed>>(async (page) => {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 });
        await page.waitForTimeout(2000);

        const pageText = await page.locator('body').innerText({ timeout: 6000 }).catch(() => '');
        if (isBotWalled(page.url(), pageText)) {
          return {
            status: 'partial',
            errorCode: 'site_blocked',
            errorMessage: 'Autocosmos bot-walls datacenter IPs — needs residential proxy',
            parsedData: { data_available: false, listing_count: 0, listings: [], searched_for: { make, model: extras.model, year: extras.year } },
            costUsd: 0.02,
          };
        }

        // Individual used listings render as .listing-card with an itemprop="price"
        // value carrying the exact integer price in its `content` attribute.
        const cards = await page.locator('.listing-card').all();

        const listings: Listing[] = [];
        for (const card of cards.slice(0, 50)) {
          const priceContent = await card
            .locator('.listing-card__price-value[itemprop="price"], [itemprop="price"]')
            .first()
            .getAttribute('content')
            .catch(() => null);
          let price_mxn = priceContent ? Number(priceContent) : undefined;
          if (!price_mxn || !Number.isFinite(price_mxn)) {
            const ptext = await card.locator('.listing-card__price-value, [class*="price"]').first().innerText().catch(() => '');
            price_mxn = parsePriceMxn(ptext);
          }
          const title = (await card.locator('.listing-card__car, .listing-card__brand').first().innerText().catch(() => '')).trim();
          const url = await card.locator('a').first().getAttribute('href').catch(() => null);
          const yearText = await card.innerText().catch(() => '');
          const yearMatch = /\b(19|20)\d{2}\b/.exec(yearText);
          if (!price_mxn && !title) continue;
          listings.push({
            title: title.slice(0, 120) || undefined,
            price_mxn: price_mxn && Number.isFinite(price_mxn) ? price_mxn : undefined,
            year: yearMatch ? Number(yearMatch[0]) : undefined,
            url: url ?? undefined,
          });
        }

        const prices = listings
          .map((l) => l.price_mxn)
          .filter((n): n is number => typeof n === 'number');

        const price_min_mxn = prices.length ? Math.min(...prices) : undefined;
        const price_max_mxn = prices.length ? Math.max(...prices) : undefined;
        const price_avg_mxn = prices.length
          ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
          : undefined;

        return {
          status: 'success',
          parsedData: {
            data_available: true,
            listing_count: listings.length,
            price_min_mxn,
            price_max_mxn,
            price_avg_mxn,
            listings: listings.slice(0, 25),
            searched_for: { make, model: extras.model, year: extras.year },
          },
          normalizedFacts: [
            { key: 'listing_count', value: listings.length, confidence: 70 },
            { key: 'price_min_mxn', value: price_min_mxn, confidence: 65 },
            { key: 'price_max_mxn', value: price_max_mxn, confidence: 65 },
            { key: 'price_avg_mxn', value: price_avg_mxn, confidence: 65 },
          ],
          costUsd: 0.02,
        };
      });
    } catch (err) {
      logger.error({ err }, 'autocosmos: scrape failed');
      return {
        status: 'failed',
        errorCode: 'scrape_error',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
