import type { QueryInput, SourceClient, SourceResult } from '@carcheck/shared-types';

interface VinAuditNmvtisResponse {
  success: boolean;
  vin?: string;
  attributes?: Record<string, string>;
  titles?: Array<{
    state: string;
    date: string;
    mileage?: number;
    odometer?: string;
    title_status?: string;
    title_number?: string;
    brands?: string[];
  }>;
  brands?: Array<{
    name: string;
    date: string;
    state: string;
  }>;
  jsi?: Array<{
    type: 'junk' | 'salvage';
    date: string;
    state: string;
    reporting_entity?: string;
  }>;
  ths?: Array<{
    date: string;
    state: string;
    reporting_entity?: string;
  }>;
  error?: string;
}

export interface VinAuditNmvtisParsed {
  data_available: boolean;
  title_count: number;
  brand_count: number;
  has_salvage: boolean;
  has_junk: boolean;
  has_theft: boolean;
  has_flood: boolean;
  has_rebuilt: boolean;
  has_lemon: boolean;
  title_brands: string[];
  latest_odometer_mi: number | null;
  latest_odometer_state: string | null;
  states_titled_in: string[];
  raw_brands: Array<{ name: string; date: string; state: string }>;
  raw_titles: VinAuditNmvtisResponse['titles'];
  jsi_records: VinAuditNmvtisResponse['jsi'];
  theft_records: VinAuditNmvtisResponse['ths'];
}

const BRAND_NORMALIZATION: Record<string, keyof Pick<VinAuditNmvtisParsed, 'has_salvage' | 'has_junk' | 'has_flood' | 'has_rebuilt' | 'has_lemon'>> = {
  salvage: 'has_salvage',
  junk: 'has_junk',
  flood: 'has_flood',
  water: 'has_flood',
  hail: 'has_flood',
  rebuilt: 'has_rebuilt',
  reconstructed: 'has_rebuilt',
  lemon: 'has_lemon',
  manufacturer_buyback: 'has_lemon',
};

function parseNmvtis(data: VinAuditNmvtisResponse): VinAuditNmvtisParsed {
  const result: VinAuditNmvtisParsed = {
    data_available: data.success && Boolean(data.titles?.length || data.brands?.length),
    title_count: data.titles?.length ?? 0,
    brand_count: data.brands?.length ?? 0,
    has_salvage: false,
    has_junk: false,
    has_theft: (data.ths?.length ?? 0) > 0,
    has_flood: false,
    has_rebuilt: false,
    has_lemon: false,
    title_brands: (data.brands ?? []).map((b) => b.name),
    latest_odometer_mi: null,
    latest_odometer_state: null,
    states_titled_in: [],
    raw_brands: data.brands ?? [],
    raw_titles: data.titles,
    jsi_records: data.jsi,
    theft_records: data.ths,
  };

  for (const brand of result.title_brands) {
    const key = brand.toLowerCase().replace(/\s+/g, '_');
    const flag = BRAND_NORMALIZATION[key];
    if (flag) result[flag] = true;
  }

  if (data.jsi) {
    for (const jsiRecord of data.jsi) {
      if (jsiRecord.type === 'salvage') result.has_salvage = true;
      if (jsiRecord.type === 'junk') result.has_junk = true;
    }
  }

  const states = new Set<string>();
  let latestOdo = 0;
  let latestState: string | null = null;
  for (const t of data.titles ?? []) {
    if (t.state) states.add(t.state);
    if (t.mileage && t.mileage > latestOdo) {
      latestOdo = t.mileage;
      latestState = t.state ?? null;
    }
  }
  result.states_titled_in = Array.from(states);
  if (latestOdo > 0) {
    result.latest_odometer_mi = latestOdo;
    result.latest_odometer_state = latestState;
  }

  return result;
}

export const vinAuditNmvtisClient: SourceClient<VinAuditNmvtisParsed> = {
  key: 'usa_fed_nmvtis_vinaudit',
  name: 'NMVTIS via VinAudit',
  async fetch(input: QueryInput): Promise<SourceResult<VinAuditNmvtisParsed>> {
    const start = Date.now();
    const apiKey = process.env.VINAUDIT_API_KEY;

    if (!input.vin) {
      return {
        sourceKey: 'usa_fed_nmvtis_vinaudit',
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage: 'NMVTIS requires a VIN',
      };
    }

    if (!apiKey) {
      return {
        sourceKey: 'usa_fed_nmvtis_vinaudit',
        status: 'skipped',
        responseTimeMs: 0,
        errorMessage: 'VINAUDIT_API_KEY not configured',
      };
    }

    const url = `https://api.vinaudit.com/v2/getsamplereport.json?key=${apiKey}&format=json&vin=${encodeURIComponent(input.vin)}&id=carcheck`;

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
          sourceKey: 'usa_fed_nmvtis_vinaudit',
          status: 'failed',
          responseTimeMs: Date.now() - start,
          httpStatus: res.status,
          errorMessage: `VinAudit returned ${res.status}`,
        };
      }

      const data = (await res.json()) as VinAuditNmvtisResponse;
      if (!data.success) {
        return {
          sourceKey: 'usa_fed_nmvtis_vinaudit',
          status: 'partial',
          responseTimeMs: Date.now() - start,
          rawData: data,
          parsedData: parseNmvtis(data),
          errorMessage: data.error ?? 'VinAudit returned success=false',
          costUsd: 2.49,
        };
      }

      const parsed = parseNmvtis(data);
      const facts: SourceResult<VinAuditNmvtisParsed>['normalizedFacts'] = [
        { key: 'nmvtis_title_count', value: parsed.title_count, confidence: 100 },
        { key: 'nmvtis_brand_count', value: parsed.brand_count, confidence: 100 },
        { key: 'title_brands', value: parsed.title_brands, confidence: 100 },
        { key: 'has_salvage', value: parsed.has_salvage, confidence: 100 },
        { key: 'has_junk', value: parsed.has_junk, confidence: 100 },
        { key: 'has_flood', value: parsed.has_flood, confidence: 100 },
        { key: 'has_rebuilt', value: parsed.has_rebuilt, confidence: 100 },
        { key: 'has_lemon', value: parsed.has_lemon, confidence: 100 },
        { key: 'has_theft_us', value: parsed.has_theft, confidence: 100 },
        { key: 'latest_odometer_mi', value: parsed.latest_odometer_mi, confidence: 90 },
        { key: 'states_titled_in_us', value: parsed.states_titled_in, confidence: 100 },
      ];

      return {
        sourceKey: 'usa_fed_nmvtis_vinaudit',
        status: 'success',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        rawData: data,
        parsedData: parsed,
        normalizedFacts: facts,
        costUsd: 2.49,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        sourceKey: 'usa_fed_nmvtis_vinaudit',
        status: isTimeout ? 'timeout' : 'failed',
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
