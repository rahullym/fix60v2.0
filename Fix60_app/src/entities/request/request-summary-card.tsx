import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { ServiceRequestSummary } from '@/shared/api/types';
import { formatSlot } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { Card, Icon, Row, Text } from '@/shared/ui';
import { RequestStatusPill } from './request-status-pill';

/** One request in a list: service, slot, place, status, and the accepted count when it's the customer's turn. */
export function RequestSummaryCard({
  request,
  onPress,
  isCompact = false,
}: {
  request: ServiceRequestSummary;
  onPress: () => void;
  isCompact?: boolean;
}): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const { locale, pick } = useLocale();
  const service = pick(request.service.name);
  const slot = `${formatSlot(request.preferredDate, request.startTime, locale)} · ${t('common:units.hours', { count: request.durationHours })}`;
  const isChoosing = request.status === 'customer_confirmation_pending' || request.status === 'provider_accepted';
  const hasAccepted = isChoosing && request.acceptedCount > 0;

  return (
    <Card
      onPress={onPress}
      accentColor={request.acceptedCount > 0 ? theme.colors.accent : undefined}
      accessibilityLabel={`${service}, ${t(`common:requestStatus.${request.status}`)}`}
      style={isCompact ? styles.compact : undefined}>
      <Row style={styles.between}>
        <View style={styles.flex}>
          <Text variant="bodyStrong" numberOfLines={isCompact ? 1 : 2}>
            {service}
          </Text>
          {request.source === 'directed' ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {t('customer:request.directed')}
            </Text>
          ) : null}
        </View>
        <RequestStatusPill status={request.status} />
      </Row>
      <Text variant="caption" tone="muted" numberOfLines={isCompact ? 1 : 2}>
        {slot}
      </Text>
      {!isCompact ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {pick(request.localityName)}
        </Text>
      ) : null}
      {hasAccepted ? (
        <View style={[styles.accepted, { backgroundColor: theme.colors.accentLight, borderRadius: theme.radius.sm }]}>
          <Icon name="people" size={16} color={theme.colors.accent} />
          <Text variant="label" style={[styles.flex, { color: theme.colors.accent }]} numberOfLines={2}>
            {t('customer:requests.acceptedCount', { count: request.acceptedCount })}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { justifyContent: 'space-between', alignItems: 'flex-start' },
  compact: { width: 260 },
  accepted: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6 },
});
