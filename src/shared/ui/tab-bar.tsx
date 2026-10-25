import type { BottomTabHeaderProps, BottomTabNavigationOptions } from 'expo-router/js-tabs';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '../theme/theme';
import { AppHeader } from './app-header';
import { Icon, type IconName } from './icon';

const INACTIVE = '#94A3B8';

/** Tab icon renderer: filled when focused, outline otherwise. */
export function tabIcon(focused: IconName, idle: IconName) {
  return function TabIcon({ color, size, focused: isFocused }: { color: ColorValue; size: number; focused: boolean }): ReactNode {
    return <Icon name={isFocused ? focused : idle} size={size} color={typeof color === 'string' ? color : undefined} />;
  };
}

/** Bottom-tab options shared by the customer and provider areas (old Fix60 tab bar + blue tab headers). */
function renderTabHeader({ options }: BottomTabHeaderProps): ReactNode {
  const title = typeof options.title === 'string' ? options.title : '';
  const right = options.headerRight?.({ tintColor: '#FFFFFF', canGoBack: false });
  return <AppHeader title={title} canGoBack={false} isTabRoot right={right} />;
}

export function useTabScreenOptions(theme: Theme): BottomTabNavigationOptions {
  const { bottom } = useSafeAreaInsets();
  return {
    header: renderTabHeader,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: INACTIVE,
    tabBarStyle: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.border,
      height: 64 + bottom,
      paddingTop: 6,
    },
    tabBarLabelStyle: { fontSize: 11, fontFamily: theme.font.medium },
    sceneStyle: { backgroundColor: theme.colors.background },
  };
}

/** Raised round blue ⚡ button in the middle of the tab bar (old quick-booking FAB). */
export function FlashTabButton({ onPress, label }: { onPress: () => void; label: string }): ReactNode {
  return (
    <View style={styles.slot}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
        <Icon name="flash" size={34} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1, alignItems: 'center' },
  fab: {
    position: 'absolute',
    top: -24,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0000FF',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  pressed: { opacity: 0.85 },
});
