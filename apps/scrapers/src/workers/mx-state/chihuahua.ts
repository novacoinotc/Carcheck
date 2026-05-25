import { makeMxStateWorker } from './_shared';

/**
 * Chihuahua — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://www.chihuahua.gob.mx
 */
export const chihuahuaWorker = makeMxStateWorker({
  key: 'mx_st_chih_control_vehicular',
  stateCode: 'CHIH',
  url: 'https://www.chihuahua.gob.mx',
});
