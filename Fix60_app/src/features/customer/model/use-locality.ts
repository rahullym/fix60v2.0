import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/endpoints';
import type { Locality } from '@/shared/api/types';
import { customerKeys } from './query-keys';

/** Resolves a locality by id within its district (null while loading or unknown). */
export function useLocality(districtId: string | null | undefined, localityId: string | null | undefined): Locality | null {
  const query = useQuery({
    queryKey: customerKeys.localities(districtId ?? null),
    queryFn: () => api.locations.localities(districtId!),
    enabled: Boolean(districtId && localityId),
    staleTime: 30 * 60 * 1000,
  });
  return query.data?.items.find((locality) => locality.id === localityId) ?? null;
}
