import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '../api/api-error';

/** Retries network/5xx only; 4xx errors surface immediately. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) =>
        failureCount < 2 && (!isApiError(error) || error.status === 0 || error.status >= 500),
    },
    mutations: { retry: false },
  },
});
