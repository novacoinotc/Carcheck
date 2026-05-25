import { makeMxStateWorker } from './_shared';

/**
 * Baja California — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://tramites.ebajacalifornia.gob.mx/ventanillaunica/tramites/controlvehicular
 */
export const bajaCaliforniaWorker = makeMxStateWorker({
  key: 'mx_st_bc_control_vehicular',
  stateCode: 'BC',
  url: 'https://tramites.ebajacalifornia.gob.mx/ventanillaunica/tramites/controlvehicular',
});
