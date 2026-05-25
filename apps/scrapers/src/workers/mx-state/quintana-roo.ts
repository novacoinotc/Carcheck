import { makeMxStateWorker } from './_shared';

/**
 * Quintana Roo — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://satq.qroo.gob.mx/controlvehicular/
 */
export const quintanaRooWorker = makeMxStateWorker({
  key: 'mx_st_qroo_control_vehicular',
  stateCode: 'QROO',
  url: 'https://satq.qroo.gob.mx/controlvehicular/',
});
