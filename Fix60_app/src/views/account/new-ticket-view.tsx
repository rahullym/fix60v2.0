import { type Href, router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateTicket } from '@/features/support/support';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { Button, Notice, Screen, Text, TextField } from '@/shared/ui';

/** New support request, optionally about a booking (`?bookingCode=`). */
export function NewTicketView(): ReactNode {
  const { t } = useTranslation();
  const { bookingCode } = useLocalSearchParams<{ bookingCode?: string }>();
  const create = useCreateTicket();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (): void => {
    const next: Record<string, string> = {};
    if (subject.trim().length < 3) next.subject = t('common:support.errors.subject');
    if (message.trim().length < 10) next.message = t('common:support.errors.message');
    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }
    create.mutate(
      { subject: subject.trim(), message: message.trim(), bookingCode: bookingCode || undefined },
      { onSuccess: (ticket) => router.replace(`/support/${encodeURIComponent(ticket.code)}` as Href) },
    );
  };

  return (
    <Screen footer={<Button label={t('common:actions.send')} icon="send" onPress={submit} isLoading={create.isPending} />}>
      <Text tone="muted">{t('common:support.newTicketIntro')}</Text>
      {bookingCode ? <Notice body={t('common:support.aboutBooking', { code: bookingCode })} icon="calendar-outline" /> : null}
      {create.isError ? <Notice tone="danger" body={t(errorMessageKey(create.error))} /> : null}
      <TextField label={t('common:support.subject')} value={subject} onChangeText={setSubject} maxLength={120} error={errors.subject} />
      <TextField
        label={t('common:support.message')}
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={2000}
        error={errors.message}
      />
    </Screen>
  );
}
