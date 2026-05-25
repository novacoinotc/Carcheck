import { Redis } from '@upstash/redis';

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (_redis) return _redis;
  if (!url || !token) {
    throw new Error('Redis env vars (KV_REST_API_URL + KV_REST_API_TOKEN) not configured');
  }
  _redis = new Redis({ url, token });
  return _redis;
}

/**
 * Build a stable cache key for a source query.
 * Format: `${source_key}:${id_type}:${id_value}` e.g. "mx_fed_repuve:vin:1HGCM82633A123456"
 */
export function buildCacheKey(
  sourceKey: string,
  id: { vin?: string; plate?: string; state?: string },
): string {
  if (id.vin) return `${sourceKey}:vin:${id.vin.toUpperCase()}`;
  if (id.plate && id.state) return `${sourceKey}:plate:${id.state}:${id.plate.toUpperCase()}`;
  if (id.plate) return `${sourceKey}:plate:${id.plate.toUpperCase()}`;
  throw new Error('buildCacheKey requires vin or plate');
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    return (await getRedis().get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  try {
    await getRedis().set(key, value, { ex: ttlSeconds });
  } catch {
    /* cache best-effort */
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await getRedis().del(key);
  } catch {
    /* best-effort */
  }
}

export async function cacheHealthCheck(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    await getRedis().ping();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export { getRedis as redis };
