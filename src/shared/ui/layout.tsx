import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from 'react';
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
  /** Page colour (defaults to the theme background). */
  backgroundColor?: string;
}

/**
 * Screen Y where the on-screen keyboard starts, or null while it is hidden. Used instead of
 * KeyboardAvoidingView, which does not lift content under Android edge-to-edge (always on in SDK 58).
 */
function useKeyboardTop(): number | null {
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) =>
      setTop(Math.min(event.endCoordinates.screenY, Dimensions.get('screen').height - event.endCoordinates.height)),
    );
    const hide = Keyboard.addListener(hideEvent, () => setTop(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return top;
}

/** Height the on-screen keyboard currently covers, measured from the bottom of the screen. */
export function useKeyboardInset(): number {
  const top = useKeyboardTop();
  return top === null ? 0 : Math.max(0, Dimensions.get('screen').height - top);
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
  backgroundColor,
}: ScreenProps): ReactNode {
  const theme = useTheme();
  const padding = { padding: theme.spacing(4), gap: theme.spacing(4) };
  const keyboardTop = useKeyboardTop();
  const insets = useSafeAreaInsets();
  const bodyRef = useRef<ComponentRef<typeof View>>(null);
  const [bodyBottom, setBodyBottom] = useState<number | null>(null);
  const measureBody = (): void => {
    bodyRef.current?.measureInWindow((_x: number, y: number, _width: number, height: number) => setBodyBottom(y + height));
  };
  useEffect(() => {
    if (keyboardTop !== null) {
      bodyRef.current?.measureInWindow((_x: number, y: number, _width: number, height: number) => setBodyBottom(y + height));
    }
  }, [keyboardTop]);
  // Lift only by the part of this screen the keyboard actually covers (the body already sits above
  // the bottom safe-area inset and any tab bar), so nothing is counted twice.
  const fallbackBottom = Dimensions.get('screen').height - (edges.includes('bottom') ? insets.bottom : 0);
  const keyboardOverlap = keyboardTop === null ? 0 : Math.max(0, (bodyBottom ?? fallbackBottom) - keyboardTop);
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: backgroundColor ?? theme.colors.background }]}>
      <View ref={bodyRef} onLayout={measureBody} style={[styles.flex, { paddingBottom: keyboardOverlap }]}>
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
              { borderTopColor: theme.colors.border, backgroundColor: backgroundColor ?? theme.colors.background, padding: theme.spacing(4) },
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
  accentColor,
  accessible,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
  /** Left border colour (old BookingCard: 3px status stripe). */
  accentColor?: string;
  /**
   * Pass false on a tappable card that contains its own buttons, so screen readers can reach them.
   * Then give the card an explicit accessible Pressable (e.g. its header) for the main action.
   */
  accessible?: boolean;
}): ReactNode {
  const theme = useTheme();
  const cardStyle: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius.md,
    padding: theme.spacing(4),
    boxShadow: '0px 0px 10px -8px rgba(15, 23, 42, 0.35)',
    gap: theme.spacing(2),
    ...(accentColor ? { borderLeftWidth: 3, borderLeftColor: accentColor } : null),
  };
  if (!onPress) {
    return <View style={[cardStyle, style]}>{children}</View>;
  }
  const isAccessible = accessible ?? true;
  return (
    <Pressable
      accessible={isAccessible}
      accessibilityRole={isAccessible ? 'button' : undefined}
      accessibilityLabel={isAccessible ? accessibilityLabel : undefined}
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
      <Text variant="title" style={{ fontSize: 20, lineHeight: 26, fontWeight: '800' }}>
        {title}
      </Text>
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
