import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { invitationStatusTone } from '@/entities/status/status-tone';
import type { ProviderInvitation } from '@/shared/api/types';
import { formatMoney, formatSlot } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { Card, Icon, Pill, Row, Text } from '@/shared/ui';
import { InvitationCountdown } from './invitation-countdown';

function Fact({ icon, label }: { icon: 'location-outline' | 'calendar-outline' | 'hourglass-outline' | 'cash-outline' | 'navigate-outline'; label: string }): ReactNode {
  const theme = useTheme();
  return (
    <Row gap={6} style={{ alignItems: 'flex-start' }}>
      <Icon name={icon} size={16} color={theme.colors.textMuted} />
      <Text variant="caption" style={{ flex: 1, flexShrink: 1 }}>
        {label}
      </Text>
    </Row>
  );
}

/** Job invitation summary: service, area, slot, duration, budget, distance and the response countdown. */
export function InvitationCard({ invitation, onPress }: { invitation: ProviderInvitation; onPress?: () => void }): ReactNode {
  const { t } = useTranslation();
  const { locale, pick } = useLocale();
  const { request } = invitation;
  const isOpen = invitation.status === 'invited' || invitation.status === 'viewed';
  const serviceName = pick(request.service.name);
  const area = `${pick(request.localityName)}, ${pick(request.districtName)}`;
  return (
    <Card onPress={onPress} accessibilityLabel={t('provider:invitation.cardA11y', { service: serviceName, area })}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text variant="heading" style={{ flex: 1 }}>
          {serviceName}
        </Text>
        <Pill label={t(`common:invitationStatus.${invitation.status}`)} tone={invitationStatusTone[invitation.status]} />
      </Row>
      {request.source === 'directed' ? (
        <Pill label={t('provider:invitation.directed')} tone="accent" icon="person-circle-outline" />
      ) : null}
      <Fact icon="location-outline" label={area} />
      <Fact icon="calendar-outline" label={formatSlot(request.preferredDate, request.startTime, locale)} />
      <Fact icon="hourglass-outline" label={t('common:units.hours', { count: request.durationHours })} />
      <Fact
        icon="cash-outline"
        label={
          request.budgetAmount !== null
            ? t('provider:invitation.budget', { amount: formatMoney(request.budgetAmount, locale) })
            : t('provider:invitation.noBudget')
        }
      />
      {invitation.distanceKm !== null ? (
        <Fact icon="navigate-outline" label={t('provider:invitation.distance', { value: invitation.distanceKm.toFixed(1) })} />
      ) : null}
      {isOpen ? <InvitationCountdown expiresAt={invitation.expiresAt} /> : null}
    </Card>
  );
}
