import type { QueryClient } from '@tanstack/react-query';
import type { BookingScope, ProviderSearchQuery } from '@/shared/api/types';

/** Query keys owned by the customer slice (roots per docs/conventions.md). */
export const customerKeys = {
  requests: ['requests'] as const,
  request: (code: string) => ['request', code] as const,
  bookings: (scope: BookingScope) => ['bookings', scope] as const,
  booking: (code: string) => ['booking', code] as const,
  providersSearch: (query: Omit<ProviderSearchQuery, 'page'>) => ['providers-search', query] as const,
  providerProfile: (code: string) => ['provider-profile', code] as const,
  savedProviders: ['saved-providers'] as const,
  categories: ['categories'] as const,
  service: (slug: string) => ['service', slug] as const,
  banners: ['banners', 'customer'] as const,
  districts: ['districts'] as const,
  localities: (districtId: string | null) => ['localities', districtId] as const,
  me: ['me'] as const,
  unreadNotifications: ['notifications', 'unread-count'] as const,
};

export type CustomerKeyRoot =
  | 'requests'
  | 'request'
  | 'bookings'
  | 'booking'
  | 'providers-search'
  | 'provider-profile'
  | 'saved-providers';

/** Invalidates every query under the given roots. */
export async function invalidateRoots(client: QueryClient, roots: CustomerKeyRoot[]): Promise<void> {
  await Promise.all(roots.map((root) => client.invalidateQueries({ queryKey: [root] })));
}
