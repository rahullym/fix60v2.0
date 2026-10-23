import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { hasErrorCode } from '@/shared/api/api-error';
import { api } from '@/shared/api/endpoints';
import { invalidateRoots } from '../model/query-keys';

export interface ConfirmProvider {
  choose: (invitationId: string, providerName: string) => void;
  pendingInvitationId: string | null;
  error: unknown;
}

/** Choose one accepted provider → booking. On a stale slot/state the request is refetched. */
export function useConfirmProvider(requestCode: string): ConfirmProvider {
  const { t } = useTranslation();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (invitationId: string) => api.requests.confirm(requestCode, invitationId),
    onSuccess: async (booking) => {
      await invalidateRoots(client, ['requests', 'request', 'bookings', 'booking', 'provider-profile']);
      router.replace({ pathname: '/customer/bookings/[code]', params: { code: booking.code } });
    },
    onError: async (error) => {
      if (hasErrorCode(error, 'SLOT_UNAVAILABLE', 'INVALID_STATE_TRANSITION')) {
        await invalidateRoots(client, ['request', 'requests']);
      }
    },
  });

  return {
    pendingInvitationId: mutation.isPending ? (mutation.variables ?? null) : null,
    error: mutation.error,
    choose: (invitationId, providerName) => {
      Alert.alert(t('customer:confirm.title', { name: providerName }), t('customer:confirm.body'), [
        { text: t('common:actions.cancel'), style: 'cancel' },
        { text: t('customer:confirm.action'), onPress: () => mutation.mutate(invitationId) },
      ]);
    },
  };
}
