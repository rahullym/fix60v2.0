# Fix60: Stage 1–2 Plan (Requirements, Architecture, Data Model)

Status: **Draft for client confirmation** · 2026-10-23
Source: the "home assistance & local services marketplace" super prompt. The Software Development Requirement Document (SRD) it refers to has **not been supplied** (see Q1).

## Progress

| Milestone                       | Status                         | Notes                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M0 Repo hygiene                 | ✅ code done, ⏳ not committed | Dev PostGIS compose (port 5446), Dockerfile (verified build + prod-mode run), prod compose, deploy workflow, pre-push typecheck, root eslint. No git commit yet.                                                                                                                                             |
| M1 Schema v2, auth, RBAC, audit | ✅                             | 3 migrations, 47 tables. Firebase → JWT with refresh rotation + reuse detection. Admin password + TOTP + lockout. 4 system roles, escalation guards. Append-only audit log. 54 unit tests plus a 47-check API smoke test and direct SQL checks of the booking-overlap, adult-provider and audit constraints. |

Deviations made while building M0–M1:

- **Payments:** the mock payment gateway was removed. Phase 2 payment tables are _not_ created yet (the plan said "schema only"). They arrive with Phase 2 so the schema doesn't carry unused tables.
- **Storage:** reworked to private-only (signed read/upload URLs). The earlier public-URL + base64 upload helper was dropped. Upload endpoints come with M3.
- **Auth guard:** passport was replaced by one global deny-by-default access guard.
- **Soft deletes:** append-only tables (`audit_logs`, `*_status_history`) have no `deleted_at`. Every other table, including join tables, soft-deletes.
- **Rate limits:** app sign-in/registration limits are 30/20 per minute per IP. Indian carrier-grade NAT puts many users behind one IP, and Firebase already limits OTP sends per phone. Admin login is 10/min per IP plus per-account lockout.

New open question:

- **Q13.** Is there a minimum age for _customers_? The prompt only requires providers to be 18+. Customer DOB is optional and not age-checked today.

Recorded decisions (do not re-open without the client):

| #   | Decision                                                                                                      | Deviation from prompt?                                     |
| --- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| D1  | Product name is **Fix60**. The existing Fix60 codebase evolves to cover this scope.                           | Yes: the prompt names the product "Rent a House Wife"      |
| D2  | ORM is **Drizzle** (LYM house standard, existing schema)                                                      | Yes: the prompt says Prisma                                |
| D3  | **One** role-based Expo app (customer + provider) replaces the two current apps                               | No (prompt's preference)                                   |
| D4  | OTP via **Firebase phone auth** → API verifies the ID token → API issues its own JWT + rotating refresh token | Yes: the prompt asks for a configurable India SMS provider |
| D5  | Single-tenant, REST `/api/v1`, theming on                                                                     | No                                                         |
| D6  | Storage, push and payments sit behind swappable adapters (registry)                                           | No                                                         |

---

## 1. Scope matrix

Legend: **P1/P2/P3** = phase · **Q** = needs client clarification · Fix60 status: ✅ exists (reusable) · ♻️ exists, needs rework · 🆕 new.

| Area         | Requirement                                                            | Phase            | Fix60 today                    | Notes                                                                              |
| ------------ | ---------------------------------------------------------------------- | ---------------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| Platforms    | Responsive public website (Next.js, SSR/SEO)                           | P1               | 🆕                             | `apps/site`                                                                        |
|              | Android app (customer + provider, one app)                             | P1               | ♻️ two GraphQL apps            | Merge; Apollo → REST                                                               |
|              | iOS app release                                                        | P2               | ♻️ ios/ folders exist          | Built from the same Expo code, not released/QA'd in P1                             |
|              | Admin panel (Next.js)                                                  | P1               | 🆕                             | `apps/admin`                                                                       |
|              | Backend API (NestJS modular monolith)                                  | P1               | ♻️ deps only, no `src/`        |                                                                                    |
| Auth         | Customer/provider OTP login                                            | P1               | ♻️ decision only               | D4                                                                                 |
|              | OTP expiry / resend limits / abuse protection                          | P1               | —                              | Firebase enforces send limits; API adds rate limits on `/auth/*` + App Check (Q11) |
|              | Admin login                                                            | P1               | —                              | Email + password (bcrypt 12) + TOTP 2FA (assumption A3)                            |
|              | Refresh-token rotation, device tokens                                  | P1               | ✅ tables                      | Rotation with reuse detection                                                      |
| Customer     | Profile, comms preferences, consent records                            | P1               | ♻️                             | Consent table is new                                                               |
|              | Browse categories, search, filters                                     | P1               | ♻️                             | New matching engine                                                                |
|              | Provider profile view + badges                                         | P1               | 🆕                             |                                                                                    |
|              | Quick request / request a specific provider                            | P1               | 🆕                             |                                                                                    |
|              | Track request + booking status                                         | P1               | ♻️                             | New lifecycle (§4)                                                                 |
|              | Saved providers                                                        | P1               | 🆕                             |                                                                                    |
|              | Reviews of completed services                                          | **Q** (P1 or P2) | ✅ `ratings` table             | The prompt lists it in both P1 and P2 (Q3)                                         |
|              | Report / block user                                                    | P1               | 🆕                             |                                                                                    |
|              | Support contact                                                        | P1               | ✅ `issues`                    |                                                                                    |
|              | Account deletion + privacy controls                                    | P1               | 🆕                             | Anonymise + purge (§6)                                                             |
| Provider     | 18+ check, 9-step wizard with drafts                                   | P1               | ♻️ basic onboarding            |                                                                                    |
|              | Document upload (private), per-document status                         | P1               | ♻️ two URL columns             | New `verification_documents`                                                       |
|              | Multi-service, qualifications, languages                               | P1               | ♻️ `provider_skills`           |                                                                                    |
|              | Service-specific dynamic questions                                     | P1               | 🆕                             | Admin-configured                                                                   |
|              | Service areas + radius, travel availability                            | P1               | ♻️ lat/lng/radius              | Moves to PostGIS                                                                   |
|              | Rates (hourly/daily/monthly, negotiable, minimum duration)             | P1               | 🆕                             | Informational in P1 (Q7)                                                           |
|              | Weekly availability, slots, max hours per day                          | P1               | ✅ `provider_availability`     | Add exceptions + max hours                                                         |
|              | Accept/decline requests, upcoming/completed                            | P1               | ♻️                             |                                                                                    |
|              | Earnings, settlements                                                  | P2               | ♻️ `bank_accounts`, `payments` | Tables stay dormant behind a flag                                                  |
| Admin        | RBAC: Super / Verification / Support / Finance                         | P1               | 🆕 (single `admin` role)       | Finance screens empty until P2                                                     |
|              | Dashboard KPIs                                                         | P1               | 🆕                             | Revenue KPIs hidden until P2                                                       |
|              | Users, providers, applications, verification                           | P1               | 🆕                             |                                                                                    |
|              | Catalog, questions, locations                                          | P1               | ♻️ `services`                  |                                                                                    |
|              | Requests and matching console                                          | P1               | 🆕                             |                                                                                    |
|              | Bookings, complaints, review moderation                                | P1               | 🆕                             |                                                                                    |
|              | Notification templates + delivery log                                  | P1               | ♻️ `notifications`             |                                                                                    |
|              | WhatsApp/SMS configuration                                             | P1               | 🆕                             | Secrets stay in env; admin toggles + template mapping only                         |
|              | CMS (banners, FAQs, policies, blog, contact)                           | P1               | ♻️ `banners`                   | Blog = **Q** (Q14)                                                                 |
|              | Audit logs, reports/exports                                            | P1               | 🆕                             | CSV export                                                                         |
| Integrations | WhatsApp Business Platform (official)                                  | P1               | 🆕                             | Clearly labelled test adapter until credentials exist                              |
|              | Push (FCM)                                                             | P1               | ✅ decision                    | APNs with iOS in P2                                                                |
|              | Maps / geocoding                                                       | P1               | ♻️                             | Google Maps (Places + Geocoding)                                                   |
|              | Email                                                                  | P1               | 🆕                             | Admin alerts + receipts; provider TBD                                              |
|              | Payment gateway (UPI, cards, refunds…)                                 | P2               | ♻️ mock                        |                                                                                    |
| Platform     | English + Malayalam; extensible i18n                                   | P1               | 🆕 (`Strings.ts` hardcoded)    |                                                                                    |
|              | SEO: sitemap, structured data, service/location pages                  | P1               | 🆕                             | Location pages only where approved providers exist                                 |
|              | Tests: unit, integration, e2e                                          | P1               | 🆕                             | Throwaway-Postgres e2e after features land (LYM §6)                                |
|              | Deployment docs, backups, monitoring                                   | P1               | ♻️ Sentry in apps              |                                                                                    |
| Later        | Advanced/AI matching, subscriptions, referrals, offers, more languages | P3               | —                              | Out of scope                                                                       |

## 2. Conflicts, gaps and open business decisions

**Blocking for a specific milestone** (the milestone is in brackets):

1. **Q1. Missing SRD.** The prompt treats an SRD as the primary source of truth, but none was supplied. This plan is built from the prompt alone. Please share the SRD so it can be reconciled. [all]
2. **Q2. Phase 1 payment model.** Payments are Phase 2. How do customers pay in Phase 1: cash or UPI directly to the provider, off-platform? Is a platform fee collected at all? This affects the T&Cs, the booking-completion step and the KPIs. [M6]
3. **Q3. Reviews in Phase 1 or Phase 2?** §4/§15 list reviews as customer features, while §17 Phase 2 says "if not included in Phase 1". Recommendation: **P1** (the table already exists, and reviews feed trust and ranking). [M6]
4. **Q4. Matching policy for quick requests.** Who picks the provider?
   - (a) Admin curates and invites providers manually.
   - (b) The system auto-invites the top N eligible providers and the first to accept wins.
   - (c) The system invites N, the customer chooses among those who accept.

   Recommendation: (c), with admin override. "Customer Confirmation Pending" already appears in the lifecycle. [M5]

5. **Q5. Invitation expiry and fan-out.** How many providers to invite at once, and how long before an invitation expires? Default assumption: 5 providers, 2 h, configurable. [M5]
6. **Q6. Cancellation and no-show rules.** Who may cancel, until when, and whether there are consequences (strikes, suspension). [M6]
7. **Q7. Rates.** Are rates per provider or per provider × service? Default assumption: per service, because a driver and a cook price differently. [M3]
8. **Q8. Required documents per service.** For example: Aadhaar or another photo ID for everyone, a driving licence for drivers, and a Police Clearance Certificate for childcare and patient care? Is a **gender** field required, and for which services? Today's enum is `male | female` only and needs extending (A5). [M3]
9. **Q9. Launch geography.** Kerala only? Which districts, and who supplies the locality and postal-code master data? [M2]
10. **Q10. WhatsApp setup.** Use Meta Cloud API directly or a BSP (Gupshup, Interakt, AiSensy)? The business owner must own the Meta Business account, the verified number and the approved templates. Per LYM §1.3, I will also ask the multi-provider question when wiring it. [M7]
11. **Q11. Firebase OTP limits.** Firebase controls SMS throttling and cost. We will add Firebase App Check and API-side rate limits. If you later need DLT-registered sender IDs or WhatsApp OTP, the SMS adapter decision has to be revisited. [M1]
12. **Q12. Hosting.** Cloud provider and region (suggest AWS ap-south-1 Mumbai for DPDP data locality), and managed Postgres **with PostGIS + btree_gist** extensions. Account ownership must sit with the business owner. [M0]

**Non-blocking. Proceeding with configurable assumptions:**

- **A1.** Public IDs use human-readable codes (`REQ-26-000123`, `APP-26-…`, `PRV-…`). Primary keys switch from integer identity to **UUIDv7** so public APIs never expose sequential IDs. Safe because migration `0000_init` has never been committed or deployed.
- **A2.** Approval is **per service** (`provider_services.status`). A provider can be approved as a cleaner while their childcare application is still pending.
- **A3.** Admins use email + password (bcrypt 12) + TOTP. They do not use phone OTP.
- **A4.** Rating sort applies only once a provider has ≥ 3 published reviews. Below that threshold, ranking uses distance and experience only, with no fabricated signal.
- **A5.** Gender enum becomes `female | male | other | prefer_not_to_say`. It is optional unless a service rule requires it (Q8).
- **A6.** Aadhaar: store **only the last 4 digits** and the scanned document (encrypted, private). Never store the full number (UIDAI rules).
- **A7.** Retention for rejected applications' documents: purge after 90 days (configurable; confirm with legal).
- **A8.** LYM's soft-delete rule conflicts with account deletion. Resolution: user rows are soft-deleted **and PII-anonymised**, S3 objects are hard-deleted, and bookings and reports are kept with anonymised references.

**Prohibited-use enforcement (P1):**

- Policy acceptance at signup.
- A fixed, admin-controlled catalog: no free-text "custom service" is publicly listed without approval.
- Keyword flagging on request notes and reviews, routed to an admin queue.
- A one-tap report button on every profile, request and booking.

## 3. Architecture

```text
fix60_backend/ (Turborepo, pnpm)
apps/
  api/      NestJS modular monolith: sole DB consumer, REST /api/v1, OpenAPI
  site/     Next.js public website (SSR/SSG, SEO, en/ml)            🆕
  admin/    Next.js admin panel (FSD, Tailwind + shadcn)             🆕 (was "apps/web")
packages/
  db/       Drizzle schema + SQL migrations (PostGIS, btree_gist)
  shared/   Zod contracts, enums, state machines (pure), i18n keys
  i18n/     en.json, ml.json message catalogs shared by site/admin/app  🆕
Fix60_app/  Expo RN (merged consumer + provider), Expo Router role groups 🆕
```

**API modules** (`apps/api/src/modules/*`, each with controller → service → repository):

`auth` · `users` · `customers` · `providers` · `applications` (wizard + drafts) · `verification` (documents, reviews) · `catalog` (categories, services, questions, required docs) · `locations` · `availability` · `matching` (eligibility + ranking, pure functions) · `requests` · `invitations` · `bookings` · `reviews` · `safety` (reports, blocks, moderation) · `notifications` (channels: push, whatsapp, email, in-app; delivery log) · `cms` · `admin-rbac` · `audit` · `reporting` · `payments` (P2, flag-off) · `storage` (adapter) · `jobs` (pg-boss on Postgres for reminders, expiries and retries, so no Redis is needed in P1).

**Cross-cutting rules:**

- Guards on every route: `JwtAuthGuard` + `RolesGuard` + `PermissionsGuard` (admin).
- Ownership checks are done in services, never trusted from the client.
- Every admin mutation goes through `AuditInterceptor`.
- Zod validation at the edge. Error envelope is `{code, message}`; the UIs map `code` to localised layman copy.
- Logs are structured and redacted: no tokens, document keys or phone numbers in full.

## 4. State machines (enforced in `packages/shared`, pure transition tables + DB checks)

**Request**

```text
submitted ─▶ under_review ─▶ matching ─▶ provider_notified ─┬─▶ provider_accepted ─▶ customer_confirmation_pending ─▶ booking_confirmed
    │             │              │                          └─▶ provider_declined ─▶ matching (re-invite) | cancelled
    └─────────────┴──────────────┴─────────── any non-terminal ─▶ cancelled
booking_confirmed ─▶ disputed (via booking)
```

- A directed request (customer picked a provider) starts at `provider_notified`.
- `provider_accepted` / `provider_declined` describe the request as a whole. Per-provider responses live on `request_invitations` (`invited → viewed → accepted | declined | expired | withdrawn`).

**Booking**: created **only** by the customer-confirm transition, inside one transaction.

```text
confirmed ─▶ service_started ─▶ service_completed
    │               │
    ├─▶ cancelled   └─▶ disputed
    └─▶ disputed
```

**Double-booking guard (server, in the database):**

- `bookings.slot tstzrange` with `EXCLUDE USING gist (provider_id WITH =, slot WITH &&) WHERE status IN ('confirmed','service_started')`.
- On top of that, the service checks availability rules and max hours per day inside the same transaction.

## 5. Database design (Drizzle, Postgres 16 + PostGIS + btree_gist)

All tables have `id uuid v7`, `created_at`, `updated_at`, `deleted_at` (soft delete), and `created_by`/`updated_by` where relevant. Status changes are written to `*_status_history`.

| Domain                     | Tables                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Key constraints                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Identity                   | `users` (role, phone E.164 unique, firebase_uid unique, status active/suspended/deleted), `customer_profiles`, `refresh_tokens`, `device_tokens`, `consents` (type, version, granted, source, at), `user_blocks` (blocker, blocked, unique pair), `saved_providers`                                                                                                                                                                                         | Partial unique indexes ignore soft-deleted rows               |
| Admin                      | `admin_users` (email, password_hash, totp_secret_enc), `admin_roles`, `permissions`, `role_permissions`, `admin_user_roles`, `audit_logs` (actor, action, entity, entity_id, diff_redacted jsonb, ip, ua)                                                                                                                                                                                                                                                   | `audit_logs` is append-only (no update/delete grants)         |
| Catalog                    | `service_categories`, `services` (slug, name/description `jsonb {en, ml}`, eligibility jsonb, active, sort), `service_required_documents`, `service_questions` (type, options, required, i18n)                                                                                                                                                                                                                                                              | Slug unique                                                   |
| Location                   | `states`, `districts`, `localities` (postal_code, `centroid geography(Point)`)                                                                                                                                                                                                                                                                                                                                                                              | GIST index on centroid                                        |
| Provider                   | `provider_profiles` (code, dob, gender, years_exp, bio, travel_pref, max_hours_day, status draft/active/suspended), `provider_services` (service, status pending/approved/rejected, rates hourly/daily/monthly, negotiable, min_duration_min), `provider_service_answers`, `provider_qualifications`, `provider_languages`, `provider_service_areas` (`center geography`, radius_km), `availability_rules` (weekday, start, end), `availability_exceptions` | `CHECK dob <= now() - 18y`; unique (provider, service)        |
| Verification               | `provider_applications` (code, status draft/submitted/under_review/info_required/approved/rejected, current_step, draft jsonb), `verification_documents` (type, storage_key, mime, size, sha256, status pending/verified/rejected/info_required, reviewer_id, note, purge_after), `application_reviews`                                                                                                                                                     | Document keys never appear in public DTOs                     |
| Requests                   | `service_requests` (code, customer, service, locality, `point geography`, date, start/end, hours, budget, notes, contact, source quick/directed, target_provider_id, status), `request_invitations` (request, provider, status, rank_score, expires_at, responded_at, decline_reason), `request_status_history`                                                                                                                                             | Unique (request, provider) on invitations                     |
| Bookings                   | `bookings` (code, request unique, customer, provider, provider_service, `slot tstzrange`, agreed_rate, status, cancel_reason, cancelled_by), `booking_status_history`                                                                                                                                                                                                                                                                                       | EXCLUDE constraint (§4)                                       |
| Trust                      | `reviews` (booking unique, rating 1–5, text, status published/hidden, moderated_by), `reports` (reporter, subject_user, booking?, reason enum, details, status open/investigating/actioned/closed, assignee), `report_actions`                                                                                                                                                                                                                              | Reports are visible only to the reporter and permitted admins |
| Notifications              | `notification_templates` (event, channel, locale, body, wa_template_name), `notifications` (in-app inbox), `notification_deliveries` (channel, status queued/sent/delivered/read/failed, provider_msg_id, error, **is_test_mode**)                                                                                                                                                                                                                          | WhatsApp sends require a granted `consents` row               |
| CMS                        | `cms_pages` (slug, i18n body, published), `cms_blocks` (banner/faq/contact), `site_settings`, `themes`, `organization` (existing)                                                                                                                                                                                                                                                                                                                           |                                                               |
| P2 (schema only, flag-off) | `payments`, `refunds`, `settlements`, `invoices`, `bank_accounts`                                                                                                                                                                                                                                                                                                                                                                                           | No P1 code paths write to these                               |

Existing Fix60 tables that are **retired**:

- `bookings` job-progress fields (`en_route`, `arrived`, …), `booking_location_pings` and `booking_materials`. These belong to the old on-demand "fix" flow. Keep them only if the client wants live tracking (P3).
- `provider_skills` → `provider_services`.
- `ratings` → `reviews`.

## 6. Security & privacy specifics

- Documents go to a private S3 bucket with SSE-KMS. Uploads use presigned PUT URLs constrained by content-type and size (≤ 5 MB; jpg/png/pdf, magic-byte check on finalise). Reads use a 5-minute presigned GET issued only to permitted admins, and every view is audit-logged.
- Public DTOs are whitelisted (separate Zod schemas): name, photo, district/locality, approved services, experience, languages, rates, rating, badge. Nothing else.
- Rate limits use `@nestjs/throttler` with a Postgres store: auth 5/min/IP and 10/h/phone; request creation 10/day/customer.
- Account deletion is a request with a 7-day grace period. A job then anonymises PII, revokes tokens and purges objects (A8). Users can export their data.
- DPDP Act 2023: purpose-specific consent records, a notice in en/ml, and a grievance officer contact on the site.

## 7. API plan (excerpt; full OpenAPI generated from the Zod contracts)

| Group        | Endpoints                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| auth         | `POST /auth/firebase` (ID token → JWT pair), `POST /auth/refresh`, `POST /auth/logout`, `POST /admin/auth/login`, `POST /admin/auth/totp`                                                                                                                                                                                                                                                                         |
| me           | `GET/PATCH /me`, `GET/PUT /me/consents`, `POST /me/deletion-request`, `GET /me/export`                                                                                                                                                                                                                                                                                                                            |
| catalog      | `GET /categories`, `GET /services/:slug`, `GET /services/:id/questions`                                                                                                                                                                                                                                                                                                                                           |
| search       | `GET /providers/search?service&locality&lat&lng&radius&date&start&end&hours&budget&minExp` → ranked, public DTO; `GET /providers/:code`                                                                                                                                                                                                                                                                           |
| provider app | `GET/PUT /provider/application` (draft per step), `POST /provider/application/submit`, `POST /provider/documents/upload-url`, `POST /provider/documents/:id/finalise`, `PUT /provider/availability`, `GET /provider/invitations`, `POST /provider/invitations/:id/accept\|decline`, `GET /provider/bookings`                                                                                                      |
| customer     | `POST /requests` (quick or directed), `GET /requests`, `GET /requests/:code`, `POST /requests/:code/confirm/:invitationId`, `POST /requests/:code/cancel`, `GET /bookings`, `POST /bookings/:code/cancel\|complete`, `POST /bookings/:code/review`, `PUT /saved-providers/:code`                                                                                                                                  |
| safety       | `POST /reports`, `POST /blocks`, `DELETE /blocks/:userId`                                                                                                                                                                                                                                                                                                                                                         |
| admin        | `/admin/dashboard`, `/admin/customers`, `/admin/providers`, `/admin/applications/:id/(approve\|reject\|request-info)`, `/admin/documents/:id/view-url`, `/admin/catalog/*`, `/admin/locations/*`, `/admin/requests/:id/invite`, `/admin/bookings/*`, `/admin/reports/*`, `/admin/reviews/:id/hide`, `/admin/notifications/*`, `/admin/cms/*`, `/admin/roles/*`, `/admin/audit-logs`, `/admin/exports/:entity.csv` |
| webhooks     | `POST /webhooks/whatsapp` (signature-verified delivery status)                                                                                                                                                                                                                                                                                                                                                    |

**Ranking (transparent and documented on the site):**

1. Filter: eligible (§8 of the prompt).
2. Sort by distance bucket (0–5 / 5–10 / 10–20 / 20+ km).
3. Then rate within budget.
4. Then years of experience.
5. Then rating (only when ≥ 3 reviews).
6. Then stable tie-break.

## 8. Milestones (each ends with passing tests + a demo on staging)

| M   | Deliverable                                                                                             | Acceptance                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| M0  | Repo hygiene: first commit, CI (lint, typecheck, test), Docker, env docs, staging Postgres with PostGIS | `pnpm typecheck && pnpm test` green in CI                                                                 |
| M1  | Schema v2 migration, auth (Firebase → JWT, rotation), admin auth + RBAC, audit interceptor              | Role/permission matrix tests; refresh-reuse detection test                                                |
| M2  | Catalog, questions, locations, CMS APIs, plus the admin screens for them                                | Admin creates a service with questions and documents; no code change needed                               |
| M3  | Provider wizard API + document storage + verification workflow + admin review UI                        | Under-18 rejected; documents never reachable via public routes (test); approve/reject/info flows          |
| M4  | Matching/search engine + public provider profiles                                                       | Suspended, rejected and unverified providers are never returned (property tests); radius tests on PostGIS |
| M5  | Requests + invitations + admin matching console                                                         | Lifecycle transition tests; invitation expiry job                                                         |
| M6  | Bookings + double-booking guard, cancellation, completion, reviews, reports/blocks                      | Concurrent-confirm test proves the EXCLUDE constraint                                                     |
| M7  | Notifications: in-app, FCM, WhatsApp (test adapter → live once credentials exist), email; delivery log  | Consent-gated sends; test-mode deliveries are labelled and never reported as sent                         |
| M8  | Public site (en/ml, SEO, sitemap, policy pages)                                                         | Lighthouse ≥ 90 on mobile; no indexed private data                                                        |
| M9  | Merged Expo app on REST (customer + provider), Android release build                                    | Detox/Maestro e2e for the three core journeys                                                             |
| M10 | Throwaway-Postgres e2e suite, security review, backup/restore drill, deployment + maintenance docs      | Success criteria from the prompt demonstrated end to end                                                  |
