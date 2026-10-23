import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { SupportMessage } from '@/shared/api/types';
import { formatDateTime } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { Text } from '@/shared/ui';

/** Chat bubble: support on the left, the user on the right. */
export function MessageBubble({ message }: { message: SupportMessage }): ReactNode {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const theme = useTheme();
  const isMine = !message.isFromSupport;
  const sender = message.isFromSupport ? message.senderName || t('common:support.fromSupport') : t('common:support.you');
  const when = formatDateTime(message.createdAt, locale);
  return (
    <View
      accessible
      accessibilityLabel={`${sender}, ${when}: ${message.body}`}
      style={[
        styles.bubble,
        {
          alignSelf: isMine ? 'flex-end' : 'flex-start',
          backgroundColor: isMine ? theme.colors.primary : theme.colors.surfaceAlt,
          borderRadius: theme.radius.lg,
          borderBottomRightRadius: isMine ? theme.radius.sm / 2 : theme.radius.lg,
          borderBottomLeftRadius: isMine ? theme.radius.lg : theme.radius.sm / 2,
        },
      ]}>
      <Text variant="label" tone={isMine ? 'onPrimary' : 'muted'}>
        {sender}
      </Text>
      <Text tone={isMine ? 'onPrimary' : 'default'}>{message.body}</Text>
      <Text variant="caption" tone={isMine ? 'onPrimary' : 'muted'} align="right">
        {when}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
});
