import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/endpoints';
import type { Me } from '@/shared/api/types';
import { useSession } from '@/shared/auth/session';
import { customerKeys } from './query-keys';

/** Current user: fresh from GET /me, falling back to the cached session profile. */
export function useMe(): Me | null {
  const { user } = useSession();
  const query = useQuery({ queryKey: customerKeys.me, queryFn: api.me.get, staleTime: 5 * 60 * 1000 });
  return query.data ?? user;
}

/** First word of a full name. */
export function firstName(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? '';
}
