import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { Me } from '@/shared/api/types';
import { maskPhone } from '@/shared/lib/format';
import { useTheme } from '@/shared/theme/theme';
import { Avatar, Card, Icon, Pill, Row, Text } from '@/shared/ui';

/** Name, masked phone and role; opens the profile editor. */
export function ProfileSummaryCard({ user, onPress }: { user: Me; onPress: () => void }): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const phone = user.phone ? maskPhone(user.phone) : null;
  const roleLabel = t(`common:settings.role.${user.role}`);
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={t('common:settings.editProfileA11y', { name: user.fullName, role: roleLabel })}>
      <Row gap={14}>
        <Avatar uri={null} name={user.fullName} size={56} />
        <View style={styles.flex}>
          <Text variant="heading" numberOfLines={1}>
            {user.fullName}
          </Text>
          {phone ? (
            <Text variant="caption" tone="muted">
              {phone}
            </Text>
          ) : null}
          <Pill label={roleLabel} tone={user.role === 'provider' ? 'accent' : 'info'} />
        </View>
        <Icon name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1, gap: 4 } });
