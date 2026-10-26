import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, type IconName } from '@/shared/ui';

/** Icon + label + value line used in request and booking details. */
export function DetailRow({ icon, label, value }: { icon: IconName; label: string; value: string | null | undefined }): ReactNode {
  if (!value) return null;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Icon name={icon} size={20} />
      <View style={styles.flex}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 4 },
  flex: { flex: 1 },
});
