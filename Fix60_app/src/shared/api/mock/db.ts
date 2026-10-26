import type {
  Badge,
  Banner,
  BookingStatus,
  Category,
  CmsPage,
  ConsentType,
  District,
  Faq,
  Gender,
  InAppNotification,
  InvitationStatus,
  Locale,
  Locality,
  ProviderApplication,
  ProviderAvailability,
  ProviderPublicProfile,
  ProviderRates,
  ProviderServiceStatus,
  ProviderStatus,
  ReportReason,
  ReportReceipt,
  RequestSource,
  RequestStatus,
  ServiceDetail,
  SupportMessage,
  SupportTicketStatus,
  TravelPreference,
  AvailabilityType,
  DayPart,
  UserRole,
  UserStatus,
  VerificationDocument,
} from '../types';
import { mockError } from './router';

/** Mock-only user row (superset of `Me`). */
export interface MockUser {
  id: string;
  role: UserRole;
  status: UserStatus;
  fullName: string;
  phone: string;
  whatsappPhone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  preferredLocale: Locale | string;
  districtId: string | null;
  localityId: string | null;
  providerCode: string | null;
  createdAt: string;
  consents: Record<ConsentType, boolean>;
  deletionScheduledFor: string | null;
}

export type Qualification = ProviderPublicProfile['qualifications'][number];

/** One service a provider offers (or applied for). */
export interface MockProviderService {
  serviceId: string;
  status: ProviderServiceStatus;
  reviewNote: string | null;
  yearsExperience: number | null;
  rates: ProviderRates;
  answers: Record<string, string | number | boolean | string[]>;
}

/** Provider profile row, keyed by user id. */
export interface MockProvider {
  userId: string;
  code: string;
  status: ProviderStatus;
  photoUrl: string | null;
  bio: string | null;
  previousWork: string | null;
  languages: string[];
  yearsExperience: number | null;
  travelPreference: TravelPreference | null;
  availabilityTypes: AvailabilityType[];
  dayParts: DayPart[];
  qualifications: Qualification[];
  districtId: string | null;
  localityId: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
  badges: Badge[];
  services: MockProviderService[];
  availability: ProviderAvailability;
  memberSince: string;
  /** Seeded providers the simulation may auto-accept for. */
  isSimulated: boolean;
}

export interface MockDocument extends VerificationDocument {
  userId: string;
  /** False between upload-url and finalise. */
  isFinalised: boolean;
}

export interface MockRequest {
  code: string;
  customerId: string;
  source: RequestSource;
  status: RequestStatus;
  serviceId: string;
  targetProviderId: string | null;
  localityId: string;
  latitude: number;
  longitude: number;
  areaNote: string | null;
  preferredDate: string;
  startTime: string;
  durationHours: number;
  budgetAmount: number | null;
  requirements: string | null;
  contactPhone: string;
  contactWhatsapp: string | null;
  createdAt: string;
  statusChangedAt: string;
  bookingCode: string | null;
  timeline: { status: RequestStatus; at: string }[];
  cancelReason: string | null;
}

export interface MockInvitation {
  id: string;
  requestCode: string;
  providerId: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  respondedAt: string | null;
  declineReason: string | null;
}

export interface MockBooking {
  code: string;
  requestCode: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  durationHours: number;
  agreedHourlyRate: number | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: 'customer' | 'provider' | 'admin' | 'system' | null;
  cancelReason: string | null;
  review: { rating: number; comment: string | null; createdAt: string } | null;
}

export interface MockReview {
  id: string;
  providerId: string;
  serviceId: string;
  rating: number;
  comment: string | null;
  customerFirstName: string;
  createdAt: string;
  bookingCode: string | null;
}

export interface MockTicket {
  code: string;
  userId: string;
  subject: string;
  status: SupportTicketStatus;
  bookingCode: string | null;
  createdAt: string;
  messages: SupportMessage[];
}

export interface MockNotification extends InAppNotification {
  userId: string;
}

export interface MockBlock {
  blockerId: string;
  blockedId: string;
  blockedAt: string;
}

export interface MockReport extends ReportReceipt {
  reporterId: string;
  subjectUserId: string;
  reason: ReportReason;
  details: string | null;
  bookingCode: string | null;
  requestCode: string | null;
}

export interface MockCategory extends Omit<Category, 'services'> {
  sortOrder: number;
}

export type CodeKind = 'request' | 'booking' | 'report' | 'ticket' | 'application' | 'provider';

let idCounter = 0;

/** UUID-shaped id, stable per session. */
export function newId(): string {
  idCounter += 1;
  const hex = idCounter.toString(16).padStart(12, '0');
  return `00000000-0000-7000-8000-${hex}`;
}

export const nowIso = (): string => new Date().toISOString();

type RegisteredListener = (user: MockUser) => void;
const registeredListeners: RegisteredListener[] = [];

const CODE_PREFIX: Record<Exclude<CodeKind, 'provider'>, string> = {
  request: 'REQ',
  booking: 'BKG',
  report: 'RPT',
  ticket: 'TKT',
  application: 'APP',
};

/** In-memory state for the mock API. Collections are filled by seed.ts. */
export const db = {
  users: new Map<string, MockUser>(),
  refreshTokens: new Map<string, string>(),

  districts: [] as District[],
  localities: [] as Locality[],
  categories: [] as MockCategory[],
  /** Keyed by service id. */
  services: new Map<string, ServiceDetail>(),
  banners: [] as { audience: UserRole; banner: Banner }[],
  pages: new Map<string, CmsPage>(),
  faqs: [] as { audience: UserRole; faq: Faq }[],

  /** Keyed by user id. */
  providers: new Map<string, MockProvider>(),
  /** Keyed by user id. */
  applications: new Map<string, ProviderApplication>(),
  documents: new Map<string, MockDocument>(),
  requests: new Map<string, MockRequest>(),
  invitations: new Map<string, MockInvitation>(),
  bookings: new Map<string, MockBooking>(),
  reviews: [] as MockReview[],
  /** customer id → provider user ids. */
  savedProviders: new Map<string, Set<string>>(),
  blocks: [] as MockBlock[],
  reports: [] as MockReport[],
  tickets: new Map<string, MockTicket>(),
  notifications: [] as MockNotification[],
  devices: new Map<string, { token: string; platform: string; registeredAt: string }[]>(),
  /** user id → consent type → last change. */
  consentUpdatedAt: new Map<string, Partial<Record<ConsentType, string>>>(),

  counters: { request: 0, booking: 0, report: 0, ticket: 0, application: 0, provider: 1000 } as Record<CodeKind, number>,

  /** Next public code, e.g. `REQ-26-000012`, `APP-26-000003`, `PRV-1016`. */
  nextCode(kind: CodeKind): string {
    this.counters[kind] += 1;
    const n = this.counters[kind];
    if (kind === 'provider') {
      return `PRV-${n}`;
    }
    const year = String(new Date().getFullYear()).slice(2);
    return `${CODE_PREFIX[kind]}-${year}-${String(n).padStart(6, '0')}`;
  },

  requireUser(userId: string): MockUser {
    const user = this.users.get(userId);
    if (!user) {
      throw mockError(404, 'NOT_FOUND', 'User not found');
    }
    return user;
  },

  /** Lets feature modules create role-specific rows (e.g. a provider application) on signup. */
  onUserRegistered(user: MockUser): void {
    registeredListeners.forEach((listener) => listener(user));
  },

  addRegisteredListener(listener: RegisteredListener): void {
    registeredListeners.push(listener);
  },
};
