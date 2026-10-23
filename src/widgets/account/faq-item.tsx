import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Faq } from '@/shared/api/types';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { Icon, Text } from '@/shared/ui';

/** Expandable question and answer. */
export function FaqItem({ faq }: { faq: Faq }): ReactNode {
  const { pick } = useLocale();
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const question = pick(faq.question);
  return (
    <View style={[styles.item, { borderBottomColor: theme.colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={question}
        accessibilityState={{ expanded: isExpanded }}
        onPress={() => setIsExpanded((value) => !value)}
        style={styles.header}>
        <Text variant="bodyStrong" style={styles.flex}>
          {question}
        </Text>
        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
      </Pressable>
      {isExpanded ? <Text tone="muted">{pick(faq.answer)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  item: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 12, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
});
