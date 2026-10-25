import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { customerKeys } from '@/features/customer/model/query-keys';
import { useCatalog } from '@/features/customer/model/use-catalog';
import { useLocality } from '@/features/customer/model/use-locality';
import { firstName, useMe } from '@/features/customer/model/use-me';
import { api } from '@/shared/api/endpoints';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { ErrorState, HeaderIconButton, Icon, LoadingState, Row, Screen, SectionHeader, Text, useLightStatusBar } from '@/shared/ui';
import { useUnreadCount } from '@/features/notifications';
import { ActiveRequestsStrip } from '@/widgets/customer/active-requests-strip';
import { BannersCarousel } from '@/widgets/customer/banners-carousel';
import { CategoryGrid } from '@/widgets/customer/category-grid';
import { SafetySection } from '@/widgets/customer/safety-section';
import { UpcomingBookingCard } from '@/widgets/customer/upcoming-booking-card';

/** Customer home: greeting, area, search, banners, categories, what's in progress, safety. */
export function HomeView(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const { top } = useSafeAreaInsets();
  useLightStatusBar();
  const unread = useUnreadCount();
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
    <Screen edges={[]} onRefresh={refresh} isRefreshing={isRefreshing}>
      <View style={[styles.hero, { backgroundColor: theme.colors.primary, paddingTop: top + 16 }]}>
        <Row style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('customer:home.areaA11y', { area: areaLabel })}
          onPress={() => router.push('/settings/profile')}
          style={[styles.areaRow, styles.shrink]}>
          <View style={styles.areaIcon}>
            <Icon name="location" size={16} color={theme.colors.onPrimary} />
          </View>
          <View style={styles.shrink}>
            <Text variant="caption" tone="onPrimary" style={styles.heroMuted}>
              {t('customer:home.yourArea')}
            </Text>
            <Row gap={4}>
              <Text variant="bodyStrong" tone="onPrimary" numberOfLines={1} style={styles.shrink}>
                {areaLabel}
              </Text>
              <Icon name="chevron-down" size={14} color={theme.colors.onPrimary} />
            </Row>
          </View>
        </Pressable>
          <HeaderIconButton
            icon="notifications"
            label={t('common:notifications.title')}
            badge={unread}
            onPress={() => router.push('/notifications')}
          />
        </Row>
        <Text variant="title" tone="onPrimary" numberOfLines={2} style={styles.greeting}>
          {name ? t('customer:home.greeting', { name }) : t('customer:home.greetingNoName')} 👋
        </Text>
        <Pressable
          accessibilityRole="search"
          accessibilityLabel={t('customer:home.searchPlaceholder')}
          onPress={() => router.push('/customer/browse')}
          style={[styles.search, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg }]}>
          <Icon name="search" size={20} color={theme.colors.textMuted} />
          <Text tone="muted" numberOfLines={1} style={styles.shrink}>
            {t('customer:home.searchPlaceholder')}
          </Text>
        </Pressable>
      </View>

      <BannersCarousel />

      <UpcomingBookingCard booking={nextBooking} isActive={Boolean(activeBooking)} />
      <ActiveRequestsStrip requests={requests.data?.items ?? []} />

      <View>
        <SectionHeader title={t('customer:home.categories')} />
        <Text variant="caption" tone="muted">
          {t('customer:home.categoriesHint')}
        </Text>
      </View>
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
  hero: {
    marginHorizontal: -16,
    marginTop: -16,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topRow: { justifyContent: 'space-between', gap: 12 },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  areaIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  heroMuted: { opacity: 0.75 },
  greeting: { fontSize: 28, lineHeight: 36 },
  shrink: { flexShrink: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 16 },
  footerNote: { justifyContent: 'center', paddingBottom: 8 },
});
