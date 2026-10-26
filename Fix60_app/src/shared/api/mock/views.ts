import type {
  Booking,
  BookingScope,
  District,
  Locality,
  LocalizedText,
  ProviderApplication,
  ProviderCard,
  ProviderInvitation,
  ProviderPublicProfile,
  ProviderRates,
  ProviderSelf,
  ServiceDetail,
  ServiceRequestDetail,
  ServiceRequestSummary,
  ServiceSummary,
  UserRole,
  VerificationDocument,
} from '../types';
import { db, type MockBooking, type MockDocument, type MockInvitation, type MockProvider, type MockRequest } from './db';
import { haversineKm, roundKm, type LatLng } from './geo';
import { mockError } from './router';

const UNKNOWN_PLACE: LocalizedText = { en: 'Unknown', ml: 'അജ്ഞാതം' };

/** Service row or 404. */
export function requireService(serviceId: string): ServiceDetail {
  const service = db.services.get(serviceId);
  if (!service) {
    throw mockError(404, 'NOT_FOUND', 'Service not found');
  }
  return service;
}

/** Strips a service detail down to its summary. */
export function serviceSummary(serviceId: string): ServiceSummary {
  const { id, slug, categoryId, name, description, imageUrl } = requireService(serviceId);
  return { id, slug, categoryId, name, description, imageUrl };
}

export function findLocality(localityId: string | null): Locality | undefined {
  return localityId ? db.localities.find((locality) => locality.id === localityId) : undefined;
}

export function findDistrict(districtId: string | null | undefined): District | undefined {
  return districtId ? db.districts.find((district) => district.id === districtId) : undefined;
}

/** First word of a full name (what providers see before booking). */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/** Published review count and the average (null below 3 reviews). */
export function reviewStats(providerId: string): { averageRating: number | null; reviewCount: number } {
  const reviews = db.reviews.filter((review) => review.providerId === providerId);
  if (reviews.length < 3) {
    return { averageRating: null, reviewCount: reviews.length };
  }
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return { averageRating: Math.round(average * 10) / 10, reviewCount: reviews.length };
}

/** True when either user has blocked the other. */
export function isBlockedEitherWay(a: string | null, b: string): boolean {
  if (!a) {
    return false;
  }
  return db.blocks.some(
    (block) => (block.blockerId === a && block.blockedId === b) || (block.blockerId === b && block.blockedId === a),
  );
}

export function providerPoint(provider: MockProvider): LatLng | null {
  return provider.latitude !== null && provider.longitude !== null
    ? { latitude: provider.latitude, longitude: provider.longitude }
    : null;
}

/** Distance from the provider's service-area centre to a point. */
export function providerDistanceKm(provider: MockProvider, point: LatLng | null): number | null {
  const center = providerPoint(provider);
  return center && point ? haversineKm(center, point) : null;
}

/** A user's own locality centroid, if they set one. */
export function userPoint(userId: string | null): LatLng | null {
  const user = userId ? db.users.get(userId) : undefined;
  const locality = findLocality(user?.localityId ?? null);
  return locality ? { latitude: locality.latitude, longitude: locality.longitude } : null;
}

export function ratesFor(provider: MockProvider, serviceId: string): ProviderRates | null {
  return provider.services.find((service) => service.serviceId === serviceId)?.rates ?? null;
}

export function isSaved(customerId: string | null, providerId: string): boolean {
  return customerId ? (db.savedProviders.get(customerId)?.has(providerId) ?? false) : false;
}

/** Whitelisted provider card. */
export function providerCard(
  provider: MockProvider,
  options: { viewerId: string | null; point: LatLng | null; serviceId: string | null },
): ProviderCard {
  const user = db.requireUser(provider.userId);
  const locality = findLocality(provider.localityId);
  const distance = providerDistanceKm(provider, options.point);
  const service = options.serviceId ? provider.services.find((entry) => entry.serviceId === options.serviceId) : undefined;
  return {
    code: provider.code,
    userId: provider.userId,
    displayName: user.fullName,
    photoUrl: provider.photoUrl,
    localityName: locality?.name ?? null,
    districtName: findDistrict(provider.districtId ?? locality?.districtId)?.name ?? null,
    yearsExperience: service?.yearsExperience ?? provider.yearsExperience,
    languages: provider.languages,
    badges: provider.badges,
    ...reviewStats(provider.userId),
    distanceKm: distance === null ? null : roundKm(distance),
    rates: service?.rates ?? null,
    isSaved: isSaved(options.viewerId, provider.userId),
  };
}

/** Public profile: card plus approved services and the latest reviews. */
export function publicProfile(provider: MockProvider, viewerId: string | null): ProviderPublicProfile {
  const recentReviews = db.reviews
    .filter((review) => review.providerId === provider.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      customerFirstName: review.customerFirstName,
      serviceName: requireService(review.serviceId).name,
      createdAt: review.createdAt,
    }));
  return {
    ...providerCard(provider, { viewerId, point: viewerId ? userPoint(viewerId) : null, serviceId: null }),
    bio: provider.bio,
    travelPreference: provider.travelPreference,
    availabilityTypes: provider.availabilityTypes,
    dayParts: provider.dayParts,
    services: provider.services
      .filter((service) => service.status === 'approved')
      .map((service) => ({ service: serviceSummary(service.serviceId), yearsExperience: service.yearsExperience, rates: service.rates })),
    qualifications: provider.qualifications,
    recentReviews,
    memberSince: provider.memberSince,
  };
}

export function requestPoint(request: MockRequest): LatLng {
  return { latitude: request.latitude, longitude: request.longitude };
}

export function requestSummary(request: MockRequest): ServiceRequestSummary {
  return {
    code: request.code,
    source: request.source,
    status: request.status,
    service: serviceSummary(request.serviceId),
    localityName: findLocality(request.localityId)?.name ?? UNKNOWN_PLACE,
    preferredDate: request.preferredDate,
    startTime: request.startTime,
    durationHours: request.durationHours,
    budgetAmount: request.budgetAmount,
    acceptedCount: [...db.invitations.values()].filter(
      (invitation) => invitation.requestCode === request.code && invitation.status === 'accepted',
    ).length,
    createdAt: request.createdAt,
    statusChangedAt: request.statusChangedAt,
    bookingCode: request.bookingCode,
  };
}

export function requestDetail(request: MockRequest): ServiceRequestDetail {
  const cardOptions = { viewerId: request.customerId, point: requestPoint(request), serviceId: request.serviceId };
  const target = request.targetProviderId ? db.providers.get(request.targetProviderId) : undefined;
  const acceptedInvitations = [...db.invitations.values()]
    .filter((invitation) => invitation.requestCode === request.code && invitation.status === 'accepted')
    .sort((a, b) => (a.respondedAt ?? '').localeCompare(b.respondedAt ?? ''))
    .flatMap((invitation) => {
      const provider = db.providers.get(invitation.providerId);
      return provider
        ? [{ invitationId: invitation.id, provider: providerCard(provider, cardOptions), respondedAt: invitation.respondedAt ?? invitation.createdAt }]
        : [];
    });
  return {
    ...requestSummary(request),
    areaNote: request.areaNote,
    requirements: request.requirements,
    contactPhone: request.contactPhone,
    contactWhatsapp: request.contactWhatsapp,
    targetProvider: target ? providerCard(target, cardOptions) : null,
    acceptedInvitations,
    timeline: request.timeline,
    cancelReason: request.cancelReason,
  };
}

/** Provider-side view of an invitation: no customer contact, no address. */
export function invitationView(invitation: MockInvitation): ProviderInvitation {
  const request = db.requests.get(invitation.requestCode);
  const provider = db.providers.get(invitation.providerId);
  if (!request || !provider) {
    throw mockError(404, 'NOT_FOUND', 'Invitation not found');
  }
  const locality = findLocality(request.localityId);
  const distance = providerDistanceKm(provider, requestPoint(request));
  return {
    id: invitation.id,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    distanceKm: distance === null ? null : roundKm(distance),
    request: {
      code: request.code,
      source: request.source,
      service: serviceSummary(request.serviceId),
      localityName: locality?.name ?? UNKNOWN_PLACE,
      districtName: findDistrict(locality?.districtId)?.name ?? UNKNOWN_PLACE,
      preferredDate: request.preferredDate,
      startTime: request.startTime,
      durationHours: request.durationHours,
      budgetAmount: request.budgetAmount,
      requirements: request.requirements,
      customerFirstName: firstName(db.users.get(request.customerId)?.fullName ?? 'Customer'),
    },
    createdAt: invitation.createdAt,
    respondedAt: invitation.respondedAt,
  };
}

/** Which list a booking belongs to right now. Overdue `confirmed` bookings stay in `active`. */
export function bookingScope(booking: MockBooking, now: number = Date.now()): BookingScope {
  if (booking.status === 'service_completed' || booking.status === 'cancelled' || booking.status === 'disputed') {
    return 'past';
  }
  if (booking.status === 'service_started') {
    return 'active';
  }
  return new Date(booking.startsAt).getTime() > now ? 'upcoming' : 'active';
}

/** Booking as seen by one side; `counterparty` is the other side. */
export function bookingView(booking: MockBooking, viewer: UserRole): Booking {
  const request = db.requests.get(booking.requestCode);
  const customer = db.users.get(booking.customerId);
  const providerUser = db.users.get(booking.providerId);
  const provider = db.providers.get(booking.providerId);
  const counterparty =
    viewer === 'customer'
      ? {
          userId: booking.providerId,
          displayName: providerUser?.fullName ?? 'Provider',
          photoUrl: provider?.photoUrl ?? null,
          phone: providerUser?.phone ?? '',
          whatsappPhone: providerUser?.whatsappPhone ?? null,
          providerCode: provider?.code ?? null,
        }
      : {
          userId: booking.customerId,
          displayName: customer?.fullName ?? 'Customer',
          photoUrl: null,
          phone: request?.contactPhone ?? customer?.phone ?? '',
          whatsappPhone: request?.contactWhatsapp ?? customer?.whatsappPhone ?? null,
          providerCode: null,
        };
  return {
    code: booking.code,
    requestCode: booking.requestCode,
    status: booking.status,
    service: serviceSummary(booking.serviceId),
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    durationHours: booking.durationHours,
    agreedHourlyRate: booking.agreedHourlyRate,
    localityName: findLocality(request?.localityId ?? null)?.name ?? UNKNOWN_PLACE,
    areaNote: request?.areaNote ?? null,
    latitude: request?.latitude ?? null,
    longitude: request?.longitude ?? null,
    requirements: request?.requirements ?? null,
    counterparty,
    startedAt: booking.startedAt,
    completedAt: booking.completedAt,
    cancelledAt: booking.cancelledAt,
    cancelledBy: booking.cancelledBy,
    cancelReason: booking.cancelReason,
    review: booking.review,
    canReview: viewer === 'customer' && booking.status === 'service_completed' && booking.review === null,
    canCancel: booking.status === 'confirmed',
  };
}

export function documentView(doc: MockDocument): VerificationDocument {
  const { userId: _userId, isFinalised: _isFinalised, ...rest } = doc;
  return rest;
}

export function applicationView(application: ProviderApplication): ProviderApplication {
  return {
    ...application,
    draft: { ...application.draft },
    completedSteps: [...application.completedSteps],
    infoRequests: [...application.infoRequests],
  };
}

/** Provider's own view, including their public profile once approved. */
export function providerSelf(provider: MockProvider, stats: ProviderSelf['stats']): ProviderSelf {
  return {
    code: provider.code,
    status: provider.status,
    applicationStatus: db.applications.get(provider.userId)?.status ?? null,
    services: provider.services.map((service) => ({
      serviceId: service.serviceId,
      service: serviceSummary(service.serviceId),
      status: service.status,
      reviewNote: service.reviewNote,
      yearsExperience: service.yearsExperience,
      rates: service.rates,
    })),
    publicProfile: provider.status === 'active' ? publicProfile(provider, null) : null,
    stats,
  };
}
