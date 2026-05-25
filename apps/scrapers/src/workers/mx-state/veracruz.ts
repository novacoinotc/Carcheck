import { makeMxStateWorker } from './_shared';

/**
 * Veracruz — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://www.haciendaveracruz.gob.mx
 */
export const veracruzWorker = makeMxStateWorker({
  key: 'mx_st_ver_control_vehicular',
  stateCode: 'VER',
  url: 'https://www.haciendaveracruz.gob.mx',
});
