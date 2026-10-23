import { type Href, router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useFaqs, useTickets } from '@/features/support/support';
import { useSession } from '@/shared/auth/session';
import { Button, EmptyState, ErrorState, LoadingState, Screen, SectionHeader, Text } from '@/shared/ui';
import { FaqItem } from '@/widgets/account/faq-item';
import { SupportContacts } from '@/widgets/account/support-contacts';
import { TicketCard } from '@/widgets/account/ticket-card';

/** Support home: contact options, the user's tickets and FAQs. */
export function SupportView(): ReactNode {
  const { t } = useTranslation();
  const { user } = useSession();
  const tickets = useTickets();
  const faqs = useFaqs(user?.role ?? 'customer');

  const refresh = (): void => {
    void tickets.refetch();
    void faqs.refetch();
  };

  return (
    <Screen onRefresh={refresh} isRefreshing={tickets.isRefetching}>
      <SupportContacts />

      <SectionHeader title={t('common:support.myTickets')} />
      <Button label={t('common:support.newTicket')} icon="add" onPress={() => router.push('/support/new')} />
      {tickets.isPending ? (
        <LoadingState />
      ) : tickets.isError ? (
        <ErrorState error={tickets.error} onRetry={tickets.refetch} />
      ) : tickets.data.items.length === 0 ? (
        <EmptyState icon="chatbubbles-outline" title={t('common:support.empty')} body={t('common:support.emptyBody')} />
      ) : (
        tickets.data.items.map((ticket) => (
          <TicketCard
            key={ticket.code}
            ticket={ticket}
            onPress={() => router.push(`/support/${encodeURIComponent(ticket.code)}` as Href)}
          />
        ))
      )}

      <SectionHeader title={t('common:support.faqTitle')} />
      {faqs.isPending ? (
        <LoadingState />
      ) : faqs.isError ? (
        <ErrorState error={faqs.error} onRetry={faqs.refetch} />
      ) : faqs.data.items.length === 0 ? (
        <Text tone="muted">{t('common:support.noFaqs')}</Text>
      ) : (
        <View>
          {faqs.data.items.map((faq) => (
            <FaqItem key={faq.id} faq={faq} />
          ))}
        </View>
      )}
    </Screen>
  );
}
