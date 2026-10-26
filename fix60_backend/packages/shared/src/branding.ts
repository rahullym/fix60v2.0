import { z } from 'zod';

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** UI theme tokens. Wire format is hex `#RRGGBB`. */
export const themeTokensSchema = z.object({
  primary: hexColorSchema,
  primaryMid: hexColorSchema,
  primaryLight: hexColorSchema,
  accent: hexColorSchema,
  accentLight: hexColorSchema,
  railMid: hexColorSchema,
  railDeep: hexColorSchema,
  tintSecondary: hexColorSchema,
  tintTertiary: hexColorSchema,
  surfaceMuted: hexColorSchema,
  surfaceFog: hexColorSchema,
  fontHeading: z.string().max(80).optional(),
  fontBody: z.string().max(80).optional(),
});
export type ThemeTokens = z.infer<typeof themeTokensSchema>;

export const publicBrandingSchema = z.object({
  name: z.string(),
  logoUrl: z.string().nullable(),
  theme: themeTokensSchema,
});
export type PublicBranding = z.infer<typeof publicBrandingSchema>;

export const themePresetSchema = z.object({
  slug: z.string(),
  name: z.string(),
  isSystem: z.boolean(),
  tokens: themeTokensSchema,
});
export type ThemePreset = z.infer<typeof themePresetSchema>;

export const updateBrandingRequestSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  logoUrl: z.url().nullable().optional(),
  themeSlug: z.string().min(1).max(60).optional(),
});
export type UpdateBrandingRequest = z.infer<typeof updateBrandingRequestSchema>;

export const createThemeRequestSchema = z.object({
  name: z.string().trim().min(1).max(60),
  tokens: themeTokensSchema,
  select: z.boolean().default(true),
});
export type CreateThemeRequest = z.infer<typeof createThemeRequestSchema>;

/** Public contact details shown on the website and in the apps. */
export const organizationSettingsSchema = z.object({
  supportPhone: z.string().max(20).nullable(),
  supportWhatsapp: z.string().max(20).nullable(),
  supportEmail: z.email().nullable(),
  companyAddress: z.string().max(500).nullable(),
  grievanceOfficerName: z.string().max(100).nullable(),
  grievanceOfficerEmail: z.email().nullable(),
});
export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

export const updateOrganizationSettingsRequestSchema = organizationSettingsSchema.partial();
export type UpdateOrganizationSettingsRequest = z.infer<
  typeof updateOrganizationSettingsRequestSchema
>;
