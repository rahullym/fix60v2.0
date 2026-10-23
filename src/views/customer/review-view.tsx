import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { customerKeys } from '@/features/customer/model/query-keys';
import { ReviewForm } from '@/features/customer/review-booking/review-form';
import { api } from '@/shared/api/endpoints';
import { Button, EmptyState, ErrorState, LoadingState, Screen } from '@/shared/ui';

/** Review a completed booking. */
export function ReviewView(): ReactNode {
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code: string }>();
  const query = useQuery({ queryKey: customerKeys.booking(code), queryFn: () => api.bookings.get(code) });
  const booking = query.data;
  const title = <Stack.Screen options={{ title: t('customer:review.title') }} />;

  if (query.isLoading) return <LoadingState />;
  if (!booking) return <ErrorState error={query.error} onRetry={query.refetch} />;
  if (!booking.canReview || booking.review) {
    return (
      <Screen>
        {title}
        <EmptyState
          icon="star-outline"
          title={t(booking.review ? 'customer:review.alreadyTitle' : 'customer:review.notYetTitle')}
          body={t(booking.review ? 'customer:review.alreadyBody' : 'customer:review.notYetBody')}
        />
        <Button label={t('common:actions.back')} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  return (
    <>
      {title}
      <ReviewForm
        bookingCode={booking.code}
        providerName={booking.counterparty.displayName}
        onDone={() => router.back()}
      />
    </>
  );
}
