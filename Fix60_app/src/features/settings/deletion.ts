import { type UseMutationResult, type UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/endpoints';
import type { DeletionRequestState } from '@/shared/api/types';

const DELETION_KEY = ['me', 'deletion'] as const;

export function useDeletionStatus(): UseQueryResult<DeletionRequestState> {
  return useQuery({ queryKey: DELETION_KEY, queryFn: api.me.deletionStatus });
}

function useDeletionMutation(
  mutationFn: () => Promise<DeletionRequestState>,
): UseMutationResult<DeletionRequestState, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (state) => {
      queryClient.setQueryData(DELETION_KEY, state);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

/** Schedules deletion after the 7-day grace period. */
export function useRequestDeletion(): UseMutationResult<DeletionRequestState, Error, void> {
  return useDeletionMutation(api.me.requestDeletion);
}

/** Cancels a scheduled deletion. */
export function useCancelDeletion(): UseMutationResult<DeletionRequestState, Error, void> {
  return useDeletionMutation(api.me.cancelDeletion);
}
