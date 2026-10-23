import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isApplicationEditable } from '@/entities/application/application-steps';
import { requiredDocuments } from '@/entities/application/required-documents';
import { DocumentChecklist } from '@/features/provider/documents/document-checklist';
import {
  providerKeys,
  useApplication,
  useDocuments,
  useProviderMe,
  useSelectedServiceDetails,
} from '@/features/provider/model/queries';
import { ErrorState, LoadingState, Screen, Text } from '@/shared/ui';

/** `/provider/documents`: the same checklist as wizard step 8, for onboarding and active providers. */
export function DocumentsView(): ReactNode {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const me = useProviderMe();
  const application = useApplication();
  const documents = useDocuments();
  const approvedIds = (me.data?.services ?? []).map((item) => item.serviceId);
  const serviceIds = approvedIds.length > 0 ? approvedIds : (application.data?.draft.services?.serviceIds ?? []);
  const services = useSelectedServiceDetails(serviceIds);

  if (me.isLoading || application.isLoading || services.isLoading) {
    return <LoadingState />;
  }
  const error = me.error ?? services.error;
  if (error) {
    return (
      <Screen>
        <ErrorState
          error={error}
          onRetry={() => {
            void me.refetch();
            services.refetch();
          }}
        />
      </Screen>
    );
  }

  const isActive = me.data?.status === 'active';
  const isEditable = isActive || (application.data ? isApplicationEditable(application.data.status) : false);

  return (
    <Screen
      onRefresh={() => {
        void queryClient.invalidateQueries({ queryKey: providerKeys.documents });
        void application.refetch();
      }}
      isRefreshing={documents.isRefetching}>
      <Text tone="muted">{t('provider:documents.screenIntro')}</Text>
      <DocumentChecklist required={requiredDocuments(services.details)} isEditable={isEditable} />
    </Screen>
  );
}
