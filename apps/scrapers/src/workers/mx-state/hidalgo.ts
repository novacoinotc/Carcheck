import { makeMxStateWorker } from './_shared';

/**
 * Hidalgo — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://finanzas.hidalgo.gob.mx
 */
export const hidalgoWorker = makeMxStateWorker({
  key: 'mx_st_hgo_control_vehicular',
  stateCode: 'HGO',
  url: 'https://finanzas.hidalgo.gob.mx',
});
