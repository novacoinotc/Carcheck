import { makeMxStateWorker } from './_shared';

/**
 * Sonora — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://cuentaunica.siiafhacienda.gob.mx/expressvehicular/verificacion
 */
export const sonoraWorker = makeMxStateWorker({
  key: 'mx_st_son_control_vehicular',
  stateCode: 'SON',
  url: 'https://cuentaunica.siiafhacienda.gob.mx/expressvehicular/verificacion',
});
