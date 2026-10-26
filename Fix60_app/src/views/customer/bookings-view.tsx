import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BookingSummaryCard } from '@/entities/booking/booking-summary-card';
import { customerKeys } from '@/features/customer/model/query-keys';
import { useRefetchOnFocus } from '@/features/customer/model/use-refetch-on-focus';
import { api } from '@/shared/api/endpoints';
import type { BookingScope } from '@/shared/api/types';
import { EmptyState, ErrorState, LoadingState, Screen, TopTabs } from '@/shared/ui';

const SCOPES: BookingScope[] = ['upcoming', 'active', 'past'];

/** Bookings split into Upcoming / Active / Past. */
export function BookingsView(): ReactNode {
  const { t } = useTranslation();
  const [scope, setScope] = useState<BookingScope>('upcoming');
  const query = useQuery({ queryKey: customerKeys.bookings(scope), queryFn: () => api.bookings.list(scope) });
  useRefetchOnFocus(query.refetch);
  const items = query.data?.items ?? [];

  return (
    <View style={styles.flex}>
      <TopTabs
        value={scope}
        tabs={SCOPES.map((value) => ({ value, label: t(`customer:bookings.scope.${value}`) }))}
        onChange={setScope}
      />
      <Screen onRefresh={query.refetch} isRefreshing={query.isRefetching}>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={t(`customer:bookings.empty.${scope}`)}
          body={t('customer:bookings.emptyBody')}
          actionLabel={scope === 'past' ? undefined : t('customer:bookings.findHelp')}
          onAction={() => router.push('/customer/browse')}
        />
      ) : (
        items.map((booking) => (
          <BookingSummaryCard
            key={booking.code}
            booking={booking}
            onPress={() => router.push({ pathname: '/customer/bookings/[code]', params: { code: booking.code } })}
          />
        ))
      )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
