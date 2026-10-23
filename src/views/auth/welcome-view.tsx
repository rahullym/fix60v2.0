import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { authFlow } from '@/features/auth/model/auth-flow';
import { LanguageSwitch } from '@/features/language/language-switch';
import type { UserRole } from '@/shared/api/types';
import { useTheme } from '@/shared/theme/theme';
import { Card, Icon, Row, Screen, Text, type IconName } from '@/shared/ui';

function RoleCard({ role, icon, title, body }: { role: UserRole; icon: IconName; title: string; body: string }): ReactNode {
  const theme = useTheme();
  return (
    <Card
      accessibilityLabel={title}
      onPress={() => {
        authFlow.chooseRole(role);
        router.push('/phone');
      }}>
      <Row gap={14}>
        <View style={[styles.iconBubble, { backgroundColor: role === 'customer' ? theme.colors.primarySoft : theme.colors.accentLight }]}>
          <Icon name={icon} size={26} color={role === 'customer' ? theme.colors.primaryMid : theme.colors.accent} />
        </View>
        <View style={styles.flex}>
          <Text variant="heading">{title}</Text>
          <Text tone="muted" variant="caption">
            {body}
          </Text>
        </View>
        <Icon name="chevron-forward" color={theme.colors.textMuted} />
      </Row>
    </Card>
  );
}

/** First screen: brand, language, and the customer / provider choice. */
export function WelcomeView(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'flex-end' }}>
        <LanguageSwitch />
      </Row>
      <View style={styles.hero}>
        <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
          <Text variant="display" tone="onPrimary">
            60
          </Text>
        </View>
        <Text variant="display" align="center">
          {theme.brandName}
        </Text>
        <Text tone="muted" align="center">
          {t('common:tagline')}
        </Text>
      </View>
      <Text variant="heading">{t('auth:welcome.question')}</Text>
      <RoleCard role="customer" icon="home-outline" title={t('auth:welcome.customerTitle')} body={t('auth:welcome.customerBody')} />
      <RoleCard role="provider" icon="briefcase-outline" title={t('auth:welcome.providerTitle')} body={t('auth:welcome.providerBody')} />
      <Text variant="caption" tone="muted" align="center">
        {t('auth:welcome.safetyNote')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  logo: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconBubble: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
