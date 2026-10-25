import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/theme/theme';
import { Icon, Screen, Text } from '@/shared/ui';

/** Blue header block from the original Fix60 sign-in screens. */
export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }): ReactNode {
  const theme = useTheme();
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.header, { backgroundColor: theme.colors.primary, paddingTop: top + 12 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common:actions.back')}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
        hitSlop={12}
        style={styles.back}>
        <Icon name="arrow-back" color={theme.colors.onPrimary} />
      </Pressable>
      <Text variant="display" tone="onPrimary" style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text tone="onPrimary" style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/** Page for auth steps: blue header over a white sheet, with a pinned footer. */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}): ReactNode {
  const theme = useTheme();
  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.surface }]}>
      <AuthHeader title={title} subtitle={subtitle} />
      <Screen footer={footer} backgroundColor={theme.colors.surface} contentStyle={styles.content}>
        {children}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 28, gap: 6 },
  back: { width: 40, height: 40, justifyContent: 'center', marginBottom: 8, marginLeft: -4 },
  title: { fontSize: 30, lineHeight: 40 },
  subtitle: { opacity: 0.9 },
  content: { paddingTop: 28, paddingHorizontal: 20 },
});
