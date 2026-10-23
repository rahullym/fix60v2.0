/**
 * Fix60 REST contract (`/api/v1`) as consumed by the app.
 * Mirrors `@fix60/shared` in fix60_backend where it already exists (auth, me, consents, branding);
 * the rest follows docs/plan/phase1-plan.md §7 and is documented in docs/api-contract.md.
 */

export type Uuid = string;
export type IsoDateTime = string;
/** YYYY-MM-DD */
export type IsoDate = string;
/** HH:mm (24h, Asia/Kolkata) */
export type ClockTime = string;

export type Locale = 'en' | 'ml';
/** Text per locale; `en` is always present. */
export type LocalizedText = { en: string } & Partial<Record<string, string>>;

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
export interface ItemList<T> {
  items: T[];
}

/* ───────────────────────────── Errors ───────────────────────────── */

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'INVALID_FIREBASE_TOKEN'
  | 'APP_CHECK_FAILED'
  | 'REGISTRATION_REQUIRED'
  | 'ALREADY_REGISTERED'
  | 'ROLE_MISMATCH'
  | 'UNDERAGE'
  | 'CONSENT_REQUIRED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_DELETED'
  | 'INVALID_REFRESH_TOKEN'
  | 'REFRESH_TOKEN_REUSED'
  | 'INVALID_STATE_TRANSITION'
  | 'UPLOAD_FAILED'
  | 'SLOT_UNAVAILABLE'
  | 'NETWORK_ERROR';

export interface ApiErrorBody {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  requestId?: string;
  code?: ErrorCode;
  issues?: { path: string; message: string }[];
}

/* ───────────────────────────── Auth & me ───────────────────────────── */

export type UserRole = 'customer' | 'provider';
export type UserStatus = 'active' | 'suspended' | 'pending_deletion' | 'deleted';
export type Gender = 'female' | 'male' | 'other' | 'prefer_not_to_say';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
}

export interface Me {
  id: Uuid;
  role: UserRole;
  status: UserStatus;
  fullName: string;
  phone: string | null;
  whatsappPhone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  preferredLocale: string;
  districtId: Uuid | null;
  localityId: Uuid | null;
  providerCode: string | null;
}

export type FirebaseSignInResponse =
  | ({ status: 'authenticated'; user: Me } & AuthTokens)
  | { status: 'registration_required'; phone: string };

export type AuthSessionResponse = { user: Me } & AuthTokens;

export interface RegistrationConsents {
  terms: true;
  privacy: true;
  safetyPolicy: true;
  serviceCommunications: boolean;
  whatsappUpdates: boolean;
}

export interface RegisterCustomerRequest {
  idToken: string;
  role: 'customer';
  fullName: string;
  email?: string;
  whatsappPhone?: string;
  dateOfBirth?: IsoDate;
  districtId?: Uuid;
  localityId?: Uuid;
  preferredLocale: Locale;
  consents: RegistrationConsents;
}

export interface RegisterProviderRequest {
  idToken: string;
  role: 'provider';
  fullName: string;
  dateOfBirth: IsoDate;
  confirmsAdult: true;
  email?: string;
  whatsappPhone?: string;
  preferredLocale: Locale;
  consents: RegistrationConsents;
}

export type RegisterRequest = RegisterCustomerRequest | RegisterProviderRequest;

export interface UpdateMeRequest {
  fullName?: string;
  email?: string | null;
  whatsappPhone?: string | null;
  gender?: Gender | null;
  preferredLocale?: Locale;
  districtId?: Uuid | null;
  localityId?: Uuid | null;
}

export type ConsentType =
  | 'terms'
  | 'privacy'
  | 'safety_policy'
  | 'service_communications'
  | 'whatsapp_updates'
  | 'marketing'
  | 'provider_declaration';

export interface ConsentState {
  type: ConsentType;
  isGranted: boolean;
  policyVersion: string;
  updatedAt: IsoDateTime;
}

export interface UpdateConsentsRequest {
  serviceCommunications?: boolean;
  whatsappUpdates?: boolean;
  marketing?: boolean;
}

export interface DeletionRequestState {
  status: 'none' | 'scheduled';
  scheduledFor: IsoDateTime | null;
}

export interface RegisterDeviceRequest {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

/* ───────────────────────────── Branding & CMS ───────────────────────────── */

export interface ThemeTokens {
  primary: string;
  primaryMid: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  railMid: string;
  railDeep: string;
  tintSecondary: string;
  tintTertiary: string;
  surfaceMuted: string;
  surfaceFog: string;
  fontHeading?: string;
  fontBody?: string;
}

export interface PublicBranding {
  name: string;
  logoUrl: string | null;
  theme: ThemeTokens;
}

export interface OrganizationSettings {
  supportPhone: string | null;
  supportWhatsapp: string | null;
  supportEmail: string | null;
  companyAddress: string | null;
  grievanceOfficerName: string | null;
  grievanceOfficerEmail: string | null;
}

export interface Banner {
  id: Uuid;
  title: LocalizedText;
  body: LocalizedText | null;
  imageUrl: string | null;
  /** In-app route, e.g. `/service/house-cleaning`. */
  linkPath: string | null;
}

export type PolicySlug = 'terms' | 'privacy' | 'safety-policy' | 'provider-agreement' | 'about';

export interface CmsPage {
  slug: PolicySlug | string;
  title: LocalizedText;
  /** Markdown per locale. */
  body: LocalizedText;
  version: string;
  updatedAt: IsoDateTime;
}

export interface Faq {
  id: Uuid;
  question: LocalizedText;
  answer: LocalizedText;
}

/* ───────────────────────────── Locations ───────────────────────────── */

export interface District {
  id: Uuid;
  slug: string;
  name: LocalizedText;
}

export interface Locality {
  id: Uuid;
  districtId: Uuid;
  slug: string;
  name: LocalizedText;
  localBody: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
}

/* ───────────────────────────── Catalog ───────────────────────────── */

export type DocumentType =
  | 'id_proof'
  | 'address_proof'
  | 'driving_licence'
  | 'police_clearance'
  | 'qualification_certificate'
  | 'training_certificate'
  | 'reference_letter'
  | 'other';

export interface ServiceSummary {
  id: Uuid;
  slug: string;
  categoryId: Uuid;
  name: LocalizedText;
  description: LocalizedText | null;
  imageUrl: string | null;
}

export interface Category {
  id: Uuid;
  slug: string;
  name: LocalizedText;
  description: LocalizedText | null;
  imageUrl: string | null;
  services: ServiceSummary[];
}

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'single_select'
  | 'multi_select'
  | 'date';

export interface ServiceQuestion {
  id: Uuid;
  key: string;
  type: QuestionType;
  label: LocalizedText;
  helpText: LocalizedText | null;
  options: { value: string; label: LocalizedText }[] | null;
  isRequired: boolean;
}

export interface ServiceRequiredDocument {
  documentType: DocumentType;
  isMandatory: boolean;
  note: LocalizedText | null;
}

export interface ServiceDetail extends ServiceSummary {
  eligibility: { minYearsExperience?: number; requiresGender?: boolean };
  requiredDocuments: ServiceRequiredDocument[];
  questions: ServiceQuestion[];
}

/* ───────────────────────────── Providers (public) ───────────────────────────── */

export type Badge = 'verified' | 'police_verified' | 'experienced' | 'top_rated';
export type TravelPreference = 'yes' | 'no' | 'depends_on_distance';
export type AvailabilityType = 'hourly' | 'part_time' | 'full_time' | 'daily' | 'weekly' | 'flexible';
export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

export interface ProviderRates {
  hourlyRate: number | null;
  dailyRate: number | null;
  monthlyRate: number | null;
  isNegotiable: boolean;
  minBookingMinutes: number;
}

/** Whitelisted public DTO (search results). */
export interface ProviderCard {
  code: string;
  /** User id, used for reports and blocks. */
  userId: Uuid;
  displayName: string;
  photoUrl: string | null;
  localityName: LocalizedText | null;
  districtName: LocalizedText | null;
  yearsExperience: number | null;
  languages: string[];
  badges: Badge[];
  /** Null until the provider has ≥ 3 published reviews. */
  averageRating: number | null;
  reviewCount: number;
  distanceKm: number | null;
  /** Rates for the searched service, when a service was searched. */
  rates: ProviderRates | null;
  isSaved: boolean;
}

export interface ProviderPublicService {
  service: ServiceSummary;
  yearsExperience: number | null;
  rates: ProviderRates;
}

export interface PublicReview {
  id: Uuid;
  rating: number;
  comment: string | null;
  customerFirstName: string;
  serviceName: LocalizedText;
  createdAt: IsoDateTime;
}

export interface ProviderPublicProfile extends ProviderCard {
  bio: string | null;
  travelPreference: TravelPreference | null;
  availabilityTypes: AvailabilityType[];
  dayParts: DayPart[];
  services: ProviderPublicService[];
  qualifications: { kind: QualificationKind; title: string; issuer: string | null; year: number | null }[];
  recentReviews: PublicReview[];
  memberSince: IsoDateTime;
}

export interface ProviderSearchQuery {
  serviceId: Uuid;
  localityId?: Uuid;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  date?: IsoDate;
  startTime?: ClockTime;
  durationHours?: number;
  maxBudget?: number;
  minExperience?: number;
  language?: string;
  page?: number;
  pageSize?: number;
}

/* ───────────────────────────── Requests & invitations ───────────────────────────── */

export type RequestSource = 'quick' | 'directed' | 'admin';
export type RequestStatus =
  | 'submitted'
  | 'under_review'
  | 'matching'
  | 'provider_notified'
  | 'provider_accepted'
  | 'provider_declined'
  | 'customer_confirmation_pending'
  | 'booking_confirmed'
  | 'cancelled'
  | 'disputed';

export type InvitationStatus = 'invited' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'withdrawn';

export interface CreateRequestRequest {
  serviceId: Uuid;
  /** Present for a directed request (customer picked this provider). */
  providerCode?: string;
  localityId: Uuid;
  latitude?: number;
  longitude?: number;
  areaNote?: string;
  preferredDate: IsoDate;
  startTime: ClockTime;
  durationHours: number;
  budgetAmount?: number;
  requirements?: string;
  contactPhone: string;
  contactWhatsapp?: string;
}

export interface ServiceRequestSummary {
  code: string;
  source: RequestSource;
  status: RequestStatus;
  service: ServiceSummary;
  localityName: LocalizedText;
  preferredDate: IsoDate;
  startTime: ClockTime;
  durationHours: number;
  budgetAmount: number | null;
  /** Providers who accepted and await the customer's choice. */
  acceptedCount: number;
  createdAt: IsoDateTime;
  statusChangedAt: IsoDateTime;
  bookingCode: string | null;
}

export interface AcceptedInvitation {
  invitationId: Uuid;
  provider: ProviderCard;
  respondedAt: IsoDateTime;
}

export interface ServiceRequestDetail extends ServiceRequestSummary {
  areaNote: string | null;
  requirements: string | null;
  contactPhone: string;
  contactWhatsapp: string | null;
  targetProvider: ProviderCard | null;
  acceptedInvitations: AcceptedInvitation[];
  timeline: { status: RequestStatus; at: IsoDateTime }[];
  cancelReason: string | null;
}

/** What a provider sees before accepting: no customer contact or full address. */
export interface ProviderInvitation {
  id: Uuid;
  status: InvitationStatus;
  expiresAt: IsoDateTime;
  distanceKm: number | null;
  request: {
    code: string;
    source: RequestSource;
    service: ServiceSummary;
    localityName: LocalizedText;
    districtName: LocalizedText;
    preferredDate: IsoDate;
    startTime: ClockTime;
    durationHours: number;
    budgetAmount: number | null;
    requirements: string | null;
    customerFirstName: string;
  };
  createdAt: IsoDateTime;
  respondedAt: IsoDateTime | null;
}

/* ───────────────────────────── Bookings ───────────────────────────── */

export type BookingStatus = 'confirmed' | 'service_started' | 'service_completed' | 'cancelled' | 'disputed';

export interface BookingCounterparty {
  userId: Uuid;
  displayName: string;
  photoUrl: string | null;
  phone: string;
  whatsappPhone: string | null;
  providerCode: string | null;
}

export interface Booking {
  code: string;
  requestCode: string;
  status: BookingStatus;
  service: ServiceSummary;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  durationHours: number;
  agreedHourlyRate: number | null;
  localityName: LocalizedText;
  /** Full address / landmark, shared after confirmation. */
  areaNote: string | null;
  latitude: number | null;
  longitude: number | null;
  requirements: string | null;
  /** The other party: provider for customers, customer for providers. */
  counterparty: BookingCounterparty;
  startedAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  cancelledAt: IsoDateTime | null;
  cancelledBy: 'customer' | 'provider' | 'admin' | 'system' | null;
  cancelReason: string | null;
  review: { rating: number; comment: string | null; createdAt: IsoDateTime } | null;
  canReview: boolean;
  canCancel: boolean;
}

export type BookingScope = 'upcoming' | 'active' | 'past';

export interface CancelRequest {
  reason: string;
}

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
}

/* ───────────────────────────── Safety & support ───────────────────────────── */

export type ReportReason =
  | 'harassment'
  | 'unsafe_behaviour'
  | 'false_information'
  | 'inappropriate_request'
  | 'payment_issue'
  | 'misconduct'
  | 'other';

export interface CreateReportRequest {
  subjectUserId: Uuid;
  reason: ReportReason;
  details?: string;
  bookingCode?: string;
  requestCode?: string;
}

export interface ReportReceipt {
  code: string;
  status: 'open' | 'investigating' | 'actioned' | 'closed';
  createdAt: IsoDateTime;
}

export interface BlockedUser {
  userId: Uuid;
  displayName: string;
  blockedAt: IsoDateTime;
}

export type SupportTicketStatus = 'open' | 'awaiting_user' | 'resolved';

export interface SupportTicket {
  code: string;
  subject: string;
  status: SupportTicketStatus;
  bookingCode: string | null;
  lastMessageAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

export interface SupportMessage {
  id: Uuid;
  body: string;
  isFromSupport: boolean;
  senderName: string;
  createdAt: IsoDateTime;
}

export interface SupportTicketDetail extends SupportTicket {
  messages: SupportMessage[];
}

export interface CreateTicketRequest {
  subject: string;
  message: string;
  bookingCode?: string;
}

/* ───────────────────────────── Notifications ───────────────────────────── */

export interface InAppNotification {
  id: Uuid;
  title: string;
  body: string;
  /** In-app route to open, e.g. `/customer/requests/REQ-26-000012`. */
  linkPath: string | null;
  isRead: boolean;
  createdAt: IsoDateTime;
}

/* ───────────────────────────── Provider self-service ───────────────────────────── */

export type ProviderStatus = 'onboarding' | 'active' | 'suspended';
export type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'info_required' | 'approved' | 'rejected';
export type ProviderServiceStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type DocumentStatus = 'pending' | 'verified' | 'rejected' | 'info_required';
export type QualificationKind = 'qualification' | 'training' | 'certification' | 'work_experience';

/** 1-based wizard steps. */
export const APPLICATION_STEPS = [
  'personal',
  'location',
  'services',
  'service_details',
  'experience',
  'service_area',
  'availability',
  'documents',
  'review',
] as const;
export type ApplicationStepKey = (typeof APPLICATION_STEPS)[number];

export interface ApplicationDraft {
  personal?: { fullName: string; dateOfBirth: IsoDate; gender: Gender | null; whatsappPhone: string | null; email: string | null };
  location?: { districtId: Uuid; localityId: Uuid; addressNote: string | null };
  services?: { serviceIds: Uuid[] };
  service_details?: {
    services: {
      serviceId: Uuid;
      yearsExperience: number | null;
      rates: ProviderRates;
      answers: Record<string, string | number | boolean | string[]>;
    }[];
  };
  experience?: {
    yearsExperience: number | null;
    bio: string | null;
    previousWork: string | null;
    languages: string[];
    qualifications: { kind: QualificationKind; title: string; issuer: string | null; year: number | null }[];
  };
  service_area?: { latitude: number; longitude: number; radiusKm: number; travelPreference: TravelPreference };
  availability?: {
    availabilityTypes: AvailabilityType[];
    dayParts: DayPart[];
    maxHoursPerDay: number | null;
    rules: AvailabilityRule[];
  };
  /** Documents are uploaded separately; this step only records the acknowledgement. */
  documents?: { acknowledged: boolean };
  review?: { declarationAccepted: boolean };
}

export interface ProviderApplication {
  code: string;
  status: ApplicationStatus;
  currentStep: number;
  draft: ApplicationDraft;
  /** Steps the server considers complete. */
  completedSteps: ApplicationStepKey[];
  submittedAt: IsoDateTime | null;
  decidedAt: IsoDateTime | null;
  decisionNote: string | null;
  /** Per-field notes from the reviewer when status is info_required. */
  infoRequests: { step: ApplicationStepKey; message: string }[];
}

export interface SaveStepRequest<K extends ApplicationStepKey = ApplicationStepKey> {
  data: NonNullable<ApplicationDraft[K]>;
}

export interface VerificationDocument {
  id: Uuid;
  type: DocumentType;
  serviceId: Uuid | null;
  fileName: string | null;
  mimeType: string;
  sizeBytes: number | null;
  idNumberLast4: string | null;
  status: DocumentStatus;
  reviewNote: string | null;
  uploadedAt: IsoDateTime | null;
}

export interface UploadUrlRequest {
  type: DocumentType;
  mimeType: 'image/jpeg' | 'image/png' | 'application/pdf';
  sizeBytes: number;
  fileName?: string;
  serviceId?: Uuid;
}

export interface UploadUrlResponse {
  documentId: Uuid;
  uploadUrl: string;
  /** Headers the PUT must send (e.g. Content-Type). */
  headers: Record<string, string>;
  expiresAt: IsoDateTime;
}

export interface FinaliseDocumentRequest {
  idNumberLast4?: string;
}

export interface AvailabilityRule {
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  startTime: ClockTime;
  endTime: ClockTime;
}

export interface AvailabilityException {
  id: Uuid;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  reason: string | null;
}

export interface ProviderAvailability {
  rules: AvailabilityRule[];
  maxHoursPerDay: number | null;
  exceptions: AvailabilityException[];
}

export interface ProviderSelfService {
  serviceId: Uuid;
  service: ServiceSummary;
  status: ProviderServiceStatus;
  reviewNote: string | null;
  yearsExperience: number | null;
  rates: ProviderRates;
}

export interface ProviderSelf {
  code: string;
  status: ProviderStatus;
  applicationStatus: ApplicationStatus | null;
  services: ProviderSelfService[];
  /** Present once approved. */
  publicProfile: ProviderPublicProfile | null;
  stats: { upcomingBookings: number; completedBookings: number; pendingInvitations: number };
}
