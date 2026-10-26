import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import { currentLocale, setLocale } from '@/shared/i18n';
import { useTheme } from '@/shared/theme/theme';
import { Icon, Text } from '@/shared/ui';

/** Compact EN ⇄ മലയാളം toggle. */
export function LanguageSwitch(): ReactNode {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const next = i18n.language === 'ml' ? 'en' : 'ml';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common:language.title')}
      onPress={() => setLocale(currentLocale() === 'ml' ? 'en' : 'ml')}
      style={[styles.pill, { borderColor: theme.colors.border }]}
      hitSlop={8}>
      <Icon name="language-outline" size={18} />
      <Text variant="label">{t(`common:language.${next}`)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, minHeight: 40 },
});
