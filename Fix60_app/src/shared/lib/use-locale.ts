import { useTranslation } from 'react-i18next';
import type { LocalizedText } from '../api/types';
import { localized } from './format';

/** Active locale plus a bound `localized()` for LocalizedText values. */
export function useLocale(): { locale: string; pick: (text: LocalizedText | null | undefined) => string } {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'ml' ? 'ml' : 'en';
  return { locale, pick: (text) => localized(text, locale) };
}
