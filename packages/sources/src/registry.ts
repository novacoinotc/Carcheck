import type { SourceClient } from '@carcheck/shared-types';
import { nhtsaVpicClient } from './clients/nhtsa-vpic';
import { nhtsaRecallsClient } from './clients/nhtsa-recalls';
import { vinAuditNmvtisClient } from './clients/vinaudit-nmvtis';
import { vinAuditMarketClient } from './clients/vinaudit-market';
import { marketCheckHistoryClient } from './clients/marketcheck-history';
import { satCfdiClient } from './clients/sat-cfdi';

type AnyClient = SourceClient<never>;

/**
 * Runtime registry of source clients available in the Vercel-hosted code path.
 * Source clients that run on Railway (Playwright scrapers) are NOT included here —
 * the orchestrator calls those via HTTP to apps/scrapers.
 */
export const clientRegistry: Record<string, AnyClient> = {
  [nhtsaVpicClient.key]: nhtsaVpicClient as AnyClient,
  [nhtsaRecallsClient.key]: nhtsaRecallsClient as AnyClient,
  [vinAuditNmvtisClient.key]: vinAuditNmvtisClient as AnyClient,
  [vinAuditMarketClient.key]: vinAuditMarketClient as AnyClient,
  [marketCheckHistoryClient.key]: marketCheckHistoryClient as AnyClient,
  [satCfdiClient.key]: satCfdiClient as AnyClient,
};

export function getClient(key: string): AnyClient | null {
  return clientRegistry[key] ?? null;
}
