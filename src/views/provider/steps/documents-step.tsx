import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { missingMandatoryDocuments, requiredDocuments } from '@/entities/application/required-documents';
import { useSaveStep } from '@/features/provider/application/use-save-step';
import { DocumentChecklist } from '@/features/provider/documents/document-checklist';
import { useDocuments, useSelectedServiceDetails } from '@/features/provider/model/queries';
import { ErrorState, LoadingState, Notice } from '@/shared/ui';
import { WizardFrame } from '@/widgets/provider/wizard-frame';
import type { StepProps } from './step-props';

/** Step 8: upload every mandatory document for the selected services (plus ID). */
export function DocumentsStep({ application, isEditable, returnTo }: StepProps): ReactNode {
  const { t } = useTranslation();
  const save = useSaveStep('documents', returnTo);
  const serviceIds = application.draft.services?.serviceIds ?? [];
  const services = useSelectedServiceDetails(serviceIds);
  const documents = useDocuments();
  const [isMissingShown, setIsMissingShown] = useState(false);

  const required = requiredDocuments(services.details);
  const missing = missingMandatoryDocuments(required, documents.data?.items ?? []);

  const submit = (): void => {
    if (services.isLoading || documents.isLoading) {
      return;
    }
    if (missing.length > 0) {
      setIsMissingShown(true);
      return;
    }
    setIsMissingShown(false);
    save.mutate({ acknowledged: true });
  };

  return (
    <WizardFrame
      step="documents"
      application={application}
      isEditable={isEditable}
      onContinue={submit}
      isSaving={save.isPending}
      saveError={save.error}>
      {services.isLoading ? <LoadingState /> : null}
      {services.error ? <ErrorState error={services.error} onRetry={services.refetch} /> : null}
      {!services.isLoading && !services.error ? <DocumentChecklist required={required} isEditable={isEditable} /> : null}
      {isMissingShown && missing.length > 0 ? (
        <Notice
          tone="danger"
          title={t('provider:documents.missingTitle')}
          body={missing.map((type) => t(`common:documentType.${type}`)).join('\n')}
        />
      ) : null}
    </WizardFrame>
  );
}
