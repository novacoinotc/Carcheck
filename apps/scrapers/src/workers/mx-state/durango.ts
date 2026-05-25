import { makeMxStateWorker } from './_shared';

/**
 * Durango — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://durango.gob.mx
 */
export const durangoWorker = makeMxStateWorker({
  key: 'mx_st_dgo_control_vehicular',
  stateCode: 'DGO',
  url: 'https://durango.gob.mx',
});
