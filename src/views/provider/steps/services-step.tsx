import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type FieldErrors, hasErrors, validateServices } from '@/entities/application/validate-step';
import { useSaveStep } from '@/features/provider/application/use-save-step';
import { useCategories } from '@/features/provider/model/queries';
import { useLocale } from '@/shared/lib/use-locale';
import { Card, Chip, ErrorState, LoadingState, Text } from '@/shared/ui';
import { WizardFrame } from '@/widgets/provider/wizard-frame';
import type { StepProps } from './step-props';

/** Step 3: pick one or more services, grouped by category. */
export function ServicesStep({ application, isEditable, returnTo }: StepProps): ReactNode {
  const { t } = useTranslation();
  const { pick } = useLocale();
  const save = useSaveStep('services', returnTo);
  const categories = useCategories();
  const [serviceIds, setServiceIds] = useState<string[]>(application.draft.services?.serviceIds ?? []);
  const [errors, setErrors] = useState<FieldErrors>({});

  const toggle = (id: string): void => {
    setServiceIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };

  const submit = (): void => {
    const data = { serviceIds };
    const next = validateServices(data);
    setErrors(next);
    if (!hasErrors(next)) {
      save.mutate(data);
    }
  };

  return (
    <WizardFrame
      step="services"
      application={application}
      isEditable={isEditable}
      onContinue={submit}
      isSaving={save.isPending}
      saveError={save.error}
      hasFieldErrors={hasErrors(errors)}>
      {categories.isLoading ? <LoadingState /> : null}
      {categories.error ? <ErrorState error={categories.error} onRetry={() => void categories.refetch()} /> : null}
      <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
        {t('provider:services.selectedCount', { count: serviceIds.length })}
      </Text>
      {(categories.data?.items ?? []).map((category) => (
        <Card key={category.id}>
          <Text variant="heading">{pick(category.name)}</Text>
          {category.description ? (
            <Text variant="caption" tone="muted">
              {pick(category.description)}
            </Text>
          ) : null}
          <View style={styles.chips}>
            {category.services.map((service) => (
              <Chip
                key={service.id}
                label={pick(service.name)}
                isSelected={serviceIds.includes(service.id)}
                onPress={() => (isEditable ? toggle(service.id) : undefined)}
              />
            ))}
          </View>
        </Card>
      ))}
      {errors.serviceIds ? (
        <Text variant="caption" tone="danger">
          {t(errors.serviceIds)}
        </Text>
      ) : null}
    </WizardFrame>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
