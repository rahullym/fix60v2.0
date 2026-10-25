import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type FieldErrors, hasErrors, validatePersonal } from '@/entities/application/validate-step';
import { useSaveStep } from '@/features/provider/application/use-save-step';
import { toIndianE164 } from '@/shared/auth/phone-auth';
import { useSession } from '@/shared/auth/session';
import type { Gender } from '@/shared/api/types';
import { formatDate, toIsoDate } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Chip, DateTimeField, Text, TextField } from '@/shared/ui';
import { WizardFrame } from '@/widgets/provider/wizard-frame';
import type { StepProps } from './step-props';

const GENDERS: Gender[] = ['female', 'male', 'other', 'prefer_not_to_say'];

function nationalDigits(phone: string | null | undefined): string {
  return (phone ?? '').replace(/^\+91/, '').replace(/\D/g, '');
}

/** Step 1: name, date of birth (18+), gender, WhatsApp, email. */
export function PersonalStep({ application, isEditable, returnTo }: StepProps): ReactNode {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { user } = useSession();
  const draft = application.draft.personal;
  const save = useSaveStep('personal', returnTo);

  const [fullName, setFullName] = useState(draft?.fullName ?? user?.fullName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(draft?.dateOfBirth ?? user?.dateOfBirth ?? null);
  const [gender, setGender] = useState<Gender | null>(draft?.gender ?? user?.gender ?? null);
  const [whatsapp, setWhatsapp] = useState(nationalDigits(draft?.whatsappPhone ?? user?.whatsappPhone));
  const [email, setEmail] = useState(draft?.email ?? user?.email ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = (): void => {
    const data = {
      fullName: fullName.trim(),
      dateOfBirth: dateOfBirth ?? '',
      gender,
      whatsappPhone: whatsapp ? (toIndianE164(whatsapp) ?? whatsapp) : null,
      email: email.trim() || null,
    };
    const next = validatePersonal(data);
    setErrors(next);
    if (!hasErrors(next)) {
      save.mutate(data);
    }
  };

  const error = (key: string): string | null => (errors[key] ? t(errors[key]) : null);

  return (
    <WizardFrame
      step="personal"
      application={application}
      isEditable={isEditable}
      onContinue={submit}
      isSaving={save.isPending}
      saveError={save.error}
      hasFieldErrors={hasErrors(errors)}>
      <TextField
        label={t('provider:personal.fullName')}
        value={fullName}
        onChangeText={setFullName}
        autoComplete="name"
        textContentType="name"
        editable={isEditable}
        error={error('fullName')}
      />
      <DateTimeField
        label={t('provider:personal.dateOfBirth')}
        mode="date"
        initialDate={new Date(new Date().getFullYear() - 25, 0, 1)}
        value={dateOfBirth ? new Date(`${dateOfBirth}T00:00:00+05:30`) : null}
        displayValue={dateOfBirth ? formatDate(dateOfBirth, locale) : null}
        onChange={(date) => (isEditable ? setDateOfBirth(toIsoDate(date)) : undefined)}
        maximumDate={new Date()}
        error={error('dateOfBirth')}
      />
      <Text variant="caption" tone="muted">
        {t('provider:personal.adultHint')}
      </Text>
      <View style={styles.group}>
        <Text variant="label" tone="muted">
          {t('provider:personal.genderOptional')}
        </Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {GENDERS.map((value) => (
            <Chip
              key={value}
              label={t(`provider:gender.${value}`)}
              isSelected={gender === value}
              onPress={() => (isEditable ? setGender(gender === value ? null : value) : undefined)}
            />
          ))}
        </View>
      </View>
      <TextField
        label={t('provider:personal.whatsappOptional')}
        hint={t('provider:personal.whatsappHint')}
        prefix="🇮🇳 +91"
        value={whatsapp}
        onChangeText={(text) => setWhatsapp(text.replace(/\D/g, '').slice(0, 10))}
        keyboardType="phone-pad"
        maxLength={10}
        editable={isEditable}
        error={error('whatsappPhone')}
      />
      <TextField
        label={t('provider:personal.emailOptional')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={isEditable}
        error={error('email')}
      />
    </WizardFrame>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
