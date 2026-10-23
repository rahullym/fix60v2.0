import { type UseMutationResult, type UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/endpoints';
import type { ConsentState, ConsentType, ItemList, UpdateConsentsRequest } from '@/shared/api/types';

/** Consents the user may switch on and off, in display order. */
export const OPTIONAL_CONSENTS = ['service_communications', 'whatsapp_updates', 'marketing'] as const;
export type OptionalConsent = (typeof OPTIONAL_CONSENTS)[number];

/** Consents recorded at signup that cannot be withdrawn in-app, with their policy page. */
export const REQUIRED_CONSENTS: { type: ConsentType; policySlug: string }[] = [
  { type: 'terms', policySlug: 'terms' },
  { type: 'privacy', policySlug: 'privacy' },
  { type: 'safety_policy', policySlug: 'safety-policy' },
  { type: 'provider_declaration', policySlug: 'provider-agreement' },
];

const requestKey: Record<OptionalConsent, keyof UpdateConsentsRequest> = {
  service_communications: 'serviceCommunications',
  whatsapp_updates: 'whatsappUpdates',
  marketing: 'marketing',
};

const CONSENTS_KEY = ['consents'] as const;

export function useConsents(): UseQueryResult<ItemList<ConsentState>> {
  return useQuery({ queryKey: CONSENTS_KEY, queryFn: api.me.consents });
}

interface ConsentChange {
  type: OptionalConsent;
  isGranted: boolean;
}

/** Optimistically flips one consent and rolls back if the server rejects it. */
export function useUpdateConsent(): UseMutationResult<
  ItemList<ConsentState>,
  Error,
  ConsentChange,
  { previous: ItemList<ConsentState> | undefined }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, isGranted }: ConsentChange) => api.me.updateConsents({ [requestKey[type]]: isGranted }),
    onMutate: async ({ type, isGranted }) => {
      await queryClient.cancelQueries({ queryKey: CONSENTS_KEY });
      const previous = queryClient.getQueryData<ItemList<ConsentState>>(CONSENTS_KEY);
      if (previous) {
        queryClient.setQueryData<ItemList<ConsentState>>(CONSENTS_KEY, {
          items: previous.items.map((item) => (item.type === type ? { ...item, isGranted } : item)),
        });
      }
      return { previous };
    },
    onError: (_error, _change, result) => {
      if (result?.previous) {
        queryClient.setQueryData(CONSENTS_KEY, result.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CONSENTS_KEY, data);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CONSENTS_KEY }),
  });
}
