import { makeMxStateWorker } from './_shared';

/**
 * Tabasco — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://finanzas.tabasco.gob.mx
 */
export const tabascoWorker = makeMxStateWorker({
  key: 'mx_st_tab_control_vehicular',
  stateCode: 'TAB',
  url: 'https://finanzas.tabasco.gob.mx',
});
