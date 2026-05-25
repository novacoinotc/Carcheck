import { makeMxStateWorker } from './_shared';

/**
 * Morelos — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://hacienda.morelos.gob.mx
 */
export const morelosWorker = makeMxStateWorker({
  key: 'mx_st_mor_control_vehicular',
  stateCode: 'MOR',
  url: 'https://hacienda.morelos.gob.mx',
});
