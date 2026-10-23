import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { useTheme } from '@/shared/theme/theme';

/** Customer area: the tab group plus pushed detail screens (titles are set by each view). */
export default function CustomerLayout(): ReactNode {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: theme.colors.text,
        headerStyle: { backgroundColor: theme.colors.background },
        contentStyle: { backgroundColor: theme.colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
