import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Category } from '@/shared/api/types';
import { useLocale } from '@/shared/lib/use-locale';
import { gradientFor, palette } from '@/shared/theme/palette';
import { useTheme } from '@/shared/theme/theme';
import { GradientIcon, Text, type IconName } from '@/shared/ui';
import { serviceIcon } from './service-icon';

/** Service picker card from the original Fix60 home: gradient icon square, name, sub-services line. */
export function CategoryTile({ category, onPress }: { category: Category; onPress: () => void }): ReactNode {
  const { pick } = useLocale();
  const name = pick(category.name);
  const subServices = category.services.map((service) => pick(service.name)).join(', ');
  return (
    <ServiceTileFrame
      label={name}
      onPress={onPress}
      icon={serviceIcon(category.slug)}
      colors={gradientFor(category.id)}
      title={name}
      subtitle={subServices}
    />
  );
}

/** Teal "View more" tile that closes the grid. */
export function ViewMoreTile({ label, onPress }: { label: string; onPress: () => void }): ReactNode {
  return <ServiceTileFrame label={label} onPress={onPress} icon="grid" colors={palette.viewMore} title={label} />;
}

function ServiceTileFrame({
  label,
  onPress,
  icon,
  colors,
  title,
  subtitle,
}: {
  label: string;
  onPress: () => void;
  icon: IconName;
  colors: readonly [string, string];
  title: string;
  subtitle?: string;
}): ReactNode {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, opacity: pressed ? 0.85 : 1 },
      ]}>
      <GradientIcon icon={icon} colors={colors} size={60} />
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 14,
    gap: 12,
    boxShadow: '0px 0px 10px -8px rgba(15, 23, 42, 0.35)',
  },
  text: { gap: 2 },
  title: { fontSize: 16, fontWeight: '600' },
});
