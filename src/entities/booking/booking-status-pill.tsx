import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { bookingStatusTone } from '@/entities/status/status-tone';
import type { BookingStatus } from '@/shared/api/types';
import { Pill } from '@/shared/ui';

export function BookingStatusPill({ status }: { status: BookingStatus }): ReactNode {
  const { t } = useTranslation();
  return <Pill label={t(`common:bookingStatus.${status}`)} tone={bookingStatusTone[status]} />;
}
