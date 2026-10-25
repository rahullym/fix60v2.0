import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { Booking } from '@/shared/api/types';
import { formatDateTime } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Avatar, Card, Row, Text } from '@/shared/ui';
import { useTheme } from '@/shared/theme/theme';
import { BookingStatusPill } from './booking-status-pill';

/** One booking in a list: provider, service, slot and status. */
export function BookingSummaryCard({ booking, onPress }: { booking: Booking; onPress: () => void }): ReactNode {
  const theme = useTheme();
  const { t } = useTranslation();
  const { locale, pick } = useLocale();
  const service = pick(booking.service.name);
  const slot = `${formatDateTime(booking.startsAt, locale)} · ${t('common:units.hours', { count: booking.durationHours })}`;
  return (
    <Card onPress={onPress} accentColor={theme.colors.primary} accessibilityLabel={`${service}, ${booking.counterparty.displayName}, ${slot}`}>
      <Row gap={12} style={styles.top}>
        <Avatar uri={booking.counterparty.photoUrl} name={booking.counterparty.displayName} size={44} />
        <View style={styles.flex}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {service}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {booking.counterparty.displayName}
          </Text>
        </View>
        <BookingStatusPill status={booking.status} />
      </Row>
      <Text variant="caption" tone="muted" numberOfLines={2}>
        {slot}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {pick(booking.localityName)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { alignItems: 'flex-start' },
});
