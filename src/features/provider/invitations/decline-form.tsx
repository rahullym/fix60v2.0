import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip, Text, TextField } from '@/shared/ui';

export const DECLINE_REASONS = ['not_available', 'too_far', 'budget_low', 'not_my_skill', 'other'] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

/** Reason picker for declining a job. The reason is required; "Other" needs text. */
export function DeclineForm({
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  isSubmitting: boolean;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}): ReactNode {
  const { t } = useTranslation();
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const [otherText, setOtherText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (): void => {
    if (!reason) {
      setError(t('provider:decline.pickReason'));
      return;
    }
    if (reason === 'other' && otherText.trim().length < 3) {
      setError(t('provider:decline.otherRequired'));
      return;
    }
    setError(null);
    onSubmit(reason === 'other' ? otherText.trim() : t(`provider:decline.reasons.${reason}`, { lng: 'en' }));
  };

  return (
    <Card>
      <Text variant="heading">{t('provider:decline.title')}</Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {DECLINE_REASONS.map((value) => (
          <Chip
            key={value}
            label={t(`provider:decline.reasons.${value}`)}
            isSelected={reason === value}
            onPress={() => setReason(value)}
          />
        ))}
      </View>
      {reason === 'other' ? (
        <TextField
          label={t('provider:decline.otherLabel')}
          value={otherText}
          onChangeText={setOtherText}
          multiline
          maxLength={300}
        />
      ) : null}
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button label={t('provider:decline.submit')} variant="danger" onPress={submit} isLoading={isSubmitting} />
      <Button label={t('common:actions.cancel')} variant="ghost" onPress={onCancel} isDisabled={isSubmitting} />
    </Card>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
