import type { QueryInput, SourceClient, SourceResult } from '@carcheck/shared-types';

interface VpicRawResult {
  Variable: string;
  VariableId: number;
  Value: string | null;
  ValueId: string | null;
}

interface VpicResponse {
  Count: number;
  Message: string;
  SearchCriteria: string;
  Results: VpicRawResult[];
}

interface VpicParsed {
  make: string | null;
  model: string | null;
  modelYear: number | null;
  trim: string | null;
  bodyClass: string | null;
  vehicleType: string | null;
  manufacturer: string | null;
  plantCountry: string | null;
  plantState: string | null;
  plantCity: string | null;
  engineCylinders: number | null;
  engineDisplacementL: number | null;
  fuelType: string | null;
  transmissionStyle: string | null;
  driveType: string | null;
  gvwr: string | null;
  errorCode: string | null;
  errorText: string | null;
}

function extract(results: VpicRawResult[], variable: string): string | null {
  const found = results.find((r) => r.Variable === variable);
  return found?.Value ?? null;
}

function parseVpicResponse(data: VpicResponse): VpicParsed {
  const results = data.Results;
  const year = extract(results, 'Model Year');
  const cylinders = extract(results, 'Engine Number of Cylinders');
  const displacement = extract(results, 'Displacement (L)');
  return {
    make: extract(results, 'Make'),
    model: extract(results, 'Model'),
    modelYear: year ? Number(year) : null,
    trim: extract(results, 'Trim'),
    bodyClass: extract(results, 'Body Class'),
    vehicleType: extract(results, 'Vehicle Type'),
    manufacturer: extract(results, 'Manufacturer Name'),
    plantCountry: extract(results, 'Plant Country'),
    plantState: extract(results, 'Plant State'),
    plantCity: extract(results, 'Plant City'),
    engineCylinders: cylinders ? Number(cylinders) : null,
    engineDisplacementL: displacement ? Number(displacement) : null,
    fuelType: extract(results, 'Fuel Type - Primary'),
    transmissionStyle: extract(results, 'Transmission Style'),
    driveType: extract(results, 'Drive Type'),
    gvwr: extract(results, 'Gross Vehicle Weight Rating From'),
    errorCode: extract(results, 'Error Code'),
    errorText: extract(results, 'Error Text'),
  };
}

export const nhtsaVpicClient: SourceClient<VpicParsed> = {
  key: 'usa_fed_nhtsa_vpic',
  name: 'NHTSA vPIC',
  async fetch(input: QueryInput): Promise<SourceResult<VpicParsed>> {
    const start = Date.now();
    if (!input.vin) {
      return {
        sourceKey: 'usa_fed_nhtsa_vpic',
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage: 'NHTSA vPIC requires a VIN',
      };
    }

    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(input.vin)}?format=json`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'CarCheck/0.1 (+https://carcheck.mx)' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          sourceKey: 'usa_fed_nhtsa_vpic',
          status: 'failed',
          responseTimeMs: Date.now() - start,
          httpStatus: res.status,
          errorMessage: `NHTSA returned ${res.status}`,
        };
      }

      const data = (await res.json()) as VpicResponse;
      const parsed = parseVpicResponse(data);

      return {
        sourceKey: 'usa_fed_nhtsa_vpic',
        status: parsed.errorCode && parsed.errorCode !== '0' ? 'partial' : 'success',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        rawData: data,
        parsedData: parsed,
        normalizedFacts: [
          { key: 'make', value: parsed.make, confidence: 100 },
          { key: 'model', value: parsed.model, confidence: 100 },
          { key: 'year', value: parsed.modelYear, confidence: 100 },
          { key: 'plant_country', value: parsed.plantCountry, confidence: 100 },
        ],
        costUsd: 0,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        sourceKey: 'usa_fed_nhtsa_vpic',
        status: isTimeout ? 'timeout' : 'failed',
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
