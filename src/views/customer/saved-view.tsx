import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderSummaryCard } from '@/entities/provider/provider-summary-card';
import { customerKeys } from '@/features/customer/model/query-keys';
import { useRefetchOnFocus } from '@/features/customer/model/use-refetch-on-focus';
import { SaveProviderButton } from '@/features/customer/save-provider/save-provider-button';
import { api } from '@/shared/api/endpoints';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/shared/ui';

/** Providers the customer saved. */
export function SavedView(): ReactNode {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: customerKeys.savedProviders, queryFn: api.providers.saved });
  useRefetchOnFocus(query.refetch);
  const items = query.data?.items ?? [];

  return (
    <Screen onRefresh={query.refetch} isRefreshing={query.isRefetching}>
      <Stack.Screen options={{ title: t('customer:tabs.savedProviders') }} />
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title={t('customer:saved.emptyTitle')}
          body={t('customer:saved.emptyBody')}
          actionLabel={t('customer:saved.findProviders')}
          onAction={() => router.push('/customer/browse')}
        />
      ) : (
        items.map((provider) => (
          <ProviderSummaryCard
            key={provider.code}
            provider={provider}
            onPress={() => router.push({ pathname: '/customer/providers/[code]', params: { code: provider.code } })}
            action={<SaveProviderButton code={provider.code} name={provider.displayName} isSaved />}
          />
        ))
      )}
    </Screen>
  );
}
