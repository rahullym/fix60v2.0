import type { ComponentRef, ReactNode, Ref } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/theme';
import { Text } from './text';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'ref'> {
  ref?: Ref<ComponentRef<typeof TextInput>>;
  label: string;
  error?: string | null;
  hint?: string;
  prefix?: string;
}

/** Labelled input with inline error. */
export function TextField({ ref, label, error, hint, prefix, multiline, ...rest }: TextFieldProps): ReactNode {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <View
        style={[
          styles.inputRow,
          {
            borderColor: error ? theme.colors.danger : theme.colors.border,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
            minHeight: multiline ? 104 : 48,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}>
        {prefix ? (
          <Text variant="body" tone="muted" style={styles.prefix}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={theme.colors.textMuted}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, { color: theme.colors.text, fontFamily: theme.font.medium }]}
          {...rest}
        />
      </View>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  inputRow: { flexDirection: 'row', borderWidth: 1, paddingHorizontal: 14 },
  prefix: { marginRight: 8, paddingVertical: 14 },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
});
