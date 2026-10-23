import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { providerKeys } from '@/features/provider/model/queries';
import { api } from '@/shared/api/endpoints';
import type { BookingScope } from '@/shared/api/types';
import { Chip, EmptyState, ErrorState, LoadingState, Screen } from '@/shared/ui';
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
    <Screen onRefresh={() => void bookings.refetch()} isRefreshing={bookings.isRefetching}>
      <View style={styles.segments} accessibilityRole="tablist">
        {SCOPES.map((value) => (
          <Chip key={value} label={t(`provider:bookings.scope.${value}`)} isSelected={scope === value} onPress={() => setScope(value)} />
        ))}
      </View>
      {bookings.isLoading ? <LoadingState /> : null}
      {bookings.error ? <ErrorState error={bookings.error} onRetry={() => void bookings.refetch()} /> : null}
      {!bookings.isLoading && !bookings.error && items.length === 0 ? (
        <EmptyState icon="calendar-clear-outline" title={t(`provider:bookings.empty.${scope}`)} />
      ) : null}
      {items.map((booking) => (
        <BookingCard key={booking.code} booking={booking} onPress={() => router.push(`/provider/bookings/${booking.code}`)} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segments: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
