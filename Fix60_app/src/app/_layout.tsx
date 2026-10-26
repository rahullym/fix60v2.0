
import { QueryClientProvider } from '@tanstack/react-query';
import * as Font from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { clearSignedOutState } from '@/features/auth/model/auth-flow';
import { PushRegistration } from '@/features/push';
import { SuccessFlashHost } from '@/features/success/success-flash';
import { setOnSessionExpired } from '@/shared/api/client';
import { installMockApi } from '@/shared/api/mock';
import { session, useSession } from '@/shared/auth/session';
import { env } from '@/shared/config/env';
import { restoreLocale } from '@/shared/i18n';
import { queryClient } from '@/shared/lib/query-client';
import { ThemeProvider, useTheme } from '@/shared/theme/theme';
import { blueStackHeader } from '@/shared/ui/stack-header';

if (env.apiMode === 'mock') {
  installMockApi();
}

setOnSessionExpired(clearSignedOutState);

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Plus Jakarta Sans, embedded natively by the expo-font plugin and loaded at runtime for Expo Go. */
const appFonts = {
  'PlusJakartaSans-Regular': require('../../assets/fonts/PlusJakartaSans-Regular.ttf'),
  'PlusJakartaSans-Medium': require('../../assets/fonts/PlusJakartaSans-Medium.ttf'),
  'PlusJakartaSans-SemiBold': require('../../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
  'PlusJakartaSans-Bold': require('../../assets/fonts/PlusJakartaSans-Bold.ttf'),
  'PlusJakartaSans-ExtraBold': require('../../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
};

function RootNavigator(): ReactNode {
  const { tokens, user } = useSession();
  const theme = useTheme();
  const { t } = useTranslation();
  const isSignedIn = Boolean(tokens && user);
  const role = user?.role;
  return (
    <>
      <StatusBar style="light" />
      <PushRegistration />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerStyle: { backgroundColor: theme.colors.background },
        }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={isSignedIn && role === 'customer'} redirectTo="/">
          <Stack.Screen name="customer" />
        </Stack.Protected>
        <Stack.Protected guard={isSignedIn && role === 'provider'} redirectTo="/">
          <Stack.Screen name="provider" />
        </Stack.Protected>
        <Stack.Protected guard={isSignedIn} redirectTo="/">
          <Stack.Screen name="(account)" />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn} redirectTo="/">
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Screen name="policy/[slug]" options={{ ...blueStackHeader, title: t('common:settings.policies') }} />
      </Stack>
    </>
  );
}

export default function RootLayout(): ReactNode {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    Promise.all([session.hydrate(), restoreLocale(), Font.loadAsync(appFonts).catch(() => undefined)]).finally(() => {
      setIsReady(true);
      SplashScreen.hideAsync().catch(() => undefined);
    });
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <RootNavigator />
            <SuccessFlashHost />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
