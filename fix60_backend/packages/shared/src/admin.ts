import { z } from 'zod';
import { emailSchema, paginationQuerySchema, personNameSchema } from './common';
import { actorTypeSchema, adminStatusSchema } from './enums';

/** Every permission an admin role can hold. Keys are stable; never rename one in place. */
export const adminPermissions = [
  'dashboard.view',
  'customers.read',
  'customers.manage',
  'providers.read',
  'providers.manage',
  'applications.review',
  'documents.view',
  'catalog.manage',
  'locations.manage',
  'requests.read',
  'requests.manage',
  'bookings.read',
  'bookings.manage',
  'reports.read',
  'reports.manage',
  'reviews.moderate',
  'support.manage',
  'notifications.manage',
  'integrations.manage',
  'cms.manage',
  'admins.manage',
  'audit.read',
  'exports.run',
  'settings.manage',
  'finance.read',
  'finance.manage',
] as const;
export const adminPermissionSchema = z.enum(adminPermissions);
export type AdminPermission = z.infer<typeof adminPermissionSchema>;

export interface SystemAdminRole {
  slug: string;
  name: string;
  description: string;
  isSuper: boolean;
  permissions: readonly AdminPermission[];
}

/** Built-in roles from the requirements. Super Admin bypasses permission checks. */
export const systemAdminRoles: readonly SystemAdminRole[] = [
  {
    slug: 'super_admin',
    name: 'Super Admin',
    description: 'Full access, including admin users and roles.',
    isSuper: true,
    permissions: [],
  },
  {
    slug: 'verification_admin',
    name: 'Verification Admin',
    description: 'Reviews provider applications and verification documents.',
    isSuper: false,
    permissions: [
      'dashboard.view',
      'providers.read',
      'providers.manage',
      'applications.review',
      'documents.view',
    ],
  },
  {
    slug: 'support_admin',
    name: 'Support Admin',
    description: 'Customer support, requests, bookings, complaints and review moderation.',
    isSuper: false,
    permissions: [
      'dashboard.view',
      'customers.read',
      'customers.manage',
      'providers.read',
      'requests.read',
      'requests.manage',
      'bookings.read',
      'bookings.manage',
      'reports.read',
      'reports.manage',
      'reviews.moderate',
      'support.manage',
    ],
  },
  {
    slug: 'finance_admin',
    name: 'Finance Admin',
    description: 'Payments, refunds, fees and settlements once Phase 2 payments are enabled.',
    isSuper: false,
    permissions: [
      'dashboard.view',
      'bookings.read',
      'finance.read',
      'finance.manage',
      'exports.run',
    ],
  },
];

const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(200)
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/\d/, 'Include a number');

export const adminRoleSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isSuper: z.boolean(),
  isSystem: z.boolean(),
  permissions: z.array(adminPermissionSchema),
});
export type AdminRole = z.infer<typeof adminRoleSchema>;

export const createAdminRoleRequestSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9_]{2,40}$/),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional(),
  permissions: z.array(adminPermissionSchema).min(1),
});
export type CreateAdminRoleRequest = z.infer<typeof createAdminRoleRequestSchema>;

export const updateAdminRoleRequestSchema = createAdminRoleRequestSchema
  .omit({ slug: true })
  .partial();
export type UpdateAdminRoleRequest = z.infer<typeof updateAdminRoleRequestSchema>;

export const adminUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  fullName: z.string(),
  status: adminStatusSchema,
  isTotpEnabled: z.boolean(),
  roles: z.array(z.object({ id: z.uuid(), slug: z.string(), name: z.string() })),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const createAdminUserRequestSchema = z.object({
  email: emailSchema,
  fullName: personNameSchema,
  password: passwordSchema,
  roleIds: z.array(z.uuid()).min(1),
});
export type CreateAdminUserRequest = z.infer<typeof createAdminUserRequestSchema>;

export const updateAdminUserRequestSchema = z.object({
  fullName: personNameSchema.optional(),
  status: adminStatusSchema.optional(),
  roleIds: z.array(z.uuid()).min(1).optional(),
  /** Forces TOTP re-enrolment on next login. */
  resetTotp: z.boolean().optional(),
});
export type UpdateAdminUserRequest = z.infer<typeof updateAdminUserRequestSchema>;

export const changeAdminPasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});
export type ChangeAdminPasswordRequest = z.infer<typeof changeAdminPasswordRequestSchema>;

export const auditLogQuerySchema = paginationQuerySchema.extend({
  actorId: z.uuid().optional(),
  entityType: z.string().max(60).optional(),
  entityId: z.string().max(100).optional(),
  action: z.string().max(80).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
});
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export const auditLogEntrySchema = z.object({
  id: z.uuid(),
  actorType: actorTypeSchema,
  actorId: z.uuid().nullable(),
  actorName: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  diff: z.record(z.string(), z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
});
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
