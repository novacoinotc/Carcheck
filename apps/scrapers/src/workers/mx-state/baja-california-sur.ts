import { makeMxStateWorker } from './_shared';

/**
 * Baja California Sur — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: http://apps.bcs.gob.mx/pedimento/pedimento.php
 */
export const bajaCaliforniaSurWorker = makeMxStateWorker({
  key: 'mx_st_bcs_control_vehicular',
  stateCode: 'BCS',
  url: 'http://apps.bcs.gob.mx/pedimento/pedimento.php',
});
