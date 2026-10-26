import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill } from '@/shared/ui';
import { countdownTo, useNow } from './countdown';

/** Live "Respond within 12m 30s" pill. */
export function InvitationCountdown({ expiresAt }: { expiresAt: string }): ReactNode {
  const { t } = useTranslation();
  const now = useNow(1000);
  const left = countdownTo(expiresAt, now);
  if (left.isExpired) {
    return <Pill label={t('provider:invitation.expired')} tone="neutral" icon="time-outline" />;
  }
  const label =
    left.hours > 0
      ? t('provider:invitation.leftHours', { hours: left.hours, minutes: left.minutes })
      : t('provider:invitation.leftMinutes', { minutes: left.minutes, seconds: left.seconds });
  return <Pill label={label} tone={left.isUrgent ? 'danger' : 'warning'} icon="time-outline" />;
}
