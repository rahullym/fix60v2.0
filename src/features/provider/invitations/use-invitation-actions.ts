import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { hasErrorCode } from '@/shared/api/api-error';
import { api } from '@/shared/api/endpoints';
import type { ProviderInvitation } from '@/shared/api/types';
import { providerKeys } from '../model/queries';

export interface InvitationActions {
  accept: UseMutationResult<ProviderInvitation, unknown, void>;
  decline: UseMutationResult<ProviderInvitation, unknown, string>;
  /** The job expired or was filled while the provider was looking at it. */
  isNoLongerAvailable: boolean;
}

/** Accept / decline with cache updates; refetches on INVALID_STATE_TRANSITION. */
export function useInvitationActions(id: string): InvitationActions {
  const queryClient = useQueryClient();

  const settle = (invitation?: ProviderInvitation): void => {
    if (invitation) {
      queryClient.setQueryData(providerKeys.invitation(id), invitation);
    }
    void queryClient.invalidateQueries({ queryKey: providerKeys.invitation(id) });
    void queryClient.invalidateQueries({ queryKey: providerKeys.invitationsRoot });
    void queryClient.invalidateQueries({ queryKey: providerKeys.me });
  };

  const accept = useMutation({
    mutationFn: () => api.provider.acceptInvitation(id),
    onSuccess: (invitation) => settle(invitation),
    onError: () => settle(),
  });
  const decline = useMutation({
    mutationFn: (reason: string) => api.provider.declineInvitation(id, reason),
    onSuccess: (invitation) => settle(invitation),
    onError: () => settle(),
  });

  const isNoLongerAvailable =
    hasErrorCode(accept.error, 'INVALID_STATE_TRANSITION') || hasErrorCode(decline.error, 'INVALID_STATE_TRANSITION');

  return { accept, decline, isNoLongerAvailable };
}

/** Marks a fresh invitation as viewed once, when the detail opens. */
export function useMarkViewed(invitation: ProviderInvitation | undefined): void {
  const queryClient = useQueryClient();
  const markedId = useRef<string | null>(null);
  useEffect(() => {
    if (!invitation || invitation.status !== 'invited' || markedId.current === invitation.id) {
      return;
    }
    markedId.current = invitation.id;
    api.provider
      .markInvitationViewed(invitation.id)
      .then((viewed) => {
        queryClient.setQueryData(providerKeys.invitation(viewed.id), viewed);
        void queryClient.invalidateQueries({ queryKey: providerKeys.invitationsRoot });
      })
      .catch(() => undefined);
  }, [invitation, queryClient]);
}
