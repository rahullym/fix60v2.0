import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { type ReactNode, useMemo, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/theme';
import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';

function FieldShell({
  label,
  value,
  placeholder,
  error,
  onPress,
  icon,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  error?: string | null;
  onPress: () => void;
  icon: 'chevron-down' | 'calendar-outline' | 'time-outline';
}): ReactNode {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        onPress={onPress}
        style={[
          styles.shell,
          {
            borderColor: error ? theme.colors.danger : theme.colors.border,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
          },
        ]}>
        <Text tone={value ? 'default' : 'muted'} style={styles.flex} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <Icon name={icon} size={18} color={theme.colors.textMuted} />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

/** Single-select from a searchable full-screen list. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder,
  error,
  isSearchable = false,
}: {
  label: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string | null;
  isSearchable?: boolean;
}): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  }, [options, query]);

  return (
    <>
      <FieldShell
        label={label}
        value={selected?.label ?? null}
        placeholder={placeholder ?? t('common:actions.select')}
        error={error}
        onPress={() => setIsOpen(true)}
        icon="chevron-down"
      />
      <Modal visible={isOpen} animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <Text variant="heading" style={styles.flex}>
              {label}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common:actions.close')} onPress={() => setIsOpen(false)} hitSlop={12}>
              <Icon name="close" />
            </Pressable>
          </View>
          {isSearchable ? (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('common:actions.search')}
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.search, { borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radius.md }]}
            />
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: item.value === value }}
                onPress={() => {
                  onChange(item.value);
                  setIsOpen(false);
                  setQuery('');
                }}
                style={[styles.option, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{item.label}</Text>
                  {item.description ? (
                    <Text variant="caption" tone="muted">
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                {item.value === value ? <Icon name="checkmark" color={theme.colors.primary} /> : null}
              </Pressable>
            )}
            ListEmptyComponent={
              <Text tone="muted" align="center" style={styles.empty}>
                {t('common:empty.noMatches')}
              </Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

/** Date or time picker. Value is a Date; formatting is the caller's job. */
export function DateTimeField({
  label,
  mode,
  value,
  displayValue,
  onChange,
  minimumDate,
  maximumDate,
  initialDate,
  error,
}: {
  label: string;
  mode: 'date' | 'time';
  /** Where the picker opens when no value is set (e.g. 25 years ago for a birth date). */
  initialDate?: Date;
  value: Date | null;
  displayValue: string | null;
  onChange: (value: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string | null;
}): ReactNode {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? initialDate ?? new Date());

  const handleChange = (event: DateTimePickerEvent, next?: Date): void => {
    if (Platform.OS === 'android') {
      setIsOpen(false);
      if (event.type === 'set' && next) {
        onChange(next);
      }
      return;
    }
    if (next) {
      setDraft(next);
    }
  };

  return (
    <>
      <FieldShell
        label={label}
        value={displayValue}
        placeholder={mode === 'date' ? t('common:actions.pickDate') : t('common:actions.pickTime')}
        error={error}
        onPress={() => {
          setDraft(value ?? initialDate ?? new Date());
          setIsOpen(true);
        }}
        icon={mode === 'date' ? 'calendar-outline' : 'time-outline'}
      />
      {isOpen && Platform.OS === 'android' ? (
        <DateTimePicker
          value={draft}
          mode={mode}
          is24Hour={false}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      ) : null}
      {Platform.OS !== 'android' ? (
        <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
          <View style={styles.backdrop}>
            <IosPickerSheet
              draft={draft}
              mode={mode}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={handleChange}
              onCancel={() => setIsOpen(false)}
              onDone={() => {
                onChange(draft);
                setIsOpen(false);
              }}
            />
          </View>
        </Modal>
      ) : null}
    </>
  );
}

function IosPickerSheet({
  draft,
  mode,
  minimumDate,
  maximumDate,
  onChange,
  onCancel,
  onDone,
}: {
  draft: Date;
  mode: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
  onChange: (event: DateTimePickerEvent, next?: Date) => void;
  onCancel: () => void;
  onDone: () => void;
}): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
      <DateTimePicker
        value={draft}
        mode={mode}
        display="spinner"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={onChange}
      />
      <View style={styles.sheetActions}>
        <Button label={t('common:actions.cancel')} variant="secondary" onPress={onCancel} style={styles.flex} />
        <Button label={t('common:actions.done')} onPress={onDone} style={styles.flex} />
      </View>
    </View>
  );
}

/** Integer stepper (hours, years). */
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}): ReactNode {
  const theme = useTheme();
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next * 10) / 10));
  const buttonStyle = [styles.stepButton, { borderColor: theme.colors.border, borderRadius: theme.radius.md }];
  return (
    <View style={styles.wrapper}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <View style={styles.stepRow} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value }}>
        <Pressable accessibilityRole="button" accessibilityLabel="−" style={buttonStyle} onPress={() => onChange(clamp(value - step))} disabled={value <= min}>
          <Icon name="remove" />
        </Pressable>
        <Text variant="title" style={styles.stepValue}>
          {value}
          {suffix ? ` ${suffix}` : ''}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="+" style={buttonStyle} onPress={() => onChange(clamp(value + step))} disabled={value >= max}>
          <Icon name="add" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { gap: 6 },
  shell: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14, borderWidth: 1, gap: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  search: { margin: 16, borderWidth: 1, paddingHorizontal: 14, minHeight: 48, fontSize: 16 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 56 },
  empty: { padding: 24 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { padding: 16, paddingBottom: 32, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetActions: { flexDirection: 'row', gap: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  stepValue: { minWidth: 72, textAlign: 'center' },
});
