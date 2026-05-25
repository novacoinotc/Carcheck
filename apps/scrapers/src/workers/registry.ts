import type { ScrapeWorker } from './types';
import { repuveWorker } from './mx-fed/repuve';
import { rugWorker } from './mx-fed/rug';
import { anamPedimentWorker } from './mx-fed/anam-pediment';
import { profecoAlertasWorker } from './mx-fed/profeco-alertas';
import { anamRegularizacionWorker } from './mx-fed/anam-regularizacion';
import { amdaWorker } from './mx-fed/amda';
import { mxStateWorkers } from './mx-state/index';
import { oemWorkers } from './oem/index';
import { usaWorkers } from './usa/index';
import { mxJudicialWorkers } from './mx-judicial/index';
import { mxEnvWorkers } from './mx-env/index';
import { marketWorkers } from './market/index';

type AnyWorker = ScrapeWorker<never>;

function byKey(workers: AnyWorker[]): Record<string, AnyWorker> {
  return Object.fromEntries(workers.map((w) => [w.key, w]));
}

/**
 * Registry of every Playwright-based scraping worker. Map key MUST match the
 * `source_registry.key` used by the orchestrator.
 *
 * Phase 3 federal core + Phase 4 expansion: 32 states, OEM recalls, US sources,
 * Fiscalías, verificación ambiental, marketplaces.
 */
export const workerRegistry: Record<string, AnyWorker> = {
  // MX federal
  [repuveWorker.key]: repuveWorker as AnyWorker,
  [rugWorker.key]: rugWorker as AnyWorker,
  [anamPedimentWorker.key]: anamPedimentWorker as AnyWorker,
  [profecoAlertasWorker.key]: profecoAlertasWorker as AnyWorker,
  [anamRegularizacionWorker.key]: anamRegularizacionWorker as AnyWorker,
  [amdaWorker.key]: amdaWorker as AnyWorker,
  // Categories (objects)
  ...mxStateWorkers,
  ...oemWorkers,
  ...usaWorkers,
  // Categories (arrays)
  ...byKey(mxJudicialWorkers),
  ...byKey(mxEnvWorkers),
  ...byKey(marketWorkers),
};
