import { router, Stack } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ServiceRow } from '@/entities/service/service-row';
import { useCatalog } from '@/features/customer/model/use-catalog';
import { useLocale } from '@/shared/lib/use-locale';
import { EmptyState, ErrorState, LoadingState, Screen, SectionHeader, TextField } from '@/shared/ui';

/** Service picker: type to filter every service across categories (matches English and Malayalam names). */
export function BrowseView(): ReactNode {
  const { t } = useTranslation();
  const { pick } = useLocale();
  const catalog = useCatalog();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();

  const groups = catalog.categories
    .map((category) => ({
      category,
      services: category.services.filter(
        (service) =>
          !needle ||
          Object.values(service.name).some((name) => name?.toLowerCase().includes(needle)) ||
          Object.values(category.name).some((name) => name?.toLowerCase().includes(needle)),
      ),
    }))
    .filter((group) => group.services.length > 0);

  return (
    <Screen onRefresh={catalog.query.refetch} isRefreshing={catalog.query.isRefetching}>
      <Stack.Screen options={{ title: t('customer:browse.title') }} />
      <TextField
        label={t('customer:browse.label')}
        value={query}
        onChangeText={setQuery}
        placeholder={t('customer:browse.placeholder')}
        autoFocus
        returnKeyType="search"
        autoCorrect={false}
      />
      {catalog.query.isLoading ? (
        <LoadingState />
      ) : catalog.query.isError ? (
        <ErrorState error={catalog.query.error} onRetry={catalog.query.refetch} />
      ) : groups.length === 0 ? (
        <EmptyState icon="search-outline" title={t('customer:browse.emptyTitle')} body={t('customer:browse.emptyBody')} />
      ) : (
        groups.map(({ category, services }) => [
          <SectionHeader key={`h-${category.id}`} title={pick(category.name)} />,
          ...services.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              onPress={() => router.push({ pathname: '/customer/services/[slug]', params: { slug: service.slug } })}
            />
          )),
        ])
      )}
    </Screen>
  );
}
