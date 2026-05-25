import { makeMxStateWorker } from './_shared';

/**
 * Nuevo León — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://www.icvnl.gob.mx/EstadodeCuenta
 */
export const nuevoLeonWorker = makeMxStateWorker({
  key: 'mx_st_nl_control_vehicular',
  stateCode: 'NL',
  url: 'https://www.icvnl.gob.mx/EstadodeCuenta',
});
