import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { customerKeys } from '@/features/customer/model/query-keys';
import { useCatalog } from '@/features/customer/model/use-catalog';
import { useLocality } from '@/features/customer/model/use-locality';
import { firstName, useMe } from '@/features/customer/model/use-me';
import { api } from '@/shared/api/endpoints';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { ErrorState, Icon, LoadingState, Row, Screen, SectionHeader, Text } from '@/shared/ui';
import { ActiveRequestsStrip } from '@/widgets/customer/active-requests-strip';
import { BannersCarousel } from '@/widgets/customer/banners-carousel';
import { CategoryGrid } from '@/widgets/customer/category-grid';
import { SafetySection } from '@/widgets/customer/safety-section';
import { UpcomingBookingCard } from '@/widgets/customer/upcoming-booking-card';

/** Customer home: greeting, area, search, banners, categories, what's in progress, safety. */
export function HomeView(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const { pick } = useLocale();
  const me = useMe();
  const locality = useLocality(me?.districtId, me?.localityId);
  const catalog = useCatalog();
  const requests = useQuery({ queryKey: customerKeys.requests, queryFn: () => api.requests.list() });
  const activeBookings = useQuery({ queryKey: customerKeys.bookings('active'), queryFn: () => api.bookings.list('active') });
  const upcomingBookings = useQuery({ queryKey: customerKeys.bookings('upcoming'), queryFn: () => api.bookings.list('upcoming') });

  const activeBooking = activeBookings.data?.items[0];
  const nextBooking = activeBooking ?? upcomingBookings.data?.items[0];
  const isRefreshing = catalog.query.isRefetching || requests.isRefetching;
  const name = firstName(me?.fullName);
  const areaLabel = locality ? pick(locality.name) : t('customer:home.setArea');

  const refresh = (): void => {
    void catalog.query.refetch();
    void requests.refetch();
    void activeBookings.refetch();
    void upcomingBookings.refetch();
  };

  return (
    <Screen edges={['top']} onRefresh={refresh} isRefreshing={isRefreshing}>
      <View style={styles.header}>
        <Text variant="title" numberOfLines={2}>
          {name ? t('customer:home.greeting', { name }) : t('customer:home.greetingNoName')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('customer:home.areaA11y', { area: areaLabel })}
          onPress={() => router.push('/settings/profile')}
          style={[styles.areaChip, { borderColor: theme.colors.border, borderRadius: theme.radius.pill }]}>
          <Icon name="location-outline" size={16} color={theme.colors.primary} />
          <Text variant="label" tone={locality ? 'default' : 'primary'} numberOfLines={1} style={styles.shrink}>
            {areaLabel}
          </Text>
          <Icon name="chevron-down" size={14} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="search"
        accessibilityLabel={t('customer:home.searchPlaceholder')}
        onPress={() => router.push('/customer/browse')}
        style={[
          styles.search,
          { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderRadius: theme.radius.md },
        ]}>
        <Icon name="search" size={20} color={theme.colors.textMuted} />
        <Text tone="muted" numberOfLines={1} style={styles.shrink}>
          {t('customer:home.searchPlaceholder')}
        </Text>
      </Pressable>

      <BannersCarousel />

      <UpcomingBookingCard booking={nextBooking} isActive={Boolean(activeBooking)} />
      <ActiveRequestsStrip requests={requests.data?.items ?? []} />

      <SectionHeader title={t('customer:home.categories')} />
      {catalog.query.isLoading ? (
        <LoadingState />
      ) : catalog.query.isError ? (
        <ErrorState error={catalog.query.error} onRetry={catalog.query.refetch} />
      ) : (
        <CategoryGrid categories={catalog.categories} />
      )}

      <SafetySection />
      <Row style={styles.footerNote}>
        <Text variant="caption" tone="muted" align="center">
          {t('customer:home.footerNote')}
        </Text>
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  shrink: { flexShrink: 1 },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 40,
    maxWidth: '100%',
  },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderWidth: 1 },
  footerNote: { justifyContent: 'center', paddingBottom: 8 },
});
