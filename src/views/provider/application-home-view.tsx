import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  isApplicationEditable,
  nextIncompleteStep,
  stepNumber,
  TOTAL_STEPS,
} from '@/entities/application/application-steps';
import { applicationStatusTone } from '@/entities/status/status-tone';
import { signOut } from '@/features/auth/model/auth-flow';
import { stepHref } from '@/features/provider/application/use-save-step';
import { providerKeys, useApplication } from '@/features/provider/model/queries';
import { formatDateTime } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Button, Card, ErrorState, ListRow, LoadingState, Notice, Pill, Row, Screen, SectionHeader, Text } from '@/shared/ui';
import { ApplicationChecklist } from '@/widgets/provider/application-checklist';

/** `/provider/application`: status, checklist, reviewer notes and Continue. Polls while under review. */
export function ApplicationHomeView(): ReactNode {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const application = useApplication();
  const status = application.data?.status;

  useEffect(() => {
    // Each poll result may carry a decision; the gate reads provider-me to switch to the tabs.
    if (application.dataUpdatedAt > 0 && (status === 'submitted' || status === 'under_review' || status === 'approved')) {
      void queryClient.invalidateQueries({ queryKey: providerKeys.me });
    }
  }, [application.dataUpdatedAt, status, queryClient]);

  if (application.isLoading) {
    return <LoadingState label={t('provider:application.loading')} />;
  }
  if (application.error || !application.data) {
    return (
      <Screen>
        <ErrorState error={application.error} onRetry={() => void application.refetch()} />
      </Screen>
    );
  }

  const data = application.data;
  const isEditable = isApplicationEditable(data.status);
  const next = nextIncompleteStep(data);
  const doneCount = data.completedSteps.length;
  const isWaiting = status === 'submitted' || status === 'under_review';

  return (
    <Screen
      onRefresh={() => void application.refetch()}
      isRefreshing={application.isRefetching}
      footer={
        isEditable ? (
          <Button
            label={
              doneCount === 0
                ? t('provider:application.start')
                : t('provider:application.continueTo', { number: stepNumber(next), title: t(`provider:steps.${next}.title`) })
            }
            onPress={() => router.push(stepHref(next))}
          />
        ) : undefined
      }>
      <Card>
        <Row style={styles.between}>
          <View style={styles.flex}>
            <Text variant="caption" tone="muted">
              {t('provider:application.code')}
            </Text>
            <Text variant="heading" selectable>
              {data.code}
            </Text>
          </View>
          <Pill label={t(`common:applicationStatus.${data.status}`)} tone={applicationStatusTone[data.status]} />
        </Row>
        <Text variant="caption" tone="muted">
          {t('provider:application.progress', { done: doneCount, total: TOTAL_STEPS })}
        </Text>
        {data.submittedAt ? (
          <Text variant="caption" tone="muted">
            {t('provider:application.submittedAt', { date: formatDateTime(data.submittedAt, locale) })}
          </Text>
        ) : null}
      </Card>

      {data.status === 'draft' ? <Notice tone="info" body={t('provider:application.draftIntro')} /> : null}
      {data.status === 'info_required' ? (
        <Notice tone="warning" title={t('provider:application.infoRequiredTitle')} body={t('provider:application.infoRequiredBody')} />
      ) : null}
      {isWaiting ? (
        <Card>
          <Text variant="heading">{t('provider:application.nextTitle')}</Text>
          {(['one', 'two', 'three'] as const).map((item) => (
            <Row key={item} style={styles.top}>
              <Text tone="primary" variant="bodyStrong">
                •
              </Text>
              <Text style={styles.flex}>{t(`provider:application.next.${item}`)}</Text>
            </Row>
          ))}
          <Text variant="caption" tone="muted">
            {t('provider:application.autoRefresh')}
          </Text>
        </Card>
      ) : null}
      {data.status === 'rejected' ? (
        <Card>
          <Notice tone="danger" title={t('provider:application.rejectedTitle')} body={data.decisionNote ?? t('provider:application.rejectedBody')} />
          <Button label={t('provider:application.contactSupport')} variant="secondary" icon="help-buoy-outline" onPress={() => router.push('/support/new')} />
        </Card>
      ) : null}
      {data.decisionNote && data.status !== 'rejected' ? (
        <Notice tone="info" title={t('provider:application.decisionNote')} body={data.decisionNote} />
      ) : null}

      <SectionHeader title={t('provider:application.checklistTitle')} />
      <ApplicationChecklist application={data} isEditable={isEditable} />

      <Card>
        <ListRow icon="document-text-outline" title={t('provider:application.documents')} onPress={() => router.push('/provider/documents')} />
        <ListRow icon="help-buoy-outline" title={t('common:settings.support')} onPress={() => router.push('/support')} />
        <ListRow icon="settings-outline" title={t('common:settings.title')} onPress={() => router.push('/settings')} />
        <ListRow icon="log-out-outline" title={t('common:actions.signOut')} tone="danger" onPress={() => void signOut()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { justifyContent: 'space-between', alignItems: 'flex-start' },
  top: { alignItems: 'flex-start' },
  flex: { flex: 1 },
});
