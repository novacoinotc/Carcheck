import { makeMxStateWorker } from './_shared';

/**
 * Nayarit — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://hacienda.nayarit.gob.mx
 */
export const nayaritWorker = makeMxStateWorker({
  key: 'mx_st_nay_control_vehicular',
  stateCode: 'NAY',
  url: 'https://hacienda.nayarit.gob.mx',
});
