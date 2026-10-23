import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { serviceIcon } from '@/entities/service/service-icon';
import { customerKeys } from '@/features/customer/model/query-keys';
import { api } from '@/shared/api/endpoints';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import { Button, Card, ErrorState, Icon, LoadingState, Row, Screen, SectionHeader, Text, type IconName } from '@/shared/ui';

const steps: { icon: IconName; key: string }[] = [
  { icon: 'create-outline', key: 'post' },
  { icon: 'people-outline', key: 'accept' },
  { icon: 'checkmark-done-outline', key: 'choose' },
  { icon: 'star-outline', key: 'review' },
];

/** Service detail: description, what to expect, how providers are checked, and the two CTAs. */
export function ServiceView(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const { pick } = useLocale();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useQuery({ queryKey: customerKeys.service(slug), queryFn: () => api.catalog.service(slug) });
  const service = query.data;

  if (query.isLoading) return <LoadingState />;
  if (!service) return <ErrorState error={query.error} onRetry={query.refetch} />;

  const minYears = service.eligibility.minYearsExperience;
  const mandatoryDocs = service.requiredDocuments.filter((doc) => doc.isMandatory);

  return (
    <Screen
      onRefresh={query.refetch}
      isRefreshing={query.isRefetching}
      footer={
        <View style={styles.ctas}>
          <Button
            label={t('customer:service.quickRequest')}
            icon="flash-outline"
            onPress={() => router.push({ pathname: '/customer/requests/new', params: { serviceId: service.id } })}
            accessibilityHint={t('customer:service.quickRequestHint')}
          />
          <Button
            label={t('customer:service.browseProviders')}
            icon="people-outline"
            variant="secondary"
            onPress={() => router.push({ pathname: '/customer/search', params: { serviceId: service.id } })}
          />
        </View>
      }>
      <Stack.Screen options={{ title: pick(service.name) }} />
      <Row gap={14}>
        <View style={[styles.bubble, { backgroundColor: theme.colors.primarySoft }]}>
          <Icon name={serviceIcon(service.slug)} size={28} color={theme.colors.primaryMid} />
        </View>
        <Text variant="title" style={styles.flex}>
          {pick(service.name)}
        </Text>
      </Row>
      {service.description ? <Text>{pick(service.description)}</Text> : null}

      <SectionHeader title={t('customer:service.whatToExpect')} />
      <Card>
        {steps.map((step, index) => (
          <Row key={step.key} gap={12} style={styles.step}>
            <Icon name={step.icon} size={22} color={theme.colors.primary} />
            <View style={styles.flex}>
              <Text variant="bodyStrong">{t(`customer:service.steps.${step.key}Title`, { step: index + 1 })}</Text>
              <Text variant="caption" tone="muted">
                {t(`customer:service.steps.${step.key}Body`)}
              </Text>
            </View>
          </Row>
        ))}
      </Card>

      <SectionHeader title={t('customer:service.checksTitle')} />
      <Card>
        <Row gap={12} style={styles.step}>
          <Icon name="shield-checkmark-outline" size={22} color={theme.colors.success} />
          <Text style={styles.flex}>{t('customer:service.checksVerified')}</Text>
        </Row>
        {minYears ? (
          <Row gap={12} style={styles.step}>
            <Icon name="ribbon-outline" size={22} color={theme.colors.success} />
            <Text style={styles.flex}>
              {t('customer:service.checksExperience', { years: t('common:units.years', { count: minYears }) })}
            </Text>
          </Row>
        ) : null}
        {mandatoryDocs.map((doc) => (
          <Row key={doc.documentType} gap={12} style={styles.step}>
            <Icon name="document-text-outline" size={22} color={theme.colors.success} />
            <Text style={styles.flex}>{t(`common:documentType.${doc.documentType}`)}</Text>
          </Row>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bubble: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  step: { alignItems: 'flex-start', paddingVertical: 4 },
  ctas: { gap: 10 },
});
