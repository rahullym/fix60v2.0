---
marp: true
theme: default
paginate: true
title: Fix60 – Project Flow & Features
---

# Fix60

### Trusted home help and local services, on one app

Kerala · English + Malayalam · Android first

Customer app · Provider app · Admin panel · REST API

---

## The problem

- Families need reliable help at home: drivers, patient care, cleaning, childcare, cooks, electricians, plumbers.
- Today they find people through word of mouth, with no verification and no record.
- Good workers have no easy way to show their skills, set their hours or get steady work.

## The Fix60 answer

- Every provider is **verified** (18+, ID documents, admin review) before they can be booked.
- Customers describe what they need; Fix60 **matches** nearby, available providers.
- The customer **chooses** from the providers who accept. No double-booking, full history, reviews.

---

## Who uses Fix60

| User | What they do | Where |
|---|---|---|
| **Customer** | Browse services, request help, choose a provider, track and review bookings | Fix60 mobile app |
| **Provider** | Apply and get verified, set availability, accept jobs, manage bookings | Same Fix60 app (provider mode) |
| **Admin** | Verify providers, manage users, roles, catalog and safety reports | Admin web panel |

One mobile app serves both customers and providers. The role is picked at sign-in.

---

## Service catalog (seeded, admin-managed)

| Category | Services |
|---|---|
| Transport | Taxi / Personal Driver · Driver with Shopping Assistance |
| Patient Support | Patient Care Assistance · Patient Companion |
| Personal & Daily | Shopping · Travel · Home Stay Assistance |
| Home Services | Home Assistance · Cleaning · Electrician · Plumber · Mechanic |
| Personal Care | Beauty and Grooming |
| Childcare | Childcare / Daycare |
| Food | Homemade Food |

- Each service has its own **questions** and **required documents**, configured by admin with no code change.
- Locations: all **14 districts of Kerala**, with localities.

---

## End-to-end flow

```mermaid
flowchart LR
  A[Provider applies<br/>9-step wizard] --> B[Admin verifies<br/>documents]
  B --> C[Provider active<br/>sets availability]
  D[Customer creates<br/>request] --> E[Matching engine<br/>finds eligible providers]
  C --> E
  E --> F[Providers get<br/>invitations]
  F --> G[Providers accept<br/>or decline]
  G --> H[Customer chooses<br/>one provider]
  H --> I[Booking confirmed]
  I --> J[Service started<br/>→ completed]
  J --> K[Customer review]
```

---

## Sign-in flow (both roles)

1. **Welcome** slides, with a language switch (English / മലയാളം).
2. Choose **I need help** (customer) or **I want to work** (provider).
3. Enter phone number → receive **OTP** (Firebase phone auth).
4. New user? Short **registration** + accept terms and privacy consent.
5. The API checks the Firebase token and issues its own secure session.

![w:180](screenshots/mobile/01-welcome.png) ![w:180](screenshots/mobile/04-welcome-malayalam.png) ![w:180](screenshots/mobile/05-phone.png) ![w:180](screenshots/mobile/06-otp.png)

---

## Customer journey 1 — Find a service

- **Home:** banners, categories, active requests and the next booking at a glance.
- **Browse** all categories → **service page** with what's included.
- **Search** providers by service, locality, date, time, hours, budget, experience and language.
- **Provider profile:** photo, services, experience, languages, rates, rating, verified badge.
- **Save** favourite providers for later.

![w:170](screenshots/mobile/10-customer-home.png) ![w:170](screenshots/mobile/15-customer-browse.png) ![w:170](screenshots/mobile/18-customer-search.png) ![w:170](screenshots/mobile/19-customer-provider-profile.png)

---

## Customer journey 2 — Request and choose

Two ways to ask for help:

- **Quick request:** describe the need. Fix60 invites the best-matched providers.
- **Directed request:** ask one specific provider from their profile.

Then:

1. Fill the request form: service, location, date, start time, hours, budget, notes, plus service-specific questions.
2. Track it live: *submitted → matching → providers notified*.
3. See the providers who **accepted**, compare them and **choose one**.
4. A booking is created. Contact details are revealed only now.

![w:170](screenshots/mobile/20-customer-request-form.png) ![w:170](screenshots/mobile/21-customer-request-matching.png) ![w:170](screenshots/mobile/22-customer-request-choose.png)

---

## Customer journey 3 — Booking to review

- **Bookings** tab: upcoming, active and past.
- Booking detail: provider, time slot, agreed rate, status timeline, contact.
- Cancel with a reason, or confirm the service is done.
- Leave a **1–5 star review** with a comment.
- One-tap **report** on any profile, request or booking.

![w:170](screenshots/mobile/24-customer-booking-upcoming.png) ![w:170](screenshots/mobile/25-customer-booking-active.png) ![w:170](screenshots/mobile/26-customer-booking-completed.png) ![w:170](screenshots/mobile/27-customer-review.png)

---

## Provider journey 1 — Apply and get verified

A guided **9-step application** with auto-saved drafts:

1. Personal details (18+ enforced)
2. Location
3. Services offered
4. Service details (service-specific questions, rates: hourly / daily / monthly)
5. Experience, qualifications, languages
6. Service area and travel radius
7. Weekly availability
8. Documents (photo ID, licence, police clearance, as required by service)
9. Review and submit

Admin then **approves, rejects or asks for more info**, per document and per service.

![w:150](screenshots/mobile/60-application-home.png) ![w:150](screenshots/mobile/61-application-step-personal.png) ![w:150](screenshots/mobile/64-application-step-service-details.png) ![w:150](screenshots/mobile/68-application-step-documents.png) ![w:150](screenshots/mobile/69-application-step-review.png)

---

## Provider journey 2 — Get jobs and work

- **Jobs** tab: open invitations with a countdown before they expire.
- Invitation detail: service, area, date, hours, budget, customer notes.
- **Accept** or **decline** (with a reason).
- **Bookings:** upcoming, active and past. **Start** and **complete** a job, or cancel with a reason.
- **Availability:** weekly hours, days off and a max-hours-per-day limit.
- **Profile:** preview exactly what customers see; manage documents.

![w:160](screenshots/mobile/50-provider-jobs.png) ![w:160](screenshots/mobile/51-provider-invitation.png) ![w:160](screenshots/mobile/54-provider-booking-active.png) ![w:160](screenshots/mobile/57-provider-availability.png) ![w:160](screenshots/mobile/58-provider-profile.png)

---

## Request and booking lifecycle

**Request**

```text
submitted → under_review → matching → provider_notified
   → provider_accepted → customer_confirmation_pending → booking_confirmed
(any open step can be cancelled; a decline goes back to matching)
```

**Invitation** (per provider): invited → viewed → accepted / declined / expired / withdrawn

**Booking**

```text
confirmed → service_started → service_completed
(confirmed or started can become cancelled or disputed)
```

Every status change is recorded in a history table.

---

## How matching works (transparent ranking)

1. **Filter** to eligible providers only: approved for the service, active, covering the area, free at that time.
2. Sort by **distance band** (0–5, 5–10, 10–20, 20+ km).
3. Then **rate within budget**.
4. Then **years of experience**.
5. Then **rating**, only once a provider has 3+ reviews (no fake signals).
6. Stable tie-break.

Suspended, rejected or unverified providers never appear.

---

## Account, safety and support (both roles)

- **Profile** and **language** settings.
- **Consents:** clear, purpose-specific choices (terms, privacy, WhatsApp updates).
- **Block** a user; manage the blocked list.
- **Report** a user or booking for review by the safety team.
- **Support tickets:** raise an issue, chat with support, see FAQs.
- **In-app notifications** plus push notifications that open the right screen.
- **Delete account** with a 7-day grace period.
- Policy pages: terms, privacy.

![w:160](screenshots/mobile/30-settings.png) ![w:160](screenshots/mobile/32-settings-consents.png) ![w:160](screenshots/mobile/36-support.png) ![w:160](screenshots/mobile/39-report.png) ![w:160](screenshots/mobile/34-settings-delete-account.png)

---

## Admin panel

Web console for the Fix60 team (Next.js):

- **Overview** dashboard
- **Customers** and **Providers:** search, detail, recent bookings, suspend or reactivate
- **Admins** and **Roles:** Super Admin, Verification, Support, Finance
- **Audit log** of every privileged action
- **My account** and two-factor sign-in

Planned next: application review queue, catalog and location editor, matching console, bookings, reports and review moderation, CMS (banners, FAQs, pages), notification templates, CSV exports.

---

## Architecture

```mermaid
flowchart TB
  App[Fix60 mobile app<br/>Expo / React Native<br/>customer + provider] -->|REST /api/v1| API
  Admin[Admin panel<br/>Next.js] -->|REST via secure proxy| API
  API[Fix60 API<br/>NestJS] --> DB[(Postgres + PostGIS<br/>Neon)]
  API --> FB[Firebase<br/>phone OTP + FCM push]
  API --> S3[Private file storage<br/>S3-compatible]
  API -.Phase 2.-> Pay[Payment gateway]
  API -.planned.-> WA[WhatsApp Business]
```

- One codebase per surface; shared request/response contracts (Zod) keep app, admin and API in sync.
- Storage, push and payments sit behind **swappable adapters**.

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile app | Expo, React Native, Expo Router, TanStack Query, i18n (en / ml) |
| Admin panel | Next.js, Tailwind |
| API | NestJS (modular monolith), REST `/api/v1` |
| Database | PostgreSQL on Neon, PostGIS for distance, Drizzle ORM |
| Auth | Firebase phone OTP → Fix60 JWT + rotating refresh tokens; admins use password + TOTP |
| Files | Private S3-compatible bucket, short-lived signed URLs |
| Push | Firebase Cloud Messaging |
| DevOps | Turborepo + pnpm, Docker, GitHub Actions deploy |

---

## Security and trust, built in

- **Deny by default:** every API route must declare who can call it.
- **Live checks:** a suspension or role change takes effect on the next request.
- **Sessions:** short-lived tokens; refresh tokens rotate, and reuse of an old one kills the session.
- **Admin sign-in:** password + authenticator code, lockout after 5 failures.
- **Audit log:** append-only and redacted (phones and emails masked).
- **Database rules:** a provider can never be double-booked; providers must be 18+.
- **Privacy:** documents are private; Aadhaar stores the last 4 digits only; public profiles never show phone, documents or exact address.
- Built with India's **DPDP Act 2023** in mind: consent records, data export, account deletion.

---

## Where we are

| Milestone | Status |
|---|---|
| M0 Repo setup, Docker, deploy pipeline | ✅ Done |
| M1 Database (47 tables), auth, admin roles, audit log | ✅ Done, with tests |
| Merged mobile app: all customer and provider screens | ✅ Built, running on a mock API |
| Admin panel: users, providers, roles, audit | ✅ First screens built |
| M2 Catalog, locations, CMS APIs | ⏭ Next |
| M3 Provider application + document verification | Planned |
| M4 Matching and search | Planned |
| M5 Requests and invitations | Planned |
| M6 Bookings, cancellation, reviews, reports | Planned |
| M7 Notifications: push, WhatsApp, email | Planned |
| M8 Public website (SEO, en / ml) | Planned |
| M9–M10 App on live API, Android release, end-to-end tests | Planned |

---

## Roadmap by phase

**Phase 1 (launch)**
Android app, admin panel, public website, verification, matching, bookings, reviews, safety, notifications, English + Malayalam.

**Phase 2**
iOS release, online payments (UPI, cards, refunds), provider earnings and settlements, finance dashboards.

**Phase 3**
Smarter matching, subscriptions, referrals and offers, more languages, optional live tracking.

---

## Decisions needed from the client

1. **Requirements document (SRD):** please share it so the plan can be checked against it.
2. **Phase 1 payments:** cash or UPI directly to the provider? Any platform fee?
3. **Reviews:** Phase 1 (recommended) or Phase 2?
4. **Matching:** invite several providers and let the customer choose (recommended), with admin override?
5. **Invitations:** how many at once and how long they last (default: 5 providers, 2 hours).
6. **Cancellation and no-show rules.**
7. **Rates:** per service (recommended) or one rate per provider?
8. **Required documents per service**, and whether gender is needed for some services.
9. **Launch districts** and who supplies locality data.
10. **WhatsApp setup:** Meta Cloud API or a partner (Gupshup, Interakt, AiSensy).
11. **Hosting** region and account ownership.

---

## Demo

The app runs today in **mock mode** (no backend needed). Sign in with OTP **123456**:

| Phone | Role | What you'll see |
|---|---|---|
| 9000000001 | Customer (Anjali) | Requests and bookings in every state; one request waiting for her to choose a provider |
| 9000000002 | Provider (Suresh) | Open invitations, bookings, availability |
| 9000000003 | Provider (Lakshmi) | Application that needs more info |
| any other | New user | Fresh registration; a new provider application is auto-approved after ~8 seconds |

---

# Thank you

**Fix60** — verified help, matched fairly, booked safely.

Questions?
