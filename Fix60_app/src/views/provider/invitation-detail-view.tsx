import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNow } from '@/entities/invitation/countdown';
import { InvitationCard } from '@/entities/invitation/invitation-card';
import { DeclineForm } from '@/features/provider/invitations/decline-form';
import { useInvitationActions, useMarkViewed } from '@/features/provider/invitations/use-invitation-actions';
import { providerKeys } from '@/features/provider/model/queries';
import { api } from '@/shared/api/endpoints';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { Button, Card, ErrorState, LoadingState, Notice, Screen, Text } from '@/shared/ui';

/** `/provider/invitations/[id]`: request summary (no contact), Accept or Decline with a reason. */
export function InvitationDetailView(): ReactNode {
  const { t } = useTranslation();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const invitation = useQuery({
    queryKey: providerKeys.invitation(id),
    queryFn: () => api.provider.invitation(id),
    enabled: Boolean(id),
  });
  useMarkViewed(invitation.data);
  const { accept, decline, isNoLongerAvailable } = useInvitationActions(id);
  const [isDeclining, setIsDeclining] = useState(false);
  const now = useNow(5000);

  if (invitation.isLoading) {
    return <LoadingState />;
  }
  if (invitation.error || !invitation.data) {
    return (
      <Screen>
        <ErrorState error={invitation.error} onRetry={() => void invitation.refetch()} />
      </Screen>
    );
  }

  const data = invitation.data;
  const { request } = data;
  const isOpen = (data.status === 'invited' || data.status === 'viewed') && new Date(data.expiresAt).getTime() > now.getTime();

  const confirmAccept = (): void => {
    Alert.alert(t('provider:invitation.acceptTitle'), t('provider:invitation.acceptBody'), [
      { text: t('common:actions.cancel'), style: 'cancel' },
      { text: t('provider:invitation.accept'), onPress: () => accept.mutate() },
    ]);
  };

  const actionError = accept.error ?? decline.error;

  return (
    <Screen
      onRefresh={() => void invitation.refetch()}
      isRefreshing={invitation.isRefetching}
      footer={
        isOpen && !isDeclining && !isNoLongerAvailable ? (
          <View style={styles.footer}>
            <Button label={t('provider:invitation.accept')} icon="checkmark" onPress={confirmAccept} isLoading={accept.isPending} />
            <Button
              label={t('provider:invitation.decline')}
              variant="secondary"
              onPress={() => setIsDeclining(true)}
              isDisabled={accept.isPending}
            />
          </View>
        ) : undefined
      }>
      <InvitationCard invitation={data} />

      <Card>
        <Text variant="label" tone="muted">
          {t('provider:invitation.customer')}
        </Text>
        <Text variant="bodyStrong">{request.customerFirstName}</Text>
        <Text variant="label" tone="muted">
          {t('provider:invitation.requirements')}
        </Text>
        <Text>{request.requirements || t('provider:invitation.noRequirements')}</Text>
        <Text variant="caption" tone="muted" selectable>
          {request.code}
        </Text>
      </Card>
      <Notice tone="info" icon="shield-checkmark-outline" body={t('provider:invitation.contactHidden')} />

      {isNoLongerAvailable ? (
        <Notice tone="warning" title={t('provider:invitation.goneTitle')} body={t('provider:invitation.goneBody')} />
      ) : actionError ? (
        <Notice tone="danger" body={t(errorMessageKey(actionError))} />
      ) : null}

      {data.status === 'accepted' ? (
        <Notice tone="success" title={t('provider:invitation.acceptedTitle')} body={t('provider:invitation.acceptedBody')} />
      ) : null}
      {data.status === 'declined' ? <Notice tone="info" body={t('provider:invitation.declinedBody')} /> : null}
      {data.status === 'expired' || data.status === 'withdrawn' ? (
        <Notice tone="info" body={t(`provider:invitation.${data.status}Body`)} />
      ) : null}

      {isDeclining && isOpen ? (
        <DeclineForm
          isSubmitting={decline.isPending}
          onCancel={() => setIsDeclining(false)}
          onSubmit={(reason) =>
            decline.mutate(reason, {
              onSuccess: () => {
                setIsDeclining(false);
                if (router.canGoBack()) router.back();
              },
            })
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: 8 },
});
