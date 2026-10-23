import {
  APPLICATION_STEPS,
  type ApplicationStatus,
  type ApplicationStepKey,
  type ProviderApplication,
} from '@/shared/api/types';
import type { IconName } from '@/shared/ui';

/** Checklist state of one wizard step. */
export type StepState = 'completed' | 'next' | 'attention' | 'upcoming';

export const STEP_ICONS: Record<ApplicationStepKey, IconName> = {
  personal: 'person-outline',
  location: 'location-outline',
  services: 'grid-outline',
  service_details: 'pricetags-outline',
  experience: 'ribbon-outline',
  service_area: 'navigate-outline',
  availability: 'calendar-outline',
  documents: 'document-attach-outline',
  review: 'checkmark-done-outline',
};

export const TOTAL_STEPS = APPLICATION_STEPS.length;

/** Narrows a route param to a step key. */
export function isStepKey(value: string | undefined): value is ApplicationStepKey {
  return value !== undefined && (APPLICATION_STEPS as readonly string[]).includes(value);
}

/** 1-based position of a step. */
export function stepNumber(key: ApplicationStepKey): number {
  return APPLICATION_STEPS.indexOf(key) + 1;
}

/** The step after `key`, or null after review. */
export function nextStepKey(key: ApplicationStepKey): ApplicationStepKey | null {
  return APPLICATION_STEPS[stepNumber(key)] ?? null;
}

/** The provider can still change the application. */
export function isApplicationEditable(status: ApplicationStatus): boolean {
  return status === 'draft' || status === 'info_required';
}

/** Reviewer messages for one step. */
export function infoRequestsFor(application: ProviderApplication, key: ApplicationStepKey): string[] {
  return application.infoRequests.filter((request) => request.step === key).map((request) => request.message);
}

/** First step that needs work: reviewer requests first, then the server's currentStep. */
export function nextIncompleteStep(application: ProviderApplication): ApplicationStepKey {
  const flagged = APPLICATION_STEPS.find((key) => application.infoRequests.some((request) => request.step === key));
  if (flagged) {
    return flagged;
  }
  const current = APPLICATION_STEPS[Math.min(Math.max(application.currentStep, 1), TOTAL_STEPS) - 1];
  if (current && !application.completedSteps.includes(current)) {
    return current;
  }
  return APPLICATION_STEPS.find((key) => !application.completedSteps.includes(key)) ?? 'review';
}

/** Checklist state for one step. */
export function stepState(application: ProviderApplication, key: ApplicationStepKey): StepState {
  if (application.infoRequests.some((request) => request.step === key)) {
    return 'attention';
  }
  if (application.completedSteps.includes(key)) {
    return 'completed';
  }
  return nextIncompleteStep(application) === key ? 'next' : 'upcoming';
}

/** Steps the provider may open: completed, flagged, and the next one. */
export function canOpenStep(application: ProviderApplication, key: ApplicationStepKey): boolean {
  return stepState(application, key) !== 'upcoming' || stepNumber(key) <= application.currentStep;
}
