import { makeMxStateWorker } from './_shared';

/**
 * Ciudad de México — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://data.finanzas.cdmx.gob.mx/consulta_adeudos
 */
export const cdmxWorker = makeMxStateWorker({
  key: 'mx_st_cdmx_control_vehicular',
  stateCode: 'CDMX',
  url: 'https://data.finanzas.cdmx.gob.mx/consulta_adeudos',
});
