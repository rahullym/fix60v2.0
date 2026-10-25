import {
  APPLICATION_STEPS,
  type ApplicationDraft,
  type ApplicationStepKey,
  type AvailabilityRule,
  type AvailabilityType,
  type DayPart,
  type DocumentType,
  type Gender,
  type InvitationStatus,
  type ProviderApplication,
  type ProviderRates,
  type QualificationKind,
  type TravelPreference,
} from '../types';
import { ageFrom } from '../../lib/format';
import { db, newId, nowIso, type MockDocument, type MockProvider, type MockUser, type Qualification } from './db';
import { toLanguageCodes } from './languages';
import {
  acceptInvitation,
  declineInvitation,
  links,
  notify,
  refreshInvitation,
  syncProviderFromDraft,
} from './lifecycle';
import { listBookings, ownBooking } from './customer-handlers';
import { mockError, noContent, ok, requireRole, route } from './router';
import { scheduleApplicationReview } from './simulation';
import { isClockTime, isIsoDate, parseTimestamp } from './slots';
import { asObject, invalid, optionalNumber, optionalText, requireText } from './validation';
import { applicationView, bookingScope, bookingView, documentView, findLocality, invitationView, providerSelf, requireService } from './views';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const DOCUMENT_TYPES: DocumentType[] = [
  'id_proof',
  'address_proof',
  'driving_licence',
  'police_clearance',
  'qualification_certificate',
  'training_certificate',
  'reference_letter',
  'other',
];
const INVITATION_STATUSES: (InvitationStatus | 'open')[] = ['open', 'invited', 'viewed', 'accepted', 'declined', 'expired', 'withdrawn'];
/** Steps 1–7 must be complete before submitting. */
const REQUIRED_BEFORE_SUBMIT: ApplicationStepKey[] = APPLICATION_STEPS.slice(0, 7);
const START_WINDOW_MS = 60 * 60 * 1000;
const GENDERS: Gender[] = ['female', 'male', 'other', 'prefer_not_to_say'];
const TRAVEL_PREFERENCES: TravelPreference[] = ['yes', 'no', 'depends_on_distance'];
const QUALIFICATION_KINDS: QualificationKind[] = ['qualification', 'training', 'certification', 'work_experience'];

/** Creates the provider row and draft application for a provider user if they are missing. */
export function ensureProviderRows(user: MockUser): { provider: MockProvider; application: ProviderApplication } {
  let provider = db.providers.get(user.id);
  if (!provider) {
    user.providerCode = db.nextCode('provider');
    provider = {
      userId: user.id,
      code: user.providerCode,
      status: 'onboarding',
      photoUrl: null,
      bio: null,
      previousWork: null,
      languages: [],
      yearsExperience: null,
      travelPreference: null,
      availabilityTypes: [],
      dayParts: [],
      qualifications: [],
      districtId: null,
      localityId: null,
      latitude: null,
      longitude: null,
      radiusKm: null,
      badges: [],
      services: [],
      availability: { rules: [], maxHoursPerDay: null, exceptions: [] },
      memberSince: user.createdAt,
      isSimulated: false,
    };
    db.providers.set(user.id, provider);
  }
  let application = db.applications.get(user.id);
  if (!application) {
    application = {
      code: db.nextCode('application'),
      status: 'draft',
      currentStep: 1,
      draft: {},
      completedSteps: [],
      submittedAt: null,
      decidedAt: null,
      decisionNote: null,
      infoRequests: [],
    };
    db.applications.set(user.id, application);
  }
  return { provider, application };
}

function rowsFor(userId: string): { provider: MockProvider; application: ProviderApplication; user: MockUser } {
  const user = db.requireUser(userId);
  return { ...ensureProviderRows(user), user };
}

function validateRules(value: unknown): AvailabilityRule[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw invalid('rules must be an array');
  }
  return value.map((raw, index) => {
    const rule = asObject(raw);
    const weekday = rule.weekday;
    if (typeof weekday !== 'number' || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw invalid(`rules[${index}].weekday must be 0–6`);
    }
    if (!isClockTime(rule.startTime) || !isClockTime(rule.endTime) || rule.startTime >= rule.endTime) {
      throw invalid(`rules[${index}] needs HH:mm startTime before endTime`);
    }
    return { weekday, startTime: rule.startTime, endTime: rule.endTime };
  });
}

function validateMaxHours(value: unknown): number | null {
  const hours = optionalNumber(value, 'maxHoursPerDay');
  if (hours === undefined) return null;
  if (hours <= 0 || hours > 24) {
    throw invalid('maxHoursPerDay must be 1–24');
  }
  return hours;
}

/** Light shape checks per wizard step. */
function validateStep(step: ApplicationStepKey, data: Record<string, unknown>, draft: ApplicationDraft): void {
  switch (step) {
    case 'personal': {
      requireText(data.fullName, 'fullName', 120);
      if (!isIsoDate(data.dateOfBirth)) throw invalid('dateOfBirth must be YYYY-MM-DD');
      if (ageFrom(data.dateOfBirth) < 18) throw mockError(422, 'UNDERAGE', 'Providers must be 18 or older');
      return;
    }
    case 'location': {
      const locality = typeof data.localityId === 'string' ? findLocality(data.localityId) : undefined;
      if (!locality || locality.districtId !== data.districtId) throw invalid('Unknown district or locality');
      return;
    }
    case 'services': {
      const ids = data.serviceIds;
      if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== 'string' || !db.services.has(id))) {
        throw invalid('Pick at least one known service');
      }
      return;
    }
    case 'service_details': {
      const services = data.services;
      if (!Array.isArray(services)) throw invalid('services must be an array');
      const chosen = draft.services?.serviceIds ?? [];
      for (const raw of services) {
        const entry = asObject(raw);
        if (typeof entry.serviceId !== 'string' || !chosen.includes(entry.serviceId)) throw invalid('service_details lists a service not picked in step 3');
      }
      return;
    }
    case 'experience': {
      if (data.languages !== undefined && data.languages !== null && !Array.isArray(data.languages)) throw invalid('languages must be an array');
      if (data.qualifications !== undefined && !Array.isArray(data.qualifications)) throw invalid('qualifications must be an array');
      return;
    }
    case 'service_area': {
      const latitude = optionalNumber(data.latitude, 'latitude');
      const longitude = optionalNumber(data.longitude, 'longitude');
      const radiusKm = optionalNumber(data.radiusKm, 'radiusKm');
      if (latitude === undefined || longitude === undefined) throw invalid('latitude and longitude are required');
      if (radiusKm === undefined || radiusKm < 1 || radiusKm > 50) throw invalid('radiusKm must be 1–50');
      return;
    }
    case 'availability': {
      validateRules(data.rules);
      validateMaxHours(data.maxHoursPerDay);
      return;
    }
    case 'documents': {
      if (typeof data.acknowledged !== 'boolean') throw invalid('acknowledged must be a boolean');
      return;
    }
    case 'review': {
      if (typeof data.declarationAccepted !== 'boolean') throw invalid('declarationAccepted must be a boolean');
      return;
    }
  }
}

const DEFAULT_RATES: ProviderRates = { hourlyRate: null, dailyRate: null, monthlyRate: null, isNegotiable: false, minBookingMinutes: 60 };

const nullableText = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);
const nullableNumber = (value: unknown): number | null => {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
};
const stringList = <T extends string>(value: unknown): T[] => (Array.isArray(value) ? value.filter((entry): entry is T => typeof entry === 'string') : []);

function normalizeRates(value: unknown): ProviderRates {
  const rates = typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    hourlyRate: nullableNumber(rates.hourlyRate),
    dailyRate: nullableNumber(rates.dailyRate),
    monthlyRate: nullableNumber(rates.monthlyRate),
    isNegotiable: rates.isNegotiable === true,
    minBookingMinutes: nullableNumber(rates.minBookingMinutes) ?? DEFAULT_RATES.minBookingMinutes,
  };
}

function normalizeAnswers(value: unknown): Record<string, string | number | boolean | string[]> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const answers: Record<string, string | number | boolean | string[]> = {};
  for (const [key, answer] of Object.entries(value)) {
    if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean') answers[key] = answer;
    else if (Array.isArray(answer)) answers[key] = answer.filter((entry): entry is string => typeof entry === 'string');
  }
  return answers;
}

function normalizeQualifications(value: unknown): Qualification[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    .map((entry) => ({
      kind: (QUALIFICATION_KINDS as string[]).includes(entry.kind as string) ? (entry.kind as QualificationKind) : 'qualification',
      title: nullableText(entry.title) ?? '',
      issuer: nullableText(entry.issuer),
      year: nullableNumber(entry.year),
    }))
    .filter((entry) => entry.title !== '');
}

/** Validated step data with every optional field filled, so later reads never meet `undefined`. */
function normalizeStep(step: ApplicationStepKey, data: Record<string, unknown>, draft: ApplicationDraft): unknown {
  switch (step) {
    case 'personal':
      return {
        fullName: requireText(data.fullName, 'fullName', 120),
        dateOfBirth: data.dateOfBirth as string,
        gender: GENDERS.includes(data.gender as Gender) ? (data.gender as Gender) : null,
        whatsappPhone: nullableText(data.whatsappPhone),
        email: nullableText(data.email),
      } satisfies NonNullable<ApplicationDraft['personal']>;
    case 'location':
      return {
        districtId: data.districtId as string,
        localityId: data.localityId as string,
        addressNote: nullableText(data.addressNote),
      } satisfies NonNullable<ApplicationDraft['location']>;
    case 'services':
      return { serviceIds: [...new Set(stringList(data.serviceIds))] } satisfies NonNullable<ApplicationDraft['services']>;
    case 'service_details': {
      const chosen = draft.services?.serviceIds ?? [];
      const services = (Array.isArray(data.services) ? data.services : [])
        .map((raw) => asObject(raw))
        .filter((entry) => typeof entry.serviceId === 'string' && chosen.includes(entry.serviceId))
        .map((entry) => ({
          serviceId: entry.serviceId as string,
          yearsExperience: nullableNumber(entry.yearsExperience),
          rates: normalizeRates(entry.rates),
          answers: normalizeAnswers(entry.answers),
        }));
      return { services } satisfies NonNullable<ApplicationDraft['service_details']>;
    }
    case 'experience':
      return {
        yearsExperience: nullableNumber(data.yearsExperience),
        bio: nullableText(data.bio),
        previousWork: nullableText(data.previousWork),
        languages: toLanguageCodes(data.languages),
        qualifications: normalizeQualifications(data.qualifications),
      } satisfies NonNullable<ApplicationDraft['experience']>;
    case 'service_area':
      return {
        latitude: nullableNumber(data.latitude) ?? 0,
        longitude: nullableNumber(data.longitude) ?? 0,
        radiusKm: nullableNumber(data.radiusKm) ?? 10,
        travelPreference: TRAVEL_PREFERENCES.includes(data.travelPreference as TravelPreference)
          ? (data.travelPreference as TravelPreference)
          : 'depends_on_distance',
      } satisfies NonNullable<ApplicationDraft['service_area']>;
    case 'availability':
      return {
        availabilityTypes: stringList<AvailabilityType>(data.availabilityTypes),
        dayParts: stringList<DayPart>(data.dayParts),
        maxHoursPerDay: validateMaxHours(data.maxHoursPerDay),
        rules: validateRules(data.rules),
      } satisfies NonNullable<ApplicationDraft['availability']>;
    case 'documents':
      return { acknowledged: data.acknowledged === true } satisfies NonNullable<ApplicationDraft['documents']>;
    case 'review':
      return { declarationAccepted: data.declarationAccepted === true } satisfies NonNullable<ApplicationDraft['review']>;
  }
}

function missingMandatoryDocuments(userId: string, serviceIds: string[]): DocumentType[] {
  const required = new Set<DocumentType>();
  for (const serviceId of serviceIds) {
    db.services
      .get(serviceId)
      ?.requiredDocuments.filter((doc) => doc.isMandatory)
      .forEach((doc) => required.add(doc.documentType));
  }
  const uploaded = [...db.documents.values()].filter(
    (doc) => doc.userId === userId && doc.isFinalised && (doc.status === 'pending' || doc.status === 'verified'),
  );
  return [...required].filter((type) => !uploaded.some((doc) => doc.type === type));
}

function ownDocument(id: string, userId: string): MockDocument {
  const doc = db.documents.get(id);
  if (!doc || doc.userId !== userId) {
    throw mockError(404, 'NOT_FOUND', 'Document not found');
  }
  return doc;
}

function ownInvitation(id: string, userId: string): ReturnType<typeof refreshInvitation> {
  const invitation = db.invitations.get(id);
  if (!invitation || invitation.providerId !== userId) {
    throw mockError(404, 'NOT_FOUND', 'Invitation not found');
  }
  return refreshInvitation(invitation);
}

function requireEditable(application: ProviderApplication): void {
  if (application.status !== 'draft' && application.status !== 'info_required') {
    throw mockError(409, 'INVALID_STATE_TRANSITION', `Application is ${application.status}`);
  }
}

/** Provider self-service: application, documents, availability, invitations and bookings. */
export function registerProviderRoutes(): void {
  db.addRegisteredListener((user) => {
    if (user.role === 'provider') {
      user.providerCode = null;
      ensureProviderRows(user);
    }
  });

  route('GET', '/provider/me', (context) => {
    const { userId } = requireRole(context, 'provider');
    const { provider } = rowsFor(userId);
    const now = Date.now();
    const bookings = [...db.bookings.values()].filter((booking) => booking.providerId === userId);
    const pendingInvitations = [...db.invitations.values()]
      .filter((invitation) => invitation.providerId === userId)
      .map((invitation) => refreshInvitation(invitation, now))
      .filter((invitation) => invitation.status === 'invited' || invitation.status === 'viewed').length;
    return providerSelf(provider, {
      upcomingBookings: bookings.filter((booking) => bookingScope(booking, now) === 'upcoming').length,
      completedBookings: bookings.filter((booking) => booking.status === 'service_completed').length,
      pendingInvitations,
    });
  });

  route('GET', '/provider/application', (context) => {
    const { userId } = requireRole(context, 'provider');
    return applicationView(rowsFor(userId).application);
  });

  route('PUT', '/provider/application/steps/:step', (context) => {
    const { userId } = requireRole(context, 'provider');
    const step = context.params.step as ApplicationStepKey;
    const index = APPLICATION_STEPS.indexOf(step);
    if (index < 0) {
      throw mockError(404, 'NOT_FOUND', 'Unknown step');
    }
    const { provider, application } = rowsFor(userId);
    requireEditable(application);
    const data = asObject(asObject(context.body).data);
    validateStep(step, data, application.draft);
    (application.draft as Record<ApplicationStepKey, unknown>)[step] = normalizeStep(step, data, application.draft);
    // Saving a step answers the reviewer's note for it; status stays info_required until submit.
    application.infoRequests = application.infoRequests.filter((request) => request.step !== step);
    if (!application.completedSteps.includes(step)) {
      application.completedSteps.push(step);
      application.completedSteps.sort((a, b) => APPLICATION_STEPS.indexOf(a) - APPLICATION_STEPS.indexOf(b));
    }
    application.currentStep = Math.min(APPLICATION_STEPS.length, Math.max(application.currentStep, index + 2));
    syncProviderFromDraft(provider, application.draft);
    return applicationView(application);
  });

  route('POST', '/provider/application/submit', (context) => {
    const { userId } = requireRole(context, 'provider');
    const { provider, application, user } = rowsFor(userId);
    requireEditable(application);
    const missingSteps = REQUIRED_BEFORE_SUBMIT.filter((step) => !application.completedSteps.includes(step));
    if (missingSteps.length > 0) {
      throw invalid(`Incomplete steps: ${missingSteps.join(', ')}`);
    }
    const dateOfBirth = application.draft.personal?.dateOfBirth;
    if (!dateOfBirth || ageFrom(dateOfBirth) < 18) {
      throw mockError(422, 'UNDERAGE', 'Providers must be 18 or older');
    }
    const missingDocs = missingMandatoryDocuments(userId, application.draft.services?.serviceIds ?? []);
    if (missingDocs.length > 0) {
      throw invalid(`Missing documents: ${missingDocs.join(', ')}`);
    }
    if (application.draft.review?.declarationAccepted !== true) {
      throw mockError(400, 'CONSENT_REQUIRED', 'Accept the provider declaration');
    }
    const submittedAt = nowIso();
    user.consents.provider_declaration = true;
    db.consentUpdatedAt.set(userId, { ...db.consentUpdatedAt.get(userId), provider_declaration: submittedAt });
    application.status = 'submitted';
    application.submittedAt = submittedAt;
    application.decidedAt = null;
    application.decisionNote = null;
    application.infoRequests = [];
    for (const step of ['documents', 'review'] as const) {
      if (!application.completedSteps.includes(step)) application.completedSteps.push(step);
    }
    application.currentStep = APPLICATION_STEPS.length;
    syncProviderFromDraft(provider, application.draft);
    provider.services.forEach((service) => {
      if (service.status !== 'approved') {
        service.status = 'pending';
        service.reviewNote = null;
      }
    });
    notify(
      userId,
      { en: 'Application submitted', ml: 'അപേക്ഷ സമർപ്പിച്ചു' },
      { en: `We received ${application.code}. We will let you know once it is reviewed.`, ml: `${application.code} ലഭിച്ചു. പരിശോധന കഴിഞ്ഞാൽ അറിയിക്കാം.` },
      links.application,
    );
    scheduleApplicationReview(userId, submittedAt);
    return applicationView(application);
  });

  route('GET', '/provider/documents', (context) => {
    const { userId } = requireRole(context, 'provider');
    const items = [...db.documents.values()]
      .filter((doc) => doc.userId === userId && doc.isFinalised)
      .sort((a, b) => (b.uploadedAt ?? '').localeCompare(a.uploadedAt ?? ''))
      .map(documentView);
    return { items };
  });

  route('POST', '/provider/documents/upload-url', (context) => {
    const { userId } = requireRole(context, 'provider');
    const body = asObject(context.body);
    if (typeof body.type !== 'string' || !DOCUMENT_TYPES.includes(body.type as DocumentType)) {
      throw invalid('Unknown document type');
    }
    if (typeof body.mimeType !== 'string' || !ALLOWED_MIME_TYPES.includes(body.mimeType)) {
      throw mockError(422, 'UPLOAD_FAILED', 'Only JPG, PNG or PDF files are accepted');
    }
    const sizeBytes = optionalNumber(body.sizeBytes, 'sizeBytes');
    if (sizeBytes === undefined || sizeBytes <= 0 || sizeBytes > MAX_UPLOAD_BYTES) {
      throw mockError(422, 'UPLOAD_FAILED', 'Files must be 5 MB or smaller');
    }
    const serviceId = optionalText(body.serviceId, 'serviceId', 64);
    if (serviceId) {
      requireService(serviceId);
    }
    const doc: MockDocument = {
      id: newId(),
      userId,
      isFinalised: false,
      type: body.type as DocumentType,
      serviceId,
      fileName: optionalText(body.fileName, 'fileName', 200),
      mimeType: body.mimeType,
      sizeBytes,
      idNumberLast4: null,
      status: 'pending',
      reviewNote: null,
      uploadedAt: null,
    };
    db.documents.set(doc.id, doc);
    return {
      documentId: doc.id,
      uploadUrl: `mock://upload/${doc.id}`,
      headers: { 'Content-Type': doc.mimeType },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  });

  route('POST', '/provider/documents/:id/finalise', (context) => {
    const { userId } = requireRole(context, 'provider');
    const doc = ownDocument(context.params.id ?? '', userId);
    if (doc.isFinalised) {
      throw mockError(409, 'INVALID_STATE_TRANSITION', 'Document already finalised');
    }
    const body = context.body === undefined || context.body === null ? {} : asObject(context.body);
    let idNumberLast4: string | null = null;
    if (doc.type === 'id_proof') {
      if (typeof body.idNumberLast4 !== 'string' || !/^[0-9A-Za-z]{4}$/.test(body.idNumberLast4)) {
        throw invalid('idNumberLast4 must be 4 characters');
      }
      idNumberLast4 = body.idNumberLast4;
    }
    for (const older of [...db.documents.values()]) {
      const isSuperseded =
        older.id !== doc.id && older.userId === userId && older.type === doc.type && older.serviceId === doc.serviceId &&
        (older.status === 'rejected' || older.status === 'info_required');
      if (isSuperseded) db.documents.delete(older.id);
    }
    doc.isFinalised = true;
    doc.status = 'pending';
    doc.idNumberLast4 = idNumberLast4;
    doc.uploadedAt = nowIso();
    return documentView(doc);
  });

  route('DELETE', '/provider/documents/:id', (context) => {
    const { userId } = requireRole(context, 'provider');
    const doc = ownDocument(context.params.id ?? '', userId);
    if (doc.isFinalised && doc.status !== 'pending' && doc.status !== 'rejected') {
      throw mockError(409, 'INVALID_STATE_TRANSITION', `Document is ${doc.status}`);
    }
    db.documents.delete(doc.id);
    return noContent();
  });

  route('GET', '/provider/availability', (context) => {
    const { userId } = requireRole(context, 'provider');
    return rowsFor(userId).provider.availability;
  });

  route('PUT', '/provider/availability', (context) => {
    const { userId } = requireRole(context, 'provider');
    const { provider } = rowsFor(userId);
    const body = asObject(context.body);
    provider.availability.rules = validateRules(body.rules);
    provider.availability.maxHoursPerDay = validateMaxHours(body.maxHoursPerDay);
    return provider.availability;
  });

  route('POST', '/provider/availability/exceptions', (context) => {
    const { userId } = requireRole(context, 'provider');
    const { provider } = rowsFor(userId);
    const body = asObject(context.body);
    const start = parseTimestamp(body.startsAt);
    const end = parseTimestamp(body.endsAt);
    if (start === null || end === null || start >= end) {
      throw invalid('startsAt must be before endsAt');
    }
    const exception = {
      id: newId(),
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(end).toISOString(),
      reason: optionalText(body.reason, 'reason', 200),
    };
    provider.availability.exceptions.push(exception);
    provider.availability.exceptions.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return ok(exception, 201);
  });

  route('DELETE', '/provider/availability/exceptions/:id', (context) => {
    const { userId } = requireRole(context, 'provider');
    const { provider } = rowsFor(userId);
    const before = provider.availability.exceptions.length;
    provider.availability.exceptions = provider.availability.exceptions.filter((exception) => exception.id !== context.params.id);
    if (provider.availability.exceptions.length === before) {
      throw mockError(404, 'NOT_FOUND', 'Exception not found');
    }
    return noContent();
  });

  route('GET', '/provider/invitations', (context) => {
    const { userId } = requireRole(context, 'provider');
    const status = context.query.status as InvitationStatus | 'open' | undefined;
    if (status && !INVITATION_STATUSES.includes(status)) {
      throw invalid('Unknown status');
    }
    const now = Date.now();
    const items = [...db.invitations.values()]
      .filter((invitation) => invitation.providerId === userId)
      .map((invitation) => refreshInvitation(invitation, now))
      .filter((invitation) => {
        if (!status) return true;
        if (status === 'open') return invitation.status === 'invited' || invitation.status === 'viewed';
        return invitation.status === status;
      })
      .sort((a, b) => (status === 'open' ? a.expiresAt.localeCompare(b.expiresAt) : b.createdAt.localeCompare(a.createdAt)))
      .map(invitationView);
    return { items };
  });

  route('GET', '/provider/invitations/:id', (context) => {
    const { userId } = requireRole(context, 'provider');
    return invitationView(ownInvitation(context.params.id ?? '', userId));
  });

  route('POST', '/provider/invitations/:id/view', (context) => {
    const { userId } = requireRole(context, 'provider');
    const invitation = ownInvitation(context.params.id ?? '', userId);
    if (invitation.status === 'invited') {
      invitation.status = 'viewed';
    }
    return invitationView(invitation);
  });

  route('POST', '/provider/invitations/:id/accept', (context) => {
    const { userId } = requireRole(context, 'provider');
    const invitation = ownInvitation(context.params.id ?? '', userId);
    acceptInvitation(invitation);
    return invitationView(invitation);
  });

  route('POST', '/provider/invitations/:id/decline', (context) => {
    const { userId } = requireRole(context, 'provider');
    const invitation = ownInvitation(context.params.id ?? '', userId);
    const reason = requireText(asObject(context.body).reason, 'reason', 500);
    declineInvitation(invitation, reason);
    return invitationView(invitation);
  });

  route('GET', '/provider/bookings', (context) => {
    const { userId } = requireRole(context, 'provider');
    return { items: listBookings(userId, 'provider', context.query.scope).map((booking) => bookingView(booking, 'provider')) };
  });

  route('GET', '/provider/bookings/:code', (context) => {
    const { userId } = requireRole(context, 'provider');
    return bookingView(ownBooking(context.params.code ?? '', userId, 'provider'), 'provider');
  });

  route('POST', '/provider/bookings/:code/start', (context) => {
    const { userId } = requireRole(context, 'provider');
    const booking = ownBooking(context.params.code ?? '', userId, 'provider');
    if (booking.status !== 'confirmed') {
      throw mockError(409, 'INVALID_STATE_TRANSITION', `Booking is ${booking.status}`);
    }
    if (Date.now() < new Date(booking.startsAt).getTime() - START_WINDOW_MS) {
      throw mockError(409, 'INVALID_STATE_TRANSITION', 'Too early to start (allowed from 1 hour before)');
    }
    booking.status = 'service_started';
    booking.startedAt = nowIso();
    notify(
      booking.customerId,
      { en: 'Service started', ml: 'സേവനം ആരംഭിച്ചു' },
      { en: `Your provider has started ${booking.code}.`, ml: `സേവനദാതാവ് ${booking.code} ആരംഭിച്ചു.` },
      links.customerBooking(booking.code),
    );
    return bookingView(booking, 'provider');
  });

  route('POST', '/provider/bookings/:code/complete', (context) => {
    const { userId } = requireRole(context, 'provider');
    const booking = ownBooking(context.params.code ?? '', userId, 'provider');
    if (booking.status !== 'service_started') {
      throw mockError(409, 'INVALID_STATE_TRANSITION', `Booking is ${booking.status}`);
    }
    booking.status = 'service_completed';
    booking.completedAt = nowIso();
    notify(
      booking.customerId,
      { en: 'Service completed', ml: 'സേവനം പൂർത്തിയായി' },
      { en: `How did it go? Rate your provider for ${booking.code}.`, ml: `എങ്ങനെയുണ്ടായിരുന്നു? ${booking.code}-ന് സേവനദാതാവിനെ വിലയിരുത്തുക.` },
      links.customerBooking(booking.code),
    );
    return bookingView(booking, 'provider');
  });

  route('POST', '/provider/bookings/:code/cancel', (context) => {
    const { userId } = requireRole(context, 'provider');
    const booking = ownBooking(context.params.code ?? '', userId, 'provider');
    const reason = requireText(asObject(context.body).reason, 'reason', 500);
    if (booking.status !== 'confirmed') {
      throw mockError(409, 'INVALID_STATE_TRANSITION', `Booking is ${booking.status}`);
    }
    booking.status = 'cancelled';
    booking.cancelledAt = nowIso();
    booking.cancelledBy = 'provider';
    booking.cancelReason = reason;
    notify(
      booking.customerId,
      { en: 'Provider cancelled your booking', ml: 'സേവനദാതാവ് ബുക്കിംഗ് റദ്ദാക്കി' },
      { en: `${booking.code} was cancelled: ${reason}`, ml: `${booking.code} റദ്ദാക്കി: ${reason}` },
      links.customerBooking(booking.code),
    );
    return bookingView(booking, 'provider');
  });
}
