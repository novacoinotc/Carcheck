import type { ScrapeWorker } from '../types';
import { aguascalientesWorker } from './aguascalientes';
import { bajaCaliforniaWorker } from './baja-california';
import { bajaCaliforniaSurWorker } from './baja-california-sur';
import { campecheWorker } from './campeche';
import { chiapasWorker } from './chiapas';
import { chihuahuaWorker } from './chihuahua';
import { coahuilaWorker } from './coahuila';
import { colimaWorker } from './colima';
import { cdmxWorker } from './cdmx';
import { durangoWorker } from './durango';
import { edomexWorker } from './edomex';
import { guanajuatoWorker } from './guanajuato';
import { guerreroWorker } from './guerrero';
import { hidalgoWorker } from './hidalgo';
import { jaliscoWorker } from './jalisco';
import { michoacanWorker } from './michoacan';
import { morelosWorker } from './morelos';
import { nayaritWorker } from './nayarit';
import { nuevoLeonWorker } from './nuevo-leon';
import { oaxacaWorker } from './oaxaca';
import { pueblaWorker } from './puebla';
import { queretaroWorker } from './queretaro';
import { quintanaRooWorker } from './quintana-roo';
import { sanLuisPotosiWorker } from './san-luis-potosi';
import { sinaloaWorker } from './sinaloa';
import { sonoraWorker } from './sonora';
import { tabascoWorker } from './tabasco';
import { tamaulipasWorker } from './tamaulipas';
import { tlaxcalaWorker } from './tlaxcala';
import { veracruzWorker } from './veracruz';
import { yucatanWorker } from './yucatan';
import { zacatecasWorker } from './zacatecas';

/**
 * Registry of all 32 Mexican state "control vehicular" scrape workers, keyed by
 * `mx_st_<code>_control_vehicular`. Consumed by the main worker registry.
 */
export const mxStateWorkers: Record<string, ScrapeWorker<never>> = {
  [aguascalientesWorker.key]: aguascalientesWorker as ScrapeWorker<never>,
  [bajaCaliforniaWorker.key]: bajaCaliforniaWorker as ScrapeWorker<never>,
  [bajaCaliforniaSurWorker.key]: bajaCaliforniaSurWorker as ScrapeWorker<never>,
  [campecheWorker.key]: campecheWorker as ScrapeWorker<never>,
  [chiapasWorker.key]: chiapasWorker as ScrapeWorker<never>,
  [chihuahuaWorker.key]: chihuahuaWorker as ScrapeWorker<never>,
  [coahuilaWorker.key]: coahuilaWorker as ScrapeWorker<never>,
  [colimaWorker.key]: colimaWorker as ScrapeWorker<never>,
  [cdmxWorker.key]: cdmxWorker as ScrapeWorker<never>,
  [durangoWorker.key]: durangoWorker as ScrapeWorker<never>,
  [edomexWorker.key]: edomexWorker as ScrapeWorker<never>,
  [guanajuatoWorker.key]: guanajuatoWorker as ScrapeWorker<never>,
  [guerreroWorker.key]: guerreroWorker as ScrapeWorker<never>,
  [hidalgoWorker.key]: hidalgoWorker as ScrapeWorker<never>,
  [jaliscoWorker.key]: jaliscoWorker as ScrapeWorker<never>,
  [michoacanWorker.key]: michoacanWorker as ScrapeWorker<never>,
  [morelosWorker.key]: morelosWorker as ScrapeWorker<never>,
  [nayaritWorker.key]: nayaritWorker as ScrapeWorker<never>,
  [nuevoLeonWorker.key]: nuevoLeonWorker as ScrapeWorker<never>,
  [oaxacaWorker.key]: oaxacaWorker as ScrapeWorker<never>,
  [pueblaWorker.key]: pueblaWorker as ScrapeWorker<never>,
  [queretaroWorker.key]: queretaroWorker as ScrapeWorker<never>,
  [quintanaRooWorker.key]: quintanaRooWorker as ScrapeWorker<never>,
  [sanLuisPotosiWorker.key]: sanLuisPotosiWorker as ScrapeWorker<never>,
  [sinaloaWorker.key]: sinaloaWorker as ScrapeWorker<never>,
  [sonoraWorker.key]: sonoraWorker as ScrapeWorker<never>,
  [tabascoWorker.key]: tabascoWorker as ScrapeWorker<never>,
  [tamaulipasWorker.key]: tamaulipasWorker as ScrapeWorker<never>,
  [tlaxcalaWorker.key]: tlaxcalaWorker as ScrapeWorker<never>,
  [veracruzWorker.key]: veracruzWorker as ScrapeWorker<never>,
  [yucatanWorker.key]: yucatanWorker as ScrapeWorker<never>,
  [zacatecasWorker.key]: zacatecasWorker as ScrapeWorker<never>,
};
