import type { App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { PushStrategy } from './push.types';

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/** Firebase Cloud Messaging. Notification + string-only data payload. */
export function createFcmPush(app: App): PushStrategy {
  const messaging = getMessaging(app);
  return {
    send: async (tokens, message) => {
      if (tokens.length === 0) {
        return { invalidTokens: [] };
      }
      const data = Object.fromEntries(
        Object.entries(message.data).map(([key, value]) => [key, String(value)]),
      );
      const response = await messaging.sendEachForMulticast({
        tokens,
        data,
        notification:
          message.title || message.body ? { title: message.title, body: message.body } : undefined,
        android: { priority: 'high' },
        apns: { payload: { aps: { contentAvailable: true, sound: 'default' } } },
      });
      const invalidTokens = response.responses.flatMap((result, index) =>
        !result.success && result.error && INVALID_TOKEN_CODES.has(result.error.code)
          ? [tokens[index]!]
          : [],
      );
      return { invalidTokens };
    },
  };
}
