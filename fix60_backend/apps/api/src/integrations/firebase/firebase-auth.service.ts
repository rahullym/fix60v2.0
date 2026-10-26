import { Inject, Injectable, Logger } from '@nestjs/common';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { errorCodes, type ApiEnv } from '@fix60/shared';
import { forbidden, unauthenticated } from '../../common/api-exception';
import { API_ENV } from '../../config/env';
import { getFirebaseApp } from './firebase-app';

export interface VerifiedPhoneIdentity {
  uid: string;
  /** E.164, verified by Firebase phone auth. */
  phone: string;
}

const DEV_TOKEN_PREFIX = 'dev:';

/** Verifies Firebase phone-auth ID tokens (and optionally App Check) from the mobile app and website. */
@Injectable()
export class FirebaseAuthService {
  private readonly logger = new Logger(FirebaseAuthService.name);

  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {}

  async verifyIdToken(idToken: string): Promise<VerifiedPhoneIdentity> {
    if (this.env.AUTH_ALLOW_DEV_TOKENS && idToken.startsWith(DEV_TOKEN_PREFIX)) {
      const phone = idToken.slice(DEV_TOKEN_PREFIX.length);
      if (!/^\+\d{6,15}$/.test(phone)) {
        throw unauthenticated('Dev token must be dev:+<digits>', errorCodes.invalidFirebaseToken);
      }
      return { uid: `dev-${phone}`, phone };
    }
    const app = getFirebaseApp(this.env);
    if (!app) {
      throw unauthenticated('Phone sign-in is not configured', errorCodes.invalidFirebaseToken);
    }
    try {
      const decoded = await getAuth(app).verifyIdToken(idToken, true);
      if (!decoded.phone_number) {
        throw new Error('Token has no phone_number claim');
      }
      return { uid: decoded.uid, phone: decoded.phone_number };
    } catch (error) {
      this.logger.warn(`Firebase token rejected: ${(error as Error).message}`);
      throw unauthenticated('Phone verification failed', errorCodes.invalidFirebaseToken);
    }
  }

  /** Rejects requests without a valid App Check token when enforcement is on. */
  async assertAppCheck(appCheckToken: string | undefined): Promise<void> {
    if (!this.env.FIREBASE_APP_CHECK_ENFORCED) {
      return;
    }
    const app = getFirebaseApp(this.env);
    if (!appCheckToken || !app) {
      throw forbidden('App verification failed', errorCodes.appCheckFailed);
    }
    try {
      await getAppCheck(app).verifyToken(appCheckToken);
    } catch (error) {
      this.logger.warn(`App Check token rejected: ${(error as Error).message}`);
      throw forbidden('App verification failed', errorCodes.appCheckFailed);
    }
  }
}
