import { makeMxStateWorker } from './_shared';

/**
 * Guerrero — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://finanzas.guerrero.gob.mx
 */
export const guerreroWorker = makeMxStateWorker({
  key: 'mx_st_gro_control_vehicular',
  stateCode: 'GRO',
  url: 'https://finanzas.guerrero.gob.mx',
});
