import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { BookingStatusPill } from '@/entities/booking/booking-status-pill';
import { useBookingActions } from '@/features/customer/booking-actions/use-booking-actions';
import { customerKeys } from '@/features/customer/model/query-keys';
import { whatsappUrl } from '@/features/customer/model/slot';
import { useRefetchOnFocus } from '@/features/customer/model/use-refetch-on-focus';
import { ReasonDialog } from '@/features/customer/reason-dialog/reason-dialog';
import { api } from '@/shared/api/endpoints';
import type { Booking } from '@/shared/api/types';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { formatDateTime, formatMoney, formatTime } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import {
  Avatar,
  Button,
  Card,
  ErrorState,
  ListRow,
  LoadingState,
  Notice,
  RatingStars,
  Row,
  Screen,
  SectionHeader,
  Text,
} from '@/shared/ui';
import { DetailRow } from '@/widgets/customer/detail-row';

function canMarkComplete(booking: Booking, now: Date = new Date()): boolean {
  return (
    booking.status === 'service_started' ||
    (booking.status === 'confirmed' && new Date(booking.startsAt).getTime() <= now.getTime())
  );
}

function openUrl(url: string, failTitle: string): void {
  Linking.openURL(url).catch(() => Alert.alert(failTitle));
}

/** Booking detail: slot, place, provider contact, complete / cancel / review, report and help. */
export function BookingDetailView(): ReactNode {
  const { t } = useTranslation();
  const { locale, pick } = useLocale();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const query = useQuery({ queryKey: customerKeys.booking(code), queryFn: () => api.bookings.get(code) });
  useRefetchOnFocus(query.refetch);
  const actions = useBookingActions(code);

  const booking = query.data;
  if (query.isLoading) return <LoadingState />;
  if (!booking) return <ErrorState error={query.error} onRetry={query.refetch} />;

  const provider = booking.counterparty;
  const isLive = booking.status === 'confirmed' || booking.status === 'service_started';
  const actionError = actions.complete.error ?? actions.cancel.error;

  const confirmComplete = (): void => {
    Alert.alert(t('customer:booking.completeTitle'), t('customer:booking.completeBody', { name: provider.displayName }), [
      { text: t('common:actions.cancel'), style: 'cancel' },
      { text: t('customer:booking.completeConfirm'), onPress: () => actions.complete.mutate() },
    ]);
  };

  const report = (): void => {
    router.push({
      pathname: '/report',
      params: { subjectUserId: provider.userId, name: provider.displayName, bookingCode: booking.code },
    });
  };

  return (
    <Screen onRefresh={query.refetch} isRefreshing={query.isRefetching}>
      <Stack.Screen options={{ title: pick(booking.service.name) }} />

      <Card>
        <Row style={styles.between}>
          <Text variant="caption" tone="muted">
            {booking.code}
          </Text>
          <BookingStatusPill status={booking.status} />
        </Row>
        <Text variant="heading">{pick(booking.service.name)}</Text>
        <Text>{t(`customer:bookingStatusHelp.${booking.status}`)}</Text>
        {booking.status === 'cancelled' && booking.cancelReason ? (
          <Text variant="caption" tone="muted">
            {t('customer:booking.cancelledBy', {
              who: t(`customer:booking.cancelledByWho.${booking.cancelledBy ?? 'system'}`),
              reason: booking.cancelReason,
            })}
          </Text>
        ) : null}
      </Card>

      <SectionHeader title={t('customer:booking.provider')} />
      <Card>
        <Row gap={12}>
          <Avatar uri={provider.photoUrl} name={provider.displayName} size={52} />
          <View style={styles.flex}>
            <Text variant="heading" numberOfLines={2}>
              {provider.displayName}
            </Text>
            {booking.agreedHourlyRate !== null ? (
              <Text variant="caption" tone="muted">
                {t('customer:booking.agreedRate', {
                  rate: t('common:rates.hourly', { amount: formatMoney(booking.agreedHourlyRate, locale) }),
                })}
              </Text>
            ) : null}
          </View>
        </Row>
        {isLive ? (
          <Row gap={10}>
            <Button
              label={t('common:actions.call')}
              icon="call-outline"
              onPress={() => openUrl(`tel:${provider.phone}`, t('customer:booking.openFailed'))}
              style={styles.flex}
              accessibilityHint={t('customer:booking.callHint', { name: provider.displayName })}
            />
            <Button
              label={t('common:actions.whatsapp')}
              icon="logo-whatsapp"
              variant="secondary"
              onPress={() => openUrl(whatsappUrl(provider.whatsappPhone ?? provider.phone), t('customer:booking.openFailed'))}
              style={styles.flex}
            />
          </Row>
        ) : null}
        {provider.providerCode ? (
          <Button
            label={t('customer:booking.viewProfile')}
            variant="ghost"
            onPress={() => router.push({ pathname: '/customer/providers/[code]', params: { code: provider.providerCode! } })}
          />
        ) : null}
      </Card>

      <SectionHeader title={t('customer:requestDetail.details')} />
      <Card>
        <DetailRow
          icon="calendar-outline"
          label={t('customer:requestDetail.when')}
          value={`${formatDateTime(booking.startsAt, locale)} – ${formatTime(booking.endsAt, locale)} · ${t('common:units.hours', { count: booking.durationHours })}`}
        />
        <DetailRow icon="location-outline" label={t('customer:location.locality')} value={pick(booking.localityName)} />
        <DetailRow icon="home-outline" label={t('customer:booking.address')} value={booking.areaNote} />
        <DetailRow icon="list-outline" label={t('customer:form.requirements')} value={booking.requirements} />
        <DetailRow
          icon="play-circle-outline"
          label={t('customer:booking.startedAt')}
          value={booking.startedAt ? formatDateTime(booking.startedAt, locale) : null}
        />
        <DetailRow
          icon="checkmark-circle-outline"
          label={t('customer:booking.completedAt')}
          value={booking.completedAt ? formatDateTime(booking.completedAt, locale) : null}
        />
      </Card>

      {booking.review ? (
        <>
          <SectionHeader title={t('customer:booking.yourReview')} />
          <Card>
            <RatingStars value={booking.review.rating} />
            {booking.review.comment ? <Text>{booking.review.comment}</Text> : null}
          </Card>
        </>
      ) : null}

      {actionError ? <Notice tone="danger" body={t(errorMessageKey(actionError))} /> : null}

      <View style={styles.actions}>
        {canMarkComplete(booking) ? (
          <Button
            label={t('customer:booking.markComplete')}
            icon="checkmark-done-outline"
            onPress={confirmComplete}
            isLoading={actions.complete.isPending}
          />
        ) : null}
        {booking.canReview && !booking.review ? (
          <Button
            label={t('customer:booking.review')}
            icon="star-outline"
            variant="accent"
            onPress={() => router.push({ pathname: '/customer/bookings/[code]/review', params: { code: booking.code } })}
          />
        ) : null}
        {booking.canCancel ? (
          <Button
            label={t('customer:booking.cancel')}
            icon="close-circle-outline"
            variant="secondary"
            onPress={() => {
              actions.cancel.reset();
              setIsCancelOpen(true);
            }}
          />
        ) : null}
      </View>

      <View>
        <ListRow icon="flag-outline" title={t('customer:booking.reportProvider')} tone="danger" onPress={report} />
        <ListRow
          icon="help-buoy-outline"
          title={t('customer:booking.getHelp')}
          onPress={() => router.push({ pathname: '/support/new', params: { bookingCode: booking.code } })}
        />
      </View>

      <ReasonDialog
        isVisible={isCancelOpen}
        title={t('customer:booking.cancelTitle')}
        body={t('customer:booking.cancelBody')}
        confirmLabel={t('customer:booking.cancelConfirm')}
        isSubmitting={actions.cancel.isPending}
        error={actions.cancel.error}
        onSubmit={(reason) => actions.cancel.mutate(reason, { onSuccess: () => setIsCancelOpen(false) })}
        onClose={() => setIsCancelOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { justifyContent: 'space-between' },
  actions: { gap: 10 },
});
