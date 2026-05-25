import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nhtsaRecallsClient } from '../clients/nhtsa-recalls';

describe('nhtsaRecallsClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns not_applicable without a vin', async () => {
    const result = await nhtsaRecallsClient.fetch({ plate: 'ABC123' });
    expect(result.status).toBe('not_applicable');
  });

  it('treats NHTSA 400 (unknown VIN) as success with empty recalls', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({}),
    });
    const result = await nhtsaRecallsClient.fetch({ vin: '5YJ3E1EA0KF317432' });
    expect(result.status).toBe('success');
    expect(result.parsedData?.openRecallCount).toBe(0);
    expect(result.normalizedFacts).toContainEqual({
      key: 'vin_not_in_nhtsa',
      value: true,
      confidence: 100,
    });
  });

  it('parses recalls when present', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        Count: 1,
        Message: 'OK',
        results: [
          {
            Manufacturer: 'HONDA',
            NHTSACampaignNumber: '20V-432',
            ReportReceivedDate: '2020-07-15',
            Component: 'AIR BAGS',
            Summary: 'Takata airbag inflator may rupture',
            Consequence: 'Injury or death',
            Remedy: 'Replace inflator at no cost',
            Notes: '',
            ModelYear: '2003',
            Make: 'HONDA',
            Model: 'ACCORD',
            ParkIt: false,
            ParkOutSide: false,
          },
        ],
      }),
    });
    const result = await nhtsaRecallsClient.fetch({ vin: '1HGCM82633A123456' });
    expect(result.status).toBe('success');
    expect(result.parsedData?.openRecallCount).toBe(1);
    expect(result.parsedData?.recalls[0]?.campaignNumber).toBe('20V-432');
  });

  it('flags park-it recalls', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        Count: 1,
        Message: 'OK',
        results: [
          {
            Manufacturer: 'X',
            NHTSACampaignNumber: '24V-001',
            ReportReceivedDate: '2024-01-01',
            Component: 'FUEL SYSTEM',
            Summary: '',
            Consequence: 'Fire',
            Remedy: 'Replace pump',
            Notes: '',
            ModelYear: '2020',
            Make: 'X',
            Model: 'Y',
            ParkIt: true,
            ParkOutSide: false,
          },
        ],
      }),
    });
    const result = await nhtsaRecallsClient.fetch({ vin: 'TESTVIN0000000000' });
    expect(result.parsedData?.parkItRecalls).toBe(1);
  });

  it('handles non-400 HTTP errors as failed', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    const result = await nhtsaRecallsClient.fetch({ vin: '1HGCM82633A123456' });
    expect(result.status).toBe('failed');
    expect(result.httpStatus).toBe(503);
  });
});
