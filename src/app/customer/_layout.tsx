import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { useTheme } from '@/shared/theme/theme';
import { blueStackHeader } from '@/shared/ui/stack-header';

/** Customer area: the tab group plus pushed detail screens (titles are set by each view). */
export default function CustomerLayout(): ReactNode {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        ...blueStackHeader,
        contentStyle: { backgroundColor: theme.colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
