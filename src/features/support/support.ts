import { type UseMutationResult, type UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/endpoints';
import type {
  CreateTicketRequest,
  Faq,
  ItemList,
  OrganizationSettings,
  SupportTicket,
  SupportTicketDetail,
  SupportTicketStatus,
  UserRole,
} from '@/shared/api/types';
import type { PillTone } from '@/shared/ui';

export const ticketStatusTone: Record<SupportTicketStatus, PillTone> = {
  open: 'info',
  awaiting_user: 'accent',
  resolved: 'neutral',
};

export function useTickets(): UseQueryResult<ItemList<SupportTicket>> {
  return useQuery({ queryKey: ['support-tickets'], queryFn: api.support.list });
}

/** One ticket; polls every 10 s while `isPolling` (the screen is focused). */
export function useTicket(code: string, isPolling: boolean): UseQueryResult<SupportTicketDetail> {
  return useQuery({
    queryKey: ['support-ticket', code],
    queryFn: () => api.support.get(code),
    enabled: Boolean(code),
    refetchInterval: isPolling ? 10_000 : false,
  });
}

export function useCreateTicket(): UseMutationResult<SupportTicketDetail, Error, CreateTicketRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTicketRequest) => api.support.create(body),
    onSuccess: (ticket) => {
      queryClient.setQueryData(['support-ticket', ticket.code], ticket);
      return queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}

export function useReplyTicket(code: string): UseMutationResult<SupportTicketDetail, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.support.reply(code, body),
    onSuccess: (ticket) => {
      queryClient.setQueryData(['support-ticket', code], ticket);
      return queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}

/** Public support contacts and grievance officer. */
export function useSupportContacts(): UseQueryResult<OrganizationSettings> {
  return useQuery({ queryKey: ['public-settings'], queryFn: api.public.settings, staleTime: 60 * 60 * 1000 });
}

export function useFaqs(role: UserRole): UseQueryResult<ItemList<Faq>> {
  return useQuery({ queryKey: ['faqs', role], queryFn: () => api.public.faqs(role), staleTime: 60 * 60 * 1000 });
}

/** wa.me link for a phone number (digits only, country code kept). */
export function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}
