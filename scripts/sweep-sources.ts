/**
 * Source sweep: inspect every enabled scraper source against its live site and
 * produce a categorized status map. Run: `tsx scripts/sweep-sources.ts`
 * Requires DATABASE_URL + SCRAPERS_AUTH_TOKEN in env. Writes JSON to /tmp/sweep.json.
 */
import 'dotenv/config';
import { db, sourceRegistry, eq } from '@carcheck/db';

const INSPECT_URL = process.env.SCRAPERS_BASE_URL ?? 'https://scrapers.carcheckmx.com';
const TOKEN = process.env.SCRAPERS_AUTH_TOKEN!;
const CONCURRENCY = 4;

interface InspectResp {
  status: string;
  finalUrl?: string;
  title?: string;
  captchaDetected?: boolean;
  captchaType?: string;
  httpBlocked?: boolean;
  inputs?: Array<{ name: string; id: string; type: string; placeholder: string }>;
  buttons?: Array<{ text: string }>;
  error?: string;
}

async function inspect(url: string, proxy: boolean): Promise<InspectResp> {
  try {
    const res = await fetch(`${INSPECT_URL}/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ url, proxy }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) return { status: 'http_' + res.status };
    return (await res.json()) as InspectResp;
  } catch (err) {
    return { status: 'fetch_error', error: err instanceof Error ? err.message : String(err) };
  }
}

function categorize(direct: InspectResp, proxied: InspectResp | null): string {
  const best = direct.status === 'loaded' ? direct : proxied?.status === 'loaded' ? proxied : direct;
  if (best.captchaDetected) return best.captchaType === 'recaptcha' ? 'CAPTCHA_RECAPTCHA' : 'CAPTCHA_IMAGE';
  if (best.status === 'loaded') {
    const via = direct.status === 'loaded' ? 'direct' : 'proxy';
    const hasForm = (best.inputs?.length ?? 0) > 0;
    return hasForm ? `LOADS_${via.toUpperCase()}_FORM` : `LOADS_${via.toUpperCase()}_NOFORM`;
  }
  if (best.status === 'blocked' || best.httpBlocked) return 'BLOCKED_CDN';
  if (direct.status === 'fetch_error' && proxied && proxied.status !== 'loaded') return 'UNREACHABLE';
  if (direct.status.startsWith('http_404') || best.title?.includes('404')) return 'URL_404';
  return `OTHER_${best.status}`;
}

async function main() {
  const sources = await db
    .select()
    .from(sourceRegistry)
    .where(eq(sourceRegistry.isEnabled, true));

  const railway = sources.filter((s) => s.runsOn === 'railway' && s.baseUrl);
  console.log(`Sweeping ${railway.length} railway scraper sources…\n`);

  const results: Array<{ key: string; name: string; url: string; category: string; detail: string }> = [];

  for (let i = 0; i < railway.length; i += CONCURRENCY) {
    const batch = railway.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (s) => {
        const direct = await inspect(s.baseUrl!, false);
        let proxied: InspectResp | null = null;
        if (direct.status !== 'loaded') {
          proxied = await inspect(s.baseUrl!, true);
        }
        const category = categorize(direct, proxied);
        const insp = direct.status === 'loaded' ? direct : (proxied ?? direct);
        const inputs = (insp.inputs ?? [])
          .map((x) => x.name || x.id || x.placeholder)
          .filter(Boolean)
          .slice(0, 5)
          .join(',');
        const detail = `${insp.title?.slice(0, 40) ?? ''} | inputs:[${inputs}]${insp.error ? ' | err:' + insp.error.slice(0, 50) : ''}`;
        return { key: s.key, name: s.name, url: s.baseUrl!, category, detail };
      }),
    );
    for (const r of batchResults) {
      results.push(r);
      console.log(`[${r.category}] ${r.key}\n   ${r.detail}`);
    }
  }

  const { writeFileSync } = await import('node:fs');
  writeFileSync('/tmp/sweep.json', JSON.stringify(results, null, 2));

  // Summary by category
  const byCat: Record<string, number> = {};
  for (const r of results) byCat[r.category] = (byCat[r.category] ?? 0) + 1;
  console.log('\n=== RESUMEN POR CATEGORÍA ===');
  for (const [cat, n] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}  ${cat}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
