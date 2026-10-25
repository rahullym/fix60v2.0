import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { infoRequestsFor, stepNumber, TOTAL_STEPS } from '@/entities/application/application-steps';
import type { ApplicationStepKey, ProviderApplication } from '@/shared/api/types';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { useTheme } from '@/shared/theme/theme';
import { Button, Notice, Screen, Text } from '@/shared/ui';

/** Wizard chrome: "Step N of 9" progress, reviewer notes, read-only notice and the Continue footer. */
export function WizardFrame({
  step,
  application,
  isEditable,
  onContinue,
  isSaving,
  saveError,
  continueLabel,
  hasFieldErrors = false,
  isContinueDisabled = false,
  children,
}: {
  step: ApplicationStepKey;
  application: ProviderApplication;
  isEditable: boolean;
  onContinue: () => void;
  isSaving: boolean;
  saveError: unknown;
  continueLabel?: string;
  hasFieldErrors?: boolean;
  isContinueDisabled?: boolean;
  children: ReactNode;
}): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const number = stepNumber(step);
  const requests = infoRequestsFor(application, step);
  return (
    <Screen
      footer={
        isEditable ? (
          <Button label={continueLabel ?? t('common:actions.saveAndContinue')} onPress={onContinue} isLoading={isSaving} isDisabled={isContinueDisabled} />
        ) : undefined
      }>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={t('provider:wizard.stepOf', { number, total: TOTAL_STEPS })}
        accessibilityValue={{ min: 1, max: TOTAL_STEPS, now: number }}
        style={styles.progress}>
        <Text variant="label" tone="muted">
          {t('provider:wizard.stepOf', { number, total: TOTAL_STEPS })}
        </Text>
        <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
          <View style={[styles.fill, { width: `${(number / TOTAL_STEPS) * 100}%`, backgroundColor: theme.colors.primary }]} />
        </View>
      </View>
      <Text variant="title">{t(`provider:steps.${step}.title`)}</Text>
      <Text tone="muted">{t(`provider:steps.${step}.subtitle`)}</Text>
      {requests.map((message) => (
        <Notice key={message} tone="warning" title={t('provider:checklist.reviewerSays')} body={message} />
      ))}
      {!isEditable ? <Notice tone="info" body={t('provider:wizard.readOnly')} /> : null}
      {children}
      {hasFieldErrors ? <Notice tone="danger" body={t('provider:wizard.fixErrors')} /> : null}
      {saveError ? <Notice tone="danger" body={t(errorMessageKey(saveError))} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { gap: 6 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
