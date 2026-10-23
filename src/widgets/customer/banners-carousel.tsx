import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { customerKeys } from '@/features/customer/model/query-keys';
import { api } from '@/shared/api/endpoints';
import type { Banner } from '@/shared/api/types';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { Text } from '@/shared/ui';
import { bannerHref } from './banner-link';

function BannerSlide({ banner, width }: { banner: Banner; width: number }): ReactNode {
  const theme = useTheme();
  const { pick } = useLocale();
  const href = banner.linkPath ? bannerHref(banner.linkPath) : null;
  const title = pick(banner.title);
  const body = pick(banner.body);
  return (
    <Pressable
      accessibilityRole={href ? 'link' : 'image'}
      accessibilityLabel={[title, body].filter(Boolean).join('. ')}
      disabled={!href}
      onPress={() => href && router.push(href)}
      style={[styles.slide, { width, backgroundColor: theme.colors.primary, borderRadius: theme.radius.lg }]}>
      {banner.imageUrl ? (
        <Image source={{ uri: banner.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : null}
      {banner.imageUrl ? <View style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: theme.colors.railDeep }]} /> : null}
      <View style={styles.caption}>
        <Text variant="heading" tone="onPrimary" numberOfLines={2}>
          {title}
        </Text>
        {body ? (
          <Text variant="caption" tone="onPrimary" numberOfLines={2}>
            {body}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Horizontally paged CMS banners. Renders nothing when there are none or they fail to load. */
export function BannersCarousel(): ReactNode {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const banners = useQuery({
    queryKey: customerKeys.banners,
    queryFn: () => api.public.banners('customer'),
    staleTime: 10 * 60 * 1000,
  });
  const items = banners.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} style={styles.wrapper}>
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}>
          {items.map((banner) => (
            <BannerSlide key={banner.id} banner={banner} width={width} />
          ))}
        </ScrollView>
      ) : null}
      {items.length > 1 ? (
        <View style={styles.dots} importantForAccessibility="no-hide-descendants">
          {items.map((banner, dot) => (
            <View
              key={banner.id}
              style={[styles.dot, { backgroundColor: dot === index ? theme.colors.primary : theme.colors.border }]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  slide: { height: 140, overflow: 'hidden', justifyContent: 'flex-end' },
  caption: { padding: 16, gap: 2 },
  scrim: { opacity: 0.4 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
