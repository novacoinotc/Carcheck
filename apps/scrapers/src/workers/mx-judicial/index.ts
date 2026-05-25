import type { ScrapeWorker } from '../types';
import { fgjemWorker } from './fgjem';
import { fgjcdmxWorker } from './fgjcdmx';
import { fgeJaliscoWorker } from './jalisco';
import { fgeNlWorker } from './nl';
import { fgePueblaWorker } from './puebla';
import { fgeVeracruzWorker } from './veracruz';

type AnyWorker = ScrapeWorker<never>;

/**
 * State Fiscalía (theft / vehículos robados) scrapers.
 * Top 6 entities by vehicle-theft volume. Keys match source_registry.
 */
export const mxJudicialWorkers: AnyWorker[] = [
  fgjemWorker as AnyWorker,
  fgjcdmxWorker as AnyWorker,
  fgeJaliscoWorker as AnyWorker,
  fgeNlWorker as AnyWorker,
  fgePueblaWorker as AnyWorker,
  fgeVeracruzWorker as AnyWorker,
];
