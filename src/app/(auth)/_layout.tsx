import { Stack } from 'expo-router';
import type { ReactNode } from 'react';

export default function AuthLayout(): ReactNode {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
    </Stack>
  );
}
