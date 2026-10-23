import { useQueries, useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/shared/api/endpoints';
import type {
  BookingScope,
  Category,
  ProviderApplication,
  ProviderSelf,
  ServiceDetail,
  ServiceSummary,
  Uuid,
  VerificationDocument,
} from '@/shared/api/types';

/** Query keys owned by the provider slice. */
export const providerKeys = {
  me: ['provider-me'] as const,
  application: ['application'] as const,
  documents: ['documents'] as const,
  availability: ['availability'] as const,
  invitations: (status: string = 'open') => ['invitations', status] as const,
  invitationsRoot: ['invitations'] as const,
  invitation: (id: string) => ['invitation', id] as const,
  bookings: (scope: BookingScope) => ['provider-bookings', scope] as const,
  bookingsRoot: ['provider-bookings'] as const,
  booking: (code: string) => ['provider-booking', code] as const,
  categories: ['categories'] as const,
  service: (slug: string) => ['service', slug] as const,
};

export function useProviderMe(): UseQueryResult<ProviderSelf> {
  return useQuery({ queryKey: providerKeys.me, queryFn: api.provider.me });
}

const POLLING_STATUSES = new Set(['submitted', 'under_review']);

/** Application; polls every 10s while it awaits a decision. */
export function useApplication(): UseQueryResult<ProviderApplication> {
  return useQuery({
    queryKey: providerKeys.application,
    queryFn: api.provider.application,
    refetchInterval: (query) => (POLLING_STATUSES.has(query.state.data?.status ?? '') ? 10_000 : false),
  });
}

export function useDocuments(): UseQueryResult<{ items: VerificationDocument[] }> {
  return useQuery({ queryKey: providerKeys.documents, queryFn: api.provider.documents });
}

export function useCategories(): UseQueryResult<{ items: Category[] }> {
  return useQuery({ queryKey: providerKeys.categories, queryFn: api.catalog.categories, staleTime: 10 * 60_000 });
}

/** Flat lookup of every catalog service by id. */
export function servicesById(categories: Category[] | undefined): Map<Uuid, ServiceSummary> {
  const map = new Map<Uuid, ServiceSummary>();
  for (const category of categories ?? []) {
    for (const service of category.services) {
      map.set(service.id, service);
    }
  }
  return map;
}

export interface SelectedServiceDetails {
  details: ServiceDetail[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Loads ServiceDetail (questions, required documents) for each selected service id. */
export function useSelectedServiceDetails(serviceIds: Uuid[]): SelectedServiceDetails {
  const categories = useCategories();
  const lookup = servicesById(categories.data?.items);
  const slugs = serviceIds.map((id) => lookup.get(id)?.slug).filter((slug): slug is string => Boolean(slug));
  const results = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: providerKeys.service(slug),
      queryFn: () => api.catalog.service(slug),
      staleTime: 10 * 60_000,
    })),
  });
  const failed = results.find((result) => result.error);
  return {
    details: results.map((result) => result.data).filter((detail): detail is ServiceDetail => Boolean(detail)),
    isLoading: categories.isLoading || results.some((result) => result.isLoading),
    error: categories.error ?? failed?.error ?? null,
    refetch: () => {
      void categories.refetch();
      results.forEach((result) => void result.refetch());
    },
  };
}

/** Invalidates everything a provider-side mutation can affect. */
export function invalidateProvider(queryClient: QueryClient, ...keys: (readonly unknown[])[]): void {
  for (const key of keys) {
    void queryClient.invalidateQueries({ queryKey: key });
  }
}
