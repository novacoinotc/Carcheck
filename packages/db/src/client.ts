import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema/index';

neonConfig.fetchConnectionCache = true;

const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, {
  schema,
  casing: 'snake_case',
  logger: process.env.NODE_ENV === 'development',
});

export type DB = typeof db;
export { schema };
