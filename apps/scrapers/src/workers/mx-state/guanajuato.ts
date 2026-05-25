import { makeMxStateWorker } from './_shared';

/**
 * Guanajuato — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://refrendo.guanajuato.gob.mx/
 */
export const guanajuatoWorker = makeMxStateWorker({
  key: 'mx_st_gto_control_vehicular',
  stateCode: 'GTO',
  url: 'https://refrendo.guanajuato.gob.mx/',
});
