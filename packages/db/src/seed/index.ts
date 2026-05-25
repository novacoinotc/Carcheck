import 'dotenv/config';
import { db } from '../client';
import { sourceRegistry } from '../schema/source-registry';
import { sourceRegistrySeed } from './source-registry-data';
import { sql } from 'drizzle-orm';

async function seedSourceRegistry() {
  console.log(`📦 Seeding source_registry with ${sourceRegistrySeed.length} entries…`);

  await db
    .insert(sourceRegistry)
    .values(sourceRegistrySeed)
    .onConflictDoUpdate({
      target: sourceRegistry.key,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        country: sql`excluded.country`,
        stateCode: sql`excluded.state_code`,
        category: sql`excluded.category`,
        accessMethod: sql`excluded.access_method`,
        baseUrl: sql`excluded.base_url`,
        docsUrl: sql`excluded.docs_url`,
        requiresVin: sql`excluded.requires_vin`,
        requiresPlate: sql`excluded.requires_plate`,
        acceptsEither: sql`excluded.accepts_either`,
        typicalLatencyMs: sql`excluded.typical_latency_ms`,
        timeoutMs: sql`excluded.timeout_ms`,
        costUsdPerCall: sql`excluded.cost_usd_per_call`,
        cacheTtlSeconds: sql`excluded.cache_ttl_seconds`,
        isTier1: sql`excluded.is_tier_1`,
        runsOn: sql`excluded.runs_on`,
        legalNotes: sql`excluded.legal_notes`,
        updatedAt: sql`now()`,
      },
    });

  const counts = await db
    .select({
      country: sourceRegistry.country,
      count: sql<number>`count(*)::int`,
    })
    .from(sourceRegistry)
    .groupBy(sourceRegistry.country);

  console.log('✅ source_registry seeded:');
  for (const c of counts) {
    console.log(`   ${c.country}: ${c.count}`);
  }
}

async function main() {
  await seedSourceRegistry();
  console.log('🎉 All seeds completed');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
