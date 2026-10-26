import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

export interface DatabaseHandle {
  db: Database;
  close: () => Promise<void>;
}

/** Opens a pooled Postgres connection. */
export function createDatabase(
  databaseUrl: string,
  options: { max?: number } = {},
): DatabaseHandle {
  const sql = postgres(databaseUrl, { max: options.max ?? 10, onnotice: () => undefined });
  return {
    db: drizzle(sql, { schema, casing: 'snake_case' }),
    close: () => sql.end({ timeout: 5 }),
  };
}
