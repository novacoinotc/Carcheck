import type { SourceClient } from '@carcheck/shared-types';
import { nhtsaVpicClient } from './clients/nhtsa-vpic';
import { nhtsaRecallsClient } from './clients/nhtsa-recalls';
import { vinAuditNmvtisClient } from './clients/vinaudit-nmvtis';
import { vinAuditMarketClient } from './clients/vinaudit-market';
import { marketCheckHistoryClient } from './clients/marketcheck-history';
import { satCfdiClient } from './clients/sat-cfdi';
import { autoCheckClient } from './clients/autocheck';
import { bumperClient } from './clients/bumper';
import { carsXeClient } from './clients/carsxe';
import { clearVinClient } from './clients/clearvin';
import { dataOneClient } from './clients/dataone';
import { epicVinClient } from './clients/epicvin';
import { manheimClient } from './clients/manheim';
import { statVinClient } from './clients/statvin';

type AnyClient = SourceClient<never>;

/**
 * Runtime registry of Vercel-hosted source clients (HTTP/API calls).
 * Railway-hosted Playwright scrapers are NOT here — the orchestrator calls those
 * via HTTP to apps/scrapers based on source_registry.runs_on.
 */
export const clientRegistry: Record<string, AnyClient> = {
  [nhtsaVpicClient.key]: nhtsaVpicClient as AnyClient,
  [nhtsaRecallsClient.key]: nhtsaRecallsClient as AnyClient,
  [vinAuditNmvtisClient.key]: vinAuditNmvtisClient as AnyClient,
  [vinAuditMarketClient.key]: vinAuditMarketClient as AnyClient,
  [marketCheckHistoryClient.key]: marketCheckHistoryClient as AnyClient,
  [satCfdiClient.key]: satCfdiClient as AnyClient,
  [autoCheckClient.key]: autoCheckClient as AnyClient,
  [bumperClient.key]: bumperClient as AnyClient,
  [carsXeClient.key]: carsXeClient as AnyClient,
  [clearVinClient.key]: clearVinClient as AnyClient,
  [dataOneClient.key]: dataOneClient as AnyClient,
  [epicVinClient.key]: epicVinClient as AnyClient,
  [manheimClient.key]: manheimClient as AnyClient,
  [statVinClient.key]: statVinClient as AnyClient,
};

export function getClient(key: string): AnyClient | null {
  return clientRegistry[key] ?? null;
}
