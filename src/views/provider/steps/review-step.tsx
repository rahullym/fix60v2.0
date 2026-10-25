import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { missingMandatoryDocuments, requiredDocuments } from '@/entities/application/required-documents';
import { validateReview } from '@/entities/application/validate-step';
import { stepHref } from '@/features/provider/application/use-save-step';
import {
  providerKeys,
  servicesById,
  useCategories,
  useDocuments,
  useSelectedServiceDetails,
} from '@/features/provider/model/queries';
import { successFlash } from '@/features/success/success-flash';
import { api } from '@/shared/api/endpoints';
import { APPLICATION_STEPS, type ApplicationStepKey, type DocumentType, type ProviderApplication } from '@/shared/api/types';
import { formatDate, formatMoney, formatTime } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { clockToDate } from '@/features/provider/availability/clock';
import { Button, Card, Checkbox, Notice, Row, Text } from '@/shared/ui';
import { WizardFrame } from '@/widgets/provider/wizard-frame';
import type { StepProps } from './step-props';

const DASH = '—';

interface ReviewSummary {
  lines: Record<ApplicationStepKey, string[]>;
  /** Mandatory document types still missing. */
  missingDocuments: DocumentType[];
  /** Selected services without rates (picked after step 4 was saved). */
  servicesWithoutDetails: string[];
  /** Documents or catalog details are still loading. */
  isChecking: boolean;
}

function useStepSummaries(application: ProviderApplication): ReviewSummary {
  const { t } = useTranslation();
  const { locale, pick } = useLocale();
  const categories = useCategories();
  const lookup = servicesById(categories.data?.items);
  const serviceName = (id: string): string => pick(lookup.get(id)?.name) || DASH;
  const { draft } = application;
  const documents = useDocuments();
  const services = useSelectedServiceDetails(draft.services?.serviceIds ?? []);
  const missing = missingMandatoryDocuments(requiredDocuments(services.details), documents.data?.items ?? []);
  const districtId = draft.location?.districtId ?? null;
  const localities = useQuery({
    queryKey: ['localities', districtId],
    queryFn: () => api.locations.localities(districtId ?? ''),
    enabled: Boolean(districtId),
    staleTime: 60 * 60_000,
  });
  const detailedIds = new Set((draft.service_details?.services ?? []).map((item) => item.serviceId));
  const servicesWithoutDetails = (draft.services?.serviceIds ?? []).filter((id) => !detailedIds.has(id)).map(serviceName);
  const localityName = pick(localities.data?.items.find((item) => item.id === draft.location?.localityId)?.name);

  const lines: Record<ApplicationStepKey, string[]> = {
    personal: draft.personal
      ? [
          draft.personal.fullName,
          formatDate(draft.personal.dateOfBirth, locale),
          draft.personal.gender ? t(`provider:gender.${draft.personal.gender}`) : null,
          draft.personal.whatsappPhone,
          draft.personal.email,
        ].filter((line): line is string => Boolean(line))
      : [],
    location: draft.location
      ? [
          localityName || DASH,
          t('provider:review.addressNote', { note: draft.location.addressNote ? t('provider:review.provided') : DASH }),
        ]
      : [],
    services: (draft.services?.serviceIds ?? []).map(serviceName),
    service_details: (draft.service_details?.services ?? []).map((item) => {
      const rates = [
        item.rates.hourlyRate !== null ? t('common:rates.hourly', { amount: formatMoney(item.rates.hourlyRate, locale) }) : null,
        item.rates.dailyRate !== null ? t('common:rates.daily', { amount: formatMoney(item.rates.dailyRate, locale) }) : null,
        item.rates.monthlyRate !== null ? t('common:rates.monthly', { amount: formatMoney(item.rates.monthlyRate, locale) }) : null,
        item.rates.isNegotiable ? t('common:rates.negotiable') : null,
      ].filter(Boolean);
      return `${serviceName(item.serviceId)}: ${rates.join(', ') || DASH}`;
    }),
    experience: draft.experience
      ? [
          t('common:units.years', { count: draft.experience.yearsExperience ?? 0 }),
          draft.experience.languages.map((language) => t(`common:languages.${language}`, { defaultValue: language })).join(', '),
          t('provider:review.qualifications', { count: draft.experience.qualifications.length }),
        ]
      : [],
    service_area: draft.service_area
      ? [
          t('common:units.km', { value: draft.service_area.radiusKm }),
          t(`provider:travel.${draft.service_area.travelPreference}`),
        ]
      : [],
    availability: draft.availability
      ? [
          draft.availability.availabilityTypes.map((type) => t(`provider:availabilityType.${type}`)).join(', '),
          ...draft.availability.rules.map(
            (rule) =>
              `${t(`common:weekdaysShort.${rule.weekday}`)} ${formatTime(clockToDate(rule.startTime), locale)}–${formatTime(clockToDate(rule.endTime), locale)}`,
          ),
        ]
      : [],
    documents:
      missing.length > 0
        ? [t('provider:review.documentsMissing', { count: missing.length })]
        : documents.data
          ? [t('provider:review.documentsReady')]
          : [],
    review: [],
  };
  return {
    lines,
    missingDocuments: missing,
    servicesWithoutDetails,
    isChecking: documents.isLoading || services.isLoading,
  };
}

/** Step 9: everything at a glance with Edit links, the declaration and Submit. */
export function ReviewStep({ application, isEditable }: StepProps): ReactNode {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { lines: summaries, missingDocuments, servicesWithoutDetails, isChecking } = useStepSummaries(application);
  const [isAccepted, setIsAccepted] = useState(application.draft.review?.declarationAccepted ?? false);
  const [declarationError, setDeclarationError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      await api.provider.saveStep('review', { data: { declarationAccepted: true } });
      return api.provider.submitApplication();
    },
    onSuccess: (submitted) => {
      queryClient.setQueryData(providerKeys.application, submitted);
      void queryClient.invalidateQueries({ queryKey: providerKeys.me });
      void queryClient.invalidateQueries({ queryKey: providerKeys.documents });
      router.dismissTo('/provider/application');
      successFlash.show({
        title: t('provider:review.successTitle'),
        body: t('provider:review.successBody'),
        actionLabel: t('common:actions.continue'),
      });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: providerKeys.application });
      void queryClient.invalidateQueries({ queryKey: providerKeys.documents });
    },
  });

  const incomplete = APPLICATION_STEPS.filter((key) => key !== 'review' && !application.completedSteps.includes(key));
  const isBlocked = isChecking || incomplete.length > 0 || missingDocuments.length > 0 || servicesWithoutDetails.length > 0;

  const onSubmit = (): void => {
    if (isBlocked) {
      return;
    }
    const errors = validateReview({ declarationAccepted: isAccepted });
    setDeclarationError(errors.declarationAccepted ? t(errors.declarationAccepted) : null);
    if (!errors.declarationAccepted) {
      submit.mutate();
    }
  };

  return (
    <WizardFrame
      step="review"
      application={application}
      isEditable={isEditable}
      onContinue={onSubmit}
      isSaving={submit.isPending}
      saveError={submit.error}
      continueLabel={t('provider:review.submit')}
      isContinueDisabled={isBlocked}>
      {incomplete.length > 0 ? (
        <Notice
          tone="warning"
          title={t('provider:review.incompleteTitle')}
          body={incomplete.map((key) => t(`provider:steps.${key}.title`)).join(', ')}
        />
      ) : null}
      {servicesWithoutDetails.length > 0 ? (
        <Notice
          tone="warning"
          title={t('provider:review.servicesWithoutRatesTitle')}
          body={servicesWithoutDetails.join(', ')}
        />
      ) : null}
      {servicesWithoutDetails.length > 0 && isEditable ? (
        <Button
          label={t('provider:review.addRates')}
          variant="secondary"
          onPress={() => router.push(stepHref('service_details', 'review'))}
        />
      ) : null}
      {missingDocuments.length > 0 ? (
        <Notice
          tone="warning"
          title={t('provider:documents.missingTitle')}
          body={missingDocuments.map((type) => t(`common:documentType.${type}`)).join('\n')}
        />
      ) : null}
      {missingDocuments.length > 0 && isEditable ? (
        <Button
          label={t('provider:review.uploadDocuments')}
          variant="secondary"
          icon="cloud-upload-outline"
          onPress={() => router.push(stepHref('documents', 'review'))}
        />
      ) : null}
      {APPLICATION_STEPS.filter((key) => key !== 'review').map((key) => (
        <Card key={key}>
          <Row style={styles.header}>
            <Text variant="bodyStrong" style={styles.flex}>
              {t(`provider:steps.${key}.title`)}
            </Text>
            {isEditable ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t('provider:review.editA11y', { step: t(`provider:steps.${key}.title`) })}
                onPress={() => router.push(stepHref(key, 'review'))}
                hitSlop={12}
                style={styles.edit}>
                <Text variant="label" tone="primary">
                  {t('common:actions.edit')}
                </Text>
              </Pressable>
            ) : null}
          </Row>
          {summaries[key].length > 0 ? (
            summaries[key].map((line, index) => (
              <Text key={`${key}-${index}`} variant="caption" tone="muted">
                {line}
              </Text>
            ))
          ) : (
            <Text variant="caption" tone="warning">
              {t('provider:review.notFilled')}
            </Text>
          )}
        </Card>
      ))}
      <View style={styles.declaration}>
        <Checkbox
          isChecked={isAccepted}
          onChange={setIsAccepted}
          label={t('provider:review.declaration')}
          error={declarationError}>
          <Text>
            {t('provider:review.declarationPrefix')}{' '}
            <Link href="/policy/provider-agreement">
              <Text tone="primary" variant="bodyStrong">
                {t('provider:review.agreement')}
              </Text>
            </Link>
            {t('provider:review.declarationSuffix')}
          </Text>
        </Checkbox>
      </View>
    </WizardFrame>
  );
}

const styles = StyleSheet.create({
  header: { justifyContent: 'space-between' },
  flex: { flex: 1 },
  edit: { minHeight: 48, minWidth: 48, alignItems: 'flex-end', justifyContent: 'center' },
  declaration: { gap: 8 },
});
