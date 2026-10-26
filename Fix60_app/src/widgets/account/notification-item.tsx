import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { InAppNotification } from '@/shared/api/types';
import { formatRelative } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { Card, Row, Text } from '@/shared/ui';

/** Inbox row; unread items get a tinted surface and a dot. */
export function NotificationItem({ item, onPress }: { item: InAppNotification; onPress: () => void }): ReactNode {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const theme = useTheme();
  const when = formatRelative(item.createdAt, locale);
  const label = [item.isRead ? null : t('common:notifications.unread'), item.title, item.body, when]
    .filter(Boolean)
    .join('. ');
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={label}
      style={item.isRead ? undefined : { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.accent }}>
      <Row gap={10} style={styles.top}>
        {item.isRead ? null : <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />}
        <Text variant={item.isRead ? 'body' : 'bodyStrong'} style={styles.flex}>
          {item.title}
        </Text>
        <Text variant="caption" tone="muted">
          {when}
        </Text>
      </Row>
      <Text variant="caption" tone="muted">
        {item.body}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
});
