import type { QueryInput, SourceClient, SourceResult } from '@carcheck/shared-types';

interface AutoCheckEvent {
  date?: string;
  type?: string;
  detail?: string;
  state?: string;
  odometer?: number;
}

interface AutoCheckResponse {
  vin?: string;
  score?: number;
  score_range_low?: number;
  score_range_high?: number;
  title_brands?: string[];
  accident_count?: number;
  owner_count?: number;
  has_frame_damage?: boolean;
  has_airbag_deployment?: boolean;
  has_odometer_problem?: boolean;
  last_reported_odometer?: number;
  auction_records?: Array<{
    date?: string;
    location?: string;
    sale_price?: number;
    damage?: string;
  }>;
  events?: AutoCheckEvent[];
  error?: string;
}

export interface AutoCheckParsed {
  data_available: boolean;
  autocheck_score: number | null;
  score_range_low: number | null;
  score_range_high: number | null;
  title_brands: string[];
  has_salvage: boolean;
  accident_count: number;
  owner_count: number | null;
  has_frame_damage: boolean;
  has_airbag_deployment: boolean;
  has_odometer_problem: boolean;
  last_odometer_mi: number | null;
  auction_record_count: number;
  highest_auction_price: number | null;
  raw_auction_records: AutoCheckResponse['auction_records'];
}

function parseAutoCheck(data: AutoCheckResponse): AutoCheckParsed {
  const brands = data.title_brands ?? [];
  const auctions = data.auction_records ?? [];
  let highest: number | null = null;
  for (const a of auctions) {
    if (typeof a.sale_price === 'number' && (highest === null || a.sale_price > highest)) {
      highest = a.sale_price;
    }
  }
  return {
    data_available: Boolean(data.score || brands.length || auctions.length || data.events?.length),
    autocheck_score: typeof data.score === 'number' ? data.score : null,
    score_range_low: typeof data.score_range_low === 'number' ? data.score_range_low : null,
    score_range_high: typeof data.score_range_high === 'number' ? data.score_range_high : null,
    title_brands: brands,
    has_salvage: brands.some((b) => /salvage|junk|scrap/i.test(b)),
    accident_count: data.accident_count ?? 0,
    owner_count: typeof data.owner_count === 'number' ? data.owner_count : null,
    has_frame_damage: data.has_frame_damage ?? false,
    has_airbag_deployment: data.has_airbag_deployment ?? false,
    has_odometer_problem: data.has_odometer_problem ?? false,
    last_odometer_mi: typeof data.last_reported_odometer === 'number' ? data.last_reported_odometer : null,
    auction_record_count: auctions.length,
    highest_auction_price: highest,
    raw_auction_records: auctions,
  };
}

export const autoCheckClient: SourceClient<AutoCheckParsed> = {
  key: 'usa_private_autocheck',
  name: 'Experian AutoCheck',
  async fetch(input: QueryInput): Promise<SourceResult<AutoCheckParsed>> {
    const start = Date.now();
    const apiKey = process.env.AUTOCHECK_API_KEY;

    if (!input.vin) {
      return {
        sourceKey: 'usa_private_autocheck',
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage: 'AutoCheck requires a VIN',
      };
    }

    if (!apiKey) {
      return {
        sourceKey: 'usa_private_autocheck',
        status: 'skipped',
        responseTimeMs: 0,
        errorMessage: 'AUTOCHECK_API_KEY not configured',
      };
    }

    const url = `https://api.autocheck.com/v1/report?vin=${encodeURIComponent(input.vin)}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'User-Agent': 'CarCheck/0.1',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          sourceKey: 'usa_private_autocheck',
          status: 'failed',
          responseTimeMs: Date.now() - start,
          httpStatus: res.status,
          errorMessage: `AutoCheck returned ${res.status}`,
        };
      }

      const data = (await res.json()) as AutoCheckResponse;
      const parsed = parseAutoCheck(data);

      const facts: SourceResult<AutoCheckParsed>['normalizedFacts'] = [
        { key: 'autocheck_score', value: parsed.autocheck_score, confidence: 100 },
        { key: 'title_brands', value: parsed.title_brands, confidence: 100 },
        { key: 'has_salvage', value: parsed.has_salvage, confidence: 100 },
        { key: 'accident_count', value: parsed.accident_count, confidence: 95 },
        { key: 'owner_count', value: parsed.owner_count, confidence: 90 },
        { key: 'has_frame_damage', value: parsed.has_frame_damage, confidence: 95 },
        { key: 'has_airbag_deployment', value: parsed.has_airbag_deployment, confidence: 95 },
        { key: 'has_odometer_problem', value: parsed.has_odometer_problem, confidence: 95 },
        { key: 'last_odometer_mi', value: parsed.last_odometer_mi, confidence: 90 },
        { key: 'auction_price', value: parsed.highest_auction_price, confidence: 90 },
      ];

      return {
        sourceKey: 'usa_private_autocheck',
        status: 'success',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        rawData: data,
        parsedData: parsed,
        normalizedFacts: facts,
        costUsd: 1.5,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        sourceKey: 'usa_private_autocheck',
        status: isTimeout ? 'timeout' : 'failed',
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
