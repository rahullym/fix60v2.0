import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BIO_MAX, type FieldErrors, hasErrors, validateExperience } from '@/entities/application/validate-step';
import { useSaveStep } from '@/features/provider/application/use-save-step';
import type { QualificationKind } from '@/shared/api/types';
import { Button, Card, Chip, Row, Stepper, Text, TextField } from '@/shared/ui';
import { WizardFrame } from '@/widgets/provider/wizard-frame';
import type { StepProps } from './step-props';

export const LANGUAGE_OPTIONS = ['Malayalam', 'English', 'Tamil', 'Hindi', 'Kannada', 'Other'] as const;
const KINDS: QualificationKind[] = ['qualification', 'training', 'certification', 'work_experience'];

interface QualificationForm {
  id: number;
  kind: QualificationKind;
  title: string;
  issuer: string;
  year: string;
}

/** Step 5: overall experience, bio, previous work, languages and qualifications. */
export function ExperienceStep({ application, isEditable, returnTo }: StepProps): ReactNode {
  const { t } = useTranslation();
  const draft = application.draft.experience;
  const save = useSaveStep('experience', returnTo);

  const [years, setYears] = useState(draft?.yearsExperience ?? 0);
  const [bio, setBio] = useState(draft?.bio ?? '');
  const [previousWork, setPreviousWork] = useState(draft?.previousWork ?? '');
  const [languages, setLanguages] = useState<string[]>(draft?.languages ?? []);
  const [qualifications, setQualifications] = useState<QualificationForm[]>(
    (draft?.qualifications ?? []).map((item, index) => ({
      id: index,
      kind: item.kind,
      title: item.title,
      issuer: item.issuer ?? '',
      year: item.year === null ? '' : String(item.year),
    })),
  );
  const [nextId, setNextId] = useState(qualifications.length);
  const [errors, setErrors] = useState<FieldErrors>({});

  const toggleLanguage = (language: string): void => {
    setLanguages((current) => (current.includes(language) ? current.filter((item) => item !== language) : [...current, language]));
  };

  const updateQualification = (id: number, patch: Partial<QualificationForm>): void => {
    setQualifications((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addQualification = (): void => {
    setQualifications((current) => [...current, { id: nextId, kind: 'qualification', title: '', issuer: '', year: '' }]);
    setNextId(nextId + 1);
  };

  const submit = (): void => {
    const data = {
      yearsExperience: years,
      bio: bio.trim() || null,
      previousWork: previousWork.trim() || null,
      languages,
      qualifications: qualifications.map((item) => ({
        kind: item.kind,
        title: item.title.trim(),
        issuer: item.issuer.trim() || null,
        year: item.year ? Number(item.year) : null,
      })),
    };
    const next = validateExperience(data);
    setErrors(next);
    if (!hasErrors(next)) {
      save.mutate(data);
    }
  };

  const error = (key: string): string | null => (errors[key] ? t(errors[key]) : null);

  return (
    <WizardFrame
      step="experience"
      application={application}
      isEditable={isEditable}
      onContinue={submit}
      isSaving={save.isPending}
      saveError={save.error}
      hasFieldErrors={hasErrors(errors)}>
      <Stepper label={t('provider:experience.years')} value={years} onChange={setYears} min={0} max={60} />
      <TextField
        label={t('provider:experience.bio')}
        hint={t('provider:experience.bioHint')}
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={BIO_MAX}
        editable={isEditable}
        error={error('bio')}
      />
      <TextField
        label={t('provider:experience.previousWork')}
        hint={t('provider:experience.previousWorkHint')}
        value={previousWork}
        onChangeText={setPreviousWork}
        multiline
        maxLength={BIO_MAX}
        editable={isEditable}
        error={error('previousWork')}
      />
      <View style={styles.group}>
        <Text variant="label" tone="muted">
          {t('provider:experience.languages')}
        </Text>
        <View style={styles.chips}>
          {LANGUAGE_OPTIONS.map((language) => (
            <Chip
              key={language}
              label={t(`provider:languages.${language}`)}
              isSelected={languages.includes(language)}
              onPress={() => isEditable && toggleLanguage(language)}
            />
          ))}
        </View>
        {error('languages') ? (
          <Text variant="caption" tone="danger">
            {error('languages')}
          </Text>
        ) : null}
      </View>

      <Text variant="heading">{t('provider:experience.qualificationsTitle')}</Text>
      <Text variant="caption" tone="muted">
        {t('provider:experience.qualificationsHint')}
      </Text>
      {qualifications.map((item, index) => (
        <Card key={item.id}>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {KINDS.map((kind) => (
              <Chip
                key={kind}
                label={t(`provider:qualificationKind.${kind}`)}
                isSelected={item.kind === kind}
                onPress={() => isEditable && updateQualification(item.id, { kind })}
              />
            ))}
          </View>
          <TextField
            label={t('provider:experience.qualificationTitle')}
            value={item.title}
            onChangeText={(title) => updateQualification(item.id, { title })}
            maxLength={120}
            editable={isEditable}
            error={error(`qualifications.${index}.title`)}
          />
          <TextField
            label={t('provider:experience.issuer')}
            value={item.issuer}
            onChangeText={(issuer) => updateQualification(item.id, { issuer })}
            maxLength={120}
            editable={isEditable}
          />
          <TextField
            label={t('provider:experience.year')}
            value={item.year}
            onChangeText={(year) => updateQualification(item.id, { year: year.replace(/\D/g, '').slice(0, 4) })}
            keyboardType="number-pad"
            maxLength={4}
            editable={isEditable}
            error={error(`qualifications.${index}.year`)}
          />
          {isEditable ? (
            <Row style={styles.end}>
              <Button
                label={t('common:actions.remove')}
                variant="ghost"
                icon="trash-outline"
                onPress={() => setQualifications((current) => current.filter((entry) => entry.id !== item.id))}
                accessibilityHint={item.title || t('provider:experience.qualificationTitle')}
              />
            </Row>
          ) : null}
        </Card>
      ))}
      {isEditable ? (
        <Button label={t('provider:experience.addQualification')} variant="secondary" icon="add" onPress={addQualification} />
      ) : null}
    </WizardFrame>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  end: { justifyContent: 'flex-end' },
});
