import type { QueryInput, SourceClient, SourceResult } from '@carcheck/shared-types';

interface CarsXeDecoderAttribute {
  label?: string;
  value?: string;
}

interface CarsXeResponse {
  success?: boolean;
  vin?: string;
  attributes?: Record<string, string>;
  input?: Record<string, string>;
  decode?: CarsXeDecoderAttribute[];
  make?: string;
  model?: string;
  year?: string;
  trim?: string;
  history?: {
    title_brands?: string[];
    salvage?: boolean;
    accident_count?: number;
  };
  images?: Array<{ url?: string; source?: string }>;
  market_value?: {
    mean?: number;
    low?: number;
    high?: number;
    currency?: string;
  };
  error?: string;
}

export interface CarsXeParsed {
  data_available: boolean;
  make: string | null;
  model: string | null;
  year: string | null;
  trim: string | null;
  title_brands: string[];
  has_salvage: boolean;
  accident_count: number;
  image_count: number;
  image_urls: string[];
  market_value_mean: number | null;
  market_value_low: number | null;
  market_value_high: number | null;
}

function parseCarsXe(data: CarsXeResponse): CarsXeParsed {
  const attrs = data.attributes ?? {};
  const brands = data.history?.title_brands ?? [];
  const images = data.images ?? [];
  return {
    data_available: data.success !== false && Boolean(data.make || attrs.make || brands.length || images.length),
    make: data.make ?? attrs.make ?? null,
    model: data.model ?? attrs.model ?? null,
    year: data.year ?? attrs.year ?? null,
    trim: data.trim ?? attrs.trim ?? null,
    title_brands: brands,
    has_salvage: data.history?.salvage === true || brands.some((b) => /salvage|junk/i.test(b)),
    accident_count: data.history?.accident_count ?? 0,
    image_count: images.length,
    image_urls: images.map((i) => i.url ?? '').filter(Boolean),
    market_value_mean: typeof data.market_value?.mean === 'number' ? data.market_value.mean : null,
    market_value_low: typeof data.market_value?.low === 'number' ? data.market_value.low : null,
    market_value_high: typeof data.market_value?.high === 'number' ? data.market_value.high : null,
  };
}

export const carsXeClient: SourceClient<CarsXeParsed> = {
  key: 'usa_private_carsxe',
  name: 'CarsXE',
  async fetch(input: QueryInput): Promise<SourceResult<CarsXeParsed>> {
    const start = Date.now();
    const apiKey = process.env.CARSXE_API_KEY;

    if (!input.vin) {
      return {
        sourceKey: 'usa_private_carsxe',
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage: 'CarsXE requires a VIN',
      };
    }

    if (!apiKey) {
      return {
        sourceKey: 'usa_private_carsxe',
        status: 'skipped',
        responseTimeMs: 0,
        errorMessage: 'CARSXE_API_KEY not configured',
      };
    }

    const url = `https://api.carsxe.com/specs?key=${apiKey}&vin=${encodeURIComponent(input.vin)}`;

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
          sourceKey: 'usa_private_carsxe',
          status: 'failed',
          responseTimeMs: Date.now() - start,
          httpStatus: res.status,
          errorMessage: `CarsXE returned ${res.status}`,
        };
      }

      const data = (await res.json()) as CarsXeResponse;
      const parsed = parseCarsXe(data);

      const facts: SourceResult<CarsXeParsed>['normalizedFacts'] = [
        { key: 'make', value: parsed.make, confidence: 95 },
        { key: 'model', value: parsed.model, confidence: 95 },
        { key: 'year', value: parsed.year, confidence: 95 },
        { key: 'trim', value: parsed.trim, confidence: 90 },
        { key: 'title_brands', value: parsed.title_brands, confidence: 90 },
        { key: 'has_salvage', value: parsed.has_salvage, confidence: 90 },
        { key: 'accident_count', value: parsed.accident_count, confidence: 85 },
        { key: 'carsxe_image_count', value: parsed.image_count, confidence: 100 },
        { key: 'market_value_avg_usd', value: parsed.market_value_mean, confidence: 80 },
      ];

      return {
        sourceKey: 'usa_private_carsxe',
        status: 'success',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        rawData: data,
        parsedData: parsed,
        normalizedFacts: facts,
        costUsd: 0.3,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        sourceKey: 'usa_private_carsxe',
        status: isTimeout ? 'timeout' : 'failed',
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
