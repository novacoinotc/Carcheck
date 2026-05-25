import type { QueryInput, SourceClient, SourceResult } from '@carcheck/shared-types';

interface BumperListing {
  date?: string;
  price?: number;
  mileage?: number;
  city?: string;
  state?: string;
  source?: string;
}

interface BumperServiceRecord {
  date?: string;
  odometer?: number;
  type?: string;
  provider?: string;
}

interface BumperResponse {
  vin?: string;
  title_records?: Array<{ state?: string; date?: string; brand?: string; status?: string }>;
  title_brands?: string[];
  salvage?: boolean;
  accident_count?: number;
  listings?: BumperListing[];
  service_records?: BumperServiceRecord[];
  last_odometer?: number;
  error?: string;
}

export interface BumperParsed {
  data_available: boolean;
  title_brands: string[];
  has_salvage: boolean;
  accident_count: number;
  listing_count: number;
  service_record_count: number;
  states_seen_in: string[];
  last_odometer_mi: number | null;
  raw_listings: BumperListing[];
  raw_service_records: BumperServiceRecord[];
}

function parseBumper(data: BumperResponse): BumperParsed {
  const listings = data.listings ?? [];
  const services = data.service_records ?? [];
  const titles = data.title_records ?? [];
  const brands = data.title_brands ?? titles.map((t) => t.brand ?? '').filter(Boolean);

  const states = new Set<string>();
  for (const t of titles) if (t.state) states.add(t.state);
  for (const l of listings) if (l.state) states.add(l.state);

  const hasSalvage = data.salvage === true || brands.some((b) => /salvage|junk/i.test(b));

  return {
    data_available: Boolean(brands.length || listings.length || services.length || titles.length),
    title_brands: brands,
    has_salvage: hasSalvage,
    accident_count: data.accident_count ?? 0,
    listing_count: listings.length,
    service_record_count: services.length,
    states_seen_in: Array.from(states),
    last_odometer_mi: typeof data.last_odometer === 'number' ? data.last_odometer : null,
    raw_listings: listings,
    raw_service_records: services,
  };
}

export const bumperClient: SourceClient<BumperParsed> = {
  key: 'usa_private_bumper',
  name: 'Bumper',
  async fetch(input: QueryInput): Promise<SourceResult<BumperParsed>> {
    const start = Date.now();
    const apiKey = process.env.BUMPER_API_KEY;

    if (!input.vin) {
      return {
        sourceKey: 'usa_private_bumper',
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage: 'Bumper requires a VIN',
      };
    }

    if (!apiKey) {
      return {
        sourceKey: 'usa_private_bumper',
        status: 'skipped',
        responseTimeMs: 0,
        errorMessage: 'BUMPER_API_KEY not configured',
      };
    }

    const url = `https://api.bumper.com/v1/vin/${encodeURIComponent(input.vin)}?api_key=${apiKey}`;

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
          sourceKey: 'usa_private_bumper',
          status: 'failed',
          responseTimeMs: Date.now() - start,
          httpStatus: res.status,
          errorMessage: `Bumper returned ${res.status}`,
        };
      }

      const data = (await res.json()) as BumperResponse;
      const parsed = parseBumper(data);

      const facts: SourceResult<BumperParsed>['normalizedFacts'] = [
        { key: 'title_brands', value: parsed.title_brands, confidence: 95 },
        { key: 'has_salvage', value: parsed.has_salvage, confidence: 95 },
        { key: 'accident_count', value: parsed.accident_count, confidence: 90 },
        { key: 'bumper_listings_count', value: parsed.listing_count, confidence: 100 },
        { key: 'service_record_count', value: parsed.service_record_count, confidence: 95 },
        { key: 'states_seen_in_us', value: parsed.states_seen_in, confidence: 95 },
        { key: 'last_odometer_mi', value: parsed.last_odometer_mi, confidence: 90 },
      ];

      return {
        sourceKey: 'usa_private_bumper',
        status: 'success',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        rawData: data,
        parsedData: parsed,
        normalizedFacts: facts,
        costUsd: 0.5,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        sourceKey: 'usa_private_bumper',
        status: isTimeout ? 'timeout' : 'failed',
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
