import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Category } from '@/shared/api/types';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { Icon, Text } from '@/shared/ui';
import { serviceIcon } from './service-icon';

/** Square-ish tile for the home category grid. */
export function CategoryTile({ category, onPress }: { category: Category; onPress: () => void }): ReactNode {
  const theme = useTheme();
  const { pick } = useLocale();
  const name = pick(category.name);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View style={[styles.bubble, { backgroundColor: theme.colors.primarySoft }]}>
        <Icon name={serviceIcon(category.slug)} size={24} color={theme.colors.primaryMid} />
      </View>
      <Text variant="label" align="center" numberOfLines={2}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minHeight: 112, borderWidth: 1, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  bubble: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
