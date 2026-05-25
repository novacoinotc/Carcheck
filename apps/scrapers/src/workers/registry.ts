import type { ScrapeWorker } from './types';
import { repuveWorker } from './mx-fed/repuve';
import { rugWorker } from './mx-fed/rug';
import { anamPedimentWorker } from './mx-fed/anam-pediment';
import { profecoAlertasWorker } from './mx-fed/profeco-alertas';

type AnyWorker = ScrapeWorker<never>;

/**
 * Registry of all Playwright-based scraping workers.
 * Map key MUST match the `source_registry.key` value used by the orchestrator.
 *
 * Phase 3 launches with 4 MX federal scrapers. Phase 4 adds the 32 state portals
 * and additional verticals (OCRA, NICB, Copart, IAA, OEM portals).
 */
export const workerRegistry: Record<string, AnyWorker> = {
  [repuveWorker.key]: repuveWorker as AnyWorker,
  [rugWorker.key]: rugWorker as AnyWorker,
  [anamPedimentWorker.key]: anamPedimentWorker as AnyWorker,
  [profecoAlertasWorker.key]: profecoAlertasWorker as AnyWorker,
};
