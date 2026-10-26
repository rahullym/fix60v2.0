import { type Href, Stack, router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotificationsFeed } from '@/features/notifications';
import type { InAppNotification } from '@/shared/api/types';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { Button, EmptyState, ErrorState, LoadingState, Notice, Screen, Text } from '@/shared/ui';
import { NotificationItem } from '@/widgets/account/notification-item';

/** In-app inbox with paging, mark read and deep links. */
export function NotificationsView(): ReactNode {
  const { t } = useTranslation();
  const feed = useNotificationsFeed();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unreadCount = feed.data?.pages[0]?.unreadCount ?? 0;
  const items = feed.data?.pages.flatMap((page) => page.items) ?? [];

  const open = (item: InAppNotification): void => {
    if (!item.isRead) {
      markRead.mutate(item.id);
    }
    if (item.linkPath) {
      router.push(item.linkPath as Href);
    }
  };

  const header = (
    <Stack.Screen
      options={{
        headerRight:
          unreadCount > 0
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('common:notifications.markAllRead')}
                  disabled={markAll.isPending}
                  onPress={() => markAll.mutate()}
                  hitSlop={8}
                  style={styles.headerAction}>
                  <Text variant="label" tone="onPrimary">
                    {t('common:notifications.markAllRead')}
                  </Text>
                </Pressable>
              )
            : undefined,
      }}
    />
  );

  if (feed.isPending) {
    return <LoadingState />;
  }
  if (feed.isError && !feed.data) {
    return <ErrorState error={feed.error} onRetry={feed.refetch} />;
  }

  return (
    <Screen onRefresh={feed.refetch} isRefreshing={feed.isRefetching && !feed.isFetchingNextPage}>
      {header}
      {markAll.isError ? <Notice tone="danger" body={t(errorMessageKey(markAll.error))} /> : null}
      {items.length === 0 ? (
        <EmptyState icon="notifications-off-outline" title={t('common:notifications.empty')} body={t('common:notifications.emptyBody')} />
      ) : (
        items.map((item) => <NotificationItem key={item.id} item={item} onPress={() => open(item)} />)
      )}
      {feed.isError ? <Notice tone="danger" body={t(errorMessageKey(feed.error))} /> : null}
      {feed.hasNextPage ? (
        <Button
          label={t('common:notifications.loadMore')}
          variant="secondary"
          isLoading={feed.isFetchingNextPage}
          onPress={() => void feed.fetchNextPage()}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ headerAction: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 } });
