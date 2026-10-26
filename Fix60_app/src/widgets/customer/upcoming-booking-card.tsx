import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { BookingSummaryCard } from '@/entities/booking/booking-summary-card';
import type { Booking } from '@/shared/api/types';
import { SectionHeader } from '@/shared/ui';

/** The next booking (an in-progress one wins). */
export function UpcomingBookingCard({ booking, isActive }: { booking: Booking | undefined; isActive: boolean }): ReactNode {
  const { t } = useTranslation();
  if (!booking) return null;
  return (
    <View style={{ gap: 10 }}>
      <SectionHeader
        title={t(isActive ? 'customer:home.activeBooking' : 'customer:home.upcomingBooking')}
        actionLabel={t('common:actions.viewAll')}
        onAction={() => router.push('/customer/bookings')}
      />
      <BookingSummaryCard
        booking={booking}
        onPress={() => router.push({ pathname: '/customer/bookings/[code]', params: { code: booking.code } })}
      />
    </View>
  );
}
