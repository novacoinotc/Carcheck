import type { QueryInput, SourceClient, SourceResult } from '@carcheck/shared-types';

interface VinAuditMarketResponse {
  success: boolean;
  vin?: string;
  prices?: {
    average?: number;
    below?: number;
    above?: number;
    certified?: number;
    range_lower?: number;
    range_upper?: number;
  };
  similar?: {
    count: number;
    listings?: Array<{ price: number; mileage?: number; year?: number; dealer?: string }>;
  };
  ymm?: { year: number; make: string; model: string; trim?: string };
  error?: string;
}

export interface VinAuditMarketParsed {
  data_available: boolean;
  avg_price_usd: number | null;
  low_price_usd: number | null;
  high_price_usd: number | null;
  certified_price_usd: number | null;
  comparable_count: number;
  market_summary: string | null;
}

export const vinAuditMarketClient: SourceClient<VinAuditMarketParsed> = {
  key: 'usa_private_vinaudit_market',
  name: 'VinAudit Market Value',
  async fetch(input: QueryInput): Promise<SourceResult<VinAuditMarketParsed>> {
    const start = Date.now();
    const apiKey = process.env.VINAUDIT_API_KEY;

    if (!input.vin) {
      return {
        sourceKey: 'usa_private_vinaudit_market',
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage: 'Market value requires a VIN',
      };
    }

    if (!apiKey) {
      return {
        sourceKey: 'usa_private_vinaudit_market',
        status: 'skipped',
        responseTimeMs: 0,
        errorMessage: 'VINAUDIT_API_KEY not configured',
      };
    }

    const url = `https://api.vinaudit.com/v2/marketvalue.json?key=${apiKey}&format=json&vin=${encodeURIComponent(input.vin)}&id=carcheck`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'CarCheck/0.1' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          sourceKey: 'usa_private_vinaudit_market',
          status: 'failed',
          responseTimeMs: Date.now() - start,
          httpStatus: res.status,
          errorMessage: `VinAudit Market returned ${res.status}`,
        };
      }

      const data = (await res.json()) as VinAuditMarketResponse;
      const parsed: VinAuditMarketParsed = {
        data_available: data.success === true && Boolean(data.prices?.average),
        avg_price_usd: data.prices?.average ?? null,
        low_price_usd: data.prices?.range_lower ?? data.prices?.below ?? null,
        high_price_usd: data.prices?.range_upper ?? data.prices?.above ?? null,
        certified_price_usd: data.prices?.certified ?? null,
        comparable_count: data.similar?.count ?? 0,
        market_summary:
          data.prices?.average && data.ymm
            ? `${data.ymm.year} ${data.ymm.make} ${data.ymm.model} — promedio US ~$${Math.round(data.prices.average).toLocaleString()} USD (${data.similar?.count ?? 0} comparables)`
            : null,
      };

      return {
        sourceKey: 'usa_private_vinaudit_market',
        status: 'success',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        rawData: data,
        parsedData: parsed,
        normalizedFacts: [
          { key: 'avg_price_usd', value: parsed.avg_price_usd, confidence: 80 },
          { key: 'price_range_low_usd', value: parsed.low_price_usd, confidence: 75 },
          { key: 'price_range_high_usd', value: parsed.high_price_usd, confidence: 75 },
          { key: 'us_comparable_count', value: parsed.comparable_count, confidence: 100 },
        ],
        costUsd: 0.15,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        sourceKey: 'usa_private_vinaudit_market',
        status: isTimeout ? 'timeout' : 'failed',
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
