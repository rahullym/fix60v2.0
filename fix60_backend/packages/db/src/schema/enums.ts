import { pgEnum } from 'drizzle-orm/pg-core';

/** One role per account in Phase 1. Admins live in `admin_users`. */
export const userRoleEnum = pgEnum('user_role', ['customer', 'provider']);
export const userStatusEnum = pgEnum('user_status', [
  'active',
  'suspended',
  'pending_deletion',
  'deleted',
]);
export const genderEnum = pgEnum('gender', ['female', 'male', 'other', 'prefer_not_to_say']);
export const devicePlatformEnum = pgEnum('device_platform', ['ios', 'android', 'web']);
export const actorTypeEnum = pgEnum('actor_type', ['customer', 'provider', 'admin', 'system']);

export const consentTypeEnum = pgEnum('consent_type', [
  'terms',
  'privacy',
  'safety_policy',
  'service_communications',
  'whatsapp_updates',
  'marketing',
  'provider_declaration',
]);
export const consentSourceEnum = pgEnum('consent_source', ['app', 'web', 'admin']);

export const adminStatusEnum = pgEnum('admin_status', ['active', 'disabled']);

export const providerStatusEnum = pgEnum('provider_status', ['onboarding', 'active', 'suspended']);
export const applicationStatusEnum = pgEnum('application_status', [
  'draft',
  'submitted',
  'under_review',
  'info_required',
  'approved',
  'rejected',
]);
export const providerServiceStatusEnum = pgEnum('provider_service_status', [
  'pending',
  'approved',
  'rejected',
  'suspended',
]);
export const documentStatusEnum = pgEnum('document_status', [
  'pending',
  'verified',
  'rejected',
  'info_required',
]);
export const documentTypeEnum = pgEnum('document_type', [
  'id_proof',
  'address_proof',
  'driving_licence',
  'police_clearance',
  'qualification_certificate',
  'training_certificate',
  'reference_letter',
  'other',
]);
export const qualificationKindEnum = pgEnum('qualification_kind', [
  'qualification',
  'training',
  'certification',
  'work_experience',
]);
export const travelPreferenceEnum = pgEnum('travel_preference', [
  'yes',
  'no',
  'depends_on_distance',
]);
export const availabilityTypeEnum = pgEnum('availability_type', [
  'hourly',
  'part_time',
  'full_time',
  'daily',
  'weekly',
  'flexible',
]);
export const dayPartEnum = pgEnum('day_part', ['morning', 'afternoon', 'evening', 'night']);
export const questionTypeEnum = pgEnum('question_type', [
  'text',
  'textarea',
  'number',
  'boolean',
  'single_select',
  'multi_select',
  'date',
]);

export const requestSourceEnum = pgEnum('request_source', ['quick', 'directed', 'admin']);
export const requestStatusEnum = pgEnum('request_status', [
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
export const invitationStatusEnum = pgEnum('invitation_status', [
  'invited',
  'viewed',
  'accepted',
  'declined',
  'expired',
  'withdrawn',
]);
export const bookingStatusEnum = pgEnum('booking_status', [
  'confirmed',
  'service_started',
  'service_completed',
  'cancelled',
  'disputed',
]);

export const reviewStatusEnum = pgEnum('review_status', ['published', 'hidden']);
export const reportReasonEnum = pgEnum('report_reason', [
  'harassment',
  'unsafe_behaviour',
  'false_information',
  'inappropriate_request',
  'payment_issue',
  'misconduct',
  'other',
]);
export const reportStatusEnum = pgEnum('report_status', [
  'open',
  'investigating',
  'actioned',
  'closed',
]);
export const supportTicketStatusEnum = pgEnum('support_ticket_status', [
  'open',
  'awaiting_user',
  'resolved',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'in_app',
  'push',
  'sms',
  'email',
  'whatsapp',
]);
export const deliveryStatusEnum = pgEnum('delivery_status', [
  'queued',
  'sent',
  'delivered',
  'read',
  'failed',
  'skipped',
]);
export const cmsBlockTypeEnum = pgEnum('cms_block_type', [
  'banner',
  'faq',
  'contact',
  'testimonial',
]);
