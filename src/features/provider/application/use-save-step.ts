import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { type Href, router } from 'expo-router';
import { nextStepKey } from '@/entities/application/application-steps';
import { APPLICATION_STEPS } from '@/shared/api/types';
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
 * back to review when opened from it; when the reviewer asked for changes, to the next flagged
 * step (or home when none are left); otherwise to the next step.
 */
export function useSaveStep<K extends ApplicationStepKey>(
  step: K,
  returnTo?: string,
  /** Opened from review but a later step must be redone first: replace this screen with it (still returning to review). */
  thenStep?: ApplicationStepKey,
): UseMutationResult<ProviderApplication, unknown, NonNullable<ApplicationDraft[K]>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NonNullable<ApplicationDraft[K]>) => api.provider.saveStep(step, { data }),
    onSuccess: (application) => {
      queryClient.setQueryData(providerKeys.application, application);
      void queryClient.invalidateQueries({ queryKey: providerKeys.me });
      if (returnTo === 'review' && thenStep) {
        router.replace(stepHref(thenStep, 'review'));
        return;
      }
      if (returnTo === 'review' && router.canGoBack()) {
        router.back();
        return;
      }
      if (application.status === 'info_required') {
        const flagged = APPLICATION_STEPS.find(
          (key) => key !== step && application.infoRequests.some((request) => request.step === key),
        );
        if (flagged) {
          router.push(stepHref(flagged));
        } else {
          router.dismissTo('/provider/application');
        }
        return;
      }
      const next = nextStepKey(step);
      router.push(next ? stepHref(next) : '/provider/application');
    },
  });
}
