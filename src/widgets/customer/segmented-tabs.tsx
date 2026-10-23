import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/shared/theme/theme';
import { Text } from '@/shared/ui';

/** Segmented control (Upcoming / Active / Past). */
export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}): ReactNode {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md }]}>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              { borderRadius: theme.radius.sm, backgroundColor: isSelected ? theme.colors.surface : 'transparent' },
            ]}>
            <Text variant="label" tone={isSelected ? 'default' : 'muted'} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
});
