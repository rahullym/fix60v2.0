import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { InvitationCard } from '@/entities/invitation/invitation-card';
import { providerKeys, useProviderMe } from '@/features/provider/model/queries';
import { api } from '@/shared/api/endpoints';
import { useSession } from '@/shared/auth/session';
import { useTheme } from '@/shared/theme/theme';
import { EmptyState, ErrorState, HeaderIconButton, LoadingState, Row, Screen, SectionHeader, StatusBarScrim, Text, useLightStatusBar } from '@/shared/ui';
import { useUnreadCount } from '@/features/notifications';
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
  const theme = useTheme();
  const { top } = useSafeAreaInsets();
  useLightStatusBar();
  const unread = useUnreadCount();
  const firstName = useSession().user?.fullName.split(' ')[0] ?? '';

  return (
    <View style={styles.root}>
      <Screen
        edges={[]}
        onRefresh={() => {
          void invitations.refetch();
          void me.refetch();
        }}
        isRefreshing={invitations.isRefetching}>
        <View style={[styles.hero, { backgroundColor: theme.colors.primary, paddingTop: top + 20 }]}>
          <Row style={styles.topRow}>
            <Text variant="caption" style={styles.heroMuted}>
              {t('provider:jobs.heroKicker')}
            </Text>
            <HeaderIconButton
              icon="notifications"
              label={t('common:notifications.title')}
              badge={unread}
              onPress={() => router.push('/notifications')}
            />
          </Row>
          <Text variant="title" tone="onPrimary" style={styles.greeting}>
            {t('provider:jobs.greeting', { name: firstName })} 👋
          </Text>
        </View>
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
      <StatusBarScrim />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    marginHorizontal: -16,
    marginTop: -16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 6,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topRow: { justifyContent: 'space-between' },
  heroMuted: { color: 'rgba(255,255,255,0.7)' },
  greeting: { fontSize: 28, lineHeight: 36 },
});
