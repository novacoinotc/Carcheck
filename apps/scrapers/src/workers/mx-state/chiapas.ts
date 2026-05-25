import { makeMxStateWorker } from './_shared';

/**
 * Chiapas — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://www.ingresos.haciendachiapas.gob.mx/servicios/adeudo-vehic-OE.asp
 */
export const chiapasWorker = makeMxStateWorker({
  key: 'mx_st_chis_control_vehicular',
  stateCode: 'CHIS',
  url: 'https://www.ingresos.haciendachiapas.gob.mx/servicios/adeudo-vehic-OE.asp',
});
