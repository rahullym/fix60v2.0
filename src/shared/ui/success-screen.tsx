import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../theme/palette';
import { useTheme } from '../theme/theme';
import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';

/** Full blue confirmation screen (old welcome / onboarding_success): check circle + big white headline. */
export function SuccessScreen({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body?: string;
  actionLabel: string;
  onAction: () => void;
}): ReactNode {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.primary }]}>
      <Animated.View entering={FadeIn.delay(300).duration(900)} style={styles.center}>
        <View style={styles.circle}>
          <Icon name="checkmark-sharp" size={60} color={palette.successCheck} />
        </View>
        <Text variant="display" tone="onPrimary" align="center" style={styles.title}>
          {title}
        </Text>
        {body ? (
          <Text tone="onPrimary" align="center" style={styles.body}>
            {body}
          </Text>
        ) : null}
      </Animated.View>
      <View style={styles.footer}>
        <Button label={actionLabel} onPress={onAction} variant="secondary" style={styles.cta} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 28 },
  circle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.successCircle,
  },
  title: { fontSize: 34, lineHeight: 42 },
  body: { opacity: 0.9 },
  footer: { padding: 20 },
  cta: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
});
