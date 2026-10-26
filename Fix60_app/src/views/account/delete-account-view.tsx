import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signOut } from '@/features/auth/model/auth-flow';
import { useCancelDeletion, useDeletionStatus, useRequestDeletion } from '@/features/settings/deletion';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { formatDateTime } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Button, Card, ErrorState, LoadingState, Notice, Screen, Text, TextField } from '@/shared/ui';
import { confirmAction } from '@/widgets/account/confirm-dialog';

const POINTS = ['pointProfile', 'pointBookings', 'pointGrace', 'pointSignIn'] as const;

/** Account deletion with a 7-day grace period (request, show schedule, cancel). */
export function DeleteAccountView(): ReactNode {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const status = useDeletionStatus();
  const request = useRequestDeletion();
  const cancel = useCancelDeletion();
  const [typed, setTyped] = useState('');

  if (status.isPending) {
    return <LoadingState />;
  }
  if (status.isError) {
    return <ErrorState error={status.error} onRetry={status.refetch} />;
  }

  const mutationError = request.error ?? cancel.error;
  const errorNotice = mutationError ? <Notice tone="danger" body={t(errorMessageKey(mutationError))} /> : null;

  if (status.data.status === 'scheduled') {
    const date = status.data.scheduledFor ? formatDateTime(status.data.scheduledFor, locale) : '—';
    return (
      <Screen>
        <Notice tone="warning" title={t('common:deletion.scheduled', { date })} body={t('common:deletion.scheduledBody')} />
        {errorNotice}
        <Button
          label={t('common:deletion.cancel')}
          icon="refresh-outline"
          isLoading={cancel.isPending}
          onPress={() => {
            request.reset();
            cancel.mutate();
          }}
        />
        <Button label={t('common:actions.signOut')} variant="secondary" icon="log-out-outline" onPress={() => void signOut()} />
        <Text variant="caption" tone="muted">
          {t('common:deletion.signOutHint')}
        </Text>
      </Screen>
    );
  }

  const confirmWord = t('common:deletion.confirmWord');
  const isTypedCorrectly = typed.trim().toUpperCase() === confirmWord.toUpperCase();

  const handleDelete = async (): Promise<void> => {
    const isConfirmed = await confirmAction({
      title: t('common:deletion.finalTitle'),
      body: t('common:deletion.finalBody'),
      confirmLabel: t('common:deletion.confirm'),
      cancelLabel: t('common:actions.cancel'),
      isDestructive: true,
    });
    if (isConfirmed) {
      cancel.reset();
      request.mutate(undefined, { onSuccess: () => setTyped('') });
    }
  };

  return (
    <Screen
      footer={
        <Button
          label={t('common:deletion.confirm')}
          variant="danger"
          icon="trash-outline"
          isDisabled={!isTypedCorrectly}
          isLoading={request.isPending}
          onPress={() => void handleDelete()}
        />
      }>
      {cancel.isSuccess ? <Notice tone="success" body={t('common:deletion.kept')} /> : null}
      <Text>{t('common:deletion.body')}</Text>
      <Card>
        {POINTS.map((point) => (
          <Text key={point} variant="caption">
            {`• ${t(`common:deletion.${point}`)}`}
          </Text>
        ))}
      </Card>
      {errorNotice}
      <TextField
        label={t('common:deletion.typeToConfirm', { word: confirmWord })}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={confirmWord}
      />
    </Screen>
  );
}
