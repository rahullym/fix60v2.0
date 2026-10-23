import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  type FieldErrors,
  hasErrors,
  MIN_BOOKING_OPTIONS,
  questionErrorKey,
  validateServiceDetails,
} from '@/entities/application/validate-step';
import { useSaveStep } from '@/features/provider/application/use-save-step';
import { useSelectedServiceDetails } from '@/features/provider/model/queries';
import type { ApplicationDraft, ServiceDetail } from '@/shared/api/types';
import { useLocale } from '@/shared/lib/use-locale';
import { Card, Checkbox, Chip, EmptyState, ErrorState, LoadingState, Notice, Stepper, Text, TextField } from '@/shared/ui';
import { WizardFrame } from '@/widgets/provider/wizard-frame';
import { type AnswerValue, QuestionField } from './question-field';
import type { StepProps } from './step-props';

type DraftEntry = NonNullable<ApplicationDraft['service_details']>['services'][number];

interface Entry {
  yearsExperience: number;
  hourly: string;
  daily: string;
  monthly: string;
  isNegotiable: boolean;
  minBookingMinutes: number;
  answers: Record<string, AnswerValue>;
}

function toText(amount: number | null | undefined): string {
  return amount === null || amount === undefined ? '' : String(amount);
}

function toAmount(text: string): number | null {
  const digits = text.replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

function fromDraft(draft: DraftEntry | undefined): Entry {
  return {
    yearsExperience: draft?.yearsExperience ?? 0,
    hourly: toText(draft?.rates.hourlyRate),
    daily: toText(draft?.rates.dailyRate),
    monthly: toText(draft?.rates.monthlyRate),
    isNegotiable: draft?.rates.isNegotiable ?? false,
    minBookingMinutes: draft?.rates.minBookingMinutes ?? 120,
    answers: draft?.answers ?? {},
  };
}

function toDraft(serviceId: string, entry: Entry): DraftEntry {
  return {
    serviceId,
    yearsExperience: entry.yearsExperience,
    rates: {
      hourlyRate: toAmount(entry.hourly),
      dailyRate: toAmount(entry.daily),
      monthlyRate: toAmount(entry.monthly),
      isNegotiable: entry.isNegotiable,
      minBookingMinutes: entry.minBookingMinutes,
    },
    answers: entry.answers,
  };
}

function ServiceSection({
  detail,
  entry,
  onChange,
  errors,
  isEditable,
}: {
  detail: ServiceDetail;
  entry: Entry;
  onChange: (entry: Entry) => void;
  errors: FieldErrors;
  isEditable: boolean;
}): ReactNode {
  const { t } = useTranslation();
  const { pick } = useLocale();
  const minYears = detail.eligibility.minYearsExperience;
  const error = (key: string): string | null => (errors[key] ? t(errors[key]) : null);
  const ratesError = error(`${detail.id}.rates`);

  return (
    <Card>
      <Text variant="heading">{pick(detail.name)}</Text>
      {minYears ? (
        <Notice
          tone={entry.yearsExperience >= minYears ? 'success' : 'warning'}
          body={t('provider:serviceDetails.eligibility', { years: t('common:units.years', { count: minYears }) })}
        />
      ) : null}
      <Stepper
        label={t('provider:serviceDetails.years')}
        value={entry.yearsExperience}
        onChange={(value) => isEditable && onChange({ ...entry, yearsExperience: value })}
        min={0}
        max={60}
      />
      <Text variant="bodyStrong">{t('provider:serviceDetails.ratesTitle')}</Text>
      <Text variant="caption" tone="muted">
        {t('provider:serviceDetails.ratesHint')}
      </Text>
      <View style={styles.rates}>
        {(['hourly', 'daily', 'monthly'] as const).map((kind) => (
          <View key={kind} style={styles.rate}>
            <TextField
              label={t(`provider:serviceDetails.rate.${kind}`)}
              prefix="₹"
              value={entry[kind]}
              onChangeText={(text) => onChange({ ...entry, [kind]: text.replace(/[^\d]/g, '').slice(0, 7) })}
              keyboardType="number-pad"
              editable={isEditable}
              error={ratesError ? ' ' : null}
            />
          </View>
        ))}
      </View>
      {ratesError ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {ratesError}
        </Text>
      ) : null}
      <Checkbox
        isChecked={entry.isNegotiable}
        onChange={(value) => isEditable && onChange({ ...entry, isNegotiable: value })}
        label={t('provider:serviceDetails.negotiable')}
      />
      <Text variant="label" tone="muted">
        {t('provider:serviceDetails.minBooking')}
      </Text>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {MIN_BOOKING_OPTIONS.map((minutes) => (
          <Chip
            key={minutes}
            label={t('common:units.hours', { count: minutes / 60 })}
            isSelected={entry.minBookingMinutes === minutes}
            onPress={() => isEditable && onChange({ ...entry, minBookingMinutes: minutes })}
          />
        ))}
      </View>
      {error(`${detail.id}.minBookingMinutes`) ? (
        <Text variant="caption" tone="danger">
          {error(`${detail.id}.minBookingMinutes`)}
        </Text>
      ) : null}
      {detail.questions.length > 0 ? (
        <Text variant="bodyStrong">{t('provider:serviceDetails.questionsTitle')}</Text>
      ) : null}
      {detail.questions.map((question) => (
        <QuestionField
          key={question.id}
          question={question}
          value={entry.answers[question.key]}
          isEditable={isEditable}
          error={error(questionErrorKey(detail.id, question))}
          onChange={(value) => {
            const answers = { ...entry.answers };
            if (value === undefined) {
              delete answers[question.key];
            } else {
              answers[question.key] = value;
            }
            onChange({ ...entry, answers });
          }}
        />
      ))}
    </Card>
  );
}

/** Step 4: per-service experience, rates, minimum booking and the catalog's questions. */
export function ServiceDetailsStep({ application, isEditable, returnTo }: StepProps): ReactNode {
  const { t } = useTranslation();
  const save = useSaveStep('service_details', returnTo);
  const serviceIds = application.draft.services?.serviceIds ?? [];
  const { details, isLoading, error, refetch } = useSelectedServiceDetails(serviceIds);
  const draftServices = application.draft.service_details?.services ?? [];
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [errors, setErrors] = useState<FieldErrors>({});

  const entryFor = (id: string): Entry => entries[id] ?? fromDraft(draftServices.find((item) => item.serviceId === id));

  const submit = (): void => {
    if (isLoading || details.length === 0) {
      return;
    }
    const data = { services: details.map((detail) => toDraft(detail.id, entryFor(detail.id))) };
    const next = validateServiceDetails(data, details);
    setErrors(next);
    if (!hasErrors(next)) {
      save.mutate(data);
    }
  };

  return (
    <WizardFrame
      step="service_details"
      application={application}
      isEditable={isEditable}
      onContinue={submit}
      isSaving={save.isPending}
      saveError={save.error}
      hasFieldErrors={hasErrors(errors)}>
      {serviceIds.length === 0 ? (
        <EmptyState icon="grid-outline" title={t('provider:serviceDetails.noServices')} />
      ) : null}
      {isLoading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} onRetry={refetch} /> : null}
      {details.map((detail) => (
        <ServiceSection
          key={detail.id}
          detail={detail}
          entry={entryFor(detail.id)}
          errors={errors}
          isEditable={isEditable}
          onChange={(entry) => setEntries((current) => ({ ...current, [detail.id]: entry }))}
        />
      ))}
    </WizardFrame>
  );
}

const styles = StyleSheet.create({
  rates: { gap: 8 },
  rate: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
