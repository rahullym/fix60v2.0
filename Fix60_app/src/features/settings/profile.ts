import { type UseMutationResult, type UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/endpoints';
import type { Me, UpdateMeRequest } from '@/shared/api/types';
import { session } from '@/shared/auth/session';

/** The signed-in user's profile; keeps the cached session user in sync. */
export function useMe(): UseQueryResult<Me> {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const me = await api.me.get();
      await session.setUser(me);
      return me;
    },
  });
}

/** PATCH /me, then refresh the session user and the `me` keys. */
export function useUpdateProfile(): UseMutationResult<Me, Error, UpdateMeRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeRequest) => api.me.update(body),
    onSuccess: async (me) => {
      await session.setUser(me);
      queryClient.setQueryData(['me'], me);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
