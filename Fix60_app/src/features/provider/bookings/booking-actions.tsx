import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '@/shared/api/endpoints';
import type { Booking } from '@/shared/api/types';
import { useNow } from '@/entities/invitation/countdown';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { formatDateTime } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Button, Card, Notice, Text, TextField } from '@/shared/ui';
import { providerKeys } from '../model/queries';

type Action = 'start' | 'complete' | 'cancel';

/** The server accepts Start from one hour before the slot. */
const START_WINDOW_MS = 60 * 60 * 1000;

/** Start (confirmed), Complete (service_started) and Cancel with reason (confirmed only). */
export function BookingActions({ booking }: { booking: Booking }): ReactNode {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const now = useNow(30_000);
  const [isCancelling, setIsCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ action, cancelReason }: { action: Action; cancelReason?: string }): Promise<Booking> => {
      if (action === 'start') return api.provider.startBooking(booking.code);
      if (action === 'complete') return api.provider.completeBooking(booking.code);
      return api.provider.cancelBooking(booking.code, { reason: cancelReason ?? '' });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(providerKeys.booking(booking.code), updated);
      setIsCancelling(false);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: providerKeys.booking(booking.code) });
      void queryClient.invalidateQueries({ queryKey: providerKeys.bookingsRoot });
      void queryClient.invalidateQueries({ queryKey: providerKeys.me });
    },
  });

  const confirm = (action: Action, cancelReason?: string): void => {
    Alert.alert(t(`provider:booking.confirm.${action}Title`), t(`provider:booking.confirm.${action}Body`), [
      { text: t('common:actions.back'), style: 'cancel' },
      {
        text: t(`provider:booking.actions.${action}`),
        style: action === 'cancel' ? 'destructive' : 'default',
        onPress: () => mutation.mutate({ action, cancelReason }),
      },
    ]);
  };

  const submitCancel = (): void => {
    if (reason.trim().length < 5) {
      setReasonError(t('provider:booking.cancelReasonError'));
      return;
    }
    setReasonError(null);
    confirm('cancel', reason.trim());
  };

  const canStart = booking.status === 'confirmed';
  const startOpensAt = new Date(new Date(booking.startsAt).getTime() - START_WINDOW_MS);
  const isTooEarly = now.getTime() < startOpensAt.getTime();
  const canComplete = booking.status === 'service_started';
  const canCancel = booking.status === 'confirmed' && booking.canCancel;
  if (!canStart && !canComplete && !canCancel) {
    return null;
  }

  return (
    <View style={styles.list}>
      {mutation.error ? <Notice tone="danger" body={t(errorMessageKey(mutation.error))} /> : null}
      {canStart ? (
        <Button
          label={t('provider:booking.actions.start')}
          icon="play-outline"
          onPress={() => confirm('start')}
          isDisabled={isTooEarly}
          isLoading={mutation.isPending && mutation.variables?.action === 'start'}
        />
      ) : null}
      {canStart && isTooEarly ? (
        <Text variant="caption" tone="muted">
          {t('provider:booking.startOpensAt', { time: formatDateTime(startOpensAt, locale) })}
        </Text>
      ) : null}
      {canComplete ? (
        <Button
          label={t('provider:booking.actions.complete')}
          icon="checkmark-done-outline"
          onPress={() => confirm('complete')}
          isLoading={mutation.isPending && mutation.variables?.action === 'complete'}
        />
      ) : null}
      {canCancel && !isCancelling ? (
        <Button label={t('provider:booking.actions.cancel')} variant="secondary" icon="close-circle-outline" onPress={() => setIsCancelling(true)} />
      ) : null}
      {isCancelling ? (
        <Card>
          <Text variant="heading">{t('provider:booking.cancelTitle')}</Text>
          <Text variant="caption" tone="muted">
            {t('provider:booking.cancelHint')}
          </Text>
          <TextField
            label={t('provider:booking.cancelReason')}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={300}
            error={reasonError}
          />
          <Button
            label={t('provider:booking.actions.cancel')}
            variant="danger"
            onPress={submitCancel}
            isLoading={mutation.isPending && mutation.variables?.action === 'cancel'}
          />
          <Button label={t('common:actions.back')} variant="ghost" onPress={() => setIsCancelling(false)} />
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
});
