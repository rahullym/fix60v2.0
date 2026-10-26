import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  canOpenStep,
  infoRequestsFor,
  STEP_ICONS,
  stepNumber,
  stepState,
  type StepState,
} from '@/entities/application/application-steps';
import { stepHref } from '@/features/provider/application/use-save-step';
import { APPLICATION_STEPS, type ProviderApplication } from '@/shared/api/types';
import { useTheme } from '@/shared/theme/theme';
import { Icon, type IconName, Notice, Pill, type PillTone, Text } from '@/shared/ui';

const STATE_META: Record<StepState, { icon: IconName; tone: PillTone }> = {
  completed: { icon: 'checkmark-circle', tone: 'success' },
  next: { icon: 'arrow-forward-circle', tone: 'accent' },
  attention: { icon: 'alert-circle', tone: 'warning' },
  upcoming: { icon: 'ellipse-outline', tone: 'neutral' },
};

/** The 9-step checklist with completed / next / needs-attention states and reviewer notes per step. */
export function ApplicationChecklist({
  application,
  isEditable,
}: {
  application: ProviderApplication;
  isEditable: boolean;
}): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={styles.list}>
      {APPLICATION_STEPS.map((key) => {
        const state = stepState(application, key);
        const meta = STATE_META[state];
        const requests = infoRequestsFor(application, key);
        const isOpenable = isEditable && canOpenStep(application, key);
        const title = t(`provider:steps.${key}.title`);
        const stateLabel = t(`provider:checklist.state.${state}`);
        const color =
          state === 'completed'
            ? theme.colors.success
            : state === 'attention'
              ? theme.colors.warning
              : state === 'next'
                ? theme.colors.accent
                : theme.colors.textMuted;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={t('provider:checklist.a11y', { number: stepNumber(key), title, state: stateLabel })}
            accessibilityState={{ disabled: !isOpenable }}
            disabled={!isOpenable}
            onPress={() => router.push(stepHref(key))}
            style={({ pressed }) => [
              styles.item,
              {
                borderColor: state === 'attention' ? theme.colors.warning : theme.colors.border,
                backgroundColor: state === 'attention' ? theme.colors.warningLight : theme.colors.surface,
                borderRadius: theme.radius.md,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <View style={styles.row}>
              <Icon name={meta.icon} color={color} />
              <Icon name={STEP_ICONS[key]} size={18} color={theme.colors.textMuted} />
              <View style={styles.flex}>
                <Text variant="caption" tone="muted">
                  {t('provider:wizard.stepOf', { number: stepNumber(key), total: APPLICATION_STEPS.length })}
                </Text>
                <Text variant="bodyStrong">{title}</Text>
              </View>
              <Pill label={stateLabel} tone={meta.tone} />
            </View>
            {requests.map((message) => (
              <Notice key={message} tone="warning" title={t('provider:checklist.reviewerSays')} body={message} />
            ))}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  item: { borderWidth: 1, padding: 12, gap: 8, minHeight: 56 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
});
