import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { satCfdiClient } from '../clients/sat-cfdi';

describe('satCfdiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns not_applicable without cfdi metadata', async () => {
    const r = await satCfdiClient.fetch({ vin: '1HGCM82633A123456' });
    expect(r.status).toBe('not_applicable');
  });

  it('parses vigente status from SAT XML', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        '<s:Envelope><s:Body><Consulta><a:CodigoEstatus>S - Comprobante obtenido</a:CodigoEstatus><a:Estado>Vigente</a:Estado></Consulta></s:Body></s:Envelope>',
    });
    const r = await satCfdiClient.fetch({
      cfdi: {
        uuid: '12345678-1234-1234-1234-123456789012',
        rfcEmisor: 'AAA010101AAA',
        rfcReceptor: 'BBB020202BBB',
        totalAmount: 150000,
      },
    } as never);
    expect(r.status).toBe('success');
    expect(r.parsedData?.status).toBe('vigente');
  });

  it('parses cancelado status', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '<a:Estado>Cancelado</a:Estado>',
    });
    const r = await satCfdiClient.fetch({
      cfdi: {
        uuid: 'x',
        rfcEmisor: 'A',
        rfcReceptor: 'B',
        totalAmount: 100,
      },
    } as never);
    expect(r.parsedData?.status).toBe('cancelado');
  });
});
