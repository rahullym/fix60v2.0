import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { serviceStatusTone } from '@/entities/status/status-tone';
import { signOut } from '@/features/auth/model/auth-flow';
import { LanguageSwitch } from '@/features/language/language-switch';
import { useProviderMe } from '@/features/provider/model/queries';
import { useLocale } from '@/shared/lib/use-locale';
import { Card, ErrorState, ListRow, LoadingState, Notice, Pill, Row, Screen, SectionHeader, Text } from '@/shared/ui';
import { PublicProfilePreview } from '@/widgets/provider/public-profile-preview';

/** Profile tab: public preview, per-service approval, documents and account links. */
export function ProfileView(): ReactNode {
  const { t } = useTranslation();
  const { pick } = useLocale();
  const me = useProviderMe();

  if (me.isLoading) {
    return <LoadingState />;
  }
  if (me.error || !me.data) {
    return (
      <Screen>
        <ErrorState error={me.error} onRetry={() => void me.refetch()} />
      </Screen>
    );
  }
  const data = me.data;

  return (
    <Screen onRefresh={() => void me.refetch()} isRefreshing={me.isRefetching}>
      <Row style={styles.between}>
        <Text variant="caption" tone="muted" selectable>
          {t('provider:profile.code', { code: data.code })}
        </Text>
        <LanguageSwitch />
      </Row>

      <SectionHeader title={t('provider:profile.previewTitle')} />
      <Text variant="caption" tone="muted">
        {t('provider:profile.previewHint')}
      </Text>
      {data.publicProfile ? (
        <PublicProfilePreview profile={data.publicProfile} />
      ) : (
        <Notice tone="info" body={t('provider:profile.noPreview')} />
      )}

      <SectionHeader title={t('provider:profile.servicesTitle')} />
      {data.services.length === 0 ? <Text tone="muted">{t('provider:profile.noServices')}</Text> : null}
      {data.services.map((item) => (
        <Card key={item.serviceId}>
          <Row style={styles.between}>
            <Text variant="bodyStrong" style={styles.flex}>
              {pick(item.service.name)}
            </Text>
            <Pill label={t(`common:serviceStatus.${item.status}`)} tone={serviceStatusTone[item.status]} />
          </Row>
          {item.reviewNote ? (
            <Notice tone={item.status === 'approved' ? 'info' : 'warning'} title={t('provider:documents.reviewNote')} body={item.reviewNote} />
          ) : null}
        </Card>
      ))}

      <Card>
        <View>
          <ListRow icon="document-text-outline" title={t('provider:profile.documents')} onPress={() => router.push('/provider/documents')} />
          <ListRow icon="notifications-outline" title={t('common:notifications.title')} onPress={() => router.push('/notifications')} />
          <ListRow icon="settings-outline" title={t('common:settings.title')} onPress={() => router.push('/settings')} />
          <ListRow icon="help-buoy-outline" title={t('common:settings.support')} onPress={() => router.push('/support')} />
          <ListRow
            icon="reader-outline"
            title={t('provider:profile.agreement')}
            onPress={() => router.push('/policy/provider-agreement')}
          />
          <ListRow icon="log-out-outline" title={t('common:actions.signOut')} tone="danger" onPress={() => void signOut()} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { justifyContent: 'space-between', alignItems: 'center' },
  flex: { flex: 1 },
});
