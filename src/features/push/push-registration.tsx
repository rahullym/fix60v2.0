import { useQueryClient } from '@tanstack/react-query';
import { type Href, router } from 'expo-router';
import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { api } from '@/shared/api/endpoints';
import type { RegisterDeviceRequest } from '@/shared/api/types';
import { session, useSession } from '@/shared/auth/session';
import { env } from '@/shared/config/env';
import { type PushData, pushHref, pushQueryKeys } from './push-routing';

type MessagingModule = typeof import('@react-native-firebase/messaging');
type Messaging = ReturnType<MessagingModule['getMessaging']>;

/** The cold-start notification is handled once per app launch, not on every sign-in. */
let hasHandledInitialNotification = false;

function loadMessaging(): MessagingModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-firebase/messaging') as MessagingModule;
}

function devicePlatform(): RegisterDeviceRequest['platform'] {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
}

async function hasNotificationPermission(module: MessagingModule, messaging: Messaging): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }
  const status = await module.requestPermission(messaging);
  return status === module.AuthorizationStatus.AUTHORIZED || status === module.AuthorizationStatus.PROVISIONAL;
}

async function registerToken(token: string): Promise<void> {
  try {
    await api.me.registerDevice({ token, platform: devicePlatform() });
  } catch {
    // Retried on the next token refresh or launch.
  }
}

function openFromPush(data: PushData | undefined): void {
  try {
    const href = pushHref(data, session.getState().user?.role);
    if (href) {
      router.push(href as Href);
    }
  } catch {
    // Navigation not ready or route missing; the inbox still has the item.
  }
}

/**
 * Registers this device for FCM while signed in and routes notification taps.
 * Runs only in `firebase` auth mode, where the native modules exist. Renders nothing.
 */
export function PushRegistration(): null {
  const { tokens, user } = useSession();
  const queryClient = useQueryClient();
  const isSignedIn = Boolean(tokens && user);
  const userId = user?.id;

  useEffect(() => {
    if (!isSignedIn || env.authMode !== 'firebase') {
      return undefined;
    }
    let isActive = true;
    const unsubscribers: (() => void)[] = [];

    try {
      const module = loadMessaging();
      const messaging = module.getMessaging();

      unsubscribers.push(
        module.onTokenRefresh(messaging, (token) => {
          void registerToken(token);
        }),
        module.onMessage(messaging, (message) => {
          pushQueryKeys(message.data).forEach((queryKey) => {
            void queryClient.invalidateQueries({ queryKey });
          });
        }),
        module.onNotificationOpenedApp(messaging, (message) => openFromPush(message.data)),
      );

      void (async () => {
        try {
          if (await hasNotificationPermission(module, messaging)) {
            const token = await module.getToken(messaging);
            if (isActive && token) {
              await registerToken(token);
            }
          }
          if (!hasHandledInitialNotification) {
            hasHandledInitialNotification = true;
            const initial = await module.getInitialNotification(messaging);
            if (isActive && initial) {
              setTimeout(() => openFromPush(initial.data), 0);
            }
          }
        } catch {
          // Push is optional; the in-app inbox still works.
        }
      })();
    } catch {
      // Native module missing (e.g. Expo Go); skip silently.
    }

    return () => {
      isActive = false;
      unsubscribers.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch {
          // Already detached.
        }
      });
    };
  }, [isSignedIn, userId, queryClient]);

  return null;
}
