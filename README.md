# Fix60 app

One Expo app for Fix60 customers and service providers (Kerala; English + Malayalam). It replaces `Fix60_consumer_app` and `Fix60_provider_app` and talks REST to `fix60_backend` (`/api/v1`).

## Run it

```bash
npm install
cp .env.example .env       # mock mode by default: no backend needed
npx expo start --go        # Expo Go works in mock/dev mode; press "a" for Android
```

### Mock demo accounts

Sign in with OTP `123456`.

| Number | Role | State |
|---|---|---|
| 9000000001 | Customer, Anjali | Requests and bookings in every state; one request has 2 providers waiting to be chosen |
| 9000000002 | Provider, Suresh | Active; open invitations, bookings, availability |
| 9000000003 | Provider, Lakshmi | Application needs more info |
| any other | Either | New registration. A new provider application is approved about 8 s after submitting. |

The mock resets on every reload. The seed data is in `src/shared/api/mock/seed*.ts`.

### Against the real backend

```env
EXPO_PUBLIC_API_MODE=live
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000   # Android emulator → host
EXPO_PUBLIC_AUTH_MODE=dev                  # backend AUTH_ALLOW_DEV_TOKENS=true
```

### Real phone OTP and push

1. Add an Android app `com.fixsixty.app` to the Firebase project.
2. Put `google-services.json` in this folder. `app.config.ts` then adds the Firebase plugins.
3. Set `EXPO_PUBLIC_AUTH_MODE=firebase`.
4. Make a dev build with `npx expo run:android` or `eas build --profile development`. Firebase native modules don't run in Expo Go.

Without the Firebase files, `react-native.config.js` also leaves the Firebase native modules out of the build. Known issue for the Firebase build: `firebase-auth` 25 needs Kotlin 2.4, and the current React Native Gradle setup uses Kotlin 2.2, so set the Kotlin version (for example via `expo-build-properties`) before the first Firebase build.

### Demo APK (test data, no backend)

```sh
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease   # needs JDK 21 (Android Studio's bundled JBR works)
# → android/app/build/outputs/apk/release/app-release.apk
```

`docs/client-demo.md` is the one-page guide to send with it. The release build is signed with the debug key, which is fine for sideloading but not for the Play Store.

## Docs

- `docs/conventions.md` covers layers, routing, data, UI and i18n rules.
- `docs/api-contract.md` is the REST contract the app expects. Share it with the backend team.

The Malayalam copy is a first draft. A native speaker must review it before release.
