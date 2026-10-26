import { type ComponentRef, type ReactNode, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../theme/theme';
import { Text } from './text';

const LENGTH = 6;

/** Six underlined digit boxes (old OtpInput), backed by one hidden input for SMS autofill. */
export function OtpInput({
  value,
  onChange,
  label,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  error?: string | null;
}): ReactNode {
  const theme = useTheme();
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const digits = value.split('');
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {Array.from({ length: LENGTH }, (_, index) => {
          const isActive = index === Math.min(digits.length, LENGTH - 1);
          return (
            <View
              key={index}
              style={[
                styles.box,
                {
                  borderBottomColor: error ? theme.colors.danger : isActive ? theme.colors.primary : theme.colors.border,
                  borderBottomWidth: isActive ? 2 : 1,
                },
              ]}>
              <Text variant="title" style={styles.digit}>
                {digits[index] ?? ''}
              </Text>
            </View>
          );
        })}
        <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, LENGTH))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={LENGTH}
        autoFocus
        accessibilityLabel={label}
        style={styles.overlay}
        caretHidden
        contextMenuHidden
      />
      </View>
      {error ? (
        <Text variant="caption" tone="danger" align="center" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 },
  box: { width: 44, height: 56, alignItems: 'center', justifyContent: 'center' },
  digit: { fontSize: 26, lineHeight: 34 },
  // Invisible input stretched over the boxes so taps focus it and Android keeps every keystroke.
  overlay: { ...StyleSheet.absoluteFill, opacity: 0, color: 'transparent' },
});
