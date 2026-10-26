'use client';

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import type { PublicBranding } from '@fix60/shared';
import { api, ApiError } from '../api/client';
import { applyThemeTokens } from './apply-theme';

function BrandingTheme(): null {
  const branding = useQuery({
    queryKey: ['branding'],
    queryFn: () => api<PublicBranding>('GET', '/branding'),
    staleTime: 60 * 60 * 1000,
  });
  useEffect(() => {
    if (branding.data) {
      applyThemeTokens(branding.data.theme);
    }
  }, [branding.data]);
  return null;
}

/** App-wide client providers: TanStack Query + live branding theme (always on). */
export function Providers({ children }: { children: ReactNode }): ReactNode {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: (count, error) =>
              count < 2 && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500),
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <BrandingTheme />
      {children}
    </QueryClientProvider>
  );
}
