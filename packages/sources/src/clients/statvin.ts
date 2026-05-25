import type { QueryInput, SourceClient, SourceResult } from '@carcheck/shared-types';

interface StatVinLot {
  source?: 'copart' | 'iaai' | string;
  lot_number?: string;
  sale_date?: string;
  sale_status?: string;
  price?: number;
  odometer?: number;
  primary_damage?: string;
  secondary_damage?: string;
  title?: string;
  location?: string;
  images?: string[];
}

interface StatVinResponse {
  vin?: string;
  lots?: StatVinLot[];
  data?: { lots?: StatVinLot[] };
  error?: string;
  message?: string;
}

export interface StatVinParsed {
  data_available: boolean;
  lot_count: number;
  copart_count: number;
  iaai_count: number;
  highest_sale_price: number | null;
  latest_sale_price: number | null;
  latest_sale_date: string | null;
  damage_types: string[];
  title_types: string[];
  has_salvage: boolean;
  total_image_count: number;
  raw_lots: StatVinLot[];
}

function parseStatVin(data: StatVinResponse): StatVinParsed {
  const lots = data.lots ?? data.data?.lots ?? [];
  const sorted = [...lots].sort((a, b) => (a.sale_date ?? '').localeCompare(b.sale_date ?? ''));
  const damages = new Set<string>();
  const titles = new Set<string>();
  let copart = 0;
  let iaai = 0;
  let highest: number | null = null;
  let images = 0;

  for (const lot of lots) {
    if (lot.source === 'copart') copart++;
    if (lot.source === 'iaai') iaai++;
    if (lot.primary_damage) damages.add(lot.primary_damage);
    if (lot.secondary_damage) damages.add(lot.secondary_damage);
    if (lot.title) titles.add(lot.title);
    if (typeof lot.price === 'number' && (highest === null || lot.price > highest)) highest = lot.price;
    images += lot.images?.length ?? 0;
  }

  const latest = sorted[sorted.length - 1];

  return {
    data_available: lots.length > 0,
    lot_count: lots.length,
    copart_count: copart,
    iaai_count: iaai,
    highest_sale_price: highest,
    latest_sale_price: typeof latest?.price === 'number' ? latest.price : null,
    latest_sale_date: latest?.sale_date ?? null,
    damage_types: Array.from(damages),
    title_types: Array.from(titles),
    has_salvage: Array.from(titles).some((t) => /salvage|junk|cert of destruction/i.test(t)),
    total_image_count: images,
    raw_lots: lots,
  };
}

export const statVinClient: SourceClient<StatVinParsed> = {
  key: 'auction_statvin',
  name: 'Stat.vin (Copart+IAAI aggregator)',
  async fetch(input: QueryInput): Promise<SourceResult<StatVinParsed>> {
    const start = Date.now();
    const apiKey = process.env.STATVIN_API_KEY;

    if (!input.vin) {
      return {
        sourceKey: 'auction_statvin',
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage: 'Stat.vin requires a VIN',
      };
    }

    if (!apiKey) {
      return {
        sourceKey: 'auction_statvin',
        status: 'skipped',
        responseTimeMs: 0,
        errorMessage: 'STATVIN_API_KEY not configured',
      };
    }

    const url = `https://stat.vin/api/v1/vehicles/${encodeURIComponent(input.vin)}?key=${apiKey}`;

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

      if (res.status === 404) {
        return {
          sourceKey: 'auction_statvin',
          status: 'success',
          responseTimeMs: Date.now() - start,
          httpStatus: 404,
          parsedData: {
            data_available: false,
            lot_count: 0,
            copart_count: 0,
            iaai_count: 0,
            highest_sale_price: null,
            latest_sale_price: null,
            latest_sale_date: null,
            damage_types: [],
            title_types: [],
            has_salvage: false,
            total_image_count: 0,
            raw_lots: [],
          },
          normalizedFacts: [{ key: 'statvin_lot_count', value: 0, confidence: 100 }],
          costUsd: 1.0,
        };
      }

      if (!res.ok) {
        return {
          sourceKey: 'auction_statvin',
          status: 'failed',
          responseTimeMs: Date.now() - start,
          httpStatus: res.status,
          errorMessage: `Stat.vin returned ${res.status}`,
        };
      }

      const data = (await res.json()) as StatVinResponse;
      const parsed = parseStatVin(data);

      const facts: SourceResult<StatVinParsed>['normalizedFacts'] = [
        { key: 'statvin_lot_count', value: parsed.lot_count, confidence: 100 },
        { key: 'copart_lot_count', value: parsed.copart_count, confidence: 100 },
        { key: 'iaai_lot_count', value: parsed.iaai_count, confidence: 100 },
        { key: 'auction_price', value: parsed.highest_sale_price, confidence: 95 },
        { key: 'latest_auction_date', value: parsed.latest_sale_date, confidence: 95 },
        { key: 'auction_damage_types', value: parsed.damage_types, confidence: 95 },
        { key: 'has_salvage', value: parsed.has_salvage, confidence: 95 },
        { key: 'auction_image_count', value: parsed.total_image_count, confidence: 100 },
      ];

      return {
        sourceKey: 'auction_statvin',
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
        sourceKey: 'auction_statvin',
        status: isTimeout ? 'timeout' : 'failed',
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
