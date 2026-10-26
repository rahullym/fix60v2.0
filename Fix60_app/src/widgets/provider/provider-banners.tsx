import { useQuery } from '@tanstack/react-query';
import { router, usePathname, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { api } from '@/shared/api/endpoints';
import { useLocale } from '@/shared/lib/use-locale';
import { Card, Text } from '@/shared/ui';

/** CMS banners for providers. Silent when there are none or they fail to load. */
export function ProviderBanners(): ReactNode {
  const { pick } = useLocale();
  const pathname = usePathname();
  const banners = useQuery({
    queryKey: ['banners', 'provider'],
    queryFn: () => api.public.banners('provider'),
    staleTime: 10 * 60_000,
  });
  const items = banners.data?.items ?? [];
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={styles.list}>
      {items.map((banner) => {
        const title = pick(banner.title);
        const linkPath = banner.linkPath && banner.linkPath.replace(/\/+$/, '') !== pathname.replace(/\/+$/, '') ? banner.linkPath : null;
        return (
          <Card
            key={banner.id}
            accessibilityLabel={title}
            onPress={linkPath ? () => router.push(linkPath as Href) : undefined}>
            <Text variant="bodyStrong">{title}</Text>
            {banner.body ? (
              <Text variant="caption" tone="muted">
                {pick(banner.body)}
              </Text>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
});
