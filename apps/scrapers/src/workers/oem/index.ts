import type { ScrapeWorker } from '../types';
import { toyotaRecallWorker } from './toyota';
import { gmRecallWorker } from './gm';
import { fordRecallWorker } from './ford';
import { hondaRecallWorker } from './honda';
import { nissanRecallWorker } from './nissan';
import { vwRecallWorker } from './vw';
import { bmwRecallWorker } from './bmw';
import { mercedesRecallWorker } from './mercedes';
import { stellantisRecallWorker } from './stellantis';

/**
 * OEM recall portal scrapers. Each takes a VIN and returns the count of open
 * recalls plus their titles via the `oem_open_recalls` / `oem_recall_titles`
 * normalized facts. Map key MUST match `source_registry.key`.
 */
export const oemWorkers: Record<string, ScrapeWorker<never>> = {
  [toyotaRecallWorker.key]: toyotaRecallWorker as ScrapeWorker<never>,
  [gmRecallWorker.key]: gmRecallWorker as ScrapeWorker<never>,
  [fordRecallWorker.key]: fordRecallWorker as ScrapeWorker<never>,
  [hondaRecallWorker.key]: hondaRecallWorker as ScrapeWorker<never>,
  [nissanRecallWorker.key]: nissanRecallWorker as ScrapeWorker<never>,
  [vwRecallWorker.key]: vwRecallWorker as ScrapeWorker<never>,
  [bmwRecallWorker.key]: bmwRecallWorker as ScrapeWorker<never>,
  [mercedesRecallWorker.key]: mercedesRecallWorker as ScrapeWorker<never>,
  [stellantisRecallWorker.key]: stellantisRecallWorker as ScrapeWorker<never>,
};
