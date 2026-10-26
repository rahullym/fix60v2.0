import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ServiceSummary } from '@/shared/api/types';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { gradientFor } from '@/shared/theme/palette';
import { Card, GradientIcon, Icon, Row, Text } from '@/shared/ui';
import { serviceIcon } from './service-icon';

/** Tappable service with icon, name and short description. */
export function ServiceRow({ service, onPress }: { service: ServiceSummary; onPress: () => void }): ReactNode {
  const theme = useTheme();
  const { pick } = useLocale();
  const name = pick(service.name);
  const description = pick(service.description);
  return (
    <Card onPress={onPress} accessibilityLabel={name}>
      <Row gap={12}>
        <GradientIcon icon={serviceIcon(service.slug)} colors={gradientFor(service.categoryId)} size={46} />
        <View style={styles.flex}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {name}
          </Text>
          {description ? (
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
