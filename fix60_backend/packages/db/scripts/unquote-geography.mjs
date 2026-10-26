// drizzle-kit quotes custom column types, emitting "geography(Point, 4326)", which Postgres
// reads as an identifier. Unquote it in every generated migration (idempotent).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const dir = path.resolve(import.meta.dirname, '../drizzle');
for (const file of readdirSync(dir).filter((name) => name.endsWith('.sql'))) {
  const target = path.join(dir, file);
  const sql = readFileSync(target, 'utf8');
  const fixed = sql.replaceAll('"geography(Point, 4326)"', 'geography(Point, 4326)');
  if (fixed !== sql) {
    writeFileSync(target, fixed);
    console.warn(`unquoted geography type in ${file}`);
  }
}
