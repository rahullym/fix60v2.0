import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RequestSummaryCard } from '@/entities/request/request-summary-card';
import { customerKeys } from '@/features/customer/model/query-keys';
import { useRefetchOnFocus } from '@/features/customer/model/use-refetch-on-focus';
import { api } from '@/shared/api/endpoints';
import type { ServiceRequestSummary } from '@/shared/api/types';
import { Button, EmptyState, ErrorState, LoadingState, Screen } from '@/shared/ui';

const needsAction = (request: ServiceRequestSummary): number =>
  request.status === 'customer_confirmation_pending' || request.status === 'provider_accepted' ? 0 : 1;

/** All the customer's requests; the ones waiting for a choice come first. */
export function RequestsView(): ReactNode {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: customerKeys.requests, queryFn: () => api.requests.list() });
  useRefetchOnFocus(query.refetch);

  const items = [...(query.data?.items ?? [])].sort(
    (a, b) => needsAction(a) - needsAction(b) || b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <Screen onRefresh={query.refetch} isRefreshing={query.isRefetching}>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title={t('customer:requests.emptyTitle')}
          body={t('customer:requests.emptyBody')}
          actionLabel={t('customer:requests.new')}
          onAction={() => router.push('/customer/browse')}
        />
      ) : (
        <>
          <Button label={t('customer:requests.new')} icon="add" variant="secondary" onPress={() => router.push('/customer/browse')} />
          {items.map((request) => (
            <RequestSummaryCard
              key={request.code}
              request={request}
              onPress={() => router.push({ pathname: '/customer/requests/[code]', params: { code: request.code } })}
            />
          ))}
        </>
      )}
    </Screen>
  );
}
