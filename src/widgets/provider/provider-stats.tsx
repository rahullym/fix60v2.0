import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ProviderSelf } from '@/shared/api/types';
import { useTheme } from '@/shared/theme/theme';
import { Text } from '@/shared/ui';

/** Three counters from ProviderSelf.stats. */
export function ProviderStats({ stats }: { stats: ProviderSelf['stats'] }): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const items = [
    { key: 'pendingInvitations', value: stats.pendingInvitations },
    { key: 'upcomingBookings', value: stats.upcomingBookings },
    { key: 'completedBookings', value: stats.completedBookings },
  ] as const;
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View
          key={item.key}
          accessible
          accessibilityLabel={`${t(`provider:stats.${item.key}`)}: ${item.value}`}
          style={[styles.tile, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md }]}>
          <Text variant="title">{item.value}</Text>
          <Text variant="caption" tone="muted">
            {t(`provider:stats.${item.key}`)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, padding: 12, gap: 2 },
});
