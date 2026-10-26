import { Tabs } from 'expo-router/js-tabs';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnreadCount } from '@/features/notifications';
import { useProviderMe } from '@/features/provider/model/queries';
import { useTheme } from '@/shared/theme/theme';
import { tabIcon, useTabScreenOptions } from '@/shared/ui/tab-bar';

/** Provider tabs in the original Fix60 layout: Jobs · Schedule · Availability · Profile. */
export default function ProviderTabsLayout(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const screenOptions = useTabScreenOptions(theme);
  const pending = useProviderMe().data?.stats.pendingInvitations ?? 0;
  const unread = useUnreadCount();
  const badgeStyle = { backgroundColor: theme.colors.accent, color: theme.colors.onPrimary };
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('provider:tabs.jobs'),
          headerShown: false,
          tabBarIcon: tabIcon('home', 'home-outline'),
          tabBarBadge: pending > 0 ? pending : undefined,
          tabBarBadgeStyle: badgeStyle,
          tabBarAccessibilityLabel: t('provider:tabs.jobsA11y', { count: pending }),
        }}
      />
      <Tabs.Screen name="bookings" options={{ title: t('provider:tabs.bookings'), tabBarIcon: tabIcon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="availability" options={{ title: t('provider:tabs.availability'), tabBarIcon: tabIcon('time', 'time-outline') }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('provider:tabs.profile'),
          tabBarIcon: tabIcon('person', 'person-outline'),
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      />
    </Tabs>
  );
}
