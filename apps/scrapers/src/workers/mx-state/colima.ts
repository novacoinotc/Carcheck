import { makeMxStateWorker } from './_shared';

/**
 * Colima — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://secfinanzas.col.gob.mx
 */
export const colimaWorker = makeMxStateWorker({
  key: 'mx_st_col_control_vehicular',
  stateCode: 'COL',
  url: 'https://secfinanzas.col.gob.mx',
});
