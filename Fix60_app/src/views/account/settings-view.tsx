import Constants from 'expo-constants';
import { type Href, router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { signOut } from '@/features/auth/model/auth-flow';
import { useUnreadCount } from '@/features/notifications';
import { LanguageSetting } from '@/features/settings/language-setting';
import { useSession } from '@/shared/auth/session';
import type { IconName } from '@/shared/ui';
import { Icon, ListRow, Pill, Row, Screen, SectionHeader, Text } from '@/shared/ui';
import { useTheme } from '@/shared/theme/theme';
import { confirmAction } from '@/widgets/account/confirm-dialog';
import { ProfileSummaryCard } from '@/widgets/account/profile-summary-card';

interface LinkRow {
  icon: IconName;
  title: string;
  href: Href;
}

/** Account hub shared by customers and providers. */
export function SettingsView(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useSession();
  const unread = useUnreadCount();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isProvider = user?.role === 'provider';
  const version = Constants.expoConfig?.version ?? '—';

  const accountRows: LinkRow[] = [
    { icon: 'shield-checkmark-outline', title: t('common:settings.privacy'), href: '/settings/consents' },
    { icon: 'ban-outline', title: t('common:settings.blocked'), href: '/settings/blocked' },
    { icon: 'help-buoy-outline', title: t('common:settings.support'), href: '/support' },
  ];
  const policyRows: LinkRow[] = [
    { icon: 'document-text-outline', title: t('common:settings.terms'), href: '/policy/terms' },
    { icon: 'lock-closed-outline', title: t('common:settings.privacyPolicy'), href: '/policy/privacy' },
    { icon: 'shield-outline', title: t('common:settings.safetyPolicy'), href: '/policy/safety-policy' },
    ...(isProvider
      ? [{ icon: 'briefcase-outline' as IconName, title: t('common:settings.providerAgreement'), href: '/policy/provider-agreement' as Href }]
      : []),
  ];

  const handleSignOut = async (): Promise<void> => {
    const isConfirmed = await confirmAction({
      title: t('common:settings.signOutConfirmTitle'),
      body: t('common:settings.signOutConfirmBody'),
      confirmLabel: t('common:actions.signOut'),
      cancelLabel: t('common:actions.cancel'),
    });
    if (!isConfirmed) {
      return;
    }
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Screen>
      {user ? <ProfileSummaryCard user={user} onPress={() => router.push('/settings/profile')} /> : null}

      <SectionHeader title={t('common:language.title')} />
      <LanguageSetting />

      <SectionHeader title={t('common:settings.account')} />
      <View>
        <ListRow
          icon="notifications-outline"
          title={t('common:settings.notifications')}
          subtitle={unread > 0 ? t('common:notifications.unreadCount', { count: unread }) : undefined}
          onPress={() => router.push('/notifications')}
          trailing={
            unread > 0 ? (
              <Row gap={6}>
                <Pill label={String(unread)} tone="accent" />
                <Icon name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </Row>
            ) : undefined
          }
        />
        {accountRows.map((row) => (
          <ListRow key={row.title} icon={row.icon} title={row.title} onPress={() => router.push(row.href)} />
        ))}
      </View>

      <SectionHeader title={t('common:settings.policies')} />
      <View>
        {policyRows.map((row) => (
          <ListRow key={row.title} icon={row.icon} title={row.title} onPress={() => router.push(row.href)} />
        ))}
      </View>

      <View>
        <ListRow
          icon="trash-outline"
          tone="danger"
          title={t('common:settings.deleteAccount')}
          onPress={() => router.push('/settings/delete-account')}
        />
        <ListRow
          icon="log-out-outline"
          title={isSigningOut ? t('common:settings.signingOut') : t('common:actions.signOut')}
          onPress={isSigningOut ? undefined : handleSignOut}
        />
      </View>

      <Text variant="caption" tone="muted" align="center">
        {t('common:settings.version', { version })}
      </Text>
    </Screen>
  );
}
