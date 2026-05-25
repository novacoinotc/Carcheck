import type { QueryInput, SourceClient, SourceResult } from '@carcheck/shared-types';

interface EpicVinSale {
  date?: string;
  price?: number;
  odometer?: number;
  source?: string;
  damage?: string;
}

interface EpicVinResponse {
  vin?: string;
  title_brands?: string[];
  salvage?: boolean;
  junk?: boolean;
  accident_count?: number;
  sales_history?: EpicVinSale[];
  market_value?: {
    low?: number;
    average?: number;
    high?: number;
    currency?: string;
  };
  last_odometer?: number;
  error?: string;
}

export interface EpicVinParsed {
  data_available: boolean;
  title_brands: string[];
  has_salvage: boolean;
  has_junk: boolean;
  accident_count: number;
  sale_count: number;
  highest_sale_price: number | null;
  latest_sale_price: number | null;
  market_value_low: number | null;
  market_value_avg: number | null;
  market_value_high: number | null;
  last_odometer_mi: number | null;
  raw_sales: EpicVinSale[];
}

function parseEpicVin(data: EpicVinResponse): EpicVinParsed {
  const brands = data.title_brands ?? [];
  const sales = data.sales_history ?? [];
  const sorted = [...sales].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  let highest: number | null = null;
  for (const s of sales) {
    if (typeof s.price === 'number' && (highest === null || s.price > highest)) highest = s.price;
  }
  const latest = sorted[sorted.length - 1];

  return {
    data_available: Boolean(brands.length || sales.length || data.market_value),
    title_brands: brands,
    has_salvage: data.salvage === true || brands.some((b) => /salvage/i.test(b)),
    has_junk: data.junk === true || brands.some((b) => /junk/i.test(b)),
    accident_count: data.accident_count ?? 0,
    sale_count: sales.length,
    highest_sale_price: highest,
    latest_sale_price: typeof latest?.price === 'number' ? latest.price : null,
    market_value_low: typeof data.market_value?.low === 'number' ? data.market_value.low : null,
    market_value_avg: typeof data.market_value?.average === 'number' ? data.market_value.average : null,
    market_value_high: typeof data.market_value?.high === 'number' ? data.market_value.high : null,
    last_odometer_mi: typeof data.last_odometer === 'number' ? data.last_odometer : null,
    raw_sales: sales,
  };
}

export const epicVinClient: SourceClient<EpicVinParsed> = {
  key: 'usa_private_epicvin',
  name: 'EpicVIN',
  async fetch(input: QueryInput): Promise<SourceResult<EpicVinParsed>> {
    const start = Date.now();
    const apiKey = process.env.EPICVIN_API_KEY;

    if (!input.vin) {
      return {
        sourceKey: 'usa_private_epicvin',
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage: 'EpicVIN requires a VIN',
      };
    }

    if (!apiKey) {
      return {
        sourceKey: 'usa_private_epicvin',
        status: 'skipped',
        responseTimeMs: 0,
        errorMessage: 'EPICVIN_API_KEY not configured',
      };
    }

    const url = `https://api.epicvin.com/v1/report?vin=${encodeURIComponent(input.vin)}&api_key=${apiKey}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'CarCheck/0.1' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          sourceKey: 'usa_private_epicvin',
          status: 'failed',
          responseTimeMs: Date.now() - start,
          httpStatus: res.status,
          errorMessage: `EpicVIN returned ${res.status}`,
        };
      }

      const data = (await res.json()) as EpicVinResponse;
      const parsed = parseEpicVin(data);

      const facts: SourceResult<EpicVinParsed>['normalizedFacts'] = [
        { key: 'title_brands', value: parsed.title_brands, confidence: 95 },
        { key: 'has_salvage', value: parsed.has_salvage, confidence: 95 },
        { key: 'has_junk', value: parsed.has_junk, confidence: 95 },
        { key: 'accident_count', value: parsed.accident_count, confidence: 90 },
        { key: 'epicvin_sale_count', value: parsed.sale_count, confidence: 100 },
        { key: 'auction_price', value: parsed.highest_sale_price, confidence: 90 },
        { key: 'market_value_avg_usd', value: parsed.market_value_avg, confidence: 85 },
        { key: 'last_odometer_mi', value: parsed.last_odometer_mi, confidence: 90 },
      ];

      return {
        sourceKey: 'usa_private_epicvin',
        status: 'success',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        rawData: data,
        parsedData: parsed,
        normalizedFacts: facts,
        costUsd: 0.75,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        sourceKey: 'usa_private_epicvin',
        status: isTimeout ? 'timeout' : 'failed',
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
