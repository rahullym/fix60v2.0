import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { ProviderSummaryCard } from '@/entities/provider/provider-summary-card';
import { useProviderFormat } from '@/entities/provider/use-provider-format';
import { api } from '@/shared/api/endpoints';
import type { CreateRequestRequest, Me } from '@/shared/api/types';
import { toIndianE164 } from '@/shared/auth/phone-auth';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { formatDate, formatTime, maskPhone } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import {
  Button,
  Card,
  DateTimeField,
  ErrorState,
  LoadingState,
  Notice,
  Screen,
  SelectField,
  Stepper,
  Text,
  TextField,
} from '@/shared/ui';
import { LocationFields } from '../location/location-fields';
import { customerKeys, invalidateRoots } from '../model/query-keys';
import { dateFromIso, dateFromSlot, toClockTime, toIsoDate, todayIso, tomorrowIso } from '../model/slot';
import { useCatalog } from '../model/use-catalog';
import { REQUEST_LIMITS, validateRequest, type RequestDraft, type RequestField } from './validate-request';

const DEFAULT_START: string = '09:00';

/** Quick or directed request form. Submits POST /requests and replaces itself with the request detail. */
export function RequestForm({
  me,
  initialServiceId,
  providerCode,
}: {
  me: Me | null;
  initialServiceId?: string;
  providerCode?: string;
}): ReactNode {
  const { t } = useTranslation();
  const { locale, pick } = useLocale();
  const client = useQueryClient();
  const format = useProviderFormat();
  const catalog = useCatalog();
  const isDirected = Boolean(providerCode);

  const provider = useQuery({
    queryKey: customerKeys.providerProfile(providerCode ?? ''),
    queryFn: () => api.providers.get(providerCode!),
    enabled: isDirected,
  });

  const [draft, setDraft] = useState<RequestDraft>(() => ({
    serviceId: initialServiceId ?? null,
    districtId: me?.districtId ?? null,
    localityId: me?.localityId ?? null,
    areaNote: '',
    date: tomorrowIso(),
    startTime: DEFAULT_START,
    durationHours: REQUEST_LIMITS.defaultHours,
    budgetText: '',
    requirements: '',
    contactPhone: me?.phone ?? null,
    whatsappText: me?.whatsappPhone?.replace(/^\+91/, '') ?? '',
  }));
  const [errors, setErrors] = useState<Partial<Record<RequestField, string>>>({});

  const directedServices = provider.data?.services ?? [];
  if (isDirected && !draft.serviceId && directedServices.length === 1) {
    setDraft((current) => ({ ...current, serviceId: directedServices[0]!.service.id }));
  }
  const contactPhone = draft.contactPhone ?? me?.phone ?? null;

  const update = (patch: Partial<RequestDraft>): void => setDraft((current) => ({ ...current, ...patch }));
  const errorText = (field: RequestField): string | null => (errors[field] ? t(errors[field]!) : null);

  const mutation = useMutation({
    mutationFn: (body: CreateRequestRequest) => api.requests.create(body),
    onSuccess: async (created) => {
      await invalidateRoots(client, ['requests']);
      router.replace({ pathname: '/customer/requests/[code]', params: { code: created.code } });
    },
  });

  const submit = (): void => {
    const withPhone = { ...draft, contactPhone };
    const nextErrors = validateRequest(withPhone, (input) => toIndianE164(input) !== null);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const budget = draft.budgetText.trim() ? Number(draft.budgetText) : undefined;
    mutation.mutate({
      serviceId: draft.serviceId!,
      providerCode,
      localityId: draft.localityId!,
      areaNote: draft.areaNote.trim() || undefined,
      preferredDate: draft.date!,
      startTime: draft.startTime!,
      durationHours: draft.durationHours,
      budgetAmount: budget,
      requirements: draft.requirements.trim() || undefined,
      contactPhone: contactPhone!,
      contactWhatsapp: draft.whatsappText.trim() ? (toIndianE164(draft.whatsappText) ?? undefined) : undefined,
    });
  };

  if (isDirected && provider.isLoading) return <LoadingState />;
  if (isDirected && provider.isError) return <ErrorState error={provider.error} onRetry={provider.refetch} />;

  const serviceOptions = isDirected
    ? directedServices.map((item) => ({ value: item.service.id, label: pick(item.service.name), description: format.rateLabel(item.rates) ?? undefined }))
    : catalog.services.map((service) => ({ value: service.id, label: pick(service.name) }));
  const isServiceLocked = isDirected && Boolean(initialServiceId);
  const selectedServiceName =
    serviceOptions.find((option) => option.value === draft.serviceId)?.label ?? pick(catalog.serviceById(draft.serviceId)?.name);
  const directedRate = directedServices.find((item) => item.service.id === draft.serviceId)?.rates;
  const timeDate = draft.date && draft.startTime ? dateFromSlot(draft.date, draft.startTime) : null;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Screen
      footer={
        <Button
          label={t(isDirected ? 'customer:form.submitDirected' : 'customer:form.submitQuick')}
          onPress={submit}
          isLoading={mutation.isPending}
        />
      }>
      <Text tone="muted">{t(isDirected ? 'customer:form.introDirected' : 'customer:form.introQuick')}</Text>

      {isDirected && provider.data ? <ProviderSummaryCard provider={provider.data} /> : null}

      {isServiceLocked ? (
        <Card>
          <Text variant="label" tone="muted">
            {t('customer:form.service')}
          </Text>
          <Text variant="bodyStrong">{selectedServiceName}</Text>
        </Card>
      ) : (
        <SelectField
          label={t('customer:form.service')}
          value={draft.serviceId}
          options={serviceOptions}
          onChange={(serviceId) => update({ serviceId })}
          placeholder={t('customer:form.chooseService')}
          error={errorText('serviceId')}
          isSearchable={!isDirected}
        />
      )}

      <LocationFields
        districtId={draft.districtId}
        localityId={draft.localityId}
        onChange={(next) => update(next)}
        districtError={errorText('districtId')}
        localityError={errorText('localityId')}
      />
      <TextField
        label={t('customer:form.areaNote')}
        value={draft.areaNote}
        onChangeText={(areaNote) => update({ areaNote })}
        placeholder={t('customer:form.areaNotePlaceholder')}
        hint={t('customer:form.areaNoteHint')}
        maxLength={REQUEST_LIMITS.maxAreaNote}
        error={errorText('areaNote')}
      />

      <DateTimeField
        label={t('customer:form.date')}
        mode="date"
        value={draft.date ? dateFromIso(draft.date) : null}
        displayValue={draft.date ? formatDate(draft.date, locale) : null}
        minimumDate={dateFromIso(todayIso())}
        onChange={(next) => update({ date: toIsoDate(next) })}
        error={errorText('date')}
      />
      <DateTimeField
        label={t('customer:form.startTime')}
        mode="time"
        value={timeDate}
        displayValue={timeDate ? formatTime(timeDate, locale) : null}
        onChange={(next) => update({ startTime: toClockTime(next) })}
        error={errorText('startTime')}
      />
      <View>
        <Stepper
          label={t('customer:form.duration')}
          value={draft.durationHours}
          min={REQUEST_LIMITS.minHours}
          max={REQUEST_LIMITS.maxHours}
          onChange={(durationHours) => update({ durationHours })}
          suffix={t('customer:form.hoursSuffix')}
        />
        <Text variant="caption" tone={errors.durationHours ? 'danger' : 'muted'}>
          {errors.durationHours ? t(errors.durationHours) : t('customer:form.durationHint')}
        </Text>
      </View>

      <TextField
        label={t('customer:form.budget')}
        value={draft.budgetText}
        onChangeText={(text) => update({ budgetText: text.replace(/\D/g, '') })}
        keyboardType="number-pad"
        prefix="₹"
        maxLength={6}
        placeholder={t('customer:form.budgetPlaceholder')}
        hint={
          directedRate && format.rateLabel(directedRate)
            ? t('customer:form.providerRate', { rate: format.rateLabel(directedRate) })
            : t('customer:form.budgetHint')
        }
        error={errorText('budgetText')}
      />

      <TextField
        label={t('customer:form.requirements')}
        value={draft.requirements}
        onChangeText={(requirements) => update({ requirements })}
        placeholder={t('customer:form.requirementsPlaceholder')}
        multiline
        maxLength={REQUEST_LIMITS.maxRequirements}
        error={errorText('requirements')}
      />
      <Notice tone="warning" icon="shield-outline" title={t('customer:form.safetyTitle')} body={t('customer:form.safetyBody')} />

      <TextField
        label={t('customer:form.contactPhone')}
        value={contactPhone ? maskPhone(contactPhone) : ''}
        editable={false}
        hint={t('customer:form.contactPhoneHint')}
        error={errorText('contactPhone')}
      />
      <TextField
        label={t('customer:form.whatsapp')}
        value={draft.whatsappText}
        onChangeText={(whatsappText) => update({ whatsappText })}
        keyboardType="phone-pad"
        prefix="+91"
        maxLength={14}
        placeholder={t('customer:form.whatsappPlaceholder')}
        error={errorText('whatsappText')}
      />

      {hasErrors ? <Notice tone="danger" body={t('customer:form.fixErrors')} /> : null}
      {mutation.isError ? <Notice tone="danger" body={t(errorMessageKey(mutation.error))} /> : null}
    </Screen>
  );
}
