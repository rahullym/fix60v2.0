import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  type FieldErrors,
  hasErrors,
  MAX_HOURS_RANGE,
  validateMaxHours,
  validateRules,
} from '@/entities/application/validate-step';
import { TimeOffForm } from '@/features/provider/availability/time-off-form';
import { WeeklyRulesEditor } from '@/features/provider/availability/weekly-rules-editor';
import { providerKeys } from '@/features/provider/model/queries';
import { api } from '@/shared/api/endpoints';
import type { AvailabilityException, ProviderAvailability } from '@/shared/api/types';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { formatDateTime } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Button, Card, ErrorState, ListRow, LoadingState, Notice, Screen, SectionHeader, Stepper, Text } from '@/shared/ui';

function WeeklyForm({ availability }: { availability: ProviderAvailability }): ReactNode {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [rules, setRules] = useState(availability.rules);
  const [maxHours, setMaxHours] = useState(availability.maxHoursPerDay ?? 8);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaved, setIsSaved] = useState(false);

  const save = useMutation({
    mutationFn: () => api.provider.updateAvailability({ rules, maxHoursPerDay: maxHours }),
    onSuccess: (updated) => {
      queryClient.setQueryData(providerKeys.availability, updated);
      setIsSaved(true);
    },
  });

  const submit = (): void => {
    const next = { ...validateRules(rules), ...validateMaxHours(maxHours) };
    setErrors(next);
    setIsSaved(false);
    if (!hasErrors(next)) {
      save.mutate();
    }
  };

  return (
    <>
      <SectionHeader title={t('provider:availability.weeklyTitle')} />
      <Text variant="caption" tone="muted">
        {t('provider:availability.weeklyHint')}
      </Text>
      <WeeklyRulesEditor
        rules={rules}
        onChange={(next) => {
          setRules(next);
          setIsSaved(false);
        }}
        errors={errors}
      />
      <Stepper
        label={t('provider:availability.maxHours')}
        value={maxHours}
        onChange={(value) => {
          setMaxHours(value);
          setIsSaved(false);
        }}
        min={MAX_HOURS_RANGE.min}
        max={MAX_HOURS_RANGE.max}
      />
      {hasErrors(errors) ? <Notice tone="danger" body={t('provider:wizard.fixErrors')} /> : null}
      {save.error ? <Notice tone="danger" body={t(errorMessageKey(save.error))} /> : null}
      {isSaved ? <Notice tone="success" body={t('provider:availability.saved')} /> : null}
      <Button label={t('common:actions.save')} onPress={submit} isLoading={save.isPending} />
    </>
  );
}

function ExceptionRow({ exception }: { exception: AvailabilityException }): ReactNode {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => api.provider.removeException(exception.id),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: providerKeys.availability }),
  });
  const range = `${formatDateTime(exception.startsAt, locale)} → ${formatDateTime(exception.endsAt, locale)}`;
  return (
    <>
      <ListRow
        icon="airplane-outline"
        title={exception.reason || t('provider:timeOff.untitled')}
        subtitle={range}
        trailing={
          <Button
            label={t('common:actions.remove')}
            variant="ghost"
            isCompact
            isLoading={remove.isPending}
            accessibilityHint={range}
            onPress={() =>
              Alert.alert(t('provider:timeOff.removeTitle'), range, [
                { text: t('common:actions.cancel'), style: 'cancel' },
                { text: t('common:actions.remove'), style: 'destructive', onPress: () => remove.mutate() },
              ])
            }
          />
        }
      />
      {remove.error ? <Notice tone="danger" body={t(errorMessageKey(remove.error))} /> : null}
    </>
  );
}

/** Availability tab: weekly schedule, daily cap and time off. */
export function AvailabilityView(): ReactNode {
  const { t } = useTranslation();
  const availability = useQuery({ queryKey: providerKeys.availability, queryFn: api.provider.availability });
  const [isAdding, setIsAdding] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  if (availability.isLoading) {
    return <LoadingState />;
  }
  if (availability.error || !availability.data) {
    return (
      <Screen>
        <ErrorState error={availability.error} onRetry={() => void availability.refetch()} />
      </Screen>
    );
  }
  const exceptions = availability.data.exceptions;

  return (
    <Screen
      onRefresh={() => void availability.refetch().then(() => setFormVersion((version) => version + 1))}
      isRefreshing={availability.isRefetching}>
      <WeeklyForm key={formVersion} availability={availability.data} />
      <SectionHeader title={t('provider:timeOff.title')} />
      <Text variant="caption" tone="muted">
        {t('provider:timeOff.hint')}
      </Text>
      <Card>
        {exceptions.length === 0 ? (
          <Text tone="muted">{t('provider:timeOff.empty')}</Text>
        ) : (
          exceptions.map((exception) => <ExceptionRow key={exception.id} exception={exception} />)
        )}
      </Card>
      {isAdding ? (
        <TimeOffForm onDone={() => setIsAdding(false)} />
      ) : (
        <Button label={t('provider:timeOff.addTitle')} variant="secondary" icon="add" onPress={() => setIsAdding(true)} />
      )}
    </Screen>
  );
}
