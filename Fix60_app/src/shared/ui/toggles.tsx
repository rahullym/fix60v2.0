import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTheme } from '../theme/theme';
import { Icon } from './icon';
import { Text } from './text';

/** Checkbox with a label; `children` may hold inline links. */
export function Checkbox({
  isChecked,
  onChange,
  label,
  children,
  error,
}: {
  isChecked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  children?: ReactNode;
  error?: string | null;
}): ReactNode {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked }}
        accessibilityLabel={label}
        onPress={() => onChange(!isChecked)}
        style={styles.row}
        hitSlop={4}>
        <View
          style={[
            styles.box,
            {
              borderColor: error ? theme.colors.danger : isChecked ? theme.colors.primary : theme.colors.border,
              backgroundColor: isChecked ? theme.colors.primary : theme.colors.surface,
            },
          ]}>
          {isChecked ? <Icon name="checkmark" size={16} color={theme.colors.onPrimary} /> : null}
        </View>
        <View style={styles.flex}>{children ?? <Text>{label}</Text>}</View>
      </Pressable>
      {error ? (
        <Text variant="caption" tone="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Switch row for settings and consents. */
export function ToggleRow({
  title,
  description,
  value,
  onChange,
  isDisabled,
}: {
  title: string;
  description?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  isDisabled?: boolean;
}): ReactNode {
  const theme = useTheme();
  return (
    <View style={[styles.toggle, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        disabled={isDisabled}
        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { gap: 4 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 32 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  error: { marginLeft: 36 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 64 },
});
