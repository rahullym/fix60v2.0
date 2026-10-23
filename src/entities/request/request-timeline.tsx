import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { RequestStatus } from '@/shared/api/types';
import { formatDateTime } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { Text } from '@/shared/ui';

/** Vertical list of status changes, newest last. */
export function RequestTimeline({ entries }: { entries: { status: RequestStatus; at: string }[] }): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const { locale } = useLocale();
  return (
    <View accessibilityRole="list">
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;
        return (
          <View key={`${entry.status}-${entry.at}`} style={styles.item} accessible>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: isLast ? theme.colors.primary : theme.colors.border }]} />
              {!isLast ? <View style={[styles.line, { backgroundColor: theme.colors.border }]} /> : null}
            </View>
            <View style={styles.body}>
              <Text variant={isLast ? 'bodyStrong' : 'body'}>{t(`common:requestStatus.${entry.status}`)}</Text>
              <Text variant="caption" tone="muted">
                {formatDateTime(entry.at, locale)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center', width: 14 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 5 },
  line: { width: 2, flex: 1, marginVertical: 2 },
  body: { flex: 1, paddingBottom: 14 },
});
