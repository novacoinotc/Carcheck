import { makeMxStateWorker } from './_shared';

/**
 * Oaxaca — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://www.finanzasoaxaca.gob.mx/
 */
export const oaxacaWorker = makeMxStateWorker({
  key: 'mx_st_oax_control_vehicular',
  stateCode: 'OAX',
  url: 'https://www.finanzasoaxaca.gob.mx/',
});
