import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/shared/theme/theme';
import { Button, Card, Icon, Row, Text, type IconName } from '@/shared/ui';

const points: { icon: IconName; key: string }[] = [
  { icon: 'shield-checkmark-outline', key: 'verified' },
  { icon: 'lock-closed-outline', key: 'privacy' },
  { icon: 'flag-outline', key: 'report' },
];

/** Short trust & safety explainer with a link to the safety policy. */
export function SafetySection(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Card style={{ backgroundColor: theme.colors.surfaceAlt }}>
      <Text variant="heading">{t('customer:safety.title')}</Text>
      {points.map((point) => (
        <Row key={point.key} gap={12} style={styles.point}>
          <Icon name={point.icon} size={22} color={theme.colors.success} />
          <View style={styles.flex}>
            <Text variant="bodyStrong">{t(`customer:safety.${point.key}Title`)}</Text>
            <Text variant="caption" tone="muted">
              {t(`customer:safety.${point.key}Body`)}
            </Text>
          </View>
        </Row>
      ))}
      <Button
        label={t('common:settings.safetyPolicy')}
        variant="ghost"
        icon="document-text-outline"
        onPress={() => router.push({ pathname: '/policy/[slug]', params: { slug: 'safety-policy' } })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  point: { alignItems: 'flex-start' },
});
