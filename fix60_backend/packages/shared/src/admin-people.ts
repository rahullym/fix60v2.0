import { z } from 'zod';
import { emailSchema, paginationQuerySchema, personNameSchema } from './common';
import {
  applicationStatusSchema,
  bookingStatusSchema,
  consentTypeSchema,
  genderSchema,
  providerStatusSchema,
  userStatusSchema,
} from './enums';

const searchSchema = z.string().trim().min(1).max(80).optional();

export const adminCustomerListQuerySchema = paginationQuerySchema.extend({
  q: searchSchema,
  status: userStatusSchema.optional(),
});
export type AdminCustomerListQuery = z.infer<typeof adminCustomerListQuerySchema>;

export const adminProviderListQuerySchema = paginationQuerySchema.extend({
  q: searchSchema,
  status: providerStatusSchema.optional(),
});
export type AdminProviderListQuery = z.infer<typeof adminProviderListQuerySchema>;

/** Body for suspending a customer or provider. The reason is kept on the account and in the audit log. */
export const suspendAccountRequestSchema = z.object({
  reason: z.string().trim().min(3, 'Give a short reason').max(500),
});
export type SuspendAccountRequest = z.infer<typeof suspendAccountRequestSchema>;

/** Contact details an admin may correct. The phone number is Firebase-verified and never edited here. */
export const updatePersonRequestSchema = z
  .object({
    fullName: personNameSchema.optional(),
    email: emailSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update');
export type UpdatePersonRequest = z.infer<typeof updatePersonRequestSchema>;

export interface AdminCustomerSummary {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  status: z.infer<typeof userStatusSchema>;
  district: string | null;
  bookingCount: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminBookingSummary {
  id: string;
  code: string;
  status: z.infer<typeof bookingStatusSchema>;
  serviceName: string;
  /** The other party: provider name on a customer page, customer name on a provider page. */
  counterpartName: string;
  startsAt: string | null;
}

export interface AdminCustomerDetail extends AdminCustomerSummary {
  whatsappPhone: string | null;
  gender: z.infer<typeof genderSchema> | null;
  dateOfBirth: string | null;
  preferredLocale: string;
  locality: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  requestCount: number;
  completedBookingCount: number;
  consents: { type: z.infer<typeof consentTypeSchema>; isGranted: boolean; policyVersion: string; at: string }[];
  recentBookings: AdminBookingSummary[];
}

export interface AdminProviderSummary {
  id: string;
  userId: string;
  code: string;
  fullName: string;
  phone: string | null;
  status: z.infer<typeof providerStatusSchema>;
  accountStatus: z.infer<typeof userStatusSchema>;
  approvedServiceCount: number;
  pendingServiceCount: number;
  yearsExperience: number | null;
  createdAt: string;
}

export interface AdminProviderService {
  id: string;
  serviceName: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  yearsExperience: number | null;
  hourlyRate: number | null;
  dailyRate: number | null;
  monthlyRate: number | null;
  isNegotiable: boolean;
}

export interface AdminProviderDetail extends AdminProviderSummary {
  email: string | null;
  whatsappPhone: string | null;
  gender: z.infer<typeof genderSchema> | null;
  dateOfBirth: string | null;
  bio: string | null;
  languages: string[];
  travelPreference: string | null;
  maxHoursPerDay: number | null;
  approvedAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  lastLoginAt: string | null;
  services: AdminProviderService[];
  application: {
    code: string;
    status: z.infer<typeof applicationStatusSchema>;
    currentStep: number;
    submittedAt: string | null;
  } | null;
  /** Document types and review status only. Storage keys never leave the API. */
  documents: { id: string; type: string; status: 'pending' | 'verified' | 'rejected' | 'info_required' }[];
  serviceAreaCount: number;
  bookingCount: number;
  completedBookingCount: number;
  rating: { average: number | null; count: number };
  recentBookings: AdminBookingSummary[];
}
