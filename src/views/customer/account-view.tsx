import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { signOut } from '@/features/auth/model/auth-flow';
import { customerKeys } from '@/features/customer/model/query-keys';
import { useLocality } from '@/features/customer/model/use-locality';
import { useMe } from '@/features/customer/model/use-me';
import { LanguageSwitch } from '@/features/language/language-switch';
import { api } from '@/shared/api/endpoints';
import { maskPhone } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { Avatar, Card, Icon, ListRow, Pill, Row, Screen, SectionHeader, Text } from '@/shared/ui';

/** Profile summary, settings links, language and sign out. */
export function AccountView(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const { pick } = useLocale();
  const me = useMe();
  const locality = useLocality(me?.districtId, me?.localityId);
  const notifications = useQuery({
    queryKey: customerKeys.unreadNotifications,
    queryFn: () => api.notifications.list(1),
    select: (data) => data.unreadCount,
  });
  const unread = notifications.data ?? 0;

  const confirmSignOut = (): void => {
    Alert.alert(t('customer:account.signOutTitle'), t('customer:account.signOutBody'), [
      { text: t('common:actions.cancel'), style: 'cancel' },
      { text: t('common:actions.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const chevron = <Icon name="chevron-forward" size={18} color={theme.colors.textMuted} />;

  return (
    <Screen onRefresh={notifications.refetch} isRefreshing={notifications.isRefetching}>
      <Card onPress={() => router.push('/settings/profile')} accessibilityLabel={t('customer:account.editProfile')}>
        <Row gap={14}>
          <Avatar uri={null} name={me?.fullName ?? ''} size={56} />
          <View style={styles.flex}>
            <Text variant="heading" numberOfLines={2}>
              {me?.fullName}
            </Text>
            {me?.phone ? (
              <Text variant="caption" tone="muted">
                {maskPhone(me.phone)}
              </Text>
            ) : null}
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {locality ? pick(locality.name) : t('customer:home.setArea')}
            </Text>
          </View>
          {chevron}
        </Row>
      </Card>

      <View>
        <ListRow icon="settings-outline" title={t('common:settings.title')} onPress={() => router.push('/settings')} />
        <ListRow
          icon="notifications-outline"
          title={t('common:notifications.title')}
          onPress={() => router.push('/notifications')}
          trailing={
            unread > 0 ? (
              <Row gap={6}>
                <Pill label={unread > 99 ? '99+' : String(unread)} tone="accent" />
                {chevron}
              </Row>
            ) : undefined
          }
        />
        <ListRow icon="help-buoy-outline" title={t('common:settings.support')} onPress={() => router.push('/support')} />
        <ListRow icon="ban-outline" title={t('common:settings.blocked')} onPress={() => router.push('/settings/blocked')} />
      </View>

      <Row style={styles.between}>
        <Text variant="bodyStrong">{t('common:language.title')}</Text>
        <LanguageSwitch />
      </Row>

      <SectionHeader title={t('common:settings.policies')} />
      <View>
        <ListRow
          icon="document-text-outline"
          title={t('common:settings.terms')}
          onPress={() => router.push({ pathname: '/policy/[slug]', params: { slug: 'terms' } })}
        />
        <ListRow
          icon="lock-closed-outline"
          title={t('common:settings.privacyPolicy')}
          onPress={() => router.push({ pathname: '/policy/[slug]', params: { slug: 'privacy' } })}
        />
        <ListRow
          icon="shield-checkmark-outline"
          title={t('common:settings.safetyPolicy')}
          onPress={() => router.push({ pathname: '/policy/[slug]', params: { slug: 'safety-policy' } })}
        />
        <ListRow
          icon="information-circle-outline"
          title={t('customer:account.about')}
          onPress={() => router.push({ pathname: '/policy/[slug]', params: { slug: 'about' } })}
        />
      </View>

      <ListRow icon="log-out-outline" title={t('common:actions.signOut')} tone="danger" onPress={confirmSignOut} trailing={null} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { justifyContent: 'space-between', minHeight: 56 },
});
