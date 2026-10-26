import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe, useUpdateProfile } from '@/features/settings/profile';
import { api } from '@/shared/api/endpoints';
import type { Gender, Me, UpdateMeRequest } from '@/shared/api/types';
import { toIndianE164 } from '@/shared/auth/phone-auth';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { useLocale } from '@/shared/lib/use-locale';
import { Button, ErrorState, LoadingState, Notice, Screen, SelectField, TextField } from '@/shared/ui';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDERS: Gender[] = ['female', 'male', 'other', 'prefer_not_to_say'];

function nationalDigits(phone: string | null): string {
  return phone ? phone.replace(/^\+91/, '') : '';
}

/** Edit name, email, WhatsApp, gender and area. The login phone is read-only. */
export function ProfileView(): ReactNode {
  const me = useMe();
  if (me.isPending) {
    return <LoadingState />;
  }
  if (me.isError) {
    return <ErrorState error={me.error} onRetry={me.refetch} />;
  }
  return <ProfileForm me={me.data} />;
}

function ProfileForm({ me }: { me: Me }): ReactNode {
  const { t } = useTranslation();
  const { pick } = useLocale();
  const update = useUpdateProfile();

  const [fullName, setFullName] = useState(me.fullName);
  const [email, setEmail] = useState(me.email ?? '');
  const [whatsapp, setWhatsapp] = useState(nationalDigits(me.whatsappPhone));
  const [gender, setGender] = useState<Gender | null>(me.gender);
  const [districtId, setDistrictId] = useState<string | null>(me.districtId);
  const [localityId, setLocalityId] = useState<string | null>(me.localityId);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);

  const districts = useQuery({ queryKey: ['districts'], queryFn: api.locations.districts });
  const localities = useQuery({
    queryKey: ['localities', districtId],
    queryFn: () => api.locations.localities(districtId ?? ''),
    enabled: Boolean(districtId),
  });

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = t('common:profile.errors.fullName');
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) next.email = t('common:profile.errors.email');
    if (whatsapp.trim() && !toIndianE164(whatsapp)) next.whatsapp = t('errors:phone.invalid_phone');
    if (districtId && !localityId) next.locality = t('common:profile.errors.locality');
    return next;
  };

  const save = (): void => {
    const nextErrors = validate();
    setErrors(nextErrors);
    setIsSaved(false);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    const body: UpdateMeRequest = {
      fullName: fullName.trim(),
      email: email.trim() || null,
      whatsappPhone: whatsapp.trim() ? toIndianE164(whatsapp) : null,
      gender,
      districtId,
      localityId,
    };
    update.mutate(body, { onSuccess: () => setIsSaved(true) });
  };

  return (
    <Screen footer={<Button label={t('common:actions.save')} onPress={save} isLoading={update.isPending} />}>
      {isSaved ? <Notice tone="success" body={t('common:profile.saved')} /> : null}
      {update.isError ? <Notice tone="danger" body={t(errorMessageKey(update.error))} /> : null}

      <TextField
        label={t('common:profile.fullName')}
        value={fullName}
        onChangeText={setFullName}
        autoComplete="name"
        textContentType="name"
        maxLength={80}
        error={errors.fullName}
      />
      <TextField
        label={t('common:profile.phone')}
        value={me.phone ?? ''}
        editable={false}
        hint={t('common:profile.phoneHint')}
        accessibilityHint={t('common:profile.phoneHint')}
      />
      <TextField
        label={t('common:profile.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        maxLength={120}
        error={errors.email}
      />
      <TextField
        label={t('common:profile.whatsapp')}
        value={whatsapp}
        onChangeText={(value) => setWhatsapp(value.replace(/\D/g, ''))}
        prefix="🇮🇳 +91"
        keyboardType="phone-pad"
        maxLength={10}
        hint={t('common:profile.whatsappHint')}
        error={errors.whatsapp}
      />
      <SelectField<Gender>
        label={t('common:profile.gender')}
        value={gender}
        placeholder={t('common:profile.optional')}
        options={GENDERS.map((value) => ({ value, label: t(`common:gender.${value}`) }))}
        onChange={setGender}
      />
      {gender ? (
        <Button label={t('common:profile.clearGender')} variant="ghost" isCompact onPress={() => setGender(null)} />
      ) : null}
      {districts.isError ? <Notice tone="danger" body={t(errorMessageKey(districts.error))} /> : null}
      <SelectField
        label={t('common:profile.district')}
        value={districtId}
        placeholder={districts.isPending ? t('common:loading') : t('common:profile.optional')}
        options={(districts.data?.items ?? []).map((district) => ({ value: district.id, label: pick(district.name) }))}
        onChange={(value) => {
          if (value !== districtId) {
            setDistrictId(value);
            setLocalityId(null);
          }
        }}
      />
      {districtId ? (
        <SelectField
          label={t('common:profile.locality')}
          value={localityId}
          isSearchable
          placeholder={localities.isPending ? t('common:loading') : t('common:actions.select')}
          options={(localities.data?.items ?? []).map((locality) => ({
            value: locality.id,
            label: pick(locality.name),
            description: locality.postalCode ?? undefined,
          }))}
          onChange={setLocalityId}
          error={errors.locality ?? (localities.isError ? t(errorMessageKey(localities.error)) : null)}
        />
      ) : null}
      <Button label={t('common:profile.contactSupport')} variant="ghost" icon="help-buoy-outline" onPress={() => router.push('/support')} />
    </Screen>
  );
}
