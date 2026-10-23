import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/shared/api/endpoints';
import type { Category, ItemList, ServiceSummary } from '@/shared/api/types';
import { customerKeys } from './query-keys';

export interface CatalogIndex {
  query: UseQueryResult<ItemList<Category>>;
  categories: Category[];
  services: ServiceSummary[];
  serviceById: (id: string | null | undefined) => ServiceSummary | undefined;
}

/** Categories (with nested services) plus lookups by id. */
export function useCatalog(): CatalogIndex {
  const query = useQuery({
    queryKey: customerKeys.categories,
    queryFn: api.catalog.categories,
    staleTime: 10 * 60 * 1000,
  });
  const categories = query.data?.items ?? [];
  const services = categories.flatMap((category) => category.services);
  return {
    query,
    categories,
    services,
    serviceById: (id) => (id ? services.find((service) => service.id === id) : undefined),
  };
}
