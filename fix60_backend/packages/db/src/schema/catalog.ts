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
import { auditColumns, uuidPk, type LocalizedText } from './columns';
import { documentTypeEnum, questionTypeEnum } from './enums';

export const serviceCategories = pgTable(
  'service_categories',
  {
    id: uuidPk(),
    slug: text('slug').notNull(),
    name: jsonb('name').$type<LocalizedText>().notNull(),
    description: jsonb('description').$type<LocalizedText>(),
    imageKey: text('image_key'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('service_categories_slug_live')
      .on(table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

/** Service-specific restrictions evaluated by the matching engine. */
export interface ServiceEligibilityRules {
  /** Provider must declare at least this many years for this service. */
  minYearsExperience?: number;
  /** Customer must pick a provider of this gender only when the service requires it (Q8). */
  requiresGender?: boolean;
  /** Admin-only: never shown in public search until explicitly enabled. */
  isRestricted?: boolean;
}

export const services = pgTable(
  'services',
  {
    id: uuidPk(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => serviceCategories.id),
    slug: text('slug').notNull(),
    name: jsonb('name').$type<LocalizedText>().notNull(),
    description: jsonb('description').$type<LocalizedText>(),
    imageKey: text('image_key'),
    eligibility: jsonb('eligibility').$type<ServiceEligibilityRules>().notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('services_slug_live')
      .on(table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    index('services_category_idx').on(table.categoryId),
  ],
);

/** Documents a provider must upload (and have verified) before approval for this service. */
export const serviceRequiredDocuments = pgTable(
  'service_required_documents',
  {
    id: uuidPk(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    documentType: documentTypeEnum('document_type').notNull(),
    isMandatory: boolean('is_mandatory').notNull().default(true),
    note: jsonb('note').$type<LocalizedText>(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('service_required_documents_live')
      .on(table.serviceId, table.documentType)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export interface QuestionOption {
  value: string;
  label: LocalizedText;
}

/** Dynamic wizard questions shown when a provider selects this service. */
export const serviceQuestions = pgTable(
  'service_questions',
  {
    id: uuidPk(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    key: text('key').notNull(),
    type: questionTypeEnum('type').notNull(),
    label: jsonb('label').$type<LocalizedText>().notNull(),
    helpText: jsonb('help_text').$type<LocalizedText>(),
    options: jsonb('options').$type<QuestionOption[]>(),
    isRequired: boolean('is_required').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('service_questions_key_live')
      .on(table.serviceId, table.key)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);
