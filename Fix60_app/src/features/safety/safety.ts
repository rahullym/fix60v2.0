import { type UseMutationResult, type UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/endpoints';
import type { BlockedUser, CreateReportRequest, ItemList, ReportReceipt } from '@/shared/api/types';

/** Lists where a blocked user may appear; refreshed after block changes. */
const AFFECTED_KEYS = [['blocks'], ['providers-search'], ['saved-providers'], ['provider-profile']] as const;

export function useBlocks(): UseQueryResult<ItemList<BlockedUser>> {
  return useQuery({ queryKey: ['blocks'], queryFn: api.safety.blocks });
}

export function useUnblock(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.safety.unblock(userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['blocks'] });
      const previous = queryClient.getQueryData<ItemList<BlockedUser>>(['blocks']);
      if (previous) {
        queryClient.setQueryData<ItemList<BlockedUser>>(['blocks'], {
          items: previous.items.filter((item) => item.userId !== userId),
        });
      }
      return { previous };
    },
    onError: (_error, _userId, result) => {
      if (result?.previous) {
        queryClient.setQueryData(['blocks'], result.previous);
      }
    },
    onSettled: () => Promise.all(AFFECTED_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

export interface ReportOutcome {
  receipt: ReportReceipt;
  /** null when no block was requested. */
  isBlocked: boolean | null;
}

/** Files a report and, when asked, blocks the person too. A failed block does not hide the receipt. */
export function useSubmitReport(): UseMutationResult<ReportOutcome, Error, { report: CreateReportRequest; shouldBlock: boolean }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ report, shouldBlock }) => {
      const receipt = await api.safety.report(report);
      if (!shouldBlock) {
        return { receipt, isBlocked: null };
      }
      try {
        await api.safety.block(report.subjectUserId);
        return { receipt, isBlocked: true };
      } catch {
        return { receipt, isBlocked: false };
      }
    },
    onSuccess: (outcome) => {
      if (outcome.isBlocked) {
        return Promise.all(AFFECTED_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      }
      return undefined;
    },
  });
}
