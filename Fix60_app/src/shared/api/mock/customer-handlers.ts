import type { BookingScope, CreateRequestRequest, RequestStatus } from '../types';
import { toIsoDate } from '../../lib/format';
import { db, newId, nowIso, type MockBooking, type MockRequest } from './db';
import type { LatLng } from './geo';
import {
  findEligibleProviders,
  hasBookingConflict,
  inviteProvider,
  isRequestOpen,
  links,
  matchQuickRequest,
  notify,
  setRequestStatus,
  withdrawInvitations,
  invitationsFor,
} from './lifecycle';
import { mockError, noContent, ok, requireRole, route } from './router';
import { scheduleAutoAccept } from './simulation';
import { isClockTime, isIsoDate, slotEndIso, slotStartIso } from './slots';
import { asObject, invalid, optionalNumber, optionalText, pageParams, paginate, requireText } from './validation';
import {
  bookingScope,
  bookingView,
  findLocality,
  firstName,
  isBlockedEitherWay,
  providerCard,
  publicProfile,
  requestDetail,
  requestSummary,
  requireService,
  userPoint,
} from './views';

const REQUEST_STATUSES: RequestStatus[] = [
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
];
const BOOKING_SCOPES: BookingScope[] = ['upcoming', 'active', 'past'];

function providerByCode(code: string): ReturnType<typeof db.providers.get> {
  return [...db.providers.values()].find((provider) => provider.code === code);
}

function ownRequest(code: string, customerId: string): MockRequest {
  const request = db.requests.get(code);
  if (!request) {
    throw mockError(404, 'NOT_FOUND', 'Request not found');
  }
  if (request.customerId !== customerId) {
    throw mockError(403, 'FORBIDDEN', 'Not your request');
  }
  invitationsFor(code);
  return request;
}

/** Booking owned by the caller on the given side, or 404/403. */
export function ownBooking(code: string, userId: string, side: 'customer' | 'provider'): MockBooking {
  const booking = db.bookings.get(code);
  if (!booking) {
    throw mockError(404, 'NOT_FOUND', 'Booking not found');
  }
  if ((side === 'customer' ? booking.customerId : booking.providerId) !== userId) {
    throw mockError(403, 'FORBIDDEN', 'Not your booking');
  }
  return booking;
}

/** Bookings of one side in a scope, soonest first (past: latest first). */
export function listBookings(userId: string, side: 'customer' | 'provider', scopeValue: string | undefined): MockBooking[] {
  const scope = (scopeValue ?? 'upcoming') as BookingScope;
  if (!BOOKING_SCOPES.includes(scope)) {
    throw invalid('scope must be upcoming, active or past');
  }
  const now = Date.now();
  const items = [...db.bookings.values()].filter(
    (booking) => (side === 'customer' ? booking.customerId : booking.providerId) === userId && bookingScope(booking, now) === scope,
  );
  return items.sort((a, b) => (scope === 'past' ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt)));
}

function searchPoint(query: Record<string, string>, callerId: string): LatLng | null {
  if (query.localityId) {
    const locality = findLocality(query.localityId);
    if (!locality) {
      throw invalid('Unknown localityId');
    }
    return { latitude: locality.latitude, longitude: locality.longitude };
  }
  const latitude = optionalNumber(query.latitude, 'latitude');
  const longitude = optionalNumber(query.longitude, 'longitude');
  if (latitude !== undefined && longitude !== undefined) {
    return { latitude, longitude };
  }
  return userPoint(callerId);
}

function serviceName(serviceId: string): { en: string; ml: string } {
  const name = requireService(serviceId).name;
  return { en: name.en, ml: name.ml ?? name.en };
}

/** Provider search, saved providers, requests and customer bookings. */
export function registerCustomerRoutes(): void {
  route('GET', '/providers/search', (context) => {
    const { query } = context;
    const callerId = context.auth!.userId;
    if (!query.serviceId || !db.services.has(query.serviceId)) {
      throw invalid('Unknown serviceId');
    }
    const point = searchPoint(query, callerId);
    let slot: { startsAt: string; endsAt: string } | undefined;
    if (query.date && query.startTime) {
      if (!isIsoDate(query.date) || !isClockTime(query.startTime)) {
        throw invalid('date must be YYYY-MM-DD and startTime HH:mm');
      }
      const hours = optionalNumber(query.durationHours, 'durationHours') ?? 1;
      slot = { startsAt: slotStartIso(query.date, query.startTime), endsAt: slotEndIso(query.date, query.startTime, hours) };
    }
    const eligible = findEligibleProviders({
      serviceId: query.serviceId,
      point,
      radiusKm: optionalNumber(query.radiusKm, 'radiusKm'),
      minExperience: optionalNumber(query.minExperience, 'minExperience'),
      language: query.language,
      maxBudget: optionalNumber(query.maxBudget, 'maxBudget'),
      slot,
      callerId,
    });
    const cards = eligible.map((entry) => providerCard(entry.provider, { viewerId: callerId, point, serviceId: query.serviceId ?? null }));
    const { page, pageSize } = pageParams(query);
    return paginate(cards, page, pageSize);
  });

  route('GET', '/providers/:code', ({ auth, params }) => {
    const provider = providerByCode(params.code ?? '');
    const isSelf = provider?.userId === auth!.userId;
    if (!provider || (!isSelf && (provider.status !== 'active' || isBlockedEitherWay(auth!.userId, provider.userId)))) {
      throw mockError(404, 'NOT_FOUND', 'Provider not found');
    }
    return publicProfile(provider, auth!.userId);
  });

  route('GET', '/saved-providers', (context) => {
    const { userId } = requireRole(context, 'customer');
    const point = userPoint(userId);
    const items = [...(db.savedProviders.get(userId) ?? [])]
      .map((providerId) => db.providers.get(providerId))
      .filter((provider) => provider !== undefined && provider.status === 'active' && !isBlockedEitherWay(userId, provider.userId))
      .map((provider) => providerCard(provider!, { viewerId: userId, point, serviceId: null }));
    return { items };
  });

  route('PUT', '/saved-providers/:code', (context) => {
    const { userId } = requireRole(context, 'customer');
    const provider = providerByCode(context.params.code ?? '');
    if (!provider || provider.status !== 'active') {
      throw mockError(404, 'NOT_FOUND', 'Provider not found');
    }
    const saved = db.savedProviders.get(userId) ?? new Set<string>();
    saved.add(provider.userId);
    db.savedProviders.set(userId, saved);
    return noContent();
  });

  route('DELETE', '/saved-providers/:code', (context) => {
    const { userId } = requireRole(context, 'customer');
    const provider = providerByCode(context.params.code ?? '');
    if (provider) {
      db.savedProviders.get(userId)?.delete(provider.userId);
    }
    return noContent();
  });

  route('POST', '/requests', (context) => {
    const { userId } = requireRole(context, 'customer');
    const body = asObject(context.body) as Partial<Record<keyof CreateRequestRequest, unknown>>;
    if (typeof body.serviceId !== 'string' || !db.services.has(body.serviceId)) {
      throw invalid('Unknown serviceId');
    }
    const serviceId = body.serviceId;
    const locality = typeof body.localityId === 'string' ? findLocality(body.localityId) : undefined;
    if (!locality) {
      throw invalid('Unknown localityId');
    }
    if (!isIsoDate(body.preferredDate) || !isClockTime(body.startTime)) {
      throw invalid('preferredDate must be YYYY-MM-DD and startTime HH:mm');
    }
    if (body.preferredDate < toIsoDate(new Date())) {
      throw invalid('preferredDate is in the past');
    }
    const durationHours = optionalNumber(body.durationHours, 'durationHours');
    if (durationHours === undefined || durationHours <= 0 || durationHours > 744) {
      throw invalid('durationHours must be > 0 and ≤ 744');
    }
    const budgetAmount = optionalNumber(body.budgetAmount, 'budgetAmount');
    if (budgetAmount !== undefined && budgetAmount < 0) {
      throw invalid('budgetAmount must be positive');
    }
    const latitude = optionalNumber(body.latitude, 'latitude');
    const longitude = optionalNumber(body.longitude, 'longitude');

    let targetProviderId: string | null = null;
    if (body.providerCode !== undefined && body.providerCode !== null && body.providerCode !== '') {
      const provider = typeof body.providerCode === 'string' ? providerByCode(body.providerCode) : undefined;
      const isOffered = provider?.services.some((service) => service.serviceId === serviceId && service.status === 'approved') ?? false;
      if (!provider || provider.status !== 'active' || !isOffered || isBlockedEitherWay(userId, provider.userId)) {
        throw invalid('This provider cannot take this service');
      }
      targetProviderId = provider.userId;
    }

    const createdAt = nowIso();
    const request: MockRequest = {
      code: db.nextCode('request'),
      customerId: userId,
      source: targetProviderId ? 'directed' : 'quick',
      status: 'submitted',
      serviceId,
      targetProviderId,
      localityId: locality.id,
      latitude: latitude !== undefined && longitude !== undefined ? latitude : locality.latitude,
      longitude: latitude !== undefined && longitude !== undefined ? longitude : locality.longitude,
      areaNote: optionalText(body.areaNote, 'areaNote', 500),
      preferredDate: body.preferredDate,
      startTime: body.startTime,
      durationHours,
      budgetAmount: budgetAmount ?? null,
      requirements: optionalText(body.requirements, 'requirements'),
      contactPhone: requireText(body.contactPhone, 'contactPhone', 20),
      contactWhatsapp: optionalText(body.contactWhatsapp, 'contactWhatsapp', 20),
      createdAt,
      statusChangedAt: createdAt,
      bookingCode: null,
      timeline: [{ status: 'submitted', at: createdAt }],
      cancelReason: null,
    };
    db.requests.set(request.code, request);

    if (targetProviderId) {
      inviteProvider(request, targetProviderId);
      setRequestStatus(request, 'provider_notified');
    } else {
      matchQuickRequest(request);
    }
    notify(
      userId,
      { en: 'Request sent', ml: 'അഭ്യർത്ഥന അയച്ചു' },
      {
        en: targetProviderId ? `We asked your chosen provider for ${serviceName(serviceId).en}.` : `We are finding providers for ${serviceName(serviceId).en}.`,
        ml: targetProviderId ? `${serviceName(serviceId).ml} — തിരഞ്ഞെടുത്ത സേവനദാതാവിനെ അറിയിച്ചു.` : `${serviceName(serviceId).ml} — സേവനദാതാക്കളെ കണ്ടെത്തുന്നു.`,
      },
      links.customerRequest(request.code),
    );
    scheduleAutoAccept(request.code);
    return ok(requestDetail(request), 201);
  });

  route('GET', '/requests', (context) => {
    const { userId } = requireRole(context, 'customer');
    const status = context.query.status as RequestStatus | undefined;
    if (status && !REQUEST_STATUSES.includes(status)) {
      throw invalid('Unknown status');
    }
    const items = [...db.requests.values()]
      .filter((request) => request.customerId === userId && (!status || request.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((request) => {
        invitationsFor(request.code);
        return requestSummary(request);
      });
    return { items };
  });

  route('GET', '/requests/:code', (context) => {
    const { userId } = requireRole(context, 'customer');
    return requestDetail(ownRequest(context.params.code ?? '', userId));
  });

  route('POST', '/requests/:code/confirm/:invitationId', (context) => {
    const { userId } = requireRole(context, 'customer');
    const request = ownRequest(context.params.code ?? '', userId);
    if (request.status !== 'customer_confirmation_pending' && request.status !== 'provider_accepted') {
      throw mockError(409, 'INVALID_STATE_TRANSITION', `Request is ${request.status}`);
    }
    const invitation = db.invitations.get(context.params.invitationId ?? '');
    if (!invitation || invitation.requestCode !== request.code) {
      throw mockError(404, 'NOT_FOUND', 'Invitation not found');
    }
    if (invitation.status !== 'accepted') {
      throw mockError(409, 'INVALID_STATE_TRANSITION', `Invitation is ${invitation.status}`);
    }
    const startsAt = slotStartIso(request.preferredDate, request.startTime);
    const endsAt = slotEndIso(request.preferredDate, request.startTime, request.durationHours);
    if (hasBookingConflict(invitation.providerId, startsAt, endsAt)) {
      throw mockError(409, 'SLOT_UNAVAILABLE', 'Provider is already booked for this slot');
    }
    const provider = db.providers.get(invitation.providerId);
    const booking: MockBooking = {
      code: db.nextCode('booking'),
      requestCode: request.code,
      customerId: userId,
      providerId: invitation.providerId,
      serviceId: request.serviceId,
      status: 'confirmed',
      startsAt,
      endsAt,
      durationHours: request.durationHours,
      agreedHourlyRate: provider?.services.find((service) => service.serviceId === request.serviceId)?.rates.hourlyRate ?? null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: null,
      review: null,
    };
    db.bookings.set(booking.code, booking);
    request.bookingCode = booking.code;
    setRequestStatus(request, 'booking_confirmed');
    withdrawInvitations(request.code, invitation.id);
    const name = serviceName(request.serviceId);
    const customerName = firstName(db.users.get(userId)?.fullName ?? 'Customer');
    notify(
      invitation.providerId,
      { en: 'Booking confirmed', ml: 'ബുക്കിംഗ് സ്ഥിരീകരിച്ചു' },
      { en: `${customerName} confirmed you for ${name.en} on ${request.preferredDate} at ${request.startTime}.`, ml: `${customerName} നിങ്ങളെ ${name.ml}-ന് സ്ഥിരീകരിച്ചു — ${request.preferredDate}, ${request.startTime}.` },
      links.providerBooking(booking.code),
    );
    notify(
      userId,
      { en: 'Booking confirmed', ml: 'ബുക്കിംഗ് സ്ഥിരീകരിച്ചു' },
      { en: `${name.en} on ${request.preferredDate} at ${request.startTime}.`, ml: `${name.ml} — ${request.preferredDate}, ${request.startTime}.` },
      links.customerBooking(booking.code),
    );
    return bookingView(booking, 'customer');
  });

  route('POST', '/requests/:code/cancel', (context) => {
    const { userId } = requireRole(context, 'customer');
    const request = ownRequest(context.params.code ?? '', userId);
    const reason = requireText(asObject(context.body).reason, 'reason', 500);
    if (!isRequestOpen(request)) {
      throw mockError(409, 'INVALID_STATE_TRANSITION', `Request is ${request.status}`);
    }
    request.cancelReason = reason;
    setRequestStatus(request, 'cancelled');
    withdrawInvitations(request.code, null);
    return requestDetail(request);
  });

  route('GET', '/bookings', (context) => {
    const { userId } = requireRole(context, 'customer');
    return { items: listBookings(userId, 'customer', context.query.scope).map((booking) => bookingView(booking, 'customer')) };
  });

  route('GET', '/bookings/:code', (context) => {
    const { userId } = requireRole(context, 'customer');
    return bookingView(ownBooking(context.params.code ?? '', userId, 'customer'), 'customer');
  });

  route('POST', '/bookings/:code/cancel', (context) => {
    const { userId } = requireRole(context, 'customer');
    const booking = ownBooking(context.params.code ?? '', userId, 'customer');
    const reason = requireText(asObject(context.body).reason, 'reason', 500);
    if (booking.status !== 'confirmed') {
      throw mockError(409, 'INVALID_STATE_TRANSITION', `Booking is ${booking.status}`);
    }
    booking.status = 'cancelled';
    booking.cancelledAt = nowIso();
    booking.cancelledBy = 'customer';
    booking.cancelReason = reason;
    const name = serviceName(booking.serviceId);
    notify(
      booking.providerId,
      { en: 'Booking cancelled', ml: 'ബുക്കിംഗ് റദ്ദാക്കി' },
      { en: `The customer cancelled ${name.en} (${booking.code}).`, ml: `ഉപഭോക്താവ് ${name.ml} (${booking.code}) റദ്ദാക്കി.` },
      links.providerBooking(booking.code),
    );
    return bookingView(booking, 'customer');
  });

  route('POST', '/bookings/:code/complete', (context) => {
    const { userId } = requireRole(context, 'customer');
    const booking = ownBooking(context.params.code ?? '', userId, 'customer');
    const hasSlotStarted = new Date(booking.startsAt).getTime() <= Date.now();
    if (!(booking.status === 'service_started' || (booking.status === 'confirmed' && hasSlotStarted))) {
      throw mockError(409, 'INVALID_STATE_TRANSITION', `Booking is ${booking.status}`);
    }
    const now = nowIso();
    booking.status = 'service_completed';
    booking.startedAt ??= booking.startsAt;
    booking.completedAt = now;
    notify(
      booking.providerId,
      { en: 'Service marked complete', ml: 'സേവനം പൂർത്തിയായി' },
      { en: `The customer confirmed ${booking.code} is done.`, ml: `${booking.code} പൂർത്തിയായെന്ന് ഉപഭോക്താവ് സ്ഥിരീകരിച്ചു.` },
      links.providerBooking(booking.code),
    );
    return bookingView(booking, 'customer');
  });

  route('POST', '/bookings/:code/review', (context) => {
    const { userId } = requireRole(context, 'customer');
    const booking = ownBooking(context.params.code ?? '', userId, 'customer');
    const body = asObject(context.body);
    const rating = optionalNumber(body.rating, 'rating');
    if (rating === undefined || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw invalid('rating must be an integer from 1 to 5');
    }
    const comment = optionalText(body.comment, 'comment', 1000);
    if (booking.status !== 'service_completed' || booking.review !== null) {
      throw mockError(409, 'INVALID_STATE_TRANSITION', 'Booking cannot be reviewed');
    }
    const createdAt = nowIso();
    booking.review = { rating, comment, createdAt };
    db.reviews.push({
      id: newId(),
      providerId: booking.providerId,
      serviceId: booking.serviceId,
      rating,
      comment,
      customerFirstName: firstName(db.users.get(userId)?.fullName ?? 'Customer'),
      createdAt,
      bookingCode: booking.code,
    });
    notify(
      booking.providerId,
      { en: `New ${rating}★ review`, ml: `പുതിയ ${rating}★ അവലോകനം` },
      { en: comment ?? 'A customer rated your service.', ml: comment ?? 'ഒരു ഉപഭോക്താവ് നിങ്ങളുടെ സേവനം വിലയിരുത്തി.' },
      links.providerBooking(booking.code),
    );
    return bookingView(booking, 'customer');
  });
}
