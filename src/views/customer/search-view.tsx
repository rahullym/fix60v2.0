import { useInfiniteQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProviderSummaryCard } from '@/entities/provider/provider-summary-card';
import { FilterSheet } from '@/features/customer/provider-search/filter-sheet';
import {
  activeFilterCount,
  defaultFilters,
  toSearchQuery,
  type SearchFilters,
} from '@/features/customer/provider-search/search-filters';
import { customerKeys } from '@/features/customer/model/query-keys';
import { useCatalog } from '@/features/customer/model/use-catalog';
import { useLocality } from '@/features/customer/model/use-locality';
import { useMe } from '@/features/customer/model/use-me';
import { SaveProviderButton } from '@/features/customer/save-provider/save-provider-button';
import { api } from '@/shared/api/endpoints';
import { formatSlot } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { Button, EmptyState, ErrorState, LoadingState, Notice, Row, Text } from '@/shared/ui';

/** Provider search for one service, with filters and infinite paging. */
export function SearchView(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const { locale, pick } = useLocale();
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();
  const me = useMe();
  const catalog = useCatalog();
  const service = catalog.serviceById(serviceId);
  const defaults = defaultFilters(me?.districtId ?? null, me?.localityId ?? null);
  const [filters, setFilters] = useState<SearchFilters>(defaults);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const locality = useLocality(filters.districtId, filters.localityId);

  const baseQuery = toSearchQuery(serviceId ?? '', filters);
  const query = useInfiniteQuery({
    queryKey: customerKeys.providersSearch(baseQuery),
    queryFn: ({ pageParam }) => api.providers.search({ ...baseQuery, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    enabled: Boolean(serviceId),
  });

  const title = service ? pick(service.name) : t('customer:search.title');
  if (!serviceId) {
    return (
      <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ title }} />
        <EmptyState
          icon="search-outline"
          title={t('customer:search.pickServiceTitle')}
          actionLabel={t('customer:search.pickService')}
          onAction={() => router.replace('/customer/browse')}
        />
      </SafeAreaView>
    );
  }

  const providers = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const filterCount = activeFilterCount(filters);
  const summary = [
    locality ? pick(locality.name) : t('customer:search.anywhere'),
    filters.date ? formatSlot(filters.date, filters.startTime ?? '09:00', locale) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const quickRequest = (): void => {
    router.push({ pathname: '/customer/requests/new', params: { serviceId } });
  };

  const header = (
    <View style={styles.headerBlock}>
      <Row style={styles.between}>
        <View style={styles.flex}>
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {summary}
          </Text>
          {query.isSuccess ? (
            <Text variant="label">{t('customer:search.resultCount', { count: total })}</Text>
          ) : null}
        </View>
        <Button
          label={filterCount > 0 ? t('customer:search.filtersCount', { count: filterCount }) : t('customer:search.filters')}
          icon="options-outline"
          variant="secondary"
          isCompact
          onPress={() => setIsFilterOpen(true)}
        />
      </Row>
      {!filters.localityId ? <Notice tone="info" body={t('customer:search.setAreaHint')} /> : null}
    </View>
  );

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title }} />
      <FlatList
        data={providers}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <ProviderSummaryCard
            provider={item}
            onPress={() =>
              router.push({ pathname: '/customer/providers/[code]', params: { code: item.code, serviceId } })
            }
            action={<SaveProviderButton code={item.code} name={item.displayName} isSaved={item.isSaved} />}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <LoadingState />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={query.refetch} />
          ) : (
            <EmptyState
              icon="people-outline"
              title={t('customer:search.emptyTitle')}
              body={t('customer:search.emptyBody')}
              actionLabel={t('customer:search.postQuick')}
              onAction={quickRequest}
            />
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.footer} />
          ) : providers.length > 0 && !query.hasNextPage ? (
            <View style={styles.footer}>
              <Text variant="caption" tone="muted" align="center">
                {t('customer:search.endOfList')}
              </Text>
              <Button label={t('customer:search.postQuick')} variant="ghost" icon="flash-outline" onPress={quickRequest} />
            </View>
          ) : undefined
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} />}
      />
      <FilterSheet
        isVisible={isFilterOpen}
        value={filters}
        defaults={defaults}
        onClose={() => setIsFilterOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setIsFilterOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16, gap: 12 },
  headerBlock: { gap: 12 },
  between: { justifyContent: 'space-between', alignItems: 'flex-start' },
  footer: { paddingVertical: 16, gap: 4 },
});
