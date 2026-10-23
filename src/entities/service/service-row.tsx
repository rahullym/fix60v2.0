import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ServiceSummary } from '@/shared/api/types';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { Card, Icon, Row, Text } from '@/shared/ui';
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
        <View style={[styles.bubble, { backgroundColor: theme.colors.primarySoft }]}>
          <Icon name={serviceIcon(service.slug)} size={22} color={theme.colors.primaryMid} />
        </View>
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
  bubble: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
