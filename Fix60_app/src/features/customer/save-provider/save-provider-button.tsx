import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { api } from '@/shared/api/endpoints';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { useTheme } from '@/shared/theme/theme';
import { Icon } from '@/shared/ui';
import { invalidateRoots } from '../model/query-keys';

/** Heart toggle that saves / unsaves a provider. Optimistic, rolls back on error. */
export function SaveProviderButton({ code, name, isSaved }: { code: string; name: string; isSaved: boolean }): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const client = useQueryClient();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const value = optimistic ?? isSaved;

  const mutation = useMutation({
    mutationFn: (next: boolean) => (next ? api.providers.save(code) : api.providers.unsave(code)),
    onMutate: (next) => setOptimistic(next),
    onError: (error) => {
      setOptimistic(null);
      Alert.alert(t('common:error.title'), t(errorMessageKey(error)));
    },
    onSuccess: async () => {
      await invalidateRoots(client, ['saved-providers', 'providers-search', 'provider-profile']);
      setOptimistic(null);
    },
  });

  const label = t(value ? 'customer:saved.unsaveA11y' : 'customer:saved.saveA11y', { name });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: value, busy: mutation.isPending }}
      disabled={mutation.isPending}
      onPress={() => mutation.mutate(!value)}
      style={styles.button}>
      <Icon name={value ? 'heart' : 'heart-outline'} size={24} color={value ? theme.colors.danger : theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: -8, marginRight: -8 },
});
