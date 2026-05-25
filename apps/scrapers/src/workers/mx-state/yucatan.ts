import { makeMxStateWorker } from './_shared';

/**
 * Yucatán — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://reemplacamiento.yucatan.gob.mx/
 */
export const yucatanWorker = makeMxStateWorker({
  key: 'mx_st_yuc_control_vehicular',
  stateCode: 'YUC',
  url: 'https://reemplacamiento.yucatan.gob.mx/',
});
