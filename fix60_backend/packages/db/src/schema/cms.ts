import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { auditColumns, uuidPk, type LocalizedText } from './columns';
import { cmsBlockTypeEnum } from './enums';

/** Policy and static pages (privacy, terms, safety, how-it-works). Body is Markdown per locale. */
export const cmsPages = pgTable(
  'cms_pages',
  {
    id: uuidPk(),
    slug: text('slug').notNull(),
    title: jsonb('title').$type<LocalizedText>().notNull(),
    body: jsonb('body').$type<LocalizedText>().notNull(),
    metaDescription: jsonb('meta_description').$type<LocalizedText>(),
    version: text('version').notNull().default('1'),
    isPublished: boolean('is_published').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('cms_pages_slug_live')
      .on(table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

/** Repeating content: banners, FAQs, contact details, approved testimonials. */
export const cmsBlocks = pgTable(
  'cms_blocks',
  {
    id: uuidPk(),
    type: cmsBlockTypeEnum('type').notNull(),
    content: jsonb('content').$type<Record<string, LocalizedText | string | null>>().notNull(),
    imageKey: text('image_key'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...auditColumns,
  },
  (table) => [index('cms_blocks_type_idx').on(table.type, table.sortOrder)],
);
