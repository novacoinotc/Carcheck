import type { QueryInput, SourceClient, SourceResult } from '@carcheck/shared-types';

interface MarketCheckHistoryListing {
  scraped_at: string;
  scraped_at_iso?: string;
  dealer?: { name?: string; city?: string; state?: string };
  price?: number;
  miles?: number;
  vdp_url?: string;
  source?: string;
}

interface MarketCheckHistoryResponse {
  vin: string;
  history?: MarketCheckHistoryListing[];
  error?: string;
}

export interface MarketCheckHistoryParsed {
  data_available: boolean;
  listing_count: number;
  first_seen: string | null;
  last_seen: string | null;
  states_seen_in: string[];
  cities_seen_in: string[];
  odometer_progression: Array<{ date: string; miles: number; state: string | null }>;
  price_progression: Array<{ date: string; price: number; state: string | null }>;
  rollback_suspected: boolean;
  rollback_details: string | null;
  raw_listings: MarketCheckHistoryListing[];
}

function analyzeRollback(odometer: Array<{ date: string; miles: number }>): {
  suspected: boolean;
  detail: string | null;
} {
  if (odometer.length < 2) return { suspected: false, detail: null };
  const sorted = [...odometer].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    if (cur.miles + 1000 < prev.miles) {
      return {
        suspected: true,
        detail: `Odómetro retrocede entre ${prev.date} (${prev.miles.toLocaleString()} mi) y ${cur.date} (${cur.miles.toLocaleString()} mi)`,
      };
    }
  }
  return { suspected: false, detail: null };
}

export const marketCheckHistoryClient: SourceClient<MarketCheckHistoryParsed> = {
  key: 'usa_private_marketcheck_history',
  name: 'MarketCheck VIN History',
  async fetch(input: QueryInput): Promise<SourceResult<MarketCheckHistoryParsed>> {
    const start = Date.now();
    const apiKey = process.env.MARKETCHECK_API_KEY;

    if (!input.vin) {
      return {
        sourceKey: 'usa_private_marketcheck_history',
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage: 'MarketCheck requires a VIN',
      };
    }

    if (!apiKey) {
      return {
        sourceKey: 'usa_private_marketcheck_history',
        status: 'skipped',
        responseTimeMs: 0,
        errorMessage: 'MARKETCHECK_API_KEY not configured',
      };
    }

    const url = `https://mc-api.marketcheck.com/v2/history/car/${encodeURIComponent(input.vin)}?api_key=${apiKey}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'CarCheck/0.1' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 404) {
        return {
          sourceKey: 'usa_private_marketcheck_history',
          status: 'success',
          responseTimeMs: Date.now() - start,
          httpStatus: 404,
          parsedData: {
            data_available: false,
            listing_count: 0,
            first_seen: null,
            last_seen: null,
            states_seen_in: [],
            cities_seen_in: [],
            odometer_progression: [],
            price_progression: [],
            rollback_suspected: false,
            rollback_details: null,
            raw_listings: [],
          },
          normalizedFacts: [{ key: 'mc_listings_count', value: 0, confidence: 100 }],
          costUsd: 0.25,
        };
      }

      if (!res.ok) {
        return {
          sourceKey: 'usa_private_marketcheck_history',
          status: 'failed',
          responseTimeMs: Date.now() - start,
          httpStatus: res.status,
          errorMessage: `MarketCheck returned ${res.status}`,
        };
      }

      const data = (await res.json()) as MarketCheckHistoryResponse;
      const listings = data.history ?? [];

      const states = new Set<string>();
      const cities = new Set<string>();
      const odometer: Array<{ date: string; miles: number; state: string | null }> = [];
      const prices: Array<{ date: string; price: number; state: string | null }> = [];

      for (const l of listings) {
        if (l.dealer?.state) states.add(l.dealer.state);
        if (l.dealer?.city) cities.add(l.dealer.city);
        const date = l.scraped_at_iso ?? l.scraped_at ?? '';
        const state = l.dealer?.state ?? null;
        if (typeof l.miles === 'number' && date) odometer.push({ date, miles: l.miles, state });
        if (typeof l.price === 'number' && date) prices.push({ date, price: l.price, state });
      }

      const sortedDates = listings
        .map((l) => l.scraped_at_iso ?? l.scraped_at)
        .filter((d): d is string => Boolean(d))
        .sort();

      const rollback = analyzeRollback(odometer);

      const parsed: MarketCheckHistoryParsed = {
        data_available: listings.length > 0,
        listing_count: listings.length,
        first_seen: sortedDates[0] ?? null,
        last_seen: sortedDates[sortedDates.length - 1] ?? null,
        states_seen_in: Array.from(states),
        cities_seen_in: Array.from(cities),
        odometer_progression: odometer,
        price_progression: prices,
        rollback_suspected: rollback.suspected,
        rollback_details: rollback.detail,
        raw_listings: listings,
      };

      return {
        sourceKey: 'usa_private_marketcheck_history',
        status: 'success',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        rawData: data,
        parsedData: parsed,
        normalizedFacts: [
          { key: 'mc_listings_count', value: parsed.listing_count, confidence: 100 },
          { key: 'mc_states_seen', value: parsed.states_seen_in, confidence: 100 },
          { key: 'odometer_rollback_suspected', value: parsed.rollback_suspected, confidence: 90 },
          { key: 'mc_first_listing_date', value: parsed.first_seen, confidence: 100 },
          { key: 'mc_last_listing_date', value: parsed.last_seen, confidence: 100 },
        ],
        costUsd: 0.25,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        sourceKey: 'usa_private_marketcheck_history',
        status: isTimeout ? 'timeout' : 'failed',
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
