import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { ProviderSummaryCard } from '@/entities/provider/provider-summary-card';
import { useConfirmProvider } from '@/features/customer/confirm-provider/use-confirm-provider';
import type { AcceptedInvitation } from '@/shared/api/types';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { formatRelative } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Button, Notice, SectionHeader, Text } from '@/shared/ui';

/** Providers who accepted a request, each with a Choose button. */
export function AcceptedProviders({
  requestCode,
  invitations,
}: {
  requestCode: string;
  invitations: AcceptedInvitation[];
}): ReactNode {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const confirm = useConfirmProvider(requestCode);
  const isBusy = confirm.pendingInvitationId !== null;

  return (
    <View style={{ gap: 12 }}>
      <SectionHeader title={t('customer:requestDetail.acceptedTitle', { count: invitations.length })} />
      {invitations.length === 0 ? <Text tone="muted">{t('customer:requestDetail.noneAcceptedYet')}</Text> : null}
      {confirm.error ? <Notice tone="danger" body={t(errorMessageKey(confirm.error))} /> : null}
      {invitations.map((invitation) => (
        <ProviderSummaryCard
          key={invitation.invitationId}
          provider={invitation.provider}
          onPress={() => router.push({ pathname: '/customer/providers/[code]', params: { code: invitation.provider.code } })}
          footer={
            <>
              <Text variant="caption" tone="muted">
                {t('customer:requestDetail.acceptedAt', { when: formatRelative(invitation.respondedAt, locale) })}
              </Text>
              <Button
                label={t('customer:requestDetail.choose', { name: invitation.provider.displayName })}
                icon="checkmark-circle-outline"
                onPress={() => confirm.choose(invitation.invitationId, invitation.provider.displayName)}
                isLoading={confirm.pendingInvitationId === invitation.invitationId}
                isDisabled={isBusy}
              />
            </>
          }
        />
      ))}
    </View>
  );
}
