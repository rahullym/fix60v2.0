import { z } from 'zod';

/** One role per account in Phase 1. Admins authenticate separately. */
export const userRoleSchema = z.enum(['customer', 'provider']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userStatusSchema = z.enum(['active', 'suspended', 'pending_deletion', 'deleted']);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const genderSchema = z.enum(['female', 'male', 'other', 'prefer_not_to_say']);
export type Gender = z.infer<typeof genderSchema>;

export const devicePlatformSchema = z.enum(['ios', 'android', 'web']);
export type DevicePlatform = z.infer<typeof devicePlatformSchema>;

export const actorTypeSchema = z.enum(['customer', 'provider', 'admin', 'system']);
export type ActorType = z.infer<typeof actorTypeSchema>;

export const consentTypeSchema = z.enum([
  'terms',
  'privacy',
  'safety_policy',
  'service_communications',
  'whatsapp_updates',
  'marketing',
  'provider_declaration',
]);
export type ConsentType = z.infer<typeof consentTypeSchema>;

export const consentSourceSchema = z.enum(['app', 'web', 'admin']);
export type ConsentSource = z.infer<typeof consentSourceSchema>;

export const adminStatusSchema = z.enum(['active', 'disabled']);
export type AdminStatus = z.infer<typeof adminStatusSchema>;

export const providerStatusSchema = z.enum(['onboarding', 'active', 'suspended']);
export type ProviderStatus = z.infer<typeof providerStatusSchema>;

export const applicationStatusSchema = z.enum([
  'draft',
  'submitted',
  'under_review',
  'info_required',
  'approved',
  'rejected',
]);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const requestStatusSchema = z.enum([
  'submitted',
  'under_review',
  'matching',
  'provider_notified',
  'provider_accepted',
  'provider_declined',
  'customer_confirmation_pending',
  'booking_confirmed',
  'cancelled',
  'disputed',
]);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

export const bookingStatusSchema = z.enum([
  'confirmed',
  'service_started',
  'service_completed',
  'cancelled',
  'disputed',
]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

/** Locales with complete UI catalogs. Others fall back to English. */
export const supportedLocales = ['en', 'ml'] as const;
export const localeSchema = z.enum(supportedLocales);
export type Locale = z.infer<typeof localeSchema>;
