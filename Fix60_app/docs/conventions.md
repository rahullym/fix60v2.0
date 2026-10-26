# Fix60 app — conventions

One Expo app for both roles (plan decision D3). Expo SDK 58, Expo Router (`src/app`), React 19, TanStack Query, i18next (en + ml). Android is the Phase 1 target.

## Layers (Feature-Sliced, imports point downward only)

```text
src/app/        routes only: each file re-exports a view, plus _layout.tsx navigators
src/views/      one component per screen (composes widgets/features/entities)
src/widgets/    larger reusable blocks (e.g. a provider card list, a booking summary)
src/features/   user actions with their state (send request, confirm provider, upload document…)
src/entities/   domain display helpers (status tones, small cards for one entity)
src/shared/     api client + types, auth/session, config, i18n, lib (format, error copy), theme, ui kit
```

- A layer imports only from layers below it. `shared` imports nothing from above.
- Import alias `@/` = `src/`.
- Files are `kebab-case.tsx`; components are `PascalCase`; booleans use `is` / `has` / `should` / `can`.
- Explicit return types on exported functions (`ReactNode` for components). No `any`.
- Short JSDoc on exports only. No narration comments.

## Routing and roles

- `/` and the `(auth)` group are shown only when signed out.
- `/customer/**` is for `role === 'customer'`, and `/provider/**` is for `role === 'provider'`. Both are guarded in `src/app/_layout.tsx` with `Stack.Protected`.
- The `(account)` group holds signed-in screens shared by both roles:
  - `/settings`, `/settings/profile`, `/settings/consents`, `/settings/blocked`, `/settings/delete-account`
  - `/notifications`
  - `/support`, `/support/new`, `/support/[code]`
  - `/report` (query: `subjectUserId`, `name`, `bookingCode?`, `requestCode?`)
- `/policy/[slug]` is public (`terms`, `privacy`, `safety-policy`, `provider-agreement`, `about`).
- Use `Tabs` from `expo-router/js-tabs`. The main `expo-router` export of Tabs is deprecated in SDK 58.

## Data

- Call the API only through `api` from `@/shared/api/endpoints`. Never use `fetch` directly; the one exception is `uploadToSignedUrl`.
- Use TanStack Query: `useQuery({ queryKey: [...], queryFn })` and `useMutation`. After a mutation, invalidate the owning keys.
- Query-key roots:
  - customer: `requests`, `request`, `bookings`, `booking`, `providers-search`, `provider-profile`, `saved-providers`, `categories`, `service`
  - provider: `provider-me`, `application`, `documents`, `availability`, `invitations`, `invitation`, `provider-bookings`, `provider-booking`
  - account: `me`, `consents`, `notifications`, `support-tickets`, `support-ticket`, `blocks`
- Every error renders through `ErrorState` / `Notice` with `t(errorMessageKey(error))`. Never show the API `message`.
- Money is INR (`formatMoney`). Dates and times are Asia/Kolkata (`formatDate`, `formatTime`, `formatSlot`, `toIsoDate`, `toClockTime`).
- Pick `LocalizedText` with `useLocale().pick(text)`.

## UI

- Build from `@/shared/ui`: `Screen`, `Card`, `Row`, `Text`, `Button`, `TextField`, `SelectField`, `DateTimeField`, `Stepper`, `Chip`, `Pill`, `Avatar`, `RatingStars`, `Checkbox`, `ToggleRow`, `ListRow`, `SectionHeader`, `EmptyState`, `ErrorState`, `LoadingState`, `Notice`, `Icon` (Ionicons).
- Colours come only from `useTheme().colors`. Never hard-code brand hex in screens; branding is live from `GET /branding`.
- Touch targets are at least 48dp. Every pressable gets `accessibilityRole` and `accessibilityLabel`.
- Every list has loading, empty and error states. Use pull-to-refresh via `Screen onRefresh`.

## i18n

- Namespaces and their owners:
  - `common` and `errors`: shared, owned by the account slice.
  - `auth`: the auth slice.
  - `customer`: the customer slice.
  - `provider`: the provider slice.
- Every user-visible string goes through `t('ns:key')`. Add each key to **both** `en/<ns>.json` and `ml/<ns>.json`. Malayalam is a first draft and must be reviewed by a native speaker before release.
- Status labels are `common:requestStatus.*`, `bookingStatus.*`, `invitationStatus.*`, `applicationStatus.*`, `serviceStatus.*`, `documentStatus.*` and `documentType.*`. Their tones are in `@/entities/status/status-tone`.

## Running

```bash
cp .env.example .env        # EXPO_PUBLIC_API_MODE=mock runs without a backend
npx expo start              # Expo Go works in mock/dev mode (no Firebase native modules)
npx tsc --noEmit            # must pass before a slice is done
```

In mock mode, sign in with any +91 number and OTP `123456`. The demo accounts are listed in `src/shared/api/mock/seed.ts`.
