import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { InvitationCard } from '@/entities/invitation/invitation-card';
import { providerKeys, useProviderMe } from '@/features/provider/model/queries';
import { api } from '@/shared/api/endpoints';
import { EmptyState, ErrorState, LoadingState, Screen, SectionHeader, Text } from '@/shared/ui';
import { ProviderBanners } from '@/widgets/provider/provider-banners';
import { ProviderStats } from '@/widgets/provider/provider-stats';

/** Jobs tab: open invitations (refreshing every 15s), stats and banners. */
export function JobsView(): ReactNode {
  const { t } = useTranslation();
  const me = useProviderMe();
  const invitations = useQuery({
    queryKey: providerKeys.invitations('open'),
    queryFn: () => api.provider.invitations('open'),
    refetchInterval: 15_000,
  });
  const items = invitations.data?.items ?? [];

  return (
    <Screen
      onRefresh={() => {
        void invitations.refetch();
        void me.refetch();
      }}
      isRefreshing={invitations.isRefetching}>
      {me.data ? <ProviderStats stats={me.data.stats} /> : null}
      <ProviderBanners />
      <SectionHeader title={t('provider:jobs.openTitle')} />
      <Text variant="caption" tone="muted">
        {t('provider:jobs.privacyHint')}
      </Text>
      {invitations.isLoading ? <LoadingState /> : null}
      {invitations.error ? <ErrorState error={invitations.error} onRetry={() => void invitations.refetch()} /> : null}
      {!invitations.isLoading && !invitations.error && items.length === 0 ? (
        <EmptyState icon="briefcase-outline" title={t('provider:jobs.emptyTitle')} body={t('provider:jobs.emptyBody')} />
      ) : null}
      {items.map((invitation) => (
        <InvitationCard
          key={invitation.id}
          invitation={invitation}
          onPress={() => router.push(`/provider/invitations/${invitation.id}`)}
        />
      ))}
    </Screen>
  );
}
