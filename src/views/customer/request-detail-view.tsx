import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ProviderSummaryCard } from '@/entities/provider/provider-summary-card';
import { RequestStatusPill } from '@/entities/request/request-status-pill';
import { RequestTimeline } from '@/entities/request/request-timeline';
import { customerKeys, invalidateRoots } from '@/features/customer/model/query-keys';
import { useRefetchOnFocus } from '@/features/customer/model/use-refetch-on-focus';
import { ReasonDialog } from '@/features/customer/reason-dialog/reason-dialog';
import { api } from '@/shared/api/endpoints';
import type { RequestStatus, ServiceRequestDetail } from '@/shared/api/types';
import { formatDateTime, formatMoney, formatSlot, maskPhone } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Button, Card, ErrorState, LoadingState, Notice, Row, Screen, SectionHeader, Text } from '@/shared/ui';
import { AcceptedProviders } from '@/widgets/customer/accepted-providers';
import { DetailRow } from '@/widgets/customer/detail-row';

const WAITING: RequestStatus[] = [
  'submitted',
  'under_review',
  'matching',
  'provider_notified',
  'provider_accepted',
  'customer_confirmation_pending',
];
const CHOOSING: RequestStatus[] = ['provider_accepted', 'customer_confirmation_pending'];
const DIRECTED_HELP: RequestStatus[] = ['provider_notified', 'provider_accepted', 'provider_declined', 'customer_confirmation_pending'];

function statusHelpKey(request: ServiceRequestDetail): string {
  return request.source === 'directed' && DIRECTED_HELP.includes(request.status)
    ? `customer:requestStatusHelp.directed.${request.status}`
    : `customer:requestStatusHelp.${request.status}`;
}

/** Request status, what happens next, accepted providers to choose from, details and cancel. */
export function RequestDetailView(): ReactNode {
  const { t } = useTranslation();
  const { locale, pick } = useLocale();
  const client = useQueryClient();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const query = useQuery({
    queryKey: customerKeys.request(code),
    queryFn: () => api.requests.get(code),
    refetchInterval: (current) => (current.state.data && WAITING.includes(current.state.data.status) ? 10_000 : false),
  });
  useRefetchOnFocus(query.refetch);

  const cancel = useMutation({
    mutationFn: (reason: string) => api.requests.cancel(code, { reason }),
    onSuccess: async () => {
      await invalidateRoots(client, ['request', 'requests']);
      setIsCancelOpen(false);
    },
  });

  const request = query.data;
  if (query.isLoading) return <LoadingState />;
  if (!request) return <ErrorState error={query.error} onRetry={query.refetch} />;

  const isChoosing = CHOOSING.includes(request.status);
  const canCancel = request.status !== 'booking_confirmed' && request.status !== 'cancelled';
  const isDirectedDeclined = request.source === 'directed' && request.status === 'provider_declined';
  const isWaiting = WAITING.includes(request.status) && !isChoosing;

  return (
    <Screen onRefresh={query.refetch} isRefreshing={query.isRefetching}>
      <Stack.Screen options={{ title: pick(request.service.name) }} />

      <Card>
        <Row style={styles.between}>
          <Text variant="caption" tone="muted">
            {request.code}
          </Text>
          <RequestStatusPill status={request.status} />
        </Row>
        <Text variant="heading">{t(`common:requestStatus.${request.status}`)}</Text>
        <Text>{t(statusHelpKey(request))}</Text>
        {isWaiting ? (
          <Text variant="caption" tone="muted">
            {t('customer:requestDetail.autoRefresh')}
          </Text>
        ) : null}
        {request.status === 'cancelled' && request.cancelReason ? (
          <Text variant="caption" tone="muted">
            {t('customer:requestDetail.cancelReason', { reason: request.cancelReason })}
          </Text>
        ) : null}
        {request.bookingCode ? (
          <Button
            label={t('customer:requestDetail.viewBooking')}
            icon="calendar-outline"
            onPress={() => router.push({ pathname: '/customer/bookings/[code]', params: { code: request.bookingCode! } })}
          />
        ) : null}
        {isDirectedDeclined ? (
          <Button
            label={t('customer:requestDetail.postQuickInstead')}
            icon="flash-outline"
            onPress={() => router.push({ pathname: '/customer/requests/new', params: { serviceId: request.service.id } })}
          />
        ) : null}
      </Card>

      {isChoosing ? <AcceptedProviders requestCode={request.code} invitations={request.acceptedInvitations} /> : null}

      {request.targetProvider && !isChoosing ? (
        <View style={styles.section}>
          <SectionHeader title={t('customer:requestDetail.requestedProvider')} />
          <ProviderSummaryCard
            provider={request.targetProvider}
            onPress={() =>
              router.push({ pathname: '/customer/providers/[code]', params: { code: request.targetProvider!.code } })
            }
          />
        </View>
      ) : null}

      <SectionHeader title={t('customer:requestDetail.details')} />
      <Card>
        <DetailRow icon="construct-outline" label={t('customer:form.service')} value={pick(request.service.name)} />
        <DetailRow
          icon="calendar-outline"
          label={t('customer:requestDetail.when')}
          value={`${formatSlot(request.preferredDate, request.startTime, locale)} · ${t('common:units.hours', { count: request.durationHours })}`}
        />
        <DetailRow icon="location-outline" label={t('customer:location.locality')} value={pick(request.localityName)} />
        <DetailRow icon="home-outline" label={t('customer:form.areaNote')} value={request.areaNote} />
        <DetailRow
          icon="cash-outline"
          label={t('customer:form.budget')}
          value={request.budgetAmount !== null ? t('common:rates.hourly', { amount: formatMoney(request.budgetAmount, locale) }) : null}
        />
        <DetailRow icon="list-outline" label={t('customer:form.requirements')} value={request.requirements} />
        <DetailRow icon="call-outline" label={t('customer:form.contactPhone')} value={maskPhone(request.contactPhone)} />
        <DetailRow
          icon="logo-whatsapp"
          label={t('customer:form.whatsapp')}
          value={request.contactWhatsapp ? maskPhone(request.contactWhatsapp) : null}
        />
        <DetailRow icon="time-outline" label={t('customer:requestDetail.created')} value={formatDateTime(request.createdAt, locale)} />
      </Card>
      <Notice tone="info" icon="lock-closed-outline" body={t('customer:form.areaNoteHint')} />

      {request.timeline.length > 0 ? (
        <>
          <SectionHeader title={t('customer:requestDetail.timeline')} />
          <Card>
            <RequestTimeline entries={request.timeline} />
          </Card>
        </>
      ) : null}

      {canCancel ? (
        <Button
          label={t('customer:requestDetail.cancel')}
          variant="secondary"
          icon="close-circle-outline"
          onPress={() => {
            cancel.reset();
            setIsCancelOpen(true);
          }}
        />
      ) : null}

      <ReasonDialog
        isVisible={isCancelOpen}
        title={t('customer:requestDetail.cancelTitle')}
        body={t('customer:requestDetail.cancelBody')}
        confirmLabel={t('customer:requestDetail.cancelConfirm')}
        isSubmitting={cancel.isPending}
        error={cancel.error}
        onSubmit={(reason) => cancel.mutate(reason)}
        onClose={() => setIsCancelOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { justifyContent: 'space-between' },
  section: { gap: 12 },
});
