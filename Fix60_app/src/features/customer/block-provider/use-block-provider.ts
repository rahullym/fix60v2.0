import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { api } from '@/shared/api/endpoints';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { invalidateRoots } from '../model/query-keys';

/** Returns a function that asks to confirm, then blocks the user. `onBlocked` runs after success. */
export function useBlockProvider(onBlocked: () => void): { requestBlock: (userId: string, name: string) => void; isBlocking: boolean } {
  const { t } = useTranslation();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ userId }: { userId: string; name: string }) => api.safety.block(userId),
    onSuccess: async (_data, { name }) => {
      await Promise.all([
        invalidateRoots(client, ['saved-providers', 'providers-search', 'provider-profile']),
        client.invalidateQueries({ queryKey: ['blocks'] }),
      ]);
      Alert.alert(t('common:block.done', { name }));
      onBlocked();
    },
    onError: (error) => Alert.alert(t('common:error.title'), t(errorMessageKey(error))),
  });

  return {
    isBlocking: mutation.isPending,
    requestBlock: (userId, name) => {
      Alert.alert(t('common:block.confirmTitle', { name }), t('common:block.confirmBody'), [
        { text: t('common:actions.cancel'), style: 'cancel' },
        { text: t('common:actions.block'), style: 'destructive', onPress: () => mutation.mutate({ userId, name }) },
      ]);
    },
  };
}
