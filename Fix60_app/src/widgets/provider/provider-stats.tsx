import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ProviderSelf } from '@/shared/api/types';
import { palette } from '@/shared/theme/palette';
import { useTheme } from '@/shared/theme/theme';
import { Icon, Text, type IconName } from '@/shared/ui';

/** Dashboard tiles from the original provider app: coloured top border + tinted icon box. */
export function ProviderStats({ stats }: { stats: ProviderSelf['stats'] }): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const items: { key: keyof ProviderSelf['stats']; value: number; icon: IconName; tone: (typeof palette.stats)[keyof typeof palette.stats] }[] = [
    { key: 'pendingInvitations', value: stats.pendingInvitations, icon: 'flash', tone: palette.stats.earnings },
    { key: 'upcomingBookings', value: stats.upcomingBookings, icon: 'calendar', tone: palette.stats.jobs },
    { key: 'completedBookings', value: stats.completedBookings, icon: 'checkmark-done', tone: palette.stats.rating },
  ];
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View
          key={item.key}
          accessible
          accessibilityLabel={`${t(`provider:stats.${item.key}`)}: ${item.value}`}
          style={[styles.tile, { backgroundColor: theme.colors.surface, borderTopColor: item.tone.border }]}>
          <View style={[styles.iconBox, { backgroundColor: item.tone.bg }]}>
            <Icon name={item.icon} size={18} color={item.tone.fg} />
          </View>
          <Text variant="caption" tone="muted" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.label}>
            {t(`provider:stats.${item.key}`).toUpperCase()}
          </Text>
          <Text variant="title" style={styles.value}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
    borderTopWidth: 3,
    borderRadius: 10,
    boxShadow: '0px 0px 10px -8px rgba(15, 23, 42, 0.35)',
  },
  iconBox: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, lineHeight: 14, fontWeight: '600' },
  value: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
});
