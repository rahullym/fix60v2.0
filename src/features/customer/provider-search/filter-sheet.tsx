import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProviderFormat } from '@/entities/provider/use-provider-format';
import { formatDate, formatTime } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { Button, Chip, DateTimeField, Icon, Row, Screen, Stepper, Text, TextField } from '@/shared/ui';
import { LocationFields } from '../location/location-fields';
import { dateFromIso, dateFromSlot, toClockTime, toIsoDate, todayIso } from '../model/slot';
import { MAX_DURATION_HOURS, SEARCH_LANGUAGES, type SearchFilters } from './search-filters';

/** Full-screen filter editor. Edits a draft; Apply commits it. */
export function FilterSheet({
  isVisible,
  value,
  defaults,
  onApply,
  onClose,
}: {
  isVisible: boolean;
  value: SearchFilters;
  defaults: SearchFilters;
  onApply: (next: SearchFilters) => void;
  onClose: () => void;
}): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const { locale } = useLocale();
  const format = useProviderFormat();
  const [draft, setDraft] = useState<SearchFilters>(value);
  const [budgetText, setBudgetText] = useState(value.maxBudget ? String(value.maxBudget) : '');
  const [wasVisible, setWasVisible] = useState(isVisible);

  if (isVisible !== wasVisible) {
    setWasVisible(isVisible);
    if (isVisible) {
      setDraft(value);
      setBudgetText(value.maxBudget ? String(value.maxBudget) : '');
    }
  }

  const update = (patch: Partial<SearchFilters>): void => setDraft((current) => ({ ...current, ...patch }));
  const timeDate = draft.date && draft.startTime ? dateFromSlot(draft.date, draft.startTime) : null;

  const apply = (): void => {
    const budget = Number.parseInt(budgetText.replace(/\D/g, ''), 10);
    onApply({ ...draft, maxBudget: Number.isFinite(budget) && budget > 0 ? budget : null });
  };

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        edges={['top']}
        style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        <Text variant="heading" style={styles.flex}>
          {t('customer:search.filters')}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common:actions.close')} onPress={onClose} style={styles.close}>
          <Icon name="close" />
        </Pressable>
      </SafeAreaView>
      <Screen
        edges={['bottom']}
        footer={
          <Row gap={12}>
            <Button
              label={t('customer:search.reset')}
              variant="secondary"
              onPress={() => {
                setDraft(defaults);
                setBudgetText('');
              }}
              style={styles.flex}
            />
            <Button label={t('customer:search.apply')} onPress={apply} style={styles.flex} />
          </Row>
        }>
        <Text variant="bodyStrong">{t('customer:search.where')}</Text>
        <LocationFields
          districtId={draft.districtId}
          localityId={draft.localityId}
          onChange={(next) => update(next)}
        />

        <Text variant="bodyStrong">{t('customer:search.when')}</Text>
        <DateTimeField
          label={t('customer:form.date')}
          mode="date"
          value={draft.date ? dateFromIso(draft.date) : null}
          displayValue={draft.date ? formatDate(draft.date, locale) : null}
          minimumDate={dateFromIso(todayIso())}
          onChange={(next) => update({ date: toIsoDate(next) })}
        />
        <DateTimeField
          label={t('customer:form.startTime')}
          mode="time"
          value={timeDate}
          displayValue={timeDate ? formatTime(timeDate, locale) : null}
          onChange={(next) => update({ startTime: toClockTime(next), date: draft.date ?? todayIso() })}
        />
        {draft.date ? (
          <>
            <Stepper
              label={t('customer:form.duration')}
              value={draft.durationHours}
              min={1}
              max={MAX_DURATION_HOURS}
              onChange={(durationHours) => update({ durationHours })}
              suffix={t('customer:form.hoursSuffix')}
            />
            <Button
              label={t('customer:search.anyTime')}
              variant="ghost"
              icon="close-circle-outline"
              onPress={() => update({ date: null, startTime: null })}
            />
          </>
        ) : (
          <Text variant="caption" tone="muted">
            {t('customer:search.anyTimeHint')}
          </Text>
        )}

        <TextField
          label={t('customer:search.maxBudget')}
          value={budgetText}
          onChangeText={(text) => setBudgetText(text.replace(/\D/g, ''))}
          keyboardType="number-pad"
          prefix="₹"
          placeholder={t('customer:search.anyBudget')}
          hint={t('customer:search.perHour')}
          maxLength={6}
        />

        <Stepper
          label={t('customer:search.minExperience')}
          value={draft.minExperience}
          min={0}
          max={30}
          onChange={(minExperience) => update({ minExperience })}
          suffix={t('customer:search.yearsSuffix')}
        />

        <Text variant="label" tone="muted">
          {t('customer:search.language')}
        </Text>
        <Row gap={8} style={styles.wrap}>
          <Chip label={t('customer:search.anyLanguage')} isSelected={draft.language === null} onPress={() => update({ language: null })} />
          {SEARCH_LANGUAGES.map((code) => (
            <Chip
              key={code}
              label={format.languageLabel(code)}
              isSelected={draft.language === code}
              onPress={() => update({ language: draft.language === code ? null : code })}
            />
          ))}
        </Row>
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flexWrap: 'wrap' },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingTop: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
