import path from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDatabase } from './client';

/** Applies SQL migrations from ./drizzle. */
async function run(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  const { db, close } = createDatabase(databaseUrl, { max: 1 });
  await migrate(db, { migrationsFolder: path.resolve(__dirname, '../drizzle') });
  await close();
  console.warn('Migrations applied');
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
