import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnreadCount } from '@/features/notifications';
import { customerKeys } from '@/features/customer/model/query-keys';
import { api } from '@/shared/api/endpoints';
import { useTheme } from '@/shared/theme/theme';
import { FlashTabButton, tabIcon, useTabScreenOptions } from '@/shared/ui/tab-bar';

/**
 * Customer tabs in the original Fix60 layout: Home · Requests · ⚡ new request · Bookings · Profile.
 * The Requests badge counts requests waiting for the customer's choice.
 */
export default function CustomerTabsLayout(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const screenOptions = useTabScreenOptions(theme);
  const requests = useQuery({ queryKey: customerKeys.requests, queryFn: () => api.requests.list() });
  const toChoose = (requests.data?.items ?? []).filter(
    (request) => request.status === 'customer_confirmation_pending' || request.status === 'provider_accepted',
  ).length;
  const unread = useUnreadCount();
  const badgeStyle = { backgroundColor: theme.colors.accent, color: theme.colors.onPrimary };

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="index" options={{ title: t('customer:tabs.home'), headerShown: false, tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen
        name="requests"
        options={{
          title: t('customer:tabs.requests'),
          tabBarIcon: tabIcon('clipboard', 'clipboard-outline'),
          tabBarBadge: toChoose > 0 ? toChoose : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      />
      <Tabs.Screen
        name="quick"
        options={{
          title: t('customer:tabs.quick'),
          tabBarButton: () => (
            <FlashTabButton label={t('customer:tabs.quick')} onPress={() => router.push('/customer/requests/new')} />
          ),
        }}
      />
      <Tabs.Screen name="bookings" options={{ title: t('customer:tabs.bookings'), tabBarIcon: tabIcon('calendar', 'calendar-outline') }} />
      <Tabs.Screen
        name="account"
        options={{
          title: t('customer:tabs.account'),
          tabBarIcon: tabIcon('person', 'person-outline'),
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      />
    </Tabs>
  );
}
