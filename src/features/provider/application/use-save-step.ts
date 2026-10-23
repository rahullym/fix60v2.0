import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { type Href, router } from 'expo-router';
import { nextStepKey } from '@/entities/application/application-steps';
import { api } from '@/shared/api/endpoints';
import type { ApplicationDraft, ApplicationStepKey, ProviderApplication } from '@/shared/api/types';
import { providerKeys } from '../model/queries';

/** Path of a wizard step. */
export function stepHref(step: ApplicationStepKey, returnTo?: 'review'): Href {
  return {
    pathname: '/provider/application/[step]',
    params: returnTo ? { step, returnTo } : { step },
  };
}

/**
 * Saves one step, caches the returned application and moves on:
 * back to review when opened from it, otherwise to the next step.
 */
export function useSaveStep<K extends ApplicationStepKey>(
  step: K,
  returnTo?: string,
): UseMutationResult<ProviderApplication, unknown, NonNullable<ApplicationDraft[K]>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NonNullable<ApplicationDraft[K]>) => api.provider.saveStep(step, { data }),
    onSuccess: (application) => {
      queryClient.setQueryData(providerKeys.application, application);
      void queryClient.invalidateQueries({ queryKey: providerKeys.me });
      if (returnTo === 'review' && router.canGoBack()) {
        router.back();
        return;
      }
      const next = nextStepKey(step);
      router.push(next ? stepHref(next) : '/provider/application');
    },
  });
}
