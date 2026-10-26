import { Global, Logger, Module } from '@nestjs/common';
import type { ApiEnv } from '@fix60/shared';
import { API_ENV } from '../../config/env';
import { createStrategyRegistry } from '../../common/strategy-registry';
import { getFirebaseApp } from '../firebase/firebase-app';
import { createFcmPush } from './fcm-push';
import { PUSH_STRATEGY, type PushStrategy } from './push.types';

const logger = new Logger('Push');

/** Logs pushes instead of sending them (dev). */
const logPush: PushStrategy = {
  send: async (tokens, message) => {
    logger.log(`push → ${tokens.length} device(s): ${JSON.stringify(message)}`);
    return { invalidTokens: [] };
  },
};

function selectPush(env: ApiEnv): PushStrategy {
  const registry = createStrategyRegistry<() => PushStrategy>('push');
  registry.register('log', () => logPush);
  registry.register('fcm', () => {
    const app = getFirebaseApp(env);
    if (!app) {
      throw new Error('FCM requires FIREBASE_SERVICE_ACCOUNT_BASE64');
    }
    return createFcmPush(app);
  });
  return registry.get(env.PUSH_PROVIDER)();
}

@Global()
@Module({
  providers: [{ provide: PUSH_STRATEGY, inject: [API_ENV], useFactory: selectPush }],
  exports: [PUSH_STRATEGY],
})
export class PushModule {}
