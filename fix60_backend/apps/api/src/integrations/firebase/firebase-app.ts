import { type App, cert, getApps, initializeApp } from 'firebase-admin/app';
import type { ApiEnv } from '@fix60/shared';

/** Lazily initialises the Firebase Admin app (shared by auth and FCM). */
export function getFirebaseApp(env: ApiEnv): App | null {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }
  if (env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const serviceAccount = JSON.parse(
      Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'),
    ) as { project_id: string; client_email: string; private_key: string };
    return initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
      projectId: serviceAccount.project_id,
    });
  }
  if (env.FIREBASE_PROJECT_ID) {
    return initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
  }
  return null;
}
