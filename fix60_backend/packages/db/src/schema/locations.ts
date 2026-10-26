import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { auditColumns, geographyPoint, uuidPk, type LocalizedText } from './columns';

export const states = pgTable(
  'states',
  {
    id: uuidPk(),
    code: text('code').notNull(),
    name: jsonb('name').$type<LocalizedText>().notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('states_code_live')
      .on(table.code)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const districts = pgTable(
  'districts',
  {
    id: uuidPk(),
    stateId: uuid('state_id')
      .notNull()
      .references(() => states.id),
    slug: text('slug').notNull(),
    name: jsonb('name').$type<LocalizedText>().notNull(),
    centroid: geographyPoint('centroid'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('districts_slug_live')
      .on(table.stateId, table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

/** Municipality / panchayat / locality with a centroid for radius matching. */
export const localities = pgTable(
  'localities',
  {
    id: uuidPk(),
    districtId: uuid('district_id')
      .notNull()
      .references(() => districts.id),
    slug: text('slug').notNull(),
    name: jsonb('name').$type<LocalizedText>().notNull(),
    localBody: text('local_body'),
    postalCode: text('postal_code'),
    centroid: geographyPoint('centroid').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('localities_slug_live')
      .on(table.districtId, table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    index('localities_postal_idx').on(table.postalCode),
    index('localities_centroid_gist').using('gist', table.centroid),
  ],
);
