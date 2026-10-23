# Fix60 mobile ↔ API contract (v1 draft)

**For:** the fix60_backend team.
**Source of truth in code:**
- `src/shared/api/types.ts`: request and response shapes.
- `src/shared/api/endpoints.ts`: methods and paths.
- `src/shared/api/mock/`: a reference implementation of behaviour.

Shapes that already exist in `@fix60/shared` are copied verbatim: `Me`, `AuthTokens`, `FirebaseSignInResponse`, register requests, consents, `PublicBranding`. Everything else follows `docs/plan/phase1-plan.md` §7. Where the backend picks a different shape, change `types.ts` and `endpoints.ts` together. Screens depend only on those two files.

## Conventions the app relies on

| Topic | Expectation |
|---|---|
| Base | `${EXPO_PUBLIC_API_URL}/api/v1` |
| Auth | `Authorization: Bearer <accessToken>` |
| Token refresh | On `401` with `code` `TOKEN_EXPIRED` or `UNAUTHENTICATED`, the app calls `POST /auth/refresh` once (single-flight), then retries. Refresh failure clears the session. |
| App Check | `X-Firebase-AppCheck` is sent on `/auth/firebase` and `/auth/register` when available |
| Errors | `{ statusCode, message, error, timestamp, requestId?, code?, issues? }`. The app maps `code` to its own copy and never shows `message`. |
| Extra codes used | `SLOT_UNAVAILABLE` (confirm or reschedule into an overlapping slot) and `NETWORK_ERROR` (client-side only). Please add `SLOT_UNAVAILABLE` to `errorCodes`. |
| Ids | Public lookups use codes (`REQ-…`, `BKG-…`, `PRV-…`, `TKT-…`). Invitations, documents and notifications use UUIDs. |
| Lists | `{ items }`. Paged lists use `{ items, page, pageSize, total }`. |
| Localised text | `LocalizedText = { en: string, ml?: string }` for catalog, location and CMS strings |
| Dates | Timestamps are ISO 8601 with an offset. Request date and time are `preferredDate: YYYY-MM-DD` and `startTime: HH:mm`, both Asia/Kolkata. |
| Public DTOs | `ProviderCard` and `ProviderPublicProfile` are whitelists. They never include phone, documents or exact address. |
| Contact reveal | `Booking.counterparty.phone` and `areaNote` only appear once a booking exists |

## Endpoints

### Auth and account
| Method | Path | Body → Response |
|---|---|---|
| POST | `/auth/firebase` | `{ idToken, role }` → `FirebaseSignInResponse` (`ROLE_MISMATCH`, `ACCOUNT_SUSPENDED`) |
| POST | `/auth/register` | `RegisterRequest` (discriminated by `role`) → `AuthSessionResponse` (`UNDERAGE`, `CONSENT_REQUIRED`, `ALREADY_REGISTERED`) |
| POST | `/auth/refresh` | `{ refreshToken }` → `AuthTokens` |
| POST | `/auth/logout` | `{ refreshToken }` → 204 |
| GET / PATCH | `/me` | `UpdateMeRequest` → `Me` |
| GET / PUT | `/me/consents` | `UpdateConsentsRequest` → `{ items: ConsentState[] }` |
| GET / POST / DELETE | `/me/deletion-request` | → `DeletionRequestState` (7-day grace) |
| POST | `/me/devices` | `{ token, platform }` → 204 (FCM registration) |

### Public (no auth)
| Method | Path | Response |
|---|---|---|
| GET | `/branding` | `PublicBranding` |
| GET | `/settings/public` | `OrganizationSettings` |
| GET | `/cms/banners?audience=customer\|provider` | `{ items: Banner[] }` |
| GET | `/cms/pages/:slug` | `CmsPage` (body is markdown per locale) |
| GET | `/cms/faqs?audience=` | `{ items: Faq[] }` |
| GET | `/locations/districts` | `{ items: District[] }` |
| GET | `/locations/localities?districtId=&q=` | `{ items: Locality[] }` |
| GET | `/categories` | `{ items: Category[] }` (with nested `services`) |
| GET | `/services/:slug` | `ServiceDetail` (questions + required documents) |

### Customer
| Method | Path | Body → Response |
|---|---|---|
| GET | `/providers/search?serviceId&localityId&latitude&longitude&radiusKm&date&startTime&durationHours&maxBudget&minExperience&language&page&pageSize` | `Paged<ProviderCard>`, ranked per plan §7 |
| GET | `/providers/:code` | `ProviderPublicProfile` |
| GET | `/saved-providers` | `{ items: ProviderCard[] }` |
| PUT / DELETE | `/saved-providers/:code` | 204 |
| POST | `/requests` | `CreateRequestRequest` (with `providerCode` = directed) → `ServiceRequestDetail` |
| GET | `/requests?status=` | `{ items: ServiceRequestSummary[] }` |
| GET | `/requests/:code` | `ServiceRequestDetail` (includes `acceptedInvitations`) |
| POST | `/requests/:code/confirm/:invitationId` | → `Booking` (`SLOT_UNAVAILABLE`, `INVALID_STATE_TRANSITION`) |
| POST | `/requests/:code/cancel` | `{ reason }` → `ServiceRequestDetail` |
| GET | `/bookings?scope=upcoming\|active\|past` | `{ items: Booking[] }` |
| GET | `/bookings/:code` | `Booking` |
| POST | `/bookings/:code/cancel` | `{ reason }` → `Booking` |
| POST | `/bookings/:code/complete` | → `Booking` (customer confirms the service was done) |
| POST | `/bookings/:code/review` | `{ rating, comment? }` → `Booking` |

### Safety and support (both roles)
| Method | Path | Body → Response |
|---|---|---|
| POST | `/reports` | `CreateReportRequest` → `ReportReceipt` |
| GET | `/blocks` | `{ items: BlockedUser[] }` |
| POST | `/blocks` | `{ userId }` → 204 |
| DELETE | `/blocks/:userId` | 204 |
| GET / POST | `/support/tickets` | `CreateTicketRequest` → `SupportTicketDetail` |
| GET | `/support/tickets/:code` | `SupportTicketDetail` |
| POST | `/support/tickets/:code/messages` | `{ body }` → `SupportTicketDetail` |
| GET | `/notifications?page&pageSize` | `Paged<InAppNotification> & { unreadCount }` |
| POST | `/notifications/:id/read`, `/notifications/read-all` | 204 |

### Provider
| Method | Path | Body → Response |
|---|---|---|
| GET | `/provider/me` | `ProviderSelf` |
| GET | `/provider/application` | `ProviderApplication`. Created as a draft on first read. |
| PUT | `/provider/application/steps/:step` | `{ data }` for the step key (`personal`, `location`, `services`, `service_details`, `experience`, `service_area`, `availability`, `documents`, `review`) → `ProviderApplication` |
| POST | `/provider/application/submit` | → `ProviderApplication`. Validates all steps, mandatory documents and the 18+ rule; records the `provider_declaration` consent. |
| GET | `/provider/documents` | `{ items: VerificationDocument[] }` |
| POST | `/provider/documents/upload-url` | `UploadUrlRequest` → `UploadUrlResponse` (presigned PUT, ≤ 5 MB, jpg/png/pdf) |
| POST | `/provider/documents/:id/finalise` | `{ idNumberLast4? }` → `VerificationDocument` (magic-byte check) |
| DELETE | `/provider/documents/:id` | 204. Only while the document is `pending` or `rejected`. |
| GET / PUT | `/provider/availability` | `{ rules, maxHoursPerDay }` → `ProviderAvailability` |
| POST / DELETE | `/provider/availability/exceptions[/:id]` | `{ startsAt, endsAt, reason? }` → `AvailabilityException` |
| GET | `/provider/invitations?status=open\|…` | `{ items: ProviderInvitation[] }`. `open` = invited + viewed. |
| GET | `/provider/invitations/:id` | `ProviderInvitation` |
| POST | `/provider/invitations/:id/view` / `accept` / `decline` (`{ reason }`) | → `ProviderInvitation` |
| GET | `/provider/bookings?scope=` | `{ items: Booking[] }` |
| GET | `/provider/bookings/:code` | `Booking` |
| POST | `/provider/bookings/:code/start` / `complete` / `cancel` (`{ reason }`) | → `Booking` |

## Push payloads (FCM `data`, all strings)

| `type` | Keys | App action |
|---|---|---|
| `invitation` | `invitationId` | Open `/provider/invitations/:id` |
| `request_update` | `requestCode`, `status` | Open `/customer/requests/:code` |
| `booking_update` | `bookingCode`, `status`, `role` | Open the role's booking detail |
| `support_reply` | `ticketCode` | Open `/support/:code` |
| `application_update` | `status` | Open `/provider` |

## Open questions found while building the app

These are the app's current assumptions. Please confirm them or change the contract.

1. **Budget units:** `maxBudget` (search) and `budgetAmount` (request) are treated as ₹ per hour. Is that right, or is either one a total?
2. **Overdue bookings:** a `confirmed` booking whose slot has passed without starting is listed under `active`. Should there be a `no_show` status or a rule for it?
3. **Expired invitations:** when every invitation on a request expires, the request stays `provider_notified`. It probably needs to move on, for example to `provider_declined`, plus an admin queue.
4. **Expired vs taken invitations:** invitations use one `INVALID_STATE_TRANSITION` code for both. Separate `INVITATION_EXPIRED` and `INVITATION_FILLED` codes would allow clearer messages.
5. **Decline reasons:** suggest `{ reasonCode, note? }` with an enum instead of free text.
6. **Required documents:** add `requiredDocuments` to `ProviderApplication`. Today the app works them out by fetching every selected service.
7. **Documents per service:** are documents per type or per service? The app sends no `serviceId`.
8. **Stub documents:** documents between `upload-url` and `finalise` have no status. Consider adding `awaiting_upload`.
9. **Locality names:** add `localityName` to `Me` and to `draft.location` (with lat/lng), and `districtName` to `ServiceRequestDetail` and `Booking`. This saves extra lookups.
10. **Editable application:** add `canEdit` to `ProviderApplication`. Today the app assumes only `draft` and `info_required` are editable.
11. **Provider rates:** `GET /providers/:code` returns no rates for a specific service. Consider `?serviceId=`.
12. **Banner links:** banner `linkPath` must use app routes, e.g. `/customer/services/<slug>`.
13. **Language codes:** `ProviderCard.languages` needs a defined code list.
14. **Profile photo:** `Me` has no profile photo URL.
15. **Phone number changes:** there is no endpoint to request one; support handles it for now.
16. **Unread count:** `POST /notifications/:id/read` returns 204, so the app refetches to get the new unread count.
17. **Deletion grace period:** signing in during the 7-day window should be allowed and should offer cancellation.
