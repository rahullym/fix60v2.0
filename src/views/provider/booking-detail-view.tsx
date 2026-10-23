import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { bookingStatusTone } from '@/entities/status/status-tone';
import { BookingActions } from '@/features/provider/bookings/booking-actions';
import { providerKeys } from '@/features/provider/model/queries';
import { api } from '@/shared/api/endpoints';
import { formatDate, formatDateTime, formatMoney, formatTime } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Avatar, Button, Card, ErrorState, ListRow, LoadingState, Notice, Pill, RatingStars, Row, Screen, Text } from '@/shared/ui';

function whatsappUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

/** `/provider/bookings/[code]`: customer contact, slot, address, actions, review and safety links. */
export function BookingDetailView(): ReactNode {
  const { t } = useTranslation();
  const { locale, pick } = useLocale();
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  const booking = useQuery({
    queryKey: providerKeys.booking(code),
    queryFn: () => api.provider.booking(code),
    enabled: Boolean(code),
  });

  if (booking.isLoading) {
    return <LoadingState />;
  }
  if (booking.error || !booking.data) {
    return (
      <Screen>
        <ErrorState error={booking.error} onRetry={() => void booking.refetch()} />
      </Screen>
    );
  }

  const data = booking.data;
  const customer = data.counterparty;
  const isLive = data.status === 'confirmed' || data.status === 'service_started';
  const reportHref: Href = {
    pathname: '/report',
    params: { subjectUserId: customer.userId, name: customer.displayName, bookingCode: data.code },
  };

  return (
    <Screen onRefresh={() => void booking.refetch()} isRefreshing={booking.isRefetching}>
      <Card>
        <Row style={styles.between}>
          <Text variant="heading" style={styles.flex}>
            {pick(data.service.name)}
          </Text>
          <Pill label={t(`common:bookingStatus.${data.status}`)} tone={bookingStatusTone[data.status]} />
        </Row>
        <Text variant="caption" tone="muted" selectable>
          {data.code}
        </Text>
        <Text variant="bodyStrong">{formatDate(data.startsAt, locale)}</Text>
        <Text>{`${formatTime(data.startsAt, locale)} – ${formatTime(data.endsAt, locale)} · ${t('common:units.hours', { count: data.durationHours })}`}</Text>
        {data.agreedHourlyRate !== null ? (
          <Text variant="caption" tone="muted">
            {t('common:rates.hourly', { amount: formatMoney(data.agreedHourlyRate, locale) })}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text variant="label" tone="muted">
          {t('provider:booking.customer')}
        </Text>
        <Row gap={12}>
          <Avatar uri={customer.photoUrl} name={customer.displayName} />
          <Text variant="bodyStrong" style={styles.flex}>
            {customer.displayName}
          </Text>
        </Row>
        {isLive ? (
          <View style={styles.contact}>
            <Button
              label={t('common:actions.call')}
              icon="call-outline"
              variant="secondary"
              onPress={() => void Linking.openURL(`tel:${customer.phone}`)}
              style={styles.flex}
              accessibilityHint={customer.displayName}
            />
            {customer.whatsappPhone ? (
              <Button
                label={t('common:actions.whatsapp')}
                icon="logo-whatsapp"
                variant="secondary"
                onPress={() => void Linking.openURL(whatsappUrl(customer.whatsappPhone ?? ''))}
                style={styles.flex}
                accessibilityHint={customer.displayName}
              />
            ) : null}
          </View>
        ) : null}
      </Card>

      <Card>
        <Text variant="label" tone="muted">
          {t('provider:booking.address')}
        </Text>
        <Text variant="bodyStrong">{pick(data.localityName)}</Text>
        {data.areaNote ? <Text selectable>{data.areaNote}</Text> : null}
        <Text variant="label" tone="muted">
          {t('provider:booking.requirements')}
        </Text>
        <Text>{data.requirements || t('provider:invitation.noRequirements')}</Text>
      </Card>

      {data.status === 'cancelled' ? (
        <Notice
          tone="info"
          title={t('provider:booking.cancelledTitle', { by: t(`provider:booking.cancelledBy.${data.cancelledBy ?? 'system'}`) })}
          body={data.cancelReason ?? t('provider:booking.noReason')}
        />
      ) : null}
      {data.startedAt ? (
        <Text variant="caption" tone="muted">
          {t('provider:booking.startedAt', { time: formatDateTime(data.startedAt, locale) })}
        </Text>
      ) : null}
      {data.completedAt ? (
        <Text variant="caption" tone="muted">
          {t('provider:booking.completedAt', { time: formatDateTime(data.completedAt, locale) })}
        </Text>
      ) : null}

      <BookingActions booking={data} />

      {data.review ? (
        <Card>
          <Text variant="heading">{t('provider:booking.reviewTitle')}</Text>
          <RatingStars value={data.review.rating} label={t('provider:profile.ratingA11y', { rating: data.review.rating })} />
          {data.review.comment ? <Text>{data.review.comment}</Text> : null}
          <Text variant="caption" tone="muted">
            {formatDate(data.review.createdAt, locale)}
          </Text>
        </Card>
      ) : null}

      <Card>
        <ListRow
          icon="flag-outline"
          title={t('provider:booking.report')}
          subtitle={t('provider:booking.reportHint')}
          onPress={() => router.push(reportHref)}
        />
        <ListRow
          icon="help-buoy-outline"
          title={t('provider:booking.help')}
          onPress={() => router.push(`/support/new?bookingCode=${encodeURIComponent(data.code)}`)}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { justifyContent: 'space-between', alignItems: 'flex-start' },
  flex: { flex: 1 },
  contact: { flexDirection: 'row', gap: 8 },
});
