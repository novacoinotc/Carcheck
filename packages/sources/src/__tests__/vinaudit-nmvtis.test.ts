import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vinAuditNmvtisClient } from '../clients/vinaudit-nmvtis';

describe('vinAuditNmvtisClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.VINAUDIT_API_KEY;
  });

  it('skips when API key missing', async () => {
    const result = await vinAuditNmvtisClient.fetch({ vin: '1HGCM82633A123456' });
    expect(result.status).toBe('skipped');
  });

  it('returns not_applicable without VIN', async () => {
    process.env.VINAUDIT_API_KEY = 'k';
    const result = await vinAuditNmvtisClient.fetch({ plate: 'ABC' });
    expect(result.status).toBe('not_applicable');
  });

  it('parses a clean record', async () => {
    process.env.VINAUDIT_API_KEY = 'k';
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        vin: '1HGCM82633A123456',
        titles: [{ state: 'TX', date: '2020-01-01', mileage: 65000 }],
        brands: [],
        jsi: [],
        ths: [],
      }),
    });
    const result = await vinAuditNmvtisClient.fetch({ vin: '1HGCM82633A123456' });
    expect(result.status).toBe('success');
    expect(result.parsedData?.has_salvage).toBe(false);
    expect(result.parsedData?.title_count).toBe(1);
    expect(result.parsedData?.states_titled_in).toContain('TX');
    expect(result.parsedData?.latest_odometer_mi).toBe(65000);
    expect(result.costUsd).toBe(2.49);
  });

  it('flags salvage from brands array', async () => {
    process.env.VINAUDIT_API_KEY = 'k';
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        titles: [{ state: 'FL', date: '2022-06-15' }],
        brands: [{ name: 'salvage', date: '2022-06-15', state: 'FL' }],
        jsi: [{ type: 'salvage', date: '2022-06-15', state: 'FL' }],
      }),
    });
    const result = await vinAuditNmvtisClient.fetch({ vin: '1HGCM82633A123456' });
    expect(result.parsedData?.has_salvage).toBe(true);
    expect(result.parsedData?.title_brands).toContain('salvage');
  });

  it('flags theft from ths records', async () => {
    process.env.VINAUDIT_API_KEY = 'k';
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        titles: [],
        brands: [],
        ths: [{ date: '2021-05-01', state: 'CA', reporting_entity: 'NICB' }],
      }),
    });
    const result = await vinAuditNmvtisClient.fetch({ vin: '1HGCM82633A123456' });
    expect(result.parsedData?.has_theft).toBe(true);
  });
});
