import type { QueryInput, SourceClient, SourceResult } from '@carcheck/shared-types';

interface ClearVinEmissionRecord {
  date?: string;
  state?: string;
  result?: string;
  odometer?: number;
  station?: string;
}

interface ClearVinResponse {
  vin?: string;
  title_brands?: string[];
  salvage?: boolean;
  junk?: boolean;
  accident_count?: number;
  emission_records?: ClearVinEmissionRecord[];
  last_odometer?: number;
  error?: string;
}

export interface ClearVinParsed {
  data_available: boolean;
  title_brands: string[];
  has_salvage: boolean;
  has_junk: boolean;
  accident_count: number;
  emission_record_count: number;
  emission_pass_count: number;
  emission_fail_count: number;
  states_tested_in: string[];
  last_odometer_mi: number | null;
  raw_emission_records: ClearVinEmissionRecord[];
}

function parseClearVin(data: ClearVinResponse): ClearVinParsed {
  const brands = data.title_brands ?? [];
  const emissions = data.emission_records ?? [];
  const states = new Set<string>();
  let pass = 0;
  let fail = 0;
  for (const e of emissions) {
    if (e.state) states.add(e.state);
    if (e.result && /pass/i.test(e.result)) pass++;
    if (e.result && /fail/i.test(e.result)) fail++;
  }

  return {
    data_available: Boolean(brands.length || emissions.length),
    title_brands: brands,
    has_salvage: data.salvage === true || brands.some((b) => /salvage/i.test(b)),
    has_junk: data.junk === true || brands.some((b) => /junk/i.test(b)),
    accident_count: data.accident_count ?? 0,
    emission_record_count: emissions.length,
    emission_pass_count: pass,
    emission_fail_count: fail,
    states_tested_in: Array.from(states),
    last_odometer_mi: typeof data.last_odometer === 'number' ? data.last_odometer : null,
    raw_emission_records: emissions,
  };
}

export const clearVinClient: SourceClient<ClearVinParsed> = {
  key: 'usa_private_clearvin',
  name: 'ClearVin',
  async fetch(input: QueryInput): Promise<SourceResult<ClearVinParsed>> {
    const start = Date.now();
    const apiKey = process.env.CLEARVIN_API_KEY;

    if (!input.vin) {
      return {
        sourceKey: 'usa_private_clearvin',
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage: 'ClearVin requires a VIN',
      };
    }

    if (!apiKey) {
      return {
        sourceKey: 'usa_private_clearvin',
        status: 'skipped',
        responseTimeMs: 0,
        errorMessage: 'CLEARVIN_API_KEY not configured',
      };
    }

    const url = `https://www.clearvin.com/api/v1/reports?vin=${encodeURIComponent(input.vin)}`;

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
          sourceKey: 'usa_private_clearvin',
          status: 'failed',
          responseTimeMs: Date.now() - start,
          httpStatus: res.status,
          errorMessage: `ClearVin returned ${res.status}`,
        };
      }

      const data = (await res.json()) as ClearVinResponse;
      const parsed = parseClearVin(data);

      const facts: SourceResult<ClearVinParsed>['normalizedFacts'] = [
        { key: 'title_brands', value: parsed.title_brands, confidence: 95 },
        { key: 'has_salvage', value: parsed.has_salvage, confidence: 95 },
        { key: 'has_junk', value: parsed.has_junk, confidence: 95 },
        { key: 'accident_count', value: parsed.accident_count, confidence: 90 },
        { key: 'emission_record_count', value: parsed.emission_record_count, confidence: 100 },
        { key: 'emission_fail_count', value: parsed.emission_fail_count, confidence: 95 },
        { key: 'states_tested_in_us', value: parsed.states_tested_in, confidence: 95 },
        { key: 'last_odometer_mi', value: parsed.last_odometer_mi, confidence: 90 },
      ];

      return {
        sourceKey: 'usa_private_clearvin',
        status: 'success',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        rawData: data,
        parsedData: parsed,
        normalizedFacts: facts,
        costUsd: 0.6,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        sourceKey: 'usa_private_clearvin',
        status: isTimeout ? 'timeout' : 'failed',
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
