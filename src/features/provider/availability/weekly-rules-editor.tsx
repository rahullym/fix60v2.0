import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FieldErrors } from '@/entities/application/validate-step';
import type { AvailabilityRule } from '@/shared/api/types';
import { formatTime } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { DateTimeField, Text, ToggleRow } from '@/shared/ui';
import { clockToDate, dateToClock } from './clock';

/** Monday first, as Kerala calendars are read. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_START = '09:00';
const DEFAULT_END = '17:00';

/**
 * One time window per weekday: toggle a day on, then pick start and end.
 * Errors use the keys from `validateRules` (`rules.<weekday>`).
 */
export function WeeklyRulesEditor({
  rules,
  onChange,
  errors = {},
}: {
  rules: AvailabilityRule[];
  onChange: (rules: AvailabilityRule[]) => void;
  errors?: FieldErrors;
}): ReactNode {
  const { t } = useTranslation();
  const { locale } = useLocale();

  const ruleFor = (weekday: number): AvailabilityRule | undefined => rules.find((rule) => rule.weekday === weekday);

  const setRule = (weekday: number, next: AvailabilityRule | null): void => {
    const others = rules.filter((rule) => rule.weekday !== weekday);
    onChange(next ? [...others, next].sort((a, b) => a.weekday - b.weekday) : others);
  };

  return (
    <View style={styles.list}>
      {WEEK_ORDER.map((weekday) => {
        const rule = ruleFor(weekday);
        const dayName = t(`common:weekdays.${weekday}`);
        const error = errors[`rules.${weekday}`];
        return (
          <View key={weekday} style={styles.day}>
            <ToggleRow
              title={dayName}
              description={rule ? undefined : t('provider:availability.dayOff')}
              value={Boolean(rule)}
              onChange={(isOn) =>
                setRule(weekday, isOn ? { weekday, startTime: DEFAULT_START, endTime: DEFAULT_END } : null)
              }
            />
            {rule ? (
              <View style={styles.times}>
                <View style={styles.flex}>
                  <DateTimeField
                    label={t('provider:availability.start', { day: dayName })}
                    mode="time"
                    value={clockToDate(rule.startTime)}
                    displayValue={formatTime(clockToDate(rule.startTime), locale)}
                    onChange={(date) => setRule(weekday, { ...rule, startTime: dateToClock(date) })}
                    error={error ? ' ' : null}
                  />
                </View>
                <View style={styles.flex}>
                  <DateTimeField
                    label={t('provider:availability.end', { day: dayName })}
                    mode="time"
                    value={clockToDate(rule.endTime)}
                    displayValue={formatTime(clockToDate(rule.endTime), locale)}
                    onChange={(date) => setRule(weekday, { ...rule, endTime: dateToClock(date) })}
                    error={error ? ' ' : null}
                  />
                </View>
              </View>
            ) : null}
            {error ? (
              <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
                {t(error)}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  day: { gap: 8 },
  times: { flexDirection: 'row', gap: 12, paddingBottom: 8 },
  flex: { flex: 1 },
});
