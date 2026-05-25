import { makeMxStateWorker } from './_shared';

/**
 * Tamaulipas — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://sat.tamaulipas.gob.mx
 */
export const tamaulipasWorker = makeMxStateWorker({
  key: 'mx_st_tamps_control_vehicular',
  stateCode: 'TAMPS',
  url: 'https://sat.tamaulipas.gob.mx',
});
