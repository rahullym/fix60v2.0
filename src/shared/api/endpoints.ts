import { request } from './client';
import type {
  AuthSessionResponse,
  AvailabilityException,
  AvailabilityRule,
  Banner,
  BlockedUser,
  Booking,
  BookingScope,
  CancelRequest,
  Category,
  CmsPage,
  ConsentState,
  CreateReportRequest,
  CreateRequestRequest,
  CreateReviewRequest,
  CreateTicketRequest,
  DeletionRequestState,
  District,
  Faq,
  FinaliseDocumentRequest,
  FirebaseSignInResponse,
  InAppNotification,
  InvitationStatus,
  ItemList,
  Locality,
  Me,
  OrganizationSettings,
  Paged,
  ProviderApplication,
  ProviderAvailability,
  ProviderCard,
  ProviderInvitation,
  ProviderPublicProfile,
  ProviderSearchQuery,
  ProviderSelf,
  PublicBranding,
  RegisterDeviceRequest,
  RegisterRequest,
  ReportReceipt,
  RequestStatus,
  SaveStepRequest,
  ServiceDetail,
  ServiceRequestDetail,
  ServiceRequestSummary,
  SupportTicket,
  SupportTicketDetail,
  UpdateConsentsRequest,
  UpdateMeRequest,
  UploadUrlRequest,
  UploadUrlResponse,
  UserRole,
  VerificationDocument,
  ApplicationStepKey,
} from './types';

const enc = encodeURIComponent;

/** Every API call the app makes. Paths are below `/api/v1`. */
export const api = {
  auth: {
    signInWithFirebase: (idToken: string, role: UserRole) =>
      request<FirebaseSignInResponse>('POST', '/auth/firebase', {
        body: { idToken, role },
        isAuthenticated: false,
        withAppCheck: true,
      }),
    register: (body: RegisterRequest) =>
      request<AuthSessionResponse>('POST', '/auth/register', { body, isAuthenticated: false, withAppCheck: true }),
    logout: (refreshToken: string) =>
      request<void>('POST', '/auth/logout', { body: { refreshToken }, isAuthenticated: false }),
  },

  me: {
    get: () => request<Me>('GET', '/me'),
    update: (body: UpdateMeRequest) => request<Me>('PATCH', '/me', { body }),
    consents: () => request<ItemList<ConsentState>>('GET', '/me/consents'),
    updateConsents: (body: UpdateConsentsRequest) => request<ItemList<ConsentState>>('PUT', '/me/consents', { body }),
    deletionStatus: () => request<DeletionRequestState>('GET', '/me/deletion-request'),
    requestDeletion: () => request<DeletionRequestState>('POST', '/me/deletion-request'),
    cancelDeletion: () => request<DeletionRequestState>('DELETE', '/me/deletion-request'),
    registerDevice: (body: RegisterDeviceRequest) => request<void>('POST', '/me/devices', { body }),
  },

  public: {
    branding: () => request<PublicBranding>('GET', '/branding', { isAuthenticated: false }),
    settings: () => request<OrganizationSettings>('GET', '/settings/public', { isAuthenticated: false }),
    banners: (audience: UserRole) =>
      request<ItemList<Banner>>('GET', '/cms/banners', { query: { audience }, isAuthenticated: false }),
    page: (slug: string) => request<CmsPage>('GET', `/cms/pages/${enc(slug)}`, { isAuthenticated: false }),
    faqs: (audience: UserRole) =>
      request<ItemList<Faq>>('GET', '/cms/faqs', { query: { audience }, isAuthenticated: false }),
  },

  locations: {
    districts: () => request<ItemList<District>>('GET', '/locations/districts', { isAuthenticated: false }),
    localities: (districtId: string, q?: string) =>
      request<ItemList<Locality>>('GET', '/locations/localities', {
        query: { districtId, q },
        isAuthenticated: false,
      }),
  },

  catalog: {
    categories: () => request<ItemList<Category>>('GET', '/categories', { isAuthenticated: false }),
    service: (slug: string) => request<ServiceDetail>('GET', `/services/${enc(slug)}`, { isAuthenticated: false }),
  },

  providers: {
    search: (query: ProviderSearchQuery) =>
      request<Paged<ProviderCard>>('GET', '/providers/search', { query: { ...query } }),
    get: (code: string) => request<ProviderPublicProfile>('GET', `/providers/${enc(code)}`),
    saved: () => request<ItemList<ProviderCard>>('GET', '/saved-providers'),
    save: (code: string) => request<void>('PUT', `/saved-providers/${enc(code)}`),
    unsave: (code: string) => request<void>('DELETE', `/saved-providers/${enc(code)}`),
  },

  requests: {
    create: (body: CreateRequestRequest) => request<ServiceRequestDetail>('POST', '/requests', { body }),
    list: (status?: RequestStatus) =>
      request<ItemList<ServiceRequestSummary>>('GET', '/requests', { query: { status } }),
    get: (code: string) => request<ServiceRequestDetail>('GET', `/requests/${enc(code)}`),
    confirm: (code: string, invitationId: string) =>
      request<Booking>('POST', `/requests/${enc(code)}/confirm/${enc(invitationId)}`),
    cancel: (code: string, body: CancelRequest) =>
      request<ServiceRequestDetail>('POST', `/requests/${enc(code)}/cancel`, { body }),
  },

  bookings: {
    list: (scope: BookingScope) => request<ItemList<Booking>>('GET', '/bookings', { query: { scope } }),
    get: (code: string) => request<Booking>('GET', `/bookings/${enc(code)}`),
    cancel: (code: string, body: CancelRequest) => request<Booking>('POST', `/bookings/${enc(code)}/cancel`, { body }),
    complete: (code: string) => request<Booking>('POST', `/bookings/${enc(code)}/complete`),
    review: (code: string, body: CreateReviewRequest) =>
      request<Booking>('POST', `/bookings/${enc(code)}/review`, { body }),
  },

  safety: {
    report: (body: CreateReportRequest) => request<ReportReceipt>('POST', '/reports', { body }),
    blocks: () => request<ItemList<BlockedUser>>('GET', '/blocks'),
    block: (userId: string) => request<void>('POST', '/blocks', { body: { userId } }),
    unblock: (userId: string) => request<void>('DELETE', `/blocks/${enc(userId)}`),
  },

  support: {
    list: () => request<ItemList<SupportTicket>>('GET', '/support/tickets'),
    create: (body: CreateTicketRequest) => request<SupportTicketDetail>('POST', '/support/tickets', { body }),
    get: (code: string) => request<SupportTicketDetail>('GET', `/support/tickets/${enc(code)}`),
    reply: (code: string, body: string) =>
      request<SupportTicketDetail>('POST', `/support/tickets/${enc(code)}/messages`, { body: { body } }),
  },

  notifications: {
    list: (page: number) =>
      request<Paged<InAppNotification> & { unreadCount: number }>('GET', '/notifications', {
        query: { page, pageSize: 30 },
      }),
    markRead: (id: string) => request<void>('POST', `/notifications/${enc(id)}/read`),
    markAllRead: () => request<void>('POST', '/notifications/read-all'),
  },

  provider: {
    me: () => request<ProviderSelf>('GET', '/provider/me'),
    application: () => request<ProviderApplication>('GET', '/provider/application'),
    saveStep: <K extends ApplicationStepKey>(step: K, body: SaveStepRequest<K>) =>
      request<ProviderApplication>('PUT', `/provider/application/steps/${step}`, { body }),
    submitApplication: () => request<ProviderApplication>('POST', '/provider/application/submit'),
    documents: () => request<ItemList<VerificationDocument>>('GET', '/provider/documents'),
    documentUploadUrl: (body: UploadUrlRequest) =>
      request<UploadUrlResponse>('POST', '/provider/documents/upload-url', { body }),
    finaliseDocument: (id: string, body: FinaliseDocumentRequest) =>
      request<VerificationDocument>('POST', `/provider/documents/${enc(id)}/finalise`, { body }),
    removeDocument: (id: string) => request<void>('DELETE', `/provider/documents/${enc(id)}`),
    availability: () => request<ProviderAvailability>('GET', '/provider/availability'),
    updateAvailability: (body: { rules: AvailabilityRule[]; maxHoursPerDay: number | null }) =>
      request<ProviderAvailability>('PUT', '/provider/availability', { body }),
    addException: (body: { startsAt: string; endsAt: string; reason?: string }) =>
      request<AvailabilityException>('POST', '/provider/availability/exceptions', { body }),
    removeException: (id: string) => request<void>('DELETE', `/provider/availability/exceptions/${enc(id)}`),
    invitations: (status?: InvitationStatus | 'open') =>
      request<ItemList<ProviderInvitation>>('GET', '/provider/invitations', { query: { status } }),
    invitation: (id: string) => request<ProviderInvitation>('GET', `/provider/invitations/${enc(id)}`),
    markInvitationViewed: (id: string) => request<ProviderInvitation>('POST', `/provider/invitations/${enc(id)}/view`),
    acceptInvitation: (id: string) => request<ProviderInvitation>('POST', `/provider/invitations/${enc(id)}/accept`),
    declineInvitation: (id: string, reason: string) =>
      request<ProviderInvitation>('POST', `/provider/invitations/${enc(id)}/decline`, { body: { reason } }),
    bookings: (scope: BookingScope) => request<ItemList<Booking>>('GET', '/provider/bookings', { query: { scope } }),
    booking: (code: string) => request<Booking>('GET', `/provider/bookings/${enc(code)}`),
    startBooking: (code: string) => request<Booking>('POST', `/provider/bookings/${enc(code)}/start`),
    completeBooking: (code: string) => request<Booking>('POST', `/provider/bookings/${enc(code)}/complete`),
    cancelBooking: (code: string, body: CancelRequest) =>
      request<Booking>('POST', `/provider/bookings/${enc(code)}/cancel`, { body }),
  },
};
