import { Tabs } from 'expo-router/js-tabs';
import type { ReactNode } from 'react';
import type { ColorValue } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useUnreadCount } from '@/features/notifications';
import { useProviderMe } from '@/features/provider/model/queries';
import { useTheme } from '@/shared/theme/theme';
import { Icon, type IconName } from '@/shared/ui';

function tabIcon(name: IconName): (props: { color: ColorValue; size: number }) => ReactNode {
  return function TabIcon({ color, size }) {
    return <Icon name={name} color={typeof color === 'string' ? color : undefined} size={size} />;
  };
}

/** Main provider tabs once approved. */
export default function ProviderTabsLayout(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const pending = useProviderMe().data?.stats.pendingInvitations ?? 0;
  const unread = useUnreadCount();
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, minHeight: 60 },
        tabBarLabelStyle: { fontSize: 12 },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('provider:tabs.jobs'),
          tabBarIcon: tabIcon('briefcase-outline'),
          tabBarBadge: pending > 0 ? pending : undefined,
          tabBarAccessibilityLabel: t('provider:tabs.jobsA11y', { count: pending }),
        }}
      />
      <Tabs.Screen name="bookings" options={{ title: t('provider:tabs.bookings'), tabBarIcon: tabIcon('calendar-outline') }} />
      <Tabs.Screen
        name="availability"
        options={{ title: t('provider:tabs.availability'), tabBarIcon: tabIcon('time-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('provider:tabs.profile'),
          tabBarIcon: tabIcon('person-circle-outline'),
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
    </Tabs>
  );
}
