import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useBlocks, useUnblock } from '@/features/safety/safety';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { formatDate } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Avatar, Button, Card, EmptyState, ErrorState, LoadingState, Notice, Row, Screen, Text } from '@/shared/ui';
import { confirmAction } from '@/widgets/account/confirm-dialog';

/** People the user has blocked, with unblock. */
export function BlockedView(): ReactNode {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const blocks = useBlocks();
  const unblock = useUnblock();

  if (blocks.isPending) {
    return <LoadingState />;
  }
  if (blocks.isError) {
    return <ErrorState error={blocks.error} onRetry={blocks.refetch} />;
  }

  const handleUnblock = async (userId: string, name: string): Promise<void> => {
    const isConfirmed = await confirmAction({
      title: t('common:block.unblockConfirmTitle', { name }),
      body: t('common:block.unblockConfirmBody'),
      confirmLabel: t('common:actions.unblock'),
      cancelLabel: t('common:actions.cancel'),
    });
    if (isConfirmed) {
      unblock.mutate(userId);
    }
  };

  return (
    <Screen onRefresh={blocks.refetch} isRefreshing={blocks.isRefetching}>
      {unblock.isError ? <Notice tone="danger" body={t(errorMessageKey(unblock.error))} /> : null}
      {blocks.data.items.length === 0 ? (
        <EmptyState icon="shield-checkmark-outline" title={t('common:block.empty')} body={t('common:block.emptyBody')} />
      ) : (
        <>
          <Text variant="caption" tone="muted">
            {t('common:block.listIntro')}
          </Text>
          {blocks.data.items.map((item) => (
            <Card key={item.userId}>
              <Row gap={12}>
                <Avatar uri={null} name={item.displayName} size={44} />
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{item.displayName}</Text>
                  <Text variant="caption" tone="muted">
                    {t('common:block.blockedOn', { date: formatDate(item.blockedAt, locale) })}
                  </Text>
                </View>
                <Button
                  label={t('common:actions.unblock')}
                  variant="secondary"
                  isCompact
                  accessibilityHint={item.displayName}
                  isLoading={unblock.isPending && unblock.variables === item.userId}
                  onPress={() => void handleUnblock(item.userId, item.displayName)}
                  style={styles.button}
                />
              </Row>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, button: { minHeight: 48 } });
