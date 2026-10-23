import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { signOut } from '@/features/auth/model/auth-flow';
import { Button, EmptyState, ErrorState, LoadingState, Notice, Screen } from '@/shared/ui';

/** Shown while provider-me loads. */
export function ProviderGateLoading(): ReactNode {
  const { t } = useTranslation();
  return (
    <Screen isScrollable={false} edges={['top', 'bottom']}>
      <LoadingState label={t('provider:gate.loading')} />
    </Screen>
  );
}

/** provider-me failed: retry or sign out. */
export function ProviderGateError({ error, onRetry }: { error: unknown; onRetry: () => void }): ReactNode {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'bottom']} footer={<Button label={t('common:actions.signOut')} variant="ghost" onPress={() => void signOut()} />}>
      <ErrorState error={error} onRetry={onRetry} />
    </Screen>
  );
}

/** Suspended providers cannot take jobs; they can reach support. */
export function ProviderSuspendedView(): ReactNode {
  const { t } = useTranslation();
  return (
    <Screen
      edges={['top', 'bottom']}
      footer={<Button label={t('common:actions.signOut')} variant="ghost" onPress={() => void signOut()} />}>
      <EmptyState icon="pause-circle-outline" title={t('provider:suspended.title')} body={t('provider:suspended.body')} />
      <Notice tone="warning" body={t('provider:suspended.notice')} />
      <Button label={t('provider:suspended.contact')} icon="help-buoy-outline" onPress={() => router.push('/support/new')} />
      <Button label={t('common:settings.support')} variant="secondary" onPress={() => router.push('/support')} />
    </Screen>
  );
}
