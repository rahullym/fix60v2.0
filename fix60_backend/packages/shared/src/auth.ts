import { z } from 'zod';
import { emailSchema, indianMobileSchema, isoDateSchema, personNameSchema } from './common';
import { genderSchema, localeSchema, userRoleSchema, userStatusSchema } from './enums';

/** Firebase ID token from phone sign-in (or `dev:<E.164 phone>` when dev tokens are enabled). */
const idTokenSchema = z.string().min(8).max(4096);

export const firebaseSignInRequestSchema = z.object({
  idToken: idTokenSchema,
  /** Role the app is signing in as; a mismatch with an existing account is rejected. */
  role: userRoleSchema,
});
export type FirebaseSignInRequest = z.infer<typeof firebaseSignInRequestSchema>;

/** Consents captured at registration. Terms, privacy and safety policy must be true. */
export const registrationConsentsSchema = z.object({
  terms: z.literal(true),
  privacy: z.literal(true),
  safetyPolicy: z.literal(true),
  serviceCommunications: z.boolean(),
  whatsappUpdates: z.boolean(),
});
export type RegistrationConsents = z.infer<typeof registrationConsentsSchema>;

export const registerCustomerRequestSchema = z.object({
  idToken: idTokenSchema,
  role: z.literal('customer'),
  fullName: personNameSchema,
  email: emailSchema.optional(),
  whatsappPhone: indianMobileSchema.optional(),
  dateOfBirth: isoDateSchema.optional(),
  districtId: z.uuid().optional(),
  localityId: z.uuid().optional(),
  preferredLocale: localeSchema.default('en'),
  consents: registrationConsentsSchema,
});
export type RegisterCustomerRequest = z.infer<typeof registerCustomerRequestSchema>;

/** Creates the provider account; the full application is completed in the wizard. */
export const registerProviderRequestSchema = z.object({
  idToken: idTokenSchema,
  role: z.literal('provider'),
  fullName: personNameSchema,
  dateOfBirth: isoDateSchema,
  /** Self-declaration of adulthood, checked against `dateOfBirth`. */
  confirmsAdult: z.literal(true),
  email: emailSchema.optional(),
  whatsappPhone: indianMobileSchema.optional(),
  preferredLocale: localeSchema.default('en'),
  consents: registrationConsentsSchema,
});
export type RegisterProviderRequest = z.infer<typeof registerProviderRequestSchema>;

export const registerRequestSchema = z.discriminatedUnion('role', [
  registerCustomerRequestSchema,
  registerProviderRequestSchema,
]);
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const refreshRequestSchema = z.object({ refreshToken: z.string().min(32).max(200) });
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const logoutRequestSchema = refreshRequestSchema;
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;

/** Access-token claims. `kind` separates phone-account tokens from admin tokens. */
export const userAccessTokenPayloadSchema = z.object({
  sub: z.uuid(),
  kind: z.literal('user'),
  role: userRoleSchema,
});
export type UserAccessTokenPayload = z.infer<typeof userAccessTokenPayloadSchema>;

export const adminAccessTokenPayloadSchema = z.object({
  sub: z.uuid(),
  kind: z.literal('admin'),
});
export type AdminAccessTokenPayload = z.infer<typeof adminAccessTokenPayloadSchema>;

export const accessTokenPayloadSchema = z.discriminatedUnion('kind', [
  userAccessTokenPayloadSchema,
  adminAccessTokenPayloadSchema,
]);
export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresIn: z.number(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const meSchema = z.object({
  id: z.uuid(),
  role: userRoleSchema,
  status: userStatusSchema,
  fullName: z.string(),
  phone: z.string().nullable(),
  whatsappPhone: z.string().nullable(),
  email: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  gender: genderSchema.nullable(),
  preferredLocale: z.string(),
  districtId: z.uuid().nullable(),
  localityId: z.uuid().nullable(),
  providerCode: z.string().nullable(),
});
export type Me = z.infer<typeof meSchema>;

/** Result of exchanging a Firebase ID token. */
export type FirebaseSignInResponse =
  | ({ status: 'authenticated'; user: Me } & AuthTokens)
  | { status: 'registration_required'; phone: string };

export type AuthSessionResponse = { user: Me } & AuthTokens;

export const updateMeRequestSchema = z.object({
  fullName: personNameSchema.optional(),
  email: emailSchema.nullable().optional(),
  whatsappPhone: indianMobileSchema.nullable().optional(),
  gender: genderSchema.nullable().optional(),
  preferredLocale: localeSchema.optional(),
  districtId: z.uuid().nullable().optional(),
  localityId: z.uuid().nullable().optional(),
});
export type UpdateMeRequest = z.infer<typeof updateMeRequestSchema>;

/** Admin step 1: password. */
export const adminLoginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});
export type AdminLoginRequest = z.infer<typeof adminLoginRequestSchema>;

/** Admin step 2: TOTP code against the challenge from step 1. */
export const adminTotpRequestSchema = z.object({
  challengeToken: z.string().min(16),
  code: z.string().regex(/^\d{6}$/),
});
export type AdminTotpRequest = z.infer<typeof adminTotpRequestSchema>;

export const adminMeSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  fullName: z.string(),
  isSuper: z.boolean(),
  roles: z.array(z.object({ slug: z.string(), name: z.string() })),
  permissions: z.array(z.string()),
});
export type AdminMe = z.infer<typeof adminMeSchema>;

export type AdminSessionResponse = { admin: AdminMe } & AuthTokens;

/** `authenticated` only occurs when ADMIN_TOTP_REQUIRED is off (local development). */
export type AdminLoginResponse =
  | { status: 'totp_required'; challengeToken: string }
  | {
      status: 'totp_enrollment_required';
      challengeToken: string;
      otpauthUrl: string;
      secret: string;
    }
  | ({ status: 'authenticated' } & AdminSessionResponse);
