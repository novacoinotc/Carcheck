import { makeMxStateWorker } from './_shared';

/**
 * Zacatecas — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://finanzas.zacatecas.gob.mx
 */
export const zacatecasWorker = makeMxStateWorker({
  key: 'mx_st_zac_control_vehicular',
  stateCode: 'ZAC',
  url: 'https://finanzas.zacatecas.gob.mx',
});
