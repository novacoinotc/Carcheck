import type { QueryInput, SourceClient, SourceResult } from '@carcheck/shared-types';

export interface SatCfdiInput {
  uuid: string;
  rfcEmisor: string;
  rfcReceptor: string;
  totalAmount: number;
}

export interface SatCfdiParsed {
  uuid: string;
  status: 'vigente' | 'cancelado' | 'no_encontrado' | 'unknown';
  emisor_rfc: string;
  receptor_rfc: string;
  total: number;
  validated_at: string;
}

/**
 * SAT CFDI validator. Only meaningful when the orchestrator passes invoice metadata
 * (UUID + RFC issuer + RFC receiver + total) via the query input.
 *
 * In a VIN-only query this is not_applicable. Phase 5+ will surface a "agrega tu factura
 * de compra" step in the UI that pipes its values into the orchestrator extras.
 */
export const satCfdiClient: SourceClient<SatCfdiParsed> = {
  key: 'mx_fed_sat_cfdi',
  name: 'SAT CFDI Validator',
  async fetch(input: QueryInput): Promise<SourceResult<SatCfdiParsed>> {
    const extras = (input as { cfdi?: SatCfdiInput }).cfdi;
    if (!extras) {
      return {
        sourceKey: 'mx_fed_sat_cfdi',
        status: 'not_applicable',
        responseTimeMs: 0,
        errorMessage:
          'CFDI validation requires UUID + RFCs + total (provide via cfdi field in query)',
      };
    }
    const start = Date.now();

    const params = new URLSearchParams({
      re: extras.rfcEmisor,
      rr: extras.rfcReceptor,
      tt: extras.totalAmount.toFixed(2),
      id: extras.uuid,
    });
    const url = `https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc/Consulta?${params}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(url, {
        headers: { Accept: 'application/xml,text/xml', 'User-Agent': 'CarCheck/0.1' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          sourceKey: 'mx_fed_sat_cfdi',
          status: 'failed',
          responseTimeMs: Date.now() - start,
          httpStatus: res.status,
          errorMessage: `SAT returned ${res.status}`,
        };
      }

      const xml = await res.text();
      const estado = /<a:Estado>([^<]+)<\/a:Estado>/.exec(xml)?.[1]?.toLowerCase() ?? 'unknown';
      const status: SatCfdiParsed['status'] = estado.includes('vigente')
        ? 'vigente'
        : estado.includes('cancel')
          ? 'cancelado'
          : estado.includes('no encontrad') || estado.includes('not found')
            ? 'no_encontrado'
            : 'unknown';

      const parsed: SatCfdiParsed = {
        uuid: extras.uuid,
        status,
        emisor_rfc: extras.rfcEmisor,
        receptor_rfc: extras.rfcReceptor,
        total: extras.totalAmount,
        validated_at: new Date().toISOString(),
      };

      return {
        sourceKey: 'mx_fed_sat_cfdi',
        status: 'success',
        responseTimeMs: Date.now() - start,
        httpStatus: res.status,
        rawData: { xml },
        parsedData: parsed,
        normalizedFacts: [
          { key: 'cfdi_status', value: parsed.status, confidence: 100 },
          { key: 'cfdi_uuid', value: parsed.uuid, confidence: 100 },
        ],
        costUsd: 0,
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return {
        sourceKey: 'mx_fed_sat_cfdi',
        status: isTimeout ? 'timeout' : 'failed',
        responseTimeMs: Date.now() - start,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
