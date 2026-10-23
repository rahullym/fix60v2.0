import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/theme/theme';
import { HeaderBackButton } from '@/widgets/account/header-back-button';

/** Signed-in screens shared by both roles (settings, notifications, support, report). */
export default function AccountLayout(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: theme.colors.text,
        headerStyle: { backgroundColor: theme.colors.background },
        contentStyle: { backgroundColor: theme.colors.background },
        headerLeft: () => <HeaderBackButton tintColor={theme.colors.text} />,
      }}>
      <Stack.Screen name="settings/index" options={{ title: t('common:settings.title') }} />
      <Stack.Screen name="settings/profile" options={{ title: t('common:settings.profile') }} />
      <Stack.Screen name="settings/consents" options={{ title: t('common:consents.title') }} />
      <Stack.Screen name="settings/blocked" options={{ title: t('common:settings.blocked') }} />
      <Stack.Screen name="settings/delete-account" options={{ title: t('common:deletion.title') }} />
      <Stack.Screen name="notifications" options={{ title: t('common:notifications.title') }} />
      <Stack.Screen name="support/index" options={{ title: t('common:support.title') }} />
      <Stack.Screen name="support/new" options={{ title: t('common:support.newTicket') }} />
      <Stack.Screen name="support/[code]" options={{ title: t('common:support.ticketTitle') }} />
      <Stack.Screen name="report" options={{ title: t('common:report.title') }} />
    </Stack>
  );
}
