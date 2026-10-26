'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AdminMe, AdminPermission } from '@fix60/shared';
import { api } from '@/shared/api/client';

export const adminMeKey = ['admin-me'] as const;

/** The signed-in admin. */
export function useAdminMe(): UseQueryResult<AdminMe> {
  return useQuery({ queryKey: adminMeKey, queryFn: () => api<AdminMe>('GET', '/admin/auth/me'), staleTime: 60_000 });
}

/** Super Admin holds every permission. */
export function hasPermission(admin: AdminMe | undefined, permission: AdminPermission): boolean {
  return Boolean(admin && (admin.isSuper || admin.permissions.includes(permission)));
}
