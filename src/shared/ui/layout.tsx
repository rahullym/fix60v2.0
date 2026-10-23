import { type ReactNode, useEffect, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). */
  isScrollable?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** Pinned bottom area, e.g. a primary button. */
  footer?: ReactNode;
  edges?: Edge[];
  contentStyle?: ViewStyle;
}

/**
 * Height the on-screen keyboard currently covers. Used instead of KeyboardAvoidingView,
 * which does not lift content under Android edge-to-edge (always on in SDK 58).
 */
export function useKeyboardInset(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) =>
      setHeight(Math.max(event.endCoordinates.height, Dimensions.get('screen').height - event.endCoordinates.screenY)),
    );
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/** Page container: safe area, padding, optional scroll + pull-to-refresh + sticky footer. */
export function Screen({
  children,
  isScrollable = true,
  onRefresh,
  isRefreshing = false,
  footer,
  edges = ['bottom'],
  contentStyle,
}: ScreenProps): ReactNode {
  const theme = useTheme();
  const padding = { padding: theme.spacing(4), gap: theme.spacing(4) };
  const keyboardInset = useKeyboardInset();
  const insets = useSafeAreaInsets();
  // SafeAreaView already pads the bottom inset; the keyboard covers it too, so don't count it twice.
  const bottomInset = edges.includes('bottom') ? insets.bottom : 0;
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.flex, { paddingBottom: Math.max(0, keyboardInset - bottomInset) }]}>
        {isScrollable ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[padding, contentStyle]}
            refreshControl={
              onRefresh ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} /> : undefined
            }>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, padding, contentStyle]}>{children}</View>
        )}
        {footer ? (
          <View
            style={[
              styles.footer,
              { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background, padding: theme.spacing(4) },
            ]}>
            {footer}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

/** Rounded surface. Pass onPress to make it a tappable card. */
export function Card({
  children,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}): ReactNode {
  const theme = useTheme();
  const cardStyle: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
    gap: theme.spacing(2),
  };
  if (!onPress) {
    return <View style={[cardStyle, style]}>{children}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.85 : 1 }, style]}>
      {children}
    </Pressable>
  );
}

export function Row({ children, gap = 8, style }: { children: ReactNode; gap?: number; style?: ViewStyle }): ReactNode {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}): ReactNode {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text variant="heading">{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={12}>
          <Text variant="label" tone="primary">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </Row>
  );
}

/** Settings-style row with icon, title, subtitle and chevron. */
export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
  tone = 'default',
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  tone?: 'default' | 'danger';
}): ReactNode {
  const theme = useTheme();
  const color = tone === 'danger' ? theme.colors.danger : theme.colors.text;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, { opacity: pressed ? 0.7 : 1, borderBottomColor: theme.colors.border }]}>
      {icon ? <Icon name={icon} color={color} /> : null}
      <View style={styles.flex}>
        <Text variant="bodyStrong" style={{ color }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? (onPress ? <Icon name="chevron-forward" size={18} color={theme.colors.textMuted} /> : null)}
    </Pressable>
  );
}

export function Divider(): ReactNode {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border }} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
