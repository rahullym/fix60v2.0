import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authFlow } from '@/features/auth/model/auth-flow';
import { api } from '@/shared/api/endpoints';
import type { RegisterRequest } from '@/shared/api/types';
import { session } from '@/shared/auth/session';
import { toIndianE164 } from '@/shared/auth/phone-auth';
import { currentLocale } from '@/shared/i18n';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { ageFrom, formatDate, localized, toIsoDate } from '@/shared/lib/format';
import { Button, Checkbox, DateTimeField, Notice, Screen, SelectField, Text, TextField } from '@/shared/ui';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PolicyLink({ slug, label }: { slug: string; label: string }): ReactNode {
  return (
    <Link href={{ pathname: '/policy/[slug]', params: { slug } }}>
      <Text tone="primary" variant="bodyStrong">
        {label}
      </Text>
    </Link>
  );
}

/** Completes signup for a verified phone: profile basics + mandatory consents. */
export function RegisterView(): ReactNode {
  const { t } = useTranslation();
  const locale = currentLocale();
  const { role, phone } = authFlow.get();
  const isProvider = role === 'provider';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [confirmsAdult, setConfirmsAdult] = useState(false);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [localityId, setLocalityId] = useState<string | null>(null);
  const [acceptsPolicies, setAcceptsPolicies] = useState(false);
  const [serviceCommunications, setServiceCommunications] = useState(true);
  const [whatsappUpdates, setWhatsappUpdates] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const districts = useQuery({ queryKey: ['districts'], queryFn: api.locations.districts, enabled: !isProvider });
  const localities = useQuery({
    queryKey: ['localities', districtId],
    queryFn: () => api.locations.localities(districtId!),
    enabled: !isProvider && Boolean(districtId),
  });

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = t('auth:register.errors.fullName');
    if (email && !EMAIL_PATTERN.test(email.trim())) next.email = t('auth:register.errors.email');
    if (whatsapp && !toIndianE164(whatsapp)) next.whatsapp = t('errors:phone.invalid_phone');
    if (isProvider) {
      if (!dateOfBirth) next.dateOfBirth = t('auth:register.errors.dateOfBirth');
      else if (ageFrom(toIsoDate(dateOfBirth)) < 18) next.dateOfBirth = t('errors:underage');
      if (!confirmsAdult) next.confirmsAdult = t('auth:register.errors.confirmsAdult');
    }
    if (!acceptsPolicies) next.policies = t('errors:consentRequired');
    return next;
  };

  const submit = async (): Promise<void> => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const idToken = await authFlow.idTokenForRegistration();
      const consents = {
        terms: true,
        privacy: true,
        safetyPolicy: true,
        serviceCommunications,
        whatsappUpdates,
      } as const;
      const shared = {
        idToken,
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        whatsappPhone: whatsapp ? (toIndianE164(whatsapp) ?? undefined) : undefined,
        preferredLocale: locale,
        consents,
      };
      const body: RegisterRequest = isProvider
        ? { ...shared, role: 'provider', dateOfBirth: toIsoDate(dateOfBirth!), confirmsAdult: true }
        : { ...shared, role: 'customer', districtId: districtId ?? undefined, localityId: localityId ?? undefined };
      const { user, ...tokens } = await api.auth.register(body);
      await session.signIn(tokens, user);
    } catch (error) {
      setSubmitError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const maxBirthDate = new Date();
  maxBirthDate.setFullYear(maxBirthDate.getFullYear() - 18);

  return (
    <Screen footer={<Button label={t('auth:register.submit')} onPress={submit} isLoading={isSubmitting} />}>
      <Text variant="title">{t(isProvider ? 'auth:register.titleProvider' : 'auth:register.titleCustomer')}</Text>
      <Text tone="muted">{t('auth:register.verifiedAs', { phone })}</Text>

      <TextField
        label={t('auth:register.fullName')}
        value={fullName}
        onChangeText={setFullName}
        autoComplete="name"
        textContentType="name"
        error={errors.fullName}
      />
      {isProvider ? (
        <>
          <DateTimeField
            label={t('auth:register.dateOfBirth')}
            mode="date"
            initialDate={new Date(new Date().getFullYear() - 25, 0, 1)}
            value={dateOfBirth}
            displayValue={dateOfBirth ? formatDate(dateOfBirth, locale) : null}
            onChange={setDateOfBirth}
            maximumDate={new Date()}
            error={errors.dateOfBirth}
          />
          <Checkbox
            isChecked={confirmsAdult}
            onChange={setConfirmsAdult}
            label={t('auth:register.confirmsAdult')}
            error={errors.confirmsAdult}
          />
        </>
      ) : null}
      <TextField
        label={t('auth:register.emailOptional')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
      />
      <TextField
        label={t('auth:register.whatsappOptional')}
        hint={t('auth:register.whatsappHint')}
        prefix="+91"
        value={whatsapp}
        onChangeText={(text) => setWhatsapp(text.replace(/\D/g, '').slice(0, 10))}
        keyboardType="phone-pad"
        maxLength={10}
        error={errors.whatsapp}
      />
      {!isProvider ? (
        <>
          <SelectField
            label={t('auth:register.district')}
            value={districtId}
            onChange={(value) => {
              setDistrictId(value);
              setLocalityId(null);
            }}
            options={(districts.data?.items ?? []).map((district) => ({ value: district.id, label: localized(district.name, locale) }))}
          />
          {districtId ? (
            <SelectField
              label={t('auth:register.locality')}
              value={localityId}
              onChange={setLocalityId}
              isSearchable
              options={(localities.data?.items ?? []).map((locality) => ({
                value: locality.id,
                label: localized(locality.name, locale),
                description: locality.postalCode ?? undefined,
              }))}
            />
          ) : null}
        </>
      ) : null}

      <Checkbox
        isChecked={acceptsPolicies}
        onChange={setAcceptsPolicies}
        label={t('auth:register.acceptPolicies')}
        error={errors.policies}>
        <Text>
          {t('auth:register.acceptPrefix')} <PolicyLink slug="terms" label={t('common:settings.terms')} />,{' '}
          <PolicyLink slug="privacy" label={t('common:settings.privacyPolicy')} /> {t('auth:register.and')}{' '}
          <PolicyLink slug="safety-policy" label={t('common:settings.safetyPolicy')} />
        </Text>
      </Checkbox>
      <Checkbox
        isChecked={serviceCommunications}
        onChange={setServiceCommunications}
        label={t('common:consents.service_communications')}
      />
      <Checkbox isChecked={whatsappUpdates} onChange={setWhatsappUpdates} label={t('common:consents.whatsapp_updates')} />

      {submitError ? <Notice tone="danger" body={t(errorMessageKey(submitError))} /> : null}
    </Screen>
  );
}
