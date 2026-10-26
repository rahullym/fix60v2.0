import { type Href, router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { OPTIONAL_CONSENTS, REQUIRED_CONSENTS, useConsents, useUpdateConsent } from '@/features/settings/consents';
import type { ConsentState } from '@/shared/api/types';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { formatDate } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { Card, ErrorState, Icon, LoadingState, Notice, Pill, Row, Screen, SectionHeader, Text, ToggleRow, Button } from '@/shared/ui';

/** DPDP consent record: required policies (read-only) and optional channels (toggles). */
export function ConsentsView(): ReactNode {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const theme = useTheme();
  const consents = useConsents();
  const update = useUpdateConsent();

  if (consents.isPending) {
    return <LoadingState />;
  }
  if (consents.isError) {
    return <ErrorState error={consents.error} onRetry={consents.refetch} />;
  }

  const byType = new Map<string, ConsentState>(consents.data.items.map((item) => [item.type, item]));
  const meta = (item: ConsentState | undefined): string | undefined =>
    item ? t('common:consents.recorded', { version: item.policyVersion, date: formatDate(item.updatedAt, locale) }) : undefined;

  return (
    <Screen onRefresh={consents.refetch} isRefreshing={consents.isRefetching}>
      <Text tone="muted">{t('common:consents.intro')}</Text>
      {update.isError ? <Notice tone="danger" body={t(errorMessageKey(update.error))} /> : null}
      {update.isSuccess ? <Notice tone="success" body={t('common:consents.saved')} /> : null}

      <SectionHeader title={t('common:consents.optionalTitle')} />
      <View>
        {OPTIONAL_CONSENTS.map((type) => {
          const item = byType.get(type);
          const recorded = meta(item);
          return (
            <ToggleRow
              key={type}
              title={t(`common:consents.${type}`)}
              description={[t(`common:consents.${type}Hint`), recorded].filter(Boolean).join('\n')}
              value={item?.isGranted ?? false}
              onChange={(isGranted) => update.mutate({ type, isGranted })}
            />
          );
        })}
      </View>

      <SectionHeader title={t('common:consents.requiredTitle')} />
      <Text variant="caption" tone="muted">
        {t('common:consents.requiredBody')}
      </Text>
      {REQUIRED_CONSENTS.filter(({ type }) => type !== 'provider_declaration' || byType.get(type)?.isGranted === true).map(({ type, policySlug }) => {
        const item = byType.get(type);
        return (
          <Card key={type}>
            <Row gap={10}>
              <Icon
                name={item?.isGranted === false ? 'ellipse-outline' : 'checkmark-circle'}
                color={item?.isGranted === false ? theme.colors.textMuted : theme.colors.success}
              />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {t(`common:consents.${type}`)}
              </Text>
              <Pill label={t('common:consents.required')} tone="success" />
            </Row>
            {item ? (
              <Text variant="caption" tone="muted">
                {meta(item)}
              </Text>
            ) : null}
            <Button
              label={t('common:consents.readPolicy')}
              variant="ghost"
              isCompact
              icon="open-outline"
              onPress={() => router.push(`/policy/${policySlug}` as Href)}
            />
          </Card>
        );
      })}
      <Text variant="caption" tone="muted">
        {t('common:consents.withdrawNote')}
      </Text>
    </Screen>
  );
}
