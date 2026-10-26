import { Image } from 'expo-image';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authFlow } from '@/features/auth/model/auth-flow';
import { LanguageSwitch } from '@/features/language/language-switch';
import type { UserRole } from '@/shared/api/types';
import { useTheme } from '@/shared/theme/theme';
import { Card, Icon, Row, Text, type IconName } from '@/shared/ui';

const slides = [
  { key: 'welcome', image: require('../../../assets/images/intro/introone.jpg') },
  { key: 'verified', image: require('../../../assets/images/intro/introtwo.jpg') },
  { key: 'safe', image: require('../../../assets/images/intro/introthree.jpg') },
] as const;

function RoleCard({ role, icon, title, body }: { role: UserRole; icon: IconName; title: string; body: string }): ReactNode {
  const theme = useTheme();
  return (
    <Card
      accessibilityLabel={title}
      onPress={() => {
        authFlow.chooseRole(role);
        router.push(role === 'provider' ? '/provider-intro' : '/phone');
      }}>
      <Row gap={14}>
        <View style={[styles.iconBubble, { backgroundColor: role === 'customer' ? theme.colors.primaryLight : theme.colors.accentLight }]}>
          <Icon name={icon} size={24} color={role === 'customer' ? theme.colors.primary : theme.colors.accent} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyStrong">{title}</Text>
          <Text tone="muted" variant="caption">
            {body}
          </Text>
        </View>
        <Icon name="chevron-forward" color={theme.colors.textMuted} />
      </Row>
    </Card>
  );
}

/** First screen: Fix60 logo, intro photos, and the customer / provider choice. */
export function WelcomeView(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  const slideWidth = width - 40;
  const [index, setIndex] = useState(0);
  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.flex, { backgroundColor: theme.colors.surface }]}>
      {isFocused ? <StatusBar style="dark" /> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <Row style={styles.top}>
          <Image source={require('../../../assets/images/logo-wordmark.png')} style={styles.logo} contentFit="contain" accessibilityLabel="Fix60" />
          <LanguageSwitch />
        </Row>
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={slideWidth}
            decelerationRate="fast"
            onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / slideWidth))}>
            {slides.map((slide) => (
              <View key={slide.key} style={[styles.slide, { width: slideWidth }]}>
                <Image source={slide.image} style={styles.photo} contentFit="cover" accessibilityIgnoresInvertColors />
                <View style={styles.caption}>
                  <Text variant="title" style={styles.captionTitle}>
                    {t(`auth:welcome.slides.${slide.key}.title`)}
                  </Text>
                  <Text tone="muted" variant="caption">
                    {t(`auth:welcome.slides.${slide.key}.body`)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <Row gap={6} style={styles.dots}>
            {slides.map((slide, dotIndex) => (
              <View
                key={slide.key}
                style={[styles.dot, { backgroundColor: dotIndex === index ? theme.colors.primary : theme.colors.border, width: dotIndex === index ? 22 : 8 }]}
              />
            ))}
          </Row>
        </View>
        <Text variant="heading">{t('auth:welcome.question')}</Text>
        <RoleCard role="customer" icon="home-outline" title={t('auth:welcome.customerTitle')} body={t('auth:welcome.customerBody')} />
        <RoleCard role="provider" icon="briefcase-outline" title={t('auth:welcome.providerTitle')} body={t('auth:welcome.providerBody')} />
        <Text variant="caption" tone="muted" align="center">
          {t('auth:welcome.safetyNote')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, gap: 16 },
  top: { justifyContent: 'space-between' },
  logo: { width: 120, height: 45 },
  slide: { borderRadius: 16, overflow: 'hidden' },
  photo: { width: '100%', height: 230 },
  caption: { paddingTop: 12, gap: 4 },
  captionTitle: { fontSize: 22, lineHeight: 30 },
  dots: { justifyContent: 'center', marginTop: 12 },
  dot: { height: 8, borderRadius: 4 },
  iconBubble: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
