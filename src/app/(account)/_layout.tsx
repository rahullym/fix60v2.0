import { Stack } from 'expo-router';
import type { ReactNode } from 'react';

/** Signed-in screens shared by both roles (settings, notifications, support, report). */
export default function AccountLayout(): ReactNode {
  return <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }} />;
}
