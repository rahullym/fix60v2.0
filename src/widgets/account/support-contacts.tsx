import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';
import { useSupportContacts, whatsappUrl } from '@/features/support/support';
import { Button, Card, ErrorState, LoadingState, Text } from '@/shared/ui';

function open(url: string): void {
  Linking.openURL(url).catch(() => undefined);
}

/** Call / WhatsApp / email support, plus the grievance officer (DPDP). */
export function SupportContacts(): ReactNode {
  const { t } = useTranslation();
  const contacts = useSupportContacts();
  if (contacts.isPending) {
    return <LoadingState />;
  }
  if (contacts.isError) {
    return <ErrorState error={contacts.error} onRetry={contacts.refetch} />;
  }
  const { supportPhone, supportWhatsapp, supportEmail, grievanceOfficerName, grievanceOfficerEmail } = contacts.data;
  const hasAny = Boolean(supportPhone || supportWhatsapp || supportEmail);
  return (
    <Card>
      <Text variant="heading">{t('common:support.contactTitle')}</Text>
      {hasAny ? (
        <Text variant="caption" tone="muted">
          {t('common:support.contactBody')}
        </Text>
      ) : (
        <Text tone="muted">{t('common:support.noContacts')}</Text>
      )}
      {supportPhone ? (
        <Button label={t('common:support.callUs')} icon="call-outline" variant="secondary" onPress={() => open(`tel:${supportPhone}`)} />
      ) : null}
      {supportWhatsapp ? (
        <Button
          label={t('common:support.whatsappUs')}
          icon="logo-whatsapp"
          variant="secondary"
          onPress={() => open(whatsappUrl(supportWhatsapp))}
        />
      ) : null}
      {supportEmail ? (
        <Button label={t('common:support.emailUs')} icon="mail-outline" variant="secondary" onPress={() => open(`mailto:${supportEmail}`)} />
      ) : null}
      {grievanceOfficerName || grievanceOfficerEmail ? (
        <Text variant="caption" tone="muted">
          {t('common:support.grievanceOfficer', {
            name: grievanceOfficerName ?? '',
            email: grievanceOfficerEmail ?? '',
          })}
        </Text>
      ) : null}
    </Card>
  );
}
