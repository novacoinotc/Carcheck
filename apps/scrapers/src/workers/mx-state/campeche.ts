import { makeMxStateWorker } from './_shared';

/**
 * Campeche — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://finanzas.campeche.gob.mx
 */
export const campecheWorker = makeMxStateWorker({
  key: 'mx_st_camp_control_vehicular',
  stateCode: 'CAMP',
  url: 'https://finanzas.campeche.gob.mx',
});
