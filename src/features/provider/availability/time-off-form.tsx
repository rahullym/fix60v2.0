import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '@/shared/api/endpoints';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { formatDate, formatTime } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Button, Card, DateTimeField, Notice, Text, TextField } from '@/shared/ui';
import { providerKeys } from '../model/queries';
import { combineDateTime } from './clock';

/** Adds one time-off window (start/end date + time, optional reason). */
export function TimeOffForm({ onDone }: { onDone: () => void }): ReactNode {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: (body: { startsAt: string; endsAt: string; reason?: string }) => api.provider.addException(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: providerKeys.availability });
      onDone();
    },
  });

  const submit = (): void => {
    if (!startDate || !startTime || !endDate || !endTime) {
      setFormError(t('provider:timeOff.errors.missing'));
      return;
    }
    const startsAt = combineDateTime(startDate, startTime);
    const endsAt = combineDateTime(endDate, endTime);
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setFormError(t('provider:timeOff.errors.order'));
      return;
    }
    if (new Date(endsAt).getTime() <= Date.now()) {
      setFormError(t('provider:timeOff.errors.past'));
      return;
    }
    setFormError(null);
    add.mutate({ startsAt, endsAt, reason: reason.trim() || undefined });
  };

  return (
    <Card>
      <Text variant="heading">{t('provider:timeOff.addTitle')}</Text>
      <View style={styles.row}>
        <View style={styles.flex}>
          <DateTimeField
            label={t('provider:timeOff.startDate')}
            mode="date"
            value={startDate}
            displayValue={startDate ? formatDate(startDate, locale) : null}
            onChange={setStartDate}
            minimumDate={new Date()}
          />
        </View>
        <View style={styles.flex}>
          <DateTimeField
            label={t('provider:timeOff.startTime')}
            mode="time"
            value={startTime}
            displayValue={startTime ? formatTime(startTime, locale) : null}
            onChange={setStartTime}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <DateTimeField
            label={t('provider:timeOff.endDate')}
            mode="date"
            value={endDate}
            displayValue={endDate ? formatDate(endDate, locale) : null}
            onChange={setEndDate}
            minimumDate={startDate ?? new Date()}
          />
        </View>
        <View style={styles.flex}>
          <DateTimeField
            label={t('provider:timeOff.endTime')}
            mode="time"
            value={endTime}
            displayValue={endTime ? formatTime(endTime, locale) : null}
            onChange={setEndTime}
          />
        </View>
      </View>
      <TextField label={t('provider:timeOff.reason')} value={reason} onChangeText={setReason} maxLength={200} />
      {formError ? <Notice tone="danger" body={formError} /> : null}
      {add.error ? <Notice tone="danger" body={t(errorMessageKey(add.error))} /> : null}
      <Button label={t('provider:timeOff.add')} onPress={submit} isLoading={add.isPending} />
      <Button label={t('common:actions.cancel')} variant="ghost" onPress={onDone} isDisabled={add.isPending} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
