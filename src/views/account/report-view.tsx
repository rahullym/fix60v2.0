import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import { type ReportOutcome, useSubmitReport } from '@/features/safety/safety';
import type { ReportReason } from '@/shared/api/types';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { useTheme } from '@/shared/theme/theme';
import { Button, Card, Checkbox, Chip, EmptyState, Icon, Notice, Screen, Text, TextField } from '@/shared/ui';

const REASONS: ReportReason[] = [
  'harassment',
  'unsafe_behaviour',
  'inappropriate_request',
  'misconduct',
  'false_information',
  'payment_issue',
  'other',
];
const EMERGENCY_NUMBER = '112';

function EmergencyNotice(): ReactNode {
  const { t } = useTranslation();
  return (
    <View style={styles.gap}>
      <Notice tone="danger" title={t('common:report.emergencyTitle')} body={t('common:report.emergency', { number: EMERGENCY_NUMBER })} />
      <Button
        label={t('common:report.callEmergency', { number: EMERGENCY_NUMBER })}
        variant="danger"
        icon="call"
        isCompact
        onPress={() => Linking.openURL(`tel:${EMERGENCY_NUMBER}`).catch(() => undefined)}
      />
    </View>
  );
}

/** Report a person (optionally blocking them) from a booking, request or profile. */
export function ReportView(): ReactNode {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ subjectUserId?: string; name?: string; bookingCode?: string; requestCode?: string }>();
  const submit = useSubmitReport();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [shouldBlock, setShouldBlock] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ReportOutcome | null>(null);
  const name = params.name || t('common:report.thisPerson');

  if (!params.subjectUserId) {
    return (
      <Screen>
        <EmergencyNotice />
        <EmptyState icon="alert-circle-outline" title={t('common:report.missingSubject')} actionLabel={t('common:settings.support')} onAction={() => router.replace('/support')} />
      </Screen>
    );
  }

  if (outcome) {
    return <ReportSuccess outcome={outcome} name={name} />;
  }

  const send = (): void => {
    if (!reason || !params.subjectUserId) {
      setReasonError(t('common:report.reasonRequired'));
      return;
    }
    setReasonError(null);
    submit.mutate(
      {
        report: {
          subjectUserId: params.subjectUserId,
          reason,
          details: details.trim() || undefined,
          bookingCode: params.bookingCode || undefined,
          requestCode: params.requestCode || undefined,
        },
        shouldBlock,
      },
      { onSuccess: setOutcome },
    );
  };

  return (
    <Screen footer={<Button label={t('common:report.submit')} variant="danger" onPress={send} isLoading={submit.isPending} />}>
      <EmergencyNotice />
      <Text variant="heading">{t('common:report.about', { name })}</Text>
      {params.bookingCode || params.requestCode ? (
        <Text variant="caption" tone="muted">
          {params.bookingCode ?? params.requestCode}
        </Text>
      ) : null}
      {submit.isError ? <Notice tone="danger" body={t(errorMessageKey(submit.error))} /> : null}

      <View style={styles.gap} accessibilityRole="radiogroup" accessibilityLabel={t('common:report.reason')}>
        <Text variant="label" tone="muted">
          {t('common:report.reason')}
        </Text>
        <View style={styles.chips}>
          {REASONS.map((value) => (
            <Chip
              key={value}
              label={t(`common:reportReasons.${value}`)}
              isSelected={reason === value}
              onPress={() => {
                setReason(value);
                setReasonError(null);
              }}
            />
          ))}
        </View>
        {reasonError ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {reasonError}
          </Text>
        ) : null}
      </View>

      <TextField
        label={t('common:report.details')}
        value={details}
        onChangeText={setDetails}
        multiline
        maxLength={1000}
        hint={t('common:report.detailsHint')}
      />
      <Checkbox isChecked={shouldBlock} onChange={setShouldBlock} label={t('common:report.blockToo')} />
      <Text variant="caption" tone="muted">
        {t('common:report.confidential')}
      </Text>
    </Screen>
  );
}

function ReportSuccess({ outcome, name }: { outcome: ReportOutcome; name: string }): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Screen footer={<Button label={t('common:actions.done')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))} />}>
      <View style={styles.center}>
        <Icon name="checkmark-circle" size={56} color={theme.colors.success} />
        <Text variant="title" align="center">
          {t('common:report.successTitle')}
        </Text>
        <Text align="center">{t('common:report.submitted', { code: outcome.receipt.code })}</Text>
      </View>
      {outcome.isBlocked === true ? <Notice tone="success" body={t('common:block.done', { name })} /> : null}
      {outcome.isBlocked === false ? <Notice tone="warning" body={t('common:report.blockFailed', { name })} /> : null}
      <Card>
        <Text variant="heading">{t('common:report.nextTitle')}</Text>
        {(['next1', 'next2', 'next3'] as const).map((key) => (
          <Text key={key} variant="caption">
            {`• ${t(`common:report.${key}`)}`}
          </Text>
        ))}
      </Card>
      <EmergencyNotice />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  center: { alignItems: 'center', gap: 8, paddingVertical: 16 },
});
