import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import { Icon } from '@/shared/ui';

/**
 * Back arrow for account screens. Screens pushed from a role tab are the first route of the
 * nested account stack, where the native header shows no back button on its own.
 */
export function HeaderBackButton({ tintColor }: { tintColor?: string }): ReactNode {
  const { t } = useTranslation();
  if (!router.canGoBack()) {
    return null;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common:actions.back')}
      onPress={() => router.back()}
      hitSlop={8}
      style={styles.button}>
      <Icon name="arrow-back" color={tintColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ button: { minWidth: 48, minHeight: 48, justifyContent: 'center' } });
