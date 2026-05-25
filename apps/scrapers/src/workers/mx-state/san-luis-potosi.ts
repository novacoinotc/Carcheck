import { makeMxStateWorker } from './_shared';

/**
 * San Luis Potosí — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://finanzas.slp.gob.mx
 */
export const sanLuisPotosiWorker = makeMxStateWorker({
  key: 'mx_st_slp_control_vehicular',
  stateCode: 'SLP',
  url: 'https://finanzas.slp.gob.mx',
});
