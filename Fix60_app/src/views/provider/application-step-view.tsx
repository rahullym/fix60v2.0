import { Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isApplicationEditable, isStepKey, stepNumber, TOTAL_STEPS } from '@/entities/application/application-steps';
import { useApplication } from '@/features/provider/model/queries';
import type { ApplicationStepKey } from '@/shared/api/types';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/shared/ui';
import { AvailabilityStep } from './steps/availability-step';
import { DocumentsStep } from './steps/documents-step';
import { ExperienceStep } from './steps/experience-step';
import { LocationStep } from './steps/location-step';
import { PersonalStep } from './steps/personal-step';
import { ReviewStep } from './steps/review-step';
import { ServiceAreaStep } from './steps/service-area-step';
import { ServiceDetailsStep } from './steps/service-details-step';
import { ServicesStep } from './steps/services-step';
import type { StepProps } from './steps/step-props';

const STEP_COMPONENTS: Record<ApplicationStepKey, (props: StepProps) => ReactNode> = {
  personal: PersonalStep,
  location: LocationStep,
  services: ServicesStep,
  service_details: ServiceDetailsStep,
  experience: ExperienceStep,
  service_area: ServiceAreaStep,
  availability: AvailabilityStep,
  documents: DocumentsStep,
  review: ReviewStep,
};

/** `/provider/application/[step]`: one wizard step, prefilled from the saved draft. */
export function ApplicationStepView(): ReactNode {
  const { t } = useTranslation();
  const { step, returnTo } = useLocalSearchParams<{ step: string; returnTo?: string }>();
  const application = useApplication();

  if (!isStepKey(step)) {
    return (
      <Screen>
        <EmptyState icon="help-circle-outline" title={t('provider:wizard.unknownStep')} />
      </Screen>
    );
  }
  const title = t('provider:wizard.headerTitle', { number: stepNumber(step), total: TOTAL_STEPS });
  if (application.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <LoadingState />
      </>
    );
  }
  if (application.error || !application.data) {
    return (
      <Screen>
        <Stack.Screen options={{ title }} />
        <ErrorState error={application.error} onRetry={() => void application.refetch()} />
      </Screen>
    );
  }
  const StepComponent = STEP_COMPONENTS[step];
  return (
    <>
      <Stack.Screen options={{ title }} />
      <StepComponent
        key={step}
        application={application.data}
        isEditable={isApplicationEditable(application.data.status)}
        returnTo={returnTo}
      />
    </>
  );
}
