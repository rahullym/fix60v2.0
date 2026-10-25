import { Image } from 'expo-image';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ComponentRef, type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/theme/theme';
import { Button, Text } from '@/shared/ui';

const slides = [
  { key: 'earn', image: require('../../../assets/images/intro-provider/introone.jpg') },
  { key: 'time', image: require('../../../assets/images/intro-provider/introtwo.jpg') },
  { key: 'paid', image: require('../../../assets/images/intro-provider/introthree.jpg') },
] as const;

/** Provider intro pager from the original provider app, shown after choosing "I want to work". */
export function ProviderIntroView(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === slides.length - 1;

  const next = (): void => {
    if (isLast) {
      router.push('/phone');
      return;
    }
    pager.current?.scrollTo({ x: (index + 1) * width, animated: true });
    setIndex(index + 1);
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.surface }]}>
      {isFocused ? <StatusBar style="dark" /> : null}
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}>
        {slides.map((slide) => (
          <View key={slide.key} style={[styles.slide, { width }]}>
            <Image source={slide.image} style={[styles.image, { width: width - 56, height: (width - 56) * 1.1 }]} contentFit="contain" />
            <Text variant="display" align="center" style={styles.title}>
              {t(`auth:providerIntro.${slide.key}.title`)}
            </Text>
            <Text tone="muted" align="center" style={styles.body}>
              {t(`auth:providerIntro.${slide.key}.body`)}
            </Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {slides.map((slide, dotIndex) => (
          <View
            key={slide.key}
            style={[styles.dot, { width: dotIndex === index ? 24 : 12, backgroundColor: dotIndex === index ? theme.colors.primary : theme.colors.primaryLight }]}
          />
        ))}
      </View>
      <View style={styles.footer}>
        <Button label={isLast ? t('auth:providerIntro.getStarted') : t('common:actions.next')} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  slide: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 24, gap: 16 },
  image: { borderRadius: 16 },
  title: { fontSize: 30, lineHeight: 38 },
  body: { fontSize: 16, lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  dot: { height: 8, borderRadius: 4 },
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
});
