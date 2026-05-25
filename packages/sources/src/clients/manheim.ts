import type { QueryInput, SourceClient, SourceResult } from '@carcheck/shared-types';

interface ManheimMmrResponse {
  vin?: string;
  conditionGrade?: number;
  averageGrade?: number;
  wholesale?: {
    above?: number;
    average?: number;
    below?: number;
    currency?: string;
  };
  adjustedPricing?: {
    wholesale?: { above?: number; average?: number; below?: number };
    adjustedMMR?: number;
  };
  retail?: {
    average?: number;
  };
  count?: number;
  odometer?: { average?: number };
  error?: string;
  message?: string;
}

interface ManheimTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

export interface ManheimParsed {
  data_available: boolean;
  wholesale_average_usd: number | null;
  wholesale_above_usd: number | null;
  wholesale_below_usd: number | null;
  adjusted_mmr_usd: number | null;
  retail_average_usd: number | null;
  condition_grade: number | null;
  comparable_count: number | null;
  average_odometer_mi: number | null;
}

function parseManheim(data: ManheimMmrResponse): ManheimParsed {
  const ws = data.wholesale ?? {};
  return {
    data_available: Boolean(ws.average || data.adjustedPricing?.adjustedMMR || data.retail?.average),
    wholesale_average_usd: typeof ws.average === 'number' ? ws.average : null,
    wholesale_above_usd: typeof ws.above === 'number' ? ws.above : null,
    wholesale_below_usd: typeof ws.below === 'number' ? ws.below : null,
    adjusted_mmr_usd:
      typeof data.adjustedPricing?.adjustedMMR === 'number' ? data.adjustedPricing.adjustedMMR : null,
    retail_average_usd: typeof data.retail?.average === 'number' ? data.retail.average : null,
    condition_grade:
      typeof data.conditionGrade === 'number'
        ? data.conditionGrade
        : typeof data.averageGrade === 'number'
          ? data.averageGrade
          : null,
    comparable_count: typeof data.count === 'number' ? data.count : null,
    average_odometer_mi: typeof data.odometer?.average === 'number' ? data.odometer.average : null,
  };
}

export const manheimClient: SourceClient<ManheimParsed> = {
  key: 'auction_manheim',
  name: 'Manheim Market Report',
  async fetch(input: QueryInput): Promise<SourceResult<ManheimParsed>> {
    const start = Date.now();
    const apiKey = process.env.MANHEIM_API_KEY;
    const apiSecret = process.env.MANHEIM_API_SECRET;

    if (!input.vin) {
      return {
        sourceKey: 'auction_manheim',
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage: 'Manheim requires a VIN',
      };
    }

    if (!apiKey) {
      return {
        sourceKey: 'auction_manheim',
        status: 'skipped',
        responseTimeMs: 0,
        errorMessage: 'MANHEIM_API_KEY not configured',
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      // Manheim uses OAuth2 client_credentials when a secret is supplied;
      // otherwise the key is passed directly as a query param.
      let authHeader: Record<string, string> = {};
      let mmrUrl = `https://api.manheim.com/valuations/vin/${encodeURIComponent(input.vin)}?api_key=${apiKey}`;

      if (apiSecret) {
        const tokenRes = await fetch('https://api.manheim.com/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            'User-Agent': 'CarCheck/0.1',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: apiKey,
            client_secret: apiSecret,
          }).toString(),
          signal: controller.signal,
        });

        if (!tokenRes.ok) {
          clearTimeout(timeout);
          return {
            sourceKey: 'auction_manheim',
            status: 'failed',
            responseTimeMs: Date.now() - start,
            httpStatus: tokenRes.status,
            errorMessage: `Manheim OAuth returned ${tokenRes.status}`,
          };
        }

        const token = (await tokenRes.json()) as ManheimTokenResponse;
        if (!token.access_token) {
          clearTimeout(timeout);
          return {
            sourceKey: 'auction_manheim',
            status: 'failed',
            responseTimeMs: Date.now() - start,
            errorMessage: 'Manheim OAuth returned no access_token',
          };
        }
        authHeader = { Authorization: `Bearer ${token.access_token}` };
        mmrUrl = `https://api.manheim.com/valuations/vin/${encodeURIComponent(input.vin)}`;
      }

      const res = await fetch(mmrUrl, {
        headers: { Accept: 'application/json', 'User-Agent': 'CarCheck/0.1', ...authHeader },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          sourceKey: 'auction_manheim',
          status: 'failed',
          responseTimeMs: Date.now() - start,
          httpStatus: res.status,
          errorMessage: `Manheim returned ${res.status}`,
        };
      }

      const data = (await res.json()) as ManheimMmrResponse;
      const parsed = parseManheim(data);

      const facts: SourceResult<ManheimParsed>['normalizedFacts'] = [
        { key: 'auction_price', value: parsed.wholesale_average_usd, confidence: 95 },
        { key: 'wholesale_mmr_usd', value: parsed.wholesale_average_usd, confidence: 95 },
        { key: 'adjusted_mmr_usd', value: parsed.adjusted_mmr_usd, confidence: 90 },
        { key: 'retail_value_usd', value: parsed.retail_average_usd, confidence: 85 },
        { key: 'condition_grade', value: parsed.condition_grade, confidence: 85 },
        { key: 'manheim_comparable_count', value: parsed.comparable_count, confidence: 90 },
        { key: 'average_odometer_mi', value: parsed.average_odometer_mi, confidence: 85 },
      ];

      return {
        sourceKey: 'auction_manheim',
        status: 'success',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        rawData: data,
        parsedData: parsed,
        normalizedFacts: facts,
        costUsd: 1.0,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        sourceKey: 'auction_manheim',
        status: isTimeout ? 'timeout' : 'failed',
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
