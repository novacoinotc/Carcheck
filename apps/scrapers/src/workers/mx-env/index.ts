import type { ScrapeWorker } from '../types';
import { cdmxVerificentrosWorker } from './cdmx';
import { edomexVerificacionWorker } from './edomex';
import { dobleCeroWorker } from './doble-cero';
import { jaliscoVerificacionWorker } from './jalisco';

type AnyWorker = ScrapeWorker<never>;

/**
 * Verificación ambiental (emissions) scrapers.
 * Keys match source_registry. CDMX yields the richest per-vehicle signal
 * (odometer history + holograma).
 */
export const mxEnvWorkers: AnyWorker[] = [
  cdmxVerificentrosWorker as AnyWorker,
  edomexVerificacionWorker as AnyWorker,
  dobleCeroWorker as AnyWorker,
  jaliscoVerificacionWorker as AnyWorker,
];
