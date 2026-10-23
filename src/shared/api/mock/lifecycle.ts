import type { ApplicationDraft, LocalizedText, RequestStatus } from '../types';
import {
  db,
  newId,
  nowIso,
  type MockBooking,
  type MockInvitation,
  type MockProvider,
  type MockProviderService,
  type MockRequest,
} from './db';
import type { LatLng } from './geo';
import { rankCandidates } from './ranking';
import { mockError } from './router';
import { slotsOverlap } from './slots';
import { firstName, isBlockedEitherWay, providerDistanceKm, requestPoint, reviewStats, requireService } from './views';

/** Invitations stay open this long. */
export const INVITATION_TTL_MS = 2 * 60 * 60 * 1000;
/** How many providers a quick request invites. */
export const QUICK_MATCH_LIMIT = 5;
/** Demo provider who accepts manually in the provider app. */
export const DEMO_PROVIDER_PHONE = '+919000000002';

/** App routes used as notification `linkPath`s. */
export const links = {
  customerRequest: (code: string): string => `/customer/requests/${code}`,
  customerBooking: (code: string): string => `/customer/bookings/${code}`,
  providerInvitation: (id: string): string => `/provider/invitations/${id}`,
  providerBooking: (code: string): string => `/provider/bookings/${code}`,
  support: (code: string): string => `/support/${code}`,
  application: '/provider',
};

const OPEN_REQUEST_STATUSES: RequestStatus[] = [
  'submitted',
  'under_review',
  'matching',
  'provider_notified',
  'provider_accepted',
  'provider_declined',
  'customer_confirmation_pending',
];

/** True while a request can still collect acceptances or be cancelled. */
export function isRequestOpen(request: MockRequest): boolean {
  return OPEN_REQUEST_STATUSES.includes(request.status);
}

/** Writes an in-app notification in the user's preferred language. */
export function notify(userId: string, title: LocalizedText, body: LocalizedText, linkPath: string | null): void {
  const user = db.users.get(userId);
  const locale = user?.preferredLocale ?? 'en';
  db.notifications.push({
    id: newId(),
    userId,
    title: title[locale] ?? title.en,
    body: body[locale] ?? body.en,
    linkPath,
    isRead: false,
    createdAt: nowIso(),
  });
}

/** Changes status and appends to the timeline (no-op when unchanged). */
export function setRequestStatus(request: MockRequest, status: RequestStatus, at: string = nowIso()): void {
  if (request.status === status) {
    return;
  }
  request.status = status;
  request.statusChangedAt = at;
  request.timeline.push({ status, at });
}

/** Flips an open invitation to `expired` once past `expiresAt`. */
export function refreshInvitation(invitation: MockInvitation, now: number = Date.now()): MockInvitation {
  if ((invitation.status === 'invited' || invitation.status === 'viewed') && new Date(invitation.expiresAt).getTime() <= now) {
    invitation.status = 'expired';
  }
  return invitation;
}

export function invitationsFor(requestCode: string): MockInvitation[] {
  return [...db.invitations.values()].filter((invitation) => invitation.requestCode === requestCode).map((invitation) => refreshInvitation(invitation));
}

/** Confirmed or in-progress bookings of a provider. */
export function activeBookingsOf(providerId: string): MockBooking[] {
  return [...db.bookings.values()].filter(
    (booking) => booking.providerId === providerId && (booking.status === 'confirmed' || booking.status === 'service_started'),
  );
}

export function hasBookingConflict(providerId: string, startsAt: string, endsAt: string): boolean {
  return activeBookingsOf(providerId).some((booking) => slotsOverlap(booking.startsAt, booking.endsAt, startsAt, endsAt));
}

export function hasExceptionConflict(provider: MockProvider, startsAt: string, endsAt: string): boolean {
  return provider.availability.exceptions.some((exception) => slotsOverlap(exception.startsAt, exception.endsAt, startsAt, endsAt));
}

const LANGUAGE_ALIASES: Record<string, string> = { ml: 'malayalam', en: 'english', ta: 'tamil', hi: 'hindi' };

function matchesLanguage(provider: MockProvider, language: string): boolean {
  const wanted = (LANGUAGE_ALIASES[language.toLowerCase()] ?? language).toLowerCase();
  return provider.languages.some((spoken) => spoken.toLowerCase() === wanted);
}

export interface EligibilityQuery {
  serviceId: string;
  point: LatLng | null;
  radiusKm?: number;
  minExperience?: number;
  language?: string;
  maxBudget?: number;
  slot?: { startsAt: string; endsAt: string };
  callerId: string | null;
}

export interface EligibleProvider {
  provider: MockProvider;
  service: MockProviderService;
  distanceKm: number | null;
}

/**
 * Approved, active, unblocked providers whose service area covers the point, ranked.
 * maxBudget drops non-negotiable providers above budget; negotiable ones stay but rank lower.
 */
export function findEligibleProviders(query: EligibilityQuery): EligibleProvider[] {
  const candidates: (EligibleProvider & { code: string; hourlyRate: number | null; yearsExperience: number | null; averageRating: number | null })[] = [];
  for (const provider of db.providers.values()) {
    const user = db.users.get(provider.userId);
    if (!user || user.status !== 'active' || provider.status !== 'active' || provider.userId === query.callerId) continue;
    const service = provider.services.find((entry) => entry.serviceId === query.serviceId && entry.status === 'approved');
    if (!service) continue;
    if (isBlockedEitherWay(query.callerId, provider.userId)) continue;
    const distanceKm = providerDistanceKm(provider, query.point);
    if (query.point && (distanceKm === null || distanceKm > (provider.radiusKm ?? 0))) continue;
    if (query.radiusKm !== undefined && distanceKm !== null && distanceKm > query.radiusKm) continue;
    const years = service.yearsExperience ?? provider.yearsExperience;
    if (query.minExperience !== undefined && (years ?? 0) < query.minExperience) continue;
    if (query.language && !matchesLanguage(provider, query.language)) continue;
    const hourlyRate = service.rates.hourlyRate;
    if (query.maxBudget !== undefined && !service.rates.isNegotiable && (hourlyRate === null || hourlyRate > query.maxBudget)) continue;
    if (query.slot && (hasBookingConflict(provider.userId, query.slot.startsAt, query.slot.endsAt) || hasExceptionConflict(provider, query.slot.startsAt, query.slot.endsAt))) {
      continue;
    }
    candidates.push({
      provider,
      service,
      distanceKm,
      code: provider.code,
      hourlyRate,
      yearsExperience: years,
      averageRating: reviewStats(provider.userId).averageRating,
    });
  }
  return rankCandidates(candidates, query.maxBudget).map(({ provider, service, distanceKm }) => ({ provider, service, distanceKm }));
}

/** Creates one invitation and tells the provider. */
export function inviteProvider(request: MockRequest, providerId: string): MockInvitation {
  const createdAt = nowIso();
  const invitation: MockInvitation = {
    id: newId(),
    requestCode: request.code,
    providerId,
    status: 'invited',
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS).toISOString(),
    createdAt,
    respondedAt: null,
    declineReason: null,
  };
  db.invitations.set(invitation.id, invitation);
  const service = requireService(request.serviceId);
  const isDirected = request.source === 'directed';
  notify(
    providerId,
    isDirected ? { en: 'A customer picked you', ml: 'ഒരു ഉപഭോക്താവ് നിങ്ങളെ തിരഞ്ഞെടുത്തു' } : { en: 'New job invitation', ml: 'പുതിയ ജോലി ക്ഷണം' },
    {
      en: `${service.name.en} on ${request.preferredDate} at ${request.startTime}. Respond within 2 hours.`,
      ml: `${service.name.ml ?? service.name.en} — ${request.preferredDate}, ${request.startTime}. 2 മണിക്കൂറിനുള്ളിൽ മറുപടി നൽകുക.`,
    },
    links.providerInvitation(invitation.id),
  );
  return invitation;
}

function requestSlot(request: MockRequest): { startsAt: string; endsAt: string } {
  const start = new Date(`${request.preferredDate}T${request.startTime}:00+05:30`).getTime();
  return { startsAt: new Date(start).toISOString(), endsAt: new Date(start + request.durationHours * 3_600_000).toISOString() };
}

/** Quick flow: matching → invite the top providers (plus the demo provider when eligible) → provider_notified. */
export function matchQuickRequest(request: MockRequest): MockInvitation[] {
  setRequestStatus(request, 'matching');
  const eligible = findEligibleProviders({
    serviceId: request.serviceId,
    point: requestPoint(request),
    slot: requestSlot(request),
    callerId: request.customerId,
  });
  const chosen = eligible.slice(0, QUICK_MATCH_LIMIT);
  const demo = eligible.find((entry) => db.users.get(entry.provider.userId)?.phone === DEMO_PROVIDER_PHONE);
  if (demo && !chosen.includes(demo)) {
    chosen.push(demo);
  }
  const invitations = chosen.map((entry) => inviteProvider(request, entry.provider.userId));
  if (invitations.length > 0) {
    setRequestStatus(request, 'provider_notified');
  }
  return invitations;
}

/** Provider accepts: request moves to customer_confirmation_pending and the customer is told. */
export function acceptInvitation(invitation: MockInvitation): void {
  refreshInvitation(invitation);
  if (invitation.status !== 'invited' && invitation.status !== 'viewed') {
    throw mockError(409, 'INVALID_STATE_TRANSITION', `Invitation is ${invitation.status}`);
  }
  const request = db.requests.get(invitation.requestCode);
  if (!request || !isRequestOpen(request)) {
    throw mockError(409, 'INVALID_STATE_TRANSITION', 'Request is no longer open');
  }
  const slot = requestSlot(request);
  if (hasBookingConflict(invitation.providerId, slot.startsAt, slot.endsAt)) {
    throw mockError(409, 'SLOT_UNAVAILABLE', 'You already have a booking at this time');
  }
  invitation.status = 'accepted';
  invitation.respondedAt = nowIso();
  setRequestStatus(request, 'customer_confirmation_pending');
  const providerName = firstName(db.users.get(invitation.providerId)?.fullName ?? 'A provider');
  const service = requireService(request.serviceId);
  notify(
    request.customerId,
    { en: `${providerName} accepted your request`, ml: `${providerName} നിങ്ങളുടെ അഭ്യർത്ഥന സ്വീകരിച്ചു` },
    {
      en: `Review and confirm a provider for ${service.name.en}.`,
      ml: `${service.name.ml ?? service.name.en} — ഒരു സേവനദാതാവിനെ സ്ഥിരീകരിക്കുക.`,
    },
    links.customerRequest(request.code),
  );
}

/** Provider declines; when nobody is left the request becomes provider_declined. */
export function declineInvitation(invitation: MockInvitation, reason: string): void {
  refreshInvitation(invitation);
  if (invitation.status !== 'invited' && invitation.status !== 'viewed') {
    throw mockError(409, 'INVALID_STATE_TRANSITION', `Invitation is ${invitation.status}`);
  }
  invitation.status = 'declined';
  invitation.respondedAt = nowIso();
  invitation.declineReason = reason;
  const request = db.requests.get(invitation.requestCode);
  if (!request || !isRequestOpen(request)) {
    return;
  }
  const isAnyoneLeft = invitationsFor(request.code).some((other) => ['invited', 'viewed', 'accepted'].includes(other.status));
  if (!isAnyoneLeft) {
    setRequestStatus(request, 'provider_declined');
    notify(
      request.customerId,
      { en: 'No provider available', ml: 'സേവനദാതാവിനെ ലഭ്യമല്ല' },
      { en: 'The invited providers could not take this request. Try another time or provider.', ml: 'ക്ഷണിച്ച സേവനദാതാക്കൾക്ക് ഈ അഭ്യർത്ഥന ഏറ്റെടുക്കാനായില്ല. മറ്റൊരു സമയമോ സേവനദാതാവിനെയോ ശ്രമിക്കുക.' },
      links.customerRequest(request.code),
    );
  }
}

/** Withdraws every invitation of a request that is not `keepId`. */
export function withdrawInvitations(requestCode: string, keepId: string | null): void {
  for (const invitation of invitationsFor(requestCode)) {
    if (invitation.id !== keepId && ['invited', 'viewed', 'accepted'].includes(invitation.status)) {
      invitation.status = 'withdrawn';
    }
  }
}

/** Copies wizard answers onto the user and provider rows. */
export function syncProviderFromDraft(provider: MockProvider, draft: ApplicationDraft): void {
  const user = db.users.get(provider.userId);
  if (draft.personal && user) {
    user.fullName = draft.personal.fullName || user.fullName;
    user.dateOfBirth = draft.personal.dateOfBirth;
    user.gender = draft.personal.gender;
    user.whatsappPhone = draft.personal.whatsappPhone;
    user.email = draft.personal.email;
  }
  if (draft.location) {
    provider.districtId = draft.location.districtId;
    provider.localityId = draft.location.localityId;
    if (user) {
      user.districtId = draft.location.districtId;
      user.localityId = draft.location.localityId;
    }
  }
  if (draft.services) {
    const ids = draft.services.serviceIds;
    provider.services = ids.map(
      (serviceId) =>
        provider.services.find((service) => service.serviceId === serviceId) ?? {
          serviceId,
          status: 'pending',
          reviewNote: null,
          yearsExperience: null,
          rates: { hourlyRate: null, dailyRate: null, monthlyRate: null, isNegotiable: false, minBookingMinutes: 60 },
          answers: {},
        },
    );
  }
  for (const details of draft.service_details?.services ?? []) {
    const service = provider.services.find((entry) => entry.serviceId === details.serviceId);
    if (service) {
      service.yearsExperience = details.yearsExperience;
      service.rates = details.rates;
      service.answers = details.answers;
    }
  }
  if (draft.experience) {
    provider.yearsExperience = draft.experience.yearsExperience;
    provider.bio = draft.experience.bio;
    provider.previousWork = draft.experience.previousWork;
    provider.languages = draft.experience.languages;
    provider.qualifications = draft.experience.qualifications;
  }
  if (draft.service_area) {
    provider.latitude = draft.service_area.latitude;
    provider.longitude = draft.service_area.longitude;
    provider.radiusKm = draft.service_area.radiusKm;
    provider.travelPreference = draft.service_area.travelPreference;
  }
  if (draft.availability) {
    provider.availabilityTypes = draft.availability.availabilityTypes;
    provider.dayParts = draft.availability.dayParts;
    provider.availability.rules = draft.availability.rules;
    provider.availability.maxHoursPerDay = draft.availability.maxHoursPerDay;
  }
}

/** submitted → under_review. Idempotent. */
export function startApplicationReview(userId: string, submittedAt: string): void {
  const application = db.applications.get(userId);
  if (!application || application.status !== 'submitted' || application.submittedAt !== submittedAt) {
    return;
  }
  application.status = 'under_review';
  notify(
    userId,
    { en: 'Application under review', ml: 'അപേക്ഷ പരിശോധനയിലാണ്' },
    { en: 'Our team has started reviewing your documents.', ml: 'ഞങ്ങളുടെ ടീം നിങ്ങളുടെ രേഖകൾ പരിശോധിക്കാൻ തുടങ്ങി.' },
    links.application,
  );
}

/** under_review → approved: services approved, documents verified, provider active. Idempotent. */
export function approveApplication(userId: string, submittedAt: string): void {
  const application = db.applications.get(userId);
  const provider = db.providers.get(userId);
  if (!application || !provider || application.status !== 'under_review' || application.submittedAt !== submittedAt) {
    return;
  }
  application.status = 'approved';
  application.decidedAt = nowIso();
  application.decisionNote = null;
  application.infoRequests = [];
  syncProviderFromDraft(provider, application.draft);
  provider.status = 'active';
  provider.services.forEach((service) => {
    service.status = 'approved';
    service.reviewNote = null;
  });
  const documents = [...db.documents.values()].filter((doc) => doc.userId === userId && doc.isFinalised);
  documents
    .filter((doc) => doc.status !== 'rejected')
    .forEach((doc) => {
      doc.status = 'verified';
      doc.reviewNote = null;
    });
  const badges = new Set(provider.badges);
  badges.add('verified');
  if (documents.some((doc) => doc.type === 'police_clearance' && doc.status === 'verified')) badges.add('police_verified');
  if ((provider.yearsExperience ?? 0) >= 5) badges.add('experienced');
  provider.badges = [...badges];
  notify(
    userId,
    { en: 'Application approved', ml: 'അപേക്ഷ അംഗീകരിച്ചു' },
    { en: 'You are now visible to customers and will start receiving invitations.', ml: 'ഇനി ഉപഭോക്താക്കൾക്ക് നിങ്ങളെ കാണാം; ക്ഷണങ്ങൾ ലഭിച്ചു തുടങ്ങും.' },
    links.application,
  );
}

const handledSupportMessages = new Set<string>();

/** Appends the canned support reply to a user message once, and sets awaiting_user. */
export function addSupportAutoReply(ticketCode: string, userMessageId: string): void {
  const ticket = db.tickets.get(ticketCode);
  if (!ticket || handledSupportMessages.has(userMessageId) || ticket.status === 'resolved') {
    return;
  }
  handledSupportMessages.add(userMessageId);
  const user = db.users.get(ticket.userId);
  const isMalayalam = user?.preferredLocale === 'ml';
  ticket.messages.push({
    id: newId(),
    body: isMalayalam
      ? 'ബന്ധപ്പെട്ടതിന് നന്ദി. ഞങ്ങൾ ഇത് പരിശോധിക്കുകയാണ്. കൂടുതൽ വിവരങ്ങൾ ഉണ്ടെങ്കിൽ ഇവിടെ മറുപടി നൽകുക. (ഇത് ഡെമോ മറുപടിയാണ്)'
      : 'Thanks for reaching out. We are looking into this. Reply here if you have anything to add. (Automated demo reply)',
    isFromSupport: true,
    senderName: 'Fix60 Support',
    createdAt: nowIso(),
  });
  ticket.status = 'awaiting_user';
  notify(
    ticket.userId,
    { en: 'Support replied', ml: 'സപ്പോർട്ട് മറുപടി നൽകി' },
    { en: ticket.subject, ml: ticket.subject },
    links.support(ticket.code),
  );
}
