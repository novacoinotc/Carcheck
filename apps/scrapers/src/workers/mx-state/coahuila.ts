import { makeMxStateWorker } from './_shared';

/**
 * Coahuila — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://www.pagafacil.gob.mx/
 */
export const coahuilaWorker = makeMxStateWorker({
  key: 'mx_st_coah_control_vehicular',
  stateCode: 'COAH',
  url: 'https://www.pagafacil.gob.mx/',
});
