import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { api } from '@/shared/api/endpoints';
import type { Locale } from '@/shared/api/types';
import { session } from '@/shared/auth/session';
import { setLocale, supportedLocales } from '@/shared/i18n';
import { Button, Row } from '@/shared/ui';

/** Applies a locale on this device and saves it to the profile (best effort). */
export async function changeLanguage(locale: Locale): Promise<void> {
  await setLocale(locale);
  if (!session.getState().tokens) {
    return;
  }
  try {
    const me = await api.me.update({ preferredLocale: locale });
    await session.setUser(me);
  } catch {
    // The device keeps the choice; the profile catches up on the next change.
  }
}

/** English / Malayalam picker for settings. */
export function LanguageSetting(): ReactNode {
  const { t, i18n } = useTranslation();
  const active: Locale = i18n.language === 'ml' ? 'ml' : 'en';
  return (
    <Row gap={12}>
      {supportedLocales.map((locale) => (
        <Button
          key={locale}
          label={t(`common:language.${locale}`)}
          variant={locale === active ? 'primary' : 'secondary'}
          icon={locale === active ? 'checkmark' : undefined}
          onPress={() => {
            if (locale !== active) {
              void changeLanguage(locale);
            }
          }}
          accessibilityHint={t('common:language.title')}
          style={styles.flex}
        />
      ))}
    </Row>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
