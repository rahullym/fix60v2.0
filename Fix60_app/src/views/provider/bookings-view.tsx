import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { providerKeys } from '@/features/provider/model/queries';
import { api } from '@/shared/api/endpoints';
import type { BookingScope } from '@/shared/api/types';
import { EmptyState, ErrorState, LoadingState, Screen, TopTabs } from '@/shared/ui';
import { BookingCard } from '@/widgets/provider/booking-card';

const SCOPES: BookingScope[] = ['upcoming', 'active', 'past'];

/** Bookings tab: Upcoming / Active / Past. */
export function BookingsView(): ReactNode {
  const { t } = useTranslation();
  const [scope, setScope] = useState<BookingScope>('upcoming');
  const bookings = useQuery({
    queryKey: providerKeys.bookings(scope),
    queryFn: () => api.provider.bookings(scope),
  });
  const items = bookings.data?.items ?? [];

  return (
    <View style={styles.flex}>
      <TopTabs
        value={scope}
        tabs={SCOPES.map((value) => ({ value, label: t(`provider:bookings.scope.${value}`) }))}
        onChange={setScope}
      />
      <Screen onRefresh={() => void bookings.refetch()} isRefreshing={bookings.isRefetching}>
      {bookings.isLoading ? <LoadingState /> : null}
      {bookings.error ? <ErrorState error={bookings.error} onRetry={() => void bookings.refetch()} /> : null}
      {!bookings.isLoading && !bookings.error && items.length === 0 ? (
        <EmptyState icon="calendar-clear-outline" title={t(`provider:bookings.empty.${scope}`)} />
      ) : null}
      {items.map((booking) => (
        <BookingCard key={booking.code} booking={booking} onPress={() => router.push(`/provider/bookings/${booking.code}`)} />
      ))}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
