import { makeMxStateWorker } from './_shared';

/**
 * Estado de México — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://sfpya.edomexico.gob.mx/controlv/faces/tramiteselectronicos/cv/portalPublico/ConsultaVigenciaPlaca.xhtml
 */
export const edomexWorker = makeMxStateWorker({
  key: 'mx_st_mex_control_vehicular',
  stateCode: 'MEX',
  url: 'https://sfpya.edomexico.gob.mx/controlv/faces/tramiteselectronicos/cv/portalPublico/ConsultaVigenciaPlaca.xhtml',
});
