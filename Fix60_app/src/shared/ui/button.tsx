import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/theme';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  isLoading?: boolean;
  isDisabled?: boolean;
  isCompact?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

/** Primary action control; min 48dp touch target. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  isLoading = false,
  isDisabled = false,
  isCompact = false,
  style,
  accessibilityHint,
}: ButtonProps): ReactNode {
  const theme = useTheme();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.colors.primary, fg: theme.colors.onPrimary, border: theme.colors.primary },
    accent: { bg: theme.colors.accent, fg: theme.colors.onPrimary, border: theme.colors.accent },
    secondary: { bg: theme.colors.surface, fg: theme.colors.primary, border: theme.colors.primary },
    ghost: { bg: 'transparent', fg: theme.colors.primary, border: 'transparent' },
    danger: { bg: theme.colors.danger, fg: theme.colors.onPrimary, border: theme.colors.danger },
  };
  const colors = palette[variant];
  const isInactive = isDisabled || isLoading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: isLoading }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: isCompact ? 48 : 56,
          paddingHorizontal: isCompact ? 18 : 24,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderRadius: theme.radius.pill,
          opacity: isInactive ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {isLoading ? (
        <ActivityIndicator color={colors.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={18} color={colors.fg} /> : null}
          <Text variant="bodyStrong" style={{ color: colors.fg, fontSize: 16 }} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
