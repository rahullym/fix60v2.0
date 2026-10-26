import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { type ReactNode, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '../theme/palette';
import { useTheme } from '../theme/theme';
import { Icon } from './icon';
import { Text } from './text';

/**
 * Blue screen header from the original Fix60 apps: round translucent back button + bold white title.
 * `isTabRoot` renders the larger tab-title style (no back button).
 */
export function AppHeader({
  title,
  canGoBack,
  isTabRoot = false,
  right,
}: {
  title: string;
  canGoBack: boolean;
  isTabRoot?: boolean;
  right?: ReactNode;
}): ReactNode {
  const theme = useTheme();
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  useLightStatusBar();
  return (
    <View style={[styles.bar, { backgroundColor: theme.colors.primary, paddingTop: top + 8 }]}>
      <View style={[styles.row, isTabRoot && styles.tabRow]}>
        {canGoBack && !isTabRoot ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common:actions.back')}
            hitSlop={10}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.back}>
            <Icon name="arrow-back" size={18} color={theme.colors.onPrimary} />
          </Pressable>
        ) : null}
        <Text
          accessibilityRole="header"
          tone="onPrimary"
          numberOfLines={1}
          style={[styles.flex, isTabRoot ? styles.tabTitle : styles.title]}>
          {title}
        </Text>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

/**
 * Keeps light status-bar icons on blue headers. Re-applied on focus and when the app returns to the
 * foreground, because system UIs (photo picker, camera) reset the style.
 */
export function useLightStatusBar(): void {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light', false);
    }, []),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setStatusBarStyle('light', false);
      }
    });
    return () => subscription.remove();
  }, []);
}

/** Round translucent icon button for blue headers (e.g. notifications bell). */
export function HeaderIconButton({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: 'notifications' | 'flag-outline' | 'call-outline';
  label: string;
  onPress: () => void;
  badge?: number;
}): ReactNode {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconButton} hitSlop={6}>
      <Icon name={icon} size={21} color={theme.colors.onPrimary} />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
          <Text variant="caption" tone="onPrimary" style={styles.badgeText}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 16, paddingBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46 },
  tabRow: { minHeight: 52 },
  flex: { flex: 1 },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.onBlueSoft,
  },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  tabTitle: { fontSize: 22, lineHeight: 30, fontWeight: '800' },
  right: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.onBlueSoft,
  },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 10, lineHeight: 14, fontWeight: '700' },
});
