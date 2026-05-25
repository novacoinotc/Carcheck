import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';

const url =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL is required to run migrations');
}

const sql = neon(url);
const db = drizzle(sql);

console.log('🚀 Applying migrations…');
await migrate(db, { migrationsFolder: './drizzle' });
console.log('✅ Migrations applied');
