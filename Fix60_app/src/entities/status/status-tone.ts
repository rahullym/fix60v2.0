import type {
  ApplicationStatus,
  BookingStatus,
  DocumentStatus,
  InvitationStatus,
  ProviderServiceStatus,
  RequestStatus,
} from '@/shared/api/types';
import type { PillTone } from '@/shared/ui';

/** Pill tones per lifecycle status. Labels live in `common:<kind>Status.<value>`. */
export const requestStatusTone: Record<RequestStatus, PillTone> = {
  submitted: 'info',
  under_review: 'info',
  matching: 'info',
  provider_notified: 'info',
  provider_accepted: 'accent',
  provider_declined: 'warning',
  customer_confirmation_pending: 'accent',
  booking_confirmed: 'success',
  cancelled: 'neutral',
  disputed: 'danger',
};

export const bookingStatusTone: Record<BookingStatus, PillTone> = {
  confirmed: 'success',
  service_started: 'accent',
  service_completed: 'neutral',
  cancelled: 'neutral',
  disputed: 'danger',
};

export const invitationStatusTone: Record<InvitationStatus, PillTone> = {
  invited: 'accent',
  viewed: 'info',
  accepted: 'success',
  declined: 'neutral',
  expired: 'neutral',
  withdrawn: 'neutral',
};

export const applicationStatusTone: Record<ApplicationStatus, PillTone> = {
  draft: 'info',
  submitted: 'info',
  under_review: 'info',
  info_required: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export const serviceStatusTone: Record<ProviderServiceStatus, PillTone> = {
  pending: 'info',
  approved: 'success',
  rejected: 'danger',
  suspended: 'warning',
};

export const documentStatusTone: Record<DocumentStatus, PillTone> = {
  pending: 'info',
  verified: 'success',
  rejected: 'danger',
  info_required: 'warning',
};
