import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ticketStatusTone } from '@/features/support/support';
import type { SupportTicket } from '@/shared/api/types';
import { formatRelative } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Card, Pill, Row, Text } from '@/shared/ui';

/** Support ticket summary with its status. */
export function TicketCard({ ticket, onPress }: { ticket: SupportTicket; onPress: () => void }): ReactNode {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const status = t(`common:support.status.${ticket.status}`);
  const when = formatRelative(ticket.lastMessageAt ?? ticket.createdAt, locale);
  return (
    <Card onPress={onPress} accessibilityLabel={`${ticket.subject}. ${ticket.code}. ${status}. ${when}`}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="caption" tone="muted">
          {ticket.code}
        </Text>
        <Pill label={status} tone={ticketStatusTone[ticket.status]} />
      </Row>
      <Text variant="bodyStrong" numberOfLines={2}>
        {ticket.subject}
      </Text>
      <Text variant="caption" tone="muted">
        {ticket.bookingCode ? `${ticket.bookingCode} · ${when}` : when}
      </Text>
    </Card>
  );
}
