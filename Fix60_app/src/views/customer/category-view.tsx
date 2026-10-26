import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ServiceRow } from '@/entities/service/service-row';
import { useCatalog } from '@/features/customer/model/use-catalog';
import { useLocale } from '@/shared/lib/use-locale';
import { EmptyState, ErrorState, LoadingState, Screen, Text } from '@/shared/ui';

/** Services in one category. */
export function CategoryView(): ReactNode {
  const { t } = useTranslation();
  const { pick } = useLocale();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const catalog = useCatalog();
  const category = catalog.categories.find((item) => item.slug === slug);

  return (
    <Screen onRefresh={catalog.query.refetch} isRefreshing={catalog.query.isRefetching}>
      <Stack.Screen options={{ title: category ? pick(category.name) : '' }} />
      {catalog.query.isLoading ? (
        <LoadingState />
      ) : catalog.query.isError ? (
        <ErrorState error={catalog.query.error} onRetry={catalog.query.refetch} />
      ) : !category ? (
        <EmptyState icon="alert-circle-outline" title={t('errors:notFound')} />
      ) : (
        <>
          {category.description ? <Text tone="muted">{pick(category.description)}</Text> : null}
          {category.services.length === 0 ? (
            <EmptyState icon="construct-outline" title={t('customer:category.emptyTitle')} body={t('customer:category.emptyBody')} />
          ) : (
            category.services.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                onPress={() => router.push({ pathname: '/customer/services/[slug]', params: { slug: service.slug } })}
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}
