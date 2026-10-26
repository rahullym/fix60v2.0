import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { systemAdminRoles } from '@fix60/shared';
import { createDatabase, type Database } from './client';
import {
  adminRolePermissions,
  adminRoles,
  adminUserRoles,
  adminUsers,
  districts,
  organization,
  serviceCategories,
  serviceQuestions,
  serviceRequiredDocuments,
  services,
  states,
} from './schema';
import { initialCatalog, keralaDistricts, toQuestionOptions } from './seed-data';
import { DEFAULT_THEME_SLUG } from './theme-presets';

const BCRYPT_ROUNDS = 12;

/** System roles are defined in code; their permission sets are re-synced on every seed. */
async function seedAdminRoles(db: Database): Promise<void> {
  for (const role of systemAdminRoles) {
    const [existing] = await db
      .select({ id: adminRoles.id })
      .from(adminRoles)
      .where(eq(adminRoles.slug, role.slug));
    const roleId =
      existing?.id ??
      (
        await db
          .insert(adminRoles)
          .values({
            slug: role.slug,
            name: role.name,
            description: role.description,
            isSuper: role.isSuper,
            isSystem: true,
          })
          .returning({ id: adminRoles.id })
      )[0]!.id;
    await db.transaction(async (tx) => {
      const live = await tx
        .select({ id: adminRolePermissions.id, permission: adminRolePermissions.permission })
        .from(adminRolePermissions)
        .where(
          and(eq(adminRolePermissions.roleId, roleId), isNull(adminRolePermissions.deletedAt)),
        );
      const wanted = new Set<string>(role.permissions);
      const stale = live.filter((row) => !wanted.has(row.permission)).map((row) => row.id);
      if (stale.length > 0) {
        await tx
          .update(adminRolePermissions)
          .set({ deletedAt: new Date() })
          .where(inArray(adminRolePermissions.id, stale));
      }
      const held = new Set(live.map((row) => row.permission));
      const missing = role.permissions.filter((permission) => !held.has(permission));
      if (missing.length > 0) {
        await tx
          .insert(adminRolePermissions)
          .values(missing.map((permission) => ({ roleId, permission })));
      }
    });
  }
}

/** Creates the first Super Admin from env. Skipped when the vars are absent. */
async function seedSuperAdmin(db: Database): Promise<void> {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn(
      'SEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD not set; skipping super admin',
    );
    return;
  }
  if (password.length < 12) {
    throw new Error('SEED_SUPER_ADMIN_PASSWORD must be at least 12 characters');
  }
  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(sql`lower(${adminUsers.email}) = ${email}`);
  if (existing) {
    return;
  }
  const [superRole] = await db
    .select({ id: adminRoles.id })
    .from(adminRoles)
    .where(eq(adminRoles.slug, 'super_admin'));
  const [admin] = await db
    .insert(adminUsers)
    .values({
      email,
      fullName: process.env.SEED_SUPER_ADMIN_NAME?.trim() || 'Super Admin',
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    })
    .returning({ id: adminUsers.id });
  await db.insert(adminUserRoles).values({ adminId: admin!.id, roleId: superRole!.id });
  console.warn(`Super admin ${email} created; TOTP enrolment happens on first login`);
}

async function seedLocations(db: Database): Promise<void> {
  const [existingState] = await db
    .select({ id: states.id })
    .from(states)
    .where(eq(states.code, 'KL'));
  const stateId =
    existingState?.id ??
    (
      await db
        .insert(states)
        .values({ code: 'KL', name: { en: 'Kerala', ml: 'കേരളം' } })
        .returning({ id: states.id })
    )[0]!.id;
  for (const [index, district] of keralaDistricts.entries()) {
    const [existing] = await db
      .select({ id: districts.id })
      .from(districts)
      .where(and(eq(districts.stateId, stateId), eq(districts.slug, district.slug)));
    if (!existing) {
      await db.insert(districts).values({ stateId, ...district, sortOrder: index });
    }
  }
}

async function seedCatalog(db: Database): Promise<void> {
  for (const [categoryIndex, category] of initialCatalog.entries()) {
    const [existingCategory] = await db
      .select({ id: serviceCategories.id })
      .from(serviceCategories)
      .where(eq(serviceCategories.slug, category.slug));
    const categoryId =
      existingCategory?.id ??
      (
        await db
          .insert(serviceCategories)
          .values({ slug: category.slug, name: { en: category.name }, sortOrder: categoryIndex })
          .returning({ id: serviceCategories.id })
      )[0]!.id;

    for (const [serviceIndex, service] of category.services.entries()) {
      const [existingService] = await db
        .select({ id: services.id })
        .from(services)
        .where(eq(services.slug, service.slug));
      if (existingService) {
        continue;
      }
      const [created] = await db
        .insert(services)
        .values({
          categoryId,
          slug: service.slug,
          name: { en: service.name },
          description: { en: service.description },
          eligibility: service.eligibility ?? {},
          sortOrder: serviceIndex,
        })
        .returning({ id: services.id });
      const serviceId = created!.id;
      await db.insert(serviceRequiredDocuments).values(
        service.documents.map((document) => ({
          serviceId,
          documentType: document.type,
          isMandatory: document.isMandatory,
        })),
      );
      if (service.questions.length > 0) {
        await db.insert(serviceQuestions).values(
          service.questions.map((question, questionIndex) => ({
            serviceId,
            key: question.key,
            type: question.type,
            label: { en: question.label },
            options: toQuestionOptions(question.options),
            isRequired: question.isRequired,
            sortOrder: questionIndex,
          })),
        );
      }
    }
  }
}

async function seedOrganization(db: Database): Promise<void> {
  const [existing] = await db.select({ id: organization.id }).from(organization).limit(1);
  if (!existing) {
    await db.insert(organization).values({ name: 'Fix60', activeThemeSlug: DEFAULT_THEME_SLUG });
  }
}

/** Idempotent reference-data seed. Safe to run on every deploy. */
async function run(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  const { db, close } = createDatabase(databaseUrl, { max: 1 });
  try {
    await seedOrganization(db);
    await seedAdminRoles(db);
    await seedSuperAdmin(db);
    await seedLocations(db);
    await seedCatalog(db);
    console.warn('Seed complete');
  } finally {
    await close();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
