import { makeMxStateWorker } from './_shared';

/**
 * Aguascalientes — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://eservicios2.aguascalientes.gob.mx/
 */
export const aguascalientesWorker = makeMxStateWorker({
  key: 'mx_st_ags_control_vehicular',
  stateCode: 'AGS',
  url: 'https://eservicios2.aguascalientes.gob.mx/',
});
