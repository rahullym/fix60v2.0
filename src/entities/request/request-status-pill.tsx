import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { requestStatusTone } from '@/entities/status/status-tone';
import type { RequestStatus } from '@/shared/api/types';
import { Pill } from '@/shared/ui';

export function RequestStatusPill({ status }: { status: RequestStatus }): ReactNode {
  const { t } = useTranslation();
  return <Pill label={t(`common:requestStatus.${status}`)} tone={requestStatusTone[status]} />;
}
