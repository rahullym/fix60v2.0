import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { auditColumns, uuidPk } from './columns';

/** Theme tokens as stored (hex strings). Mirrors `ThemeTokens` in @fix60/shared. */
export type StoredThemeTokens = Record<string, string>;

/** Custom theme presets. System presets live in code and are merged on read. */
export const themes = pgTable(
  'themes',
  {
    id: uuidPk(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    tokens: jsonb('tokens').$type<StoredThemeTokens>().notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('themes_slug_live')
      .on(table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

/** Single organisation row: branding + public contact details. Commercial settings arrive with Phase 2. */
export const organization = pgTable('organization', {
  id: uuidPk(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  activeThemeSlug: text('active_theme_slug').notNull().default('graphite-signal'),
  supportPhone: text('support_phone'),
  supportWhatsapp: text('support_whatsapp'),
  supportEmail: text('support_email'),
  companyAddress: text('company_address'),
  grievanceOfficerName: text('grievance_officer_name'),
  grievanceOfficerEmail: text('grievance_officer_email'),
  ...auditColumns,
});
