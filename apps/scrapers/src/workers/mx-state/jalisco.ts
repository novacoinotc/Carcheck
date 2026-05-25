import { makeMxStateWorker } from './_shared';

/**
 * Jalisco — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://sfp.jalisco.gob.mx/
 */
export const jaliscoWorker = makeMxStateWorker({
  key: 'mx_st_jal_control_vehicular',
  stateCode: 'JAL',
  url: 'https://sfp.jalisco.gob.mx/',
});
