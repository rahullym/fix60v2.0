import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Locale } from '../api/types';
import { resources } from './resources';

const LOCALE_KEY = 'fix60.locale';
export const supportedLocales: Locale[] = ['en', 'ml'];
export const namespaces = ['common', 'errors', 'auth', 'customer', 'provider'] as const;

function deviceLocale(): Locale {
  const code = getLocales()[0]?.languageCode;
  return code === 'ml' ? 'ml' : 'en';
}

i18next.use(initReactI18next).init({
  resources,
  lng: deviceLocale(),
  fallbackLng: 'en',
  ns: [...namespaces],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Restores the user's saved language (falls back to device language). */
export async function restoreLocale(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(LOCALE_KEY);
    if (saved === 'en' || saved === 'ml') {
      await i18next.changeLanguage(saved);
    }
  } catch {
    // Device language stays active.
  }
}

export async function setLocale(locale: Locale): Promise<void> {
  await i18next.changeLanguage(locale);
  try {
    await AsyncStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // Not persisted; still applied for this session.
  }
}

export function currentLocale(): Locale {
  return i18next.language === 'ml' ? 'ml' : 'en';
}

export { i18next };
