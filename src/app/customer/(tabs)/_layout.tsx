import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router/js-tabs';
import type { ReactNode } from 'react';
import type { ColorValue } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useUnreadCount } from '@/features/notifications';
import { customerKeys } from '@/features/customer/model/query-keys';
import { api } from '@/shared/api/endpoints';
import { useTheme } from '@/shared/theme/theme';
import { Icon, type IconName } from '@/shared/ui';

function tabIcon(focused: IconName, idle: IconName) {
  return function TabIcon({ color, size, focused: isFocused }: { color: ColorValue; size: number; focused: boolean }): ReactNode {
    return <Icon name={isFocused ? focused : idle} size={size} color={typeof color === 'string' ? color : undefined} />;
  };
}

/** Customer bottom tabs. The Requests badge counts requests waiting for the customer's choice. */
export default function CustomerTabsLayout(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const requests = useQuery({ queryKey: customerKeys.requests, queryFn: () => api.requests.list() });
  const toChoose = (requests.data?.items ?? []).filter(
    (request) => request.status === 'customer_confirmation_pending' || request.status === 'provider_accepted',
  ).length;
  const unread = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarLabelStyle: { fontSize: 12 },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: t('customer:tabs.home'), headerShown: false, tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: t('customer:tabs.requests'),
          tabBarIcon: tabIcon('document-text', 'document-text-outline'),
          tabBarBadge: toChoose > 0 ? toChoose : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.accent, color: theme.colors.onPrimary },
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ title: t('customer:tabs.bookings'), tabBarIcon: tabIcon('calendar', 'calendar-outline') }}
      />
      <Tabs.Screen name="saved" options={{ title: t('customer:tabs.saved'), tabBarIcon: tabIcon('heart', 'heart-outline') }} />
      <Tabs.Screen
        name="account"
        options={{
          title: t('customer:tabs.account'),
          tabBarIcon: tabIcon('person-circle', 'person-circle-outline'),
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
    </Tabs>
  );
}
