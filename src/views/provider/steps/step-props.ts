import type { ProviderApplication } from '@/shared/api/types';

/** Props every wizard step screen receives. */
export interface StepProps {
  application: ProviderApplication;
  isEditable: boolean;
  /** `review` when opened from the review step's Edit links. */
  returnTo?: string;
}
