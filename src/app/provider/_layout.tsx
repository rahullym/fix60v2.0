import { Stack } from 'expo-router';
import { blueStackHeader } from '@/shared/ui/stack-header';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useProviderMe } from '@/features/provider/model/queries';
import { useTheme } from '@/shared/theme/theme';
import { ProviderGateError, ProviderGateLoading, ProviderSuspendedView } from '@/views/provider/provider-gate-states';

/**
 * Provider gate. `provider-me.status` decides the area:
 * active → tabs + job/booking screens; onboarding → application home + wizard; suspended → notice.
 * Guarded routes redirect to the other area, so `/provider` always lands somewhere valid.
 */
export default function ProviderLayout(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const me = useProviderMe();

  if (me.isLoading) {
    return <ProviderGateLoading />;
  }
  if (!me.data) {
    return <ProviderGateError error={me.error} onRetry={() => void me.refetch()} />;
  }
  if (me.data.status === 'suspended') {
    return <ProviderSuspendedView />;
  }
  const isActive = me.data.status === 'active';

  return (
    <Stack
      screenOptions={{
        ...blueStackHeader,
        contentStyle: { backgroundColor: theme.colors.background },
      }}>
      <Stack.Protected guard={isActive} redirectTo="/provider/application">
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="invitations/[id]" options={{ title: t('provider:invitation.title') }} />
        <Stack.Screen name="bookings/[code]" options={{ title: t('provider:booking.title') }} />
      </Stack.Protected>
      <Stack.Protected guard={!isActive} redirectTo="/provider">
        <Stack.Screen name="application/index" options={{ title: t('provider:application.title') }} />
        <Stack.Screen name="application/[step]" options={{ title: '' }} />
      </Stack.Protected>
      <Stack.Screen name="documents" options={{ title: t('provider:documents.title') }} />
    </Stack>
  );
}
