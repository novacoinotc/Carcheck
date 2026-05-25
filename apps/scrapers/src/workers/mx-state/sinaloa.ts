import { makeMxStateWorker } from './_shared';

/**
 * Sinaloa — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://ase.sinaloa.gob.mx
 */
export const sinaloaWorker = makeMxStateWorker({
  key: 'mx_st_sin_control_vehicular',
  stateCode: 'SIN',
  url: 'https://ase.sinaloa.gob.mx',
});
