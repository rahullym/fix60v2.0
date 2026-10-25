import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/theme';
import { Text } from './text';

/**
 * Blue top tabs from the old Bookings/Schedule screens: white labels, 2px white underline on the active tab.
 * Place directly under an AppHeader so the blue runs together.
 */
export function TopTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}): ReactNode {
  const theme = useTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.bar, { backgroundColor: theme.colors.primary }]}>
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(tab.value)}
            style={[styles.tab, { borderBottomColor: isActive ? theme.colors.onPrimary : 'transparent' }]}>
            <Text tone="onPrimary" style={[styles.label, { fontWeight: isActive ? '600' : '400', opacity: isActive ? 1 : 0.8 }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row' },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2 },
  label: { fontSize: 15 },
});
