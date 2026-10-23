import '@/shared/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PushRegistration } from '@/features/push';
import { installMockApi } from '@/shared/api/mock';
import { session, useSession } from '@/shared/auth/session';
import { env } from '@/shared/config/env';
import { restoreLocale } from '@/shared/i18n';
import { queryClient } from '@/shared/lib/query-client';
import { ThemeProvider, useTheme } from '@/shared/theme/theme';

if (env.apiMode === 'mock') {
  installMockApi();
}

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator(): ReactNode {
  const { tokens, user } = useSession();
  const theme = useTheme();
  const isSignedIn = Boolean(tokens && user);
  const role = user?.role;
  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
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
        <Stack.Screen name="policy/[slug]" options={{ headerShown: true, title: '' }} />
      </Stack>
    </>
  );
}

export default function RootLayout(): ReactNode {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    Promise.all([session.hydrate(), restoreLocale()]).finally(() => {
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
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
