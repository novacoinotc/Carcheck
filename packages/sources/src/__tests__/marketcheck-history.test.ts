import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { marketCheckHistoryClient } from '../clients/marketcheck-history';

describe('marketCheckHistoryClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.MARKETCHECK_API_KEY;
  });

  it('skips without API key', async () => {
    const r = await marketCheckHistoryClient.fetch({ vin: '1HGCM82633A123456' });
    expect(r.status).toBe('skipped');
  });

  it('treats 404 as success with empty history', async () => {
    process.env.MARKETCHECK_API_KEY = 'k';
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    });
    const r = await marketCheckHistoryClient.fetch({ vin: '1HGCM82633A123456' });
    expect(r.status).toBe('success');
    expect(r.parsedData?.listing_count).toBe(0);
  });

  it('parses listing history and detects rollback', async () => {
    process.env.MARKETCHECK_API_KEY = 'k';
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        vin: '1HGCM82633A123456',
        history: [
          {
            scraped_at_iso: '2022-01-15T00:00:00Z',
            dealer: { name: 'X', city: 'Austin', state: 'TX' },
            price: 12000,
            miles: 120_000,
          },
          {
            scraped_at_iso: '2023-06-01T00:00:00Z',
            dealer: { name: 'Y', city: 'Houston', state: 'TX' },
            price: 13500,
            miles: 95_000,
          },
        ],
      }),
    });
    const r = await marketCheckHistoryClient.fetch({ vin: '1HGCM82633A123456' });
    expect(r.status).toBe('success');
    expect(r.parsedData?.listing_count).toBe(2);
    expect(r.parsedData?.rollback_suspected).toBe(true);
    expect(r.parsedData?.states_seen_in).toContain('TX');
  });

  it('does not flag rollback when odometer increases monotonically', async () => {
    process.env.MARKETCHECK_API_KEY = 'k';
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        history: [
          { scraped_at_iso: '2022-01-15T00:00:00Z', dealer: { state: 'TX' }, miles: 50_000 },
          { scraped_at_iso: '2023-06-01T00:00:00Z', dealer: { state: 'TX' }, miles: 75_000 },
        ],
      }),
    });
    const r = await marketCheckHistoryClient.fetch({ vin: '1HGCM82633A123456' });
    expect(r.parsedData?.rollback_suspected).toBe(false);
  });
});
