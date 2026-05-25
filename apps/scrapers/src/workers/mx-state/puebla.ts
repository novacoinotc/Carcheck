import { makeMxStateWorker } from './_shared';

/**
 * Puebla — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://finanzas.puebla.gob.mx
 */
export const pueblaWorker = makeMxStateWorker({
  key: 'mx_st_pue_control_vehicular',
  stateCode: 'PUE',
  url: 'https://finanzas.puebla.gob.mx',
});
