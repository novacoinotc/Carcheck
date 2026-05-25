import type { ScrapeWorker } from '../types';
import { mercadolibreWorker } from './mercadolibre';
import { seminuevosWorker } from './seminuevos';
import { kavakWorker } from './kavak';
import { autocosmosWorker } from './autocosmos';

type AnyWorker = ScrapeWorker<never>;

/**
 * MX marketplace scrapers. Search by decoded make/model/year and return
 * comparable listings + price range (MXN). Keys match source_registry.
 */
export const marketWorkers: AnyWorker[] = [
  mercadolibreWorker as AnyWorker,
  seminuevosWorker as AnyWorker,
  kavakWorker as AnyWorker,
  autocosmosWorker as AnyWorker,
];
