import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/shared/api/endpoints';
import type { InAppNotification, Paged } from '@/shared/api/types';
import { useSession } from '@/shared/auth/session';

export type NotificationsPage = Paged<InAppNotification> & { unreadCount: number };

const FEED_KEY = ['notifications', 'feed'] as const;
const UNREAD_KEY = ['notifications', 'unread'] as const;

/** Paged inbox, newest first. */
export function useNotificationsFeed(): UseInfiniteQueryResult<InfiniteData<NotificationsPage, number>> {
  return useInfiniteQuery({
    queryKey: FEED_KEY,
    queryFn: ({ pageParam }) => api.notifications.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}

/** Unread count for tab badges (page 1, refreshed every 60 s while signed in). */
export function useUnreadCount(): number {
  const { tokens, user } = useSession();
  const query = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: () => api.notifications.list(1),
    select: (page) => page.unreadCount,
    refetchInterval: 60_000,
    enabled: Boolean(tokens && user),
  });
  return query.data ?? 0;
}

function markInFeed(
  data: InfiniteData<NotificationsPage, number> | undefined,
  shouldMark: (item: InAppNotification) => boolean,
): InfiniteData<NotificationsPage, number> | undefined {
  if (!data) {
    return data;
  }
  const marked = data.pages.reduce(
    (count, page) => count + page.items.filter((item) => !item.isRead && shouldMark(item)).length,
    0,
  );
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      unreadCount: Math.max(0, page.unreadCount - marked),
      items: page.items.map((item) => (shouldMark(item) ? { ...item, isRead: true } : item)),
    })),
  };
}

function useMarkMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<void>,
  shouldMark: (variables: TVariables) => (item: InAppNotification) => boolean,
): UseMutationResult<void, Error, TVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: FEED_KEY });
      queryClient.setQueryData<InfiniteData<NotificationsPage, number>>(FEED_KEY, (data) =>
        markInFeed(data, shouldMark(variables)),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkNotificationRead(): UseMutationResult<void, Error, string> {
  return useMarkMutation(api.notifications.markRead, (id) => (item) => item.id === id);
}

export function useMarkAllNotificationsRead(): UseMutationResult<void, Error, void> {
  return useMarkMutation(api.notifications.markAllRead, () => () => true);
}
