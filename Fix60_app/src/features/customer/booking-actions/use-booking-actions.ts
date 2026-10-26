import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/shared/api/endpoints';
import type { Booking } from '@/shared/api/types';
import { invalidateRoots } from '../model/query-keys';

export interface BookingActions {
  cancel: UseMutationResult<Booking, Error, string>;
  complete: UseMutationResult<Booking, Error, void>;
}

/** Customer mutations on a booking; both refresh booking + lists. */
export function useBookingActions(code: string): BookingActions {
  const client = useQueryClient();
  const refresh = (): Promise<void> => invalidateRoots(client, ['booking', 'bookings', 'request', 'requests']);
  const cancel = useMutation({
    mutationFn: (reason: string) => api.bookings.cancel(code, { reason }),
    onSuccess: refresh,
  });
  const complete = useMutation({
    mutationFn: () => api.bookings.complete(code),
    onSuccess: refresh,
  });
  return { cancel, complete };
}
