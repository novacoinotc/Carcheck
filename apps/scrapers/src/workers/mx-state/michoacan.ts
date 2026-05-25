import { makeMxStateWorker } from './_shared';

/**
 * Michoacán — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://secfinanzas.michoacan.gob.mx/
 */
export const michoacanWorker = makeMxStateWorker({
  key: 'mx_st_mich_control_vehicular',
  stateCode: 'MICH',
  url: 'https://secfinanzas.michoacan.gob.mx/',
});
