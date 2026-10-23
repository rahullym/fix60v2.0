import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type FieldErrors, hasErrors, NOTE_MAX, validateLocation } from '@/entities/application/validate-step';
import { useSaveStep } from '@/features/provider/application/use-save-step';
import { api } from '@/shared/api/endpoints';
import { useLocale } from '@/shared/lib/use-locale';
import { ErrorState, Notice, SelectField, TextField } from '@/shared/ui';
import { WizardFrame } from '@/widgets/provider/wizard-frame';
import type { StepProps } from './step-props';

/** Step 2: district + locality and a private address note. */
export function LocationStep({ application, isEditable, returnTo }: StepProps): ReactNode {
  const { t } = useTranslation();
  const { pick } = useLocale();
  const draft = application.draft.location;
  const save = useSaveStep('location', returnTo);

  const [districtId, setDistrictId] = useState<string | null>(draft?.districtId ?? null);
  const [localityId, setLocalityId] = useState<string | null>(draft?.localityId ?? null);
  const [addressNote, setAddressNote] = useState(draft?.addressNote ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});

  const districts = useQuery({ queryKey: ['districts'], queryFn: api.locations.districts, staleTime: 60 * 60_000 });
  const localities = useQuery({
    queryKey: ['localities', districtId],
    queryFn: () => api.locations.localities(districtId ?? ''),
    enabled: Boolean(districtId),
    staleTime: 60 * 60_000,
  });

  const submit = (): void => {
    const data = { districtId: districtId ?? '', localityId: localityId ?? '', addressNote: addressNote.trim() || null };
    const next = validateLocation(data);
    setErrors(next);
    if (!hasErrors(next)) {
      save.mutate(data);
    }
  };

  const error = (key: string): string | null => (errors[key] ? t(errors[key]) : null);

  return (
    <WizardFrame
      step="location"
      application={application}
      isEditable={isEditable}
      onContinue={submit}
      isSaving={save.isPending}
      saveError={save.error}
      hasFieldErrors={hasErrors(errors)}>
      {districts.error ? <ErrorState error={districts.error} onRetry={() => void districts.refetch()} /> : null}
      <SelectField
        label={t('provider:location.district')}
        value={districtId}
        onChange={(value) => {
          setDistrictId(value);
          setLocalityId(null);
        }}
        options={(districts.data?.items ?? []).map((district) => ({ value: district.id, label: pick(district.name) }))}
        placeholder={districts.isLoading ? t('provider:common.loading') : undefined}
        error={error('districtId')}
      />
      {districtId ? (
        <SelectField
          label={t('provider:location.locality')}
          value={localityId}
          onChange={setLocalityId}
          isSearchable
          options={(localities.data?.items ?? []).map((locality) => ({
            value: locality.id,
            label: pick(locality.name),
            description: [locality.localBody, locality.postalCode].filter(Boolean).join(' · ') || undefined,
          }))}
          placeholder={localities.isLoading ? t('provider:common.loading') : undefined}
          error={error('localityId')}
        />
      ) : null}
      {localities.error ? <Notice tone="danger" body={t('provider:location.localitiesFailed')} /> : null}
      <TextField
        label={t('provider:location.addressNote')}
        hint={t('provider:location.addressNoteHint')}
        value={addressNote}
        onChangeText={setAddressNote}
        multiline
        maxLength={NOTE_MAX}
        editable={isEditable}
        error={error('addressNote')}
      />
      <Notice tone="info" icon="lock-closed-outline" body={t('provider:location.privateNotice')} />
    </WizardFrame>
  );
}
