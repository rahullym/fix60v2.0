import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ServiceQuestion } from '@/shared/api/types';
import { formatDate, toIsoDate } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Chip, DateTimeField, Text, TextField } from '@/shared/ui';

export type AnswerValue = string | number | boolean | string[];

function GroupLabel({ label, help, error }: { label: string; help: string; error: string | null }): ReactNode {
  return (
    <>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      {help ? (
        <Text variant="caption" tone="muted">
          {help}
        </Text>
      ) : null}
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </>
  );
}

/** Numeric answer that keeps the typed text (so "2." can become "2.5"). */
function NumberQuestion({
  label,
  help,
  value,
  onChange,
  error,
  isEditable,
}: {
  label: string;
  help: string;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue | undefined) => void;
  error: string | null;
  isEditable: boolean;
}): ReactNode {
  const [text, setText] = useState(typeof value === 'number' ? String(value) : '');
  return (
    <TextField
      label={label}
      hint={help || undefined}
      value={text}
      onChangeText={(raw) => {
        const cleaned = raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
        setText(cleaned);
        const parsed = Number(cleaned);
        onChange(cleaned && cleaned !== '.' && Number.isFinite(parsed) ? parsed : undefined);
      }}
      keyboardType="decimal-pad"
      editable={isEditable}
      error={error}
    />
  );
}

/** Renders one catalog question by type. `undefined` clears the answer. */
export function QuestionField({
  question,
  value,
  onChange,
  error,
  isEditable,
}: {
  question: ServiceQuestion;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue | undefined) => void;
  error: string | null;
  isEditable: boolean;
}): ReactNode {
  const { t } = useTranslation();
  const { locale, pick } = useLocale();
  const label = `${pick(question.label)}${question.isRequired ? ' *' : ` (${t('provider:common.optional')})`}`;
  const help = pick(question.helpText);
  const options = question.options ?? [];

  switch (question.type) {
    case 'text':
    case 'textarea':
      return (
        <TextField
          label={label}
          hint={help || undefined}
          value={typeof value === 'string' ? value : ''}
          onChangeText={(text) => onChange(text.length > 0 ? text : undefined)}
          multiline={question.type === 'textarea'}
          maxLength={question.type === 'textarea' ? 1000 : 200}
          editable={isEditable}
          error={error}
        />
      );
    case 'number':
      return <NumberQuestion label={label} help={help} value={value} onChange={onChange} error={error} isEditable={isEditable} />;
    case 'date':
      return (
        <DateTimeField
          label={label}
          mode="date"
          value={typeof value === 'string' && value ? new Date(`${value}T00:00:00+05:30`) : null}
          displayValue={typeof value === 'string' && value ? formatDate(value, locale) : null}
          onChange={(date) => (isEditable ? onChange(toIsoDate(date)) : undefined)}
          error={error}
        />
      );
    case 'boolean':
      return (
        <View style={styles.group}>
          <GroupLabel label={label} help={help} error={error} />
          <View style={styles.chips} accessibilityRole="radiogroup">
            <Chip label={t('common:actions.yes')} isSelected={value === true} onPress={() => isEditable && onChange(true)} />
            <Chip label={t('common:actions.no')} isSelected={value === false} onPress={() => isEditable && onChange(false)} />
          </View>
        </View>
      );
    case 'single_select':
      return (
        <View style={styles.group}>
          <GroupLabel label={label} help={help} error={error} />
          <View style={styles.chips} accessibilityRole="radiogroup">
            {options.map((option) => (
              <Chip
                key={option.value}
                label={pick(option.label)}
                isSelected={value === option.value}
                onPress={() => isEditable && onChange(value === option.value ? undefined : option.value)}
              />
            ))}
          </View>
        </View>
      );
    case 'multi_select': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <View style={styles.group}>
          <GroupLabel label={label} help={help} error={error} />
          <View style={styles.chips}>
            {options.map((option) => (
              <Chip
                key={option.value}
                label={pick(option.label)}
                isSelected={selected.includes(option.value)}
                onPress={() => {
                  if (!isEditable) return;
                  const next = selected.includes(option.value)
                    ? selected.filter((item) => item !== option.value)
                    : [...selected, option.value];
                  onChange(next.length > 0 ? next : undefined);
                }}
              />
            ))}
          </View>
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
