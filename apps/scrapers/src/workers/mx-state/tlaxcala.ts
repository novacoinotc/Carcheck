import { makeMxStateWorker } from './_shared';

/**
 * Tlaxcala — Control Vehicular (refrendo / tenencia / adeudos / multas).
 * Source: https://a-tenenciaonline.sefintlax.gob.mx/TenenciaEnLinea/consultar_tenencia/
 */
export const tlaxcalaWorker = makeMxStateWorker({
  key: 'mx_st_tlax_control_vehicular',
  stateCode: 'TLAX',
  url: 'https://a-tenenciaonline.sefintlax.gob.mx/TenenciaEnLinea/consultar_tenencia/',
});
