import type { ScrapeWorker } from '../types';
import { nicbVinCheckWorker } from './nicb';
import { epaCertificationWorker } from './epa';
import { caSmogCheckWorker } from './ca-smog';
import { copartWorker } from './copart';
import { iaaWorker } from './iaa';

/**
 * US federal/state + auction scrapers. Map key MUST match `source_registry.key`.
 */
export const usaWorkers: Record<string, ScrapeWorker<never>> = {
  [nicbVinCheckWorker.key]: nicbVinCheckWorker as ScrapeWorker<never>,
  [epaCertificationWorker.key]: epaCertificationWorker as ScrapeWorker<never>,
  [caSmogCheckWorker.key]: caSmogCheckWorker as ScrapeWorker<never>,
  [copartWorker.key]: copartWorker as ScrapeWorker<never>,
  [iaaWorker.key]: iaaWorker as ScrapeWorker<never>,
};
