import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { bookingStatusTone } from '@/entities/status/status-tone';
import type { Booking } from '@/shared/api/types';
import { formatDateTime } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Avatar, Card, Pill, Row, Text } from '@/shared/ui';
import { useTheme } from '@/shared/theme/theme';

/** Compact booking row for the provider's lists. */
export function BookingCard({ booking, onPress }: { booking: Booking; onPress: () => void }): ReactNode {
  const theme = useTheme();
  const { t } = useTranslation();
  const { locale, pick } = useLocale();
  const serviceName = pick(booking.service.name);
  return (
    <Card onPress={onPress} accentColor={theme.colors.primary} accessibilityLabel={t('provider:bookings.cardA11y', { service: serviceName, code: booking.code })}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text variant="heading" style={{ flex: 1 }}>
          {serviceName}
        </Text>
        <Pill label={t(`common:bookingStatus.${booking.status}`)} tone={bookingStatusTone[booking.status]} />
      </Row>
      <Text variant="caption" tone="muted">
        {booking.code}
      </Text>
      <Text>{formatDateTime(booking.startsAt, locale)}</Text>
      <Text variant="caption" tone="muted">
        {`${t('common:units.hours', { count: booking.durationHours })} · ${pick(booking.localityName)}`}
      </Text>
      <Row>
        <Avatar uri={booking.counterparty.photoUrl} name={booking.counterparty.displayName} size={32} />
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {booking.counterparty.displayName}
        </Text>
      </Row>
    </Card>
  );
}
