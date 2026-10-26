import { z } from 'zod';
import { consentTypeSchema } from './enums';

/** Consents a user may change after registration. Terms, privacy and safety stay mandatory. */
export const optionalConsentTypes = [
  'service_communications',
  'whatsapp_updates',
  'marketing',
] as const;

export const updateConsentsRequestSchema = z
  .object({
    serviceCommunications: z.boolean(),
    whatsappUpdates: z.boolean(),
    marketing: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Change at least one consent');
export type UpdateConsentsRequest = z.infer<typeof updateConsentsRequestSchema>;

export const consentStateSchema = z.object({
  type: consentTypeSchema,
  isGranted: z.boolean(),
  policyVersion: z.string(),
  updatedAt: z.string(),
});
export type ConsentState = z.infer<typeof consentStateSchema>;

export const registerDeviceRequestSchema = z.object({
  token: z.string().min(16).max(4096),
  platform: z.enum(['ios', 'android', 'web']),
});
export type RegisterDeviceRequest = z.infer<typeof registerDeviceRequestSchema>;
