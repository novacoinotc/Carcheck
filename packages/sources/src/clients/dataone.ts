import type { QueryInput, SourceClient, SourceResult } from '@carcheck/shared-types';

interface DataOneTrim {
  trim?: string;
  body_style?: string;
  engine?: string;
  transmission?: string;
  drive_type?: string;
  msrp?: number;
}

interface DataOneResponse {
  vin?: string;
  decode?: {
    make?: string;
    model?: string;
    year?: number;
    body_style?: string;
    engine?: string;
    transmission?: string;
    drive_type?: string;
    fuel_type?: string;
    doors?: number;
    plant_country?: string;
    msrp?: number;
  };
  trims?: DataOneTrim[];
  options?: string[];
  error?: string;
}

export interface DataOneParsed {
  data_available: boolean;
  make: string | null;
  model: string | null;
  year: number | null;
  body_style: string | null;
  engine: string | null;
  transmission: string | null;
  drive_type: string | null;
  fuel_type: string | null;
  doors: number | null;
  plant_country: string | null;
  msrp_usd: number | null;
  trim_count: number;
  option_count: number;
  raw_trims: DataOneTrim[];
}

function parseDataOne(data: DataOneResponse): DataOneParsed {
  const d = data.decode ?? {};
  const trims = data.trims ?? [];
  const options = data.options ?? [];
  return {
    data_available: Boolean(d.make || trims.length),
    make: d.make ?? null,
    model: d.model ?? null,
    year: typeof d.year === 'number' ? d.year : null,
    body_style: d.body_style ?? null,
    engine: d.engine ?? null,
    transmission: d.transmission ?? null,
    drive_type: d.drive_type ?? null,
    fuel_type: d.fuel_type ?? null,
    doors: typeof d.doors === 'number' ? d.doors : null,
    plant_country: d.plant_country ?? null,
    msrp_usd: typeof d.msrp === 'number' ? d.msrp : null,
    trim_count: trims.length,
    option_count: options.length,
    raw_trims: trims,
  };
}

export const dataOneClient: SourceClient<DataOneParsed> = {
  key: 'usa_private_dataone',
  name: 'DataOne Software',
  async fetch(input: QueryInput): Promise<SourceResult<DataOneParsed>> {
    const start = Date.now();
    const apiKey = process.env.DATAONE_API_KEY;

    if (!input.vin) {
      return {
        sourceKey: 'usa_private_dataone',
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage: 'DataOne requires a VIN',
      };
    }

    if (!apiKey) {
      return {
        sourceKey: 'usa_private_dataone',
        status: 'skipped',
        responseTimeMs: 0,
        errorMessage: 'DATAONE_API_KEY not configured',
      };
    }

    const url = `https://api.dataonesoftware.com/v2/vin/${encodeURIComponent(input.vin)}/decode`;

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
          sourceKey: 'usa_private_dataone',
          status: 'failed',
          responseTimeMs: Date.now() - start,
          httpStatus: res.status,
          errorMessage: `DataOne returned ${res.status}`,
        };
      }

      const data = (await res.json()) as DataOneResponse;
      const parsed = parseDataOne(data);

      const facts: SourceResult<DataOneParsed>['normalizedFacts'] = [
        { key: 'make', value: parsed.make, confidence: 100 },
        { key: 'model', value: parsed.model, confidence: 100 },
        { key: 'year', value: parsed.year, confidence: 100 },
        { key: 'body_style', value: parsed.body_style, confidence: 95 },
        { key: 'engine', value: parsed.engine, confidence: 95 },
        { key: 'transmission', value: parsed.transmission, confidence: 95 },
        { key: 'drive_type', value: parsed.drive_type, confidence: 95 },
        { key: 'fuel_type', value: parsed.fuel_type, confidence: 95 },
        { key: 'plant_country', value: parsed.plant_country, confidence: 90 },
        { key: 'msrp_usd', value: parsed.msrp_usd, confidence: 90 },
        { key: 'dataone_trim_count', value: parsed.trim_count, confidence: 100 },
      ];

      return {
        sourceKey: 'usa_private_dataone',
        status: 'success',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        rawData: data,
        parsedData: parsed,
        normalizedFacts: facts,
        costUsd: 0.4,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        sourceKey: 'usa_private_dataone',
        status: isTimeout ? 'timeout' : 'failed',
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
