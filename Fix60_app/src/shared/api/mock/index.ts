import { setTransport } from '../client';
import { registerAuthRoutes, resolveAuth } from './auth-handlers';
import { registerFeatureRoutes } from './handlers';
import { createMockTransport } from './router';

let isInstalled = false;

/**
 * Runs the app against an in-memory API (EXPO_PUBLIC_API_MODE=mock).
 * Sign in with any +91 number and OTP 123456. Demo accounts: see seed.ts.
 */
export function installMockApi(): void {
  if (isInstalled) {
    return;
  }
  isInstalled = true;
  registerAuthRoutes();
  registerFeatureRoutes();
  setTransport(createMockTransport(resolveAuth));
}
