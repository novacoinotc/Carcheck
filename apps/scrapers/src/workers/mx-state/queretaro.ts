import { makeMxStateWorker } from './_shared';

/**
 * Querétaro — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://finanzas.queretaro.gob.mx
 */
export const queretaroWorker = makeMxStateWorker({
  key: 'mx_st_qro_control_vehicular',
  stateCode: 'QRO',
  url: 'https://finanzas.queretaro.gob.mx',
});
