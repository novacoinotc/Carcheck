import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nhtsaVpicClient } from '../clients/nhtsa-vpic';

const TESLA_VPIC_RESPONSE = {
  Count: 1,
  Message: 'Results returned successfully',
  SearchCriteria: 'VIN:5YJ3E1EA0KF317432',
  Results: [
    { Variable: 'Make', VariableId: 26, Value: 'TESLA', ValueId: '441' },
    { Variable: 'Model', VariableId: 28, Value: 'Model 3', ValueId: '1685' },
    { Variable: 'Model Year', VariableId: 29, Value: '2019', ValueId: null },
    { Variable: 'Body Class', VariableId: 5, Value: 'Sedan/Saloon', ValueId: '4' },
    { Variable: 'Plant Country', VariableId: 75, Value: 'UNITED STATES (USA)', ValueId: '6' },
    { Variable: 'Plant State', VariableId: 77, Value: 'CALIFORNIA', ValueId: null },
    { Variable: 'Plant City', VariableId: 31, Value: 'FREMONT', ValueId: null },
    { Variable: 'Fuel Type - Primary', VariableId: 24, Value: 'Electric', ValueId: '5' },
    { Variable: 'Manufacturer Name', VariableId: 27, Value: 'TESLA, INC.', ValueId: '955' },
    { Variable: 'Error Code', VariableId: 143, Value: '0', ValueId: null },
    { Variable: 'Error Text', VariableId: 156, Value: '', ValueId: null },
  ],
};

describe('nhtsaVpicClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns not_applicable when no vin is provided', async () => {
    const result = await nhtsaVpicClient.fetch({ plate: 'ABC123' });
    expect(result.status).toBe('not_applicable');
    expect(result.sourceKey).toBe('usa_fed_nhtsa_vpic');
  });

  it('parses a successful Tesla response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => TESLA_VPIC_RESPONSE,
    });
    const result = await nhtsaVpicClient.fetch({ vin: '5YJ3E1EA0KF317432' });
    expect(result.status).toBe('success');
    expect(result.parsedData?.make).toBe('TESLA');
    expect(result.parsedData?.model).toBe('Model 3');
    expect(result.parsedData?.modelYear).toBe(2019);
    expect(result.parsedData?.plantCountry).toBe('UNITED STATES (USA)');
    expect(result.parsedData?.fuelType).toBe('Electric');
    expect(result.costUsd).toBe(0);
  });

  it('handles HTTP errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    const result = await nhtsaVpicClient.fetch({ vin: '5YJ3E1EA0KF317432' });
    expect(result.status).toBe('failed');
    expect(result.httpStatus).toBe(503);
  });

  it('marks partial when NHTSA returns an error code', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ...TESLA_VPIC_RESPONSE,
        Results: TESLA_VPIC_RESPONSE.Results.map((r) =>
          r.Variable === 'Error Code' ? { ...r, Value: '1' } : r,
        ),
      }),
    });
    const result = await nhtsaVpicClient.fetch({ vin: '5YJ3E1EA0KF317432' });
    expect(result.status).toBe('partial');
  });
});
