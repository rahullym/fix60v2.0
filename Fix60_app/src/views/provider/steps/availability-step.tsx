import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  type FieldErrors,
  hasErrors,
  MAX_HOURS_RANGE,
  validateAvailability,
} from '@/entities/application/validate-step';
import { useSaveStep } from '@/features/provider/application/use-save-step';
import { WeeklyRulesEditor } from '@/features/provider/availability/weekly-rules-editor';
import type { AvailabilityRule, AvailabilityType, DayPart } from '@/shared/api/types';
import { Chip, Stepper, Text } from '@/shared/ui';
import { WizardFrame } from '@/widgets/provider/wizard-frame';
import type { StepProps } from './step-props';

const TYPES: AvailabilityType[] = ['hourly', 'part_time', 'full_time', 'daily', 'weekly', 'flexible'];
const DAY_PARTS: DayPart[] = ['morning', 'afternoon', 'evening', 'night'];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/** Step 7: kinds of work, parts of day, daily hour cap and the weekly schedule. */
export function AvailabilityStep({ application, isEditable, returnTo }: StepProps): ReactNode {
  const { t } = useTranslation();
  const draft = application.draft.availability;
  const save = useSaveStep('availability', returnTo);

  const [types, setTypes] = useState<AvailabilityType[]>(draft?.availabilityTypes ?? []);
  const [dayParts, setDayParts] = useState<DayPart[]>(draft?.dayParts ?? []);
  const [maxHours, setMaxHours] = useState(draft?.maxHoursPerDay ?? 8);
  const [rules, setRules] = useState<AvailabilityRule[]>(draft?.rules ?? []);
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = (): void => {
    const data = { availabilityTypes: types, dayParts, maxHoursPerDay: maxHours, rules };
    const next = validateAvailability(data);
    setErrors(next);
    if (!hasErrors(next)) {
      save.mutate(data);
    }
  };

  const errorText = (key: string): ReactNode =>
    errors[key] ? (
      <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
        {t(errors[key])}
      </Text>
    ) : null;

  return (
    <WizardFrame
      step="availability"
      application={application}
      isEditable={isEditable}
      onContinue={submit}
      isSaving={save.isPending}
      saveError={save.error}
      hasFieldErrors={hasErrors(errors)}>
      <View style={styles.group}>
        <Text variant="label" tone="muted">
          {t('provider:availability.types')}
        </Text>
        <View style={styles.chips}>
          {TYPES.map((value) => (
            <Chip
              key={value}
              label={t(`provider:availabilityType.${value}`)}
              isSelected={types.includes(value)}
              onPress={() => isEditable && setTypes(toggle(types, value))}
            />
          ))}
        </View>
        {errorText('availabilityTypes')}
      </View>
      <View style={styles.group}>
        <Text variant="label" tone="muted">
          {t('provider:availability.dayParts')}
        </Text>
        <View style={styles.chips}>
          {DAY_PARTS.map((value) => (
            <Chip
              key={value}
              label={t(`provider:dayPart.${value}`)}
              isSelected={dayParts.includes(value)}
              onPress={() => isEditable && setDayParts(toggle(dayParts, value))}
            />
          ))}
        </View>
        {errorText('dayParts')}
      </View>
      <Stepper
        label={t('provider:availability.maxHours')}
        value={maxHours}
        onChange={(value) => isEditable && setMaxHours(value)}
        min={MAX_HOURS_RANGE.min}
        max={MAX_HOURS_RANGE.max}
      />
      {errorText('maxHoursPerDay')}
      <Text variant="heading">{t('provider:availability.weeklyTitle')}</Text>
      <Text variant="caption" tone="muted">
        {t('provider:availability.weeklyHint')}
      </Text>
      {errorText('rules')}
      <WeeklyRulesEditor rules={rules} onChange={(next) => isEditable && setRules(next)} errors={errors} />
    </WizardFrame>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
