import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { ProviderBadges } from '@/entities/provider/provider-badges';
import { ProviderRating } from '@/entities/provider/provider-rating';
import { useProviderFormat } from '@/entities/provider/use-provider-format';
import { useBlockProvider } from '@/features/customer/block-provider/use-block-provider';
import { customerKeys } from '@/features/customer/model/query-keys';
import { SaveProviderButton } from '@/features/customer/save-provider/save-provider-button';
import { api } from '@/shared/api/endpoints';
import type { ProviderPublicProfile } from '@/shared/api/types';
import { formatDate } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { useTheme } from '@/shared/theme/theme';
import {
  Avatar,
  Button,
  Card,
  Divider,
  ErrorState,
  Icon,
  LoadingState,
  Notice,
  Pill,
  RatingStars,
  Row,
  Screen,
  SectionHeader,
  Text,
} from '@/shared/ui';

function OverflowMenu({ profile }: { profile: ProviderPublicProfile }): ReactNode {
  const { t } = useTranslation();
  const block = useBlockProvider(() => router.back());
  const open = (): void => {
    Alert.alert(profile.displayName, undefined, [
      {
        text: t('common:actions.report'),
        onPress: () =>
          router.push({ pathname: '/report', params: { subjectUserId: profile.userId, name: profile.displayName } }),
      },
      { text: t('common:actions.block'), style: 'destructive', onPress: () => block.requestBlock(profile.userId, profile.displayName) },
      { text: t('common:actions.cancel'), style: 'cancel' },
    ]);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('customer:provider.moreActions')}
      onPress={open}
      disabled={block.isBlocking}
      style={styles.menuButton}>
      <Icon name="ellipsis-vertical" />
    </Pressable>
  );
}

/** Public provider profile with save, report/block and "Request <name>". */
export function ProviderProfileView(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const { locale, pick } = useLocale();
  const format = useProviderFormat();
  const { code, serviceId } = useLocalSearchParams<{ code: string; serviceId?: string }>();
  const query = useQuery({ queryKey: customerKeys.providerProfile(code), queryFn: () => api.providers.get(code) });
  const profile = query.data;

  if (query.isLoading) return <LoadingState />;
  if (!profile) return <ErrorState error={query.error} onRetry={query.refetch} />;

  const place = [pick(profile.localityName), pick(profile.districtName)].filter(Boolean).join(', ');
  const offered = profile.services.map((item) => item.service.id);
  const requestServiceId =
    profile.services.length === 1 ? offered[0] : serviceId && offered.includes(serviceId) ? serviceId : undefined;

  const requestProvider = (): void => {
    router.push({
      pathname: '/customer/requests/new',
      params: requestServiceId ? { providerCode: profile.code, serviceId: requestServiceId } : { providerCode: profile.code },
    });
  };

  return (
    <Screen
      onRefresh={query.refetch}
      isRefreshing={query.isRefetching}
      footer={
        <Button
          label={t('customer:provider.request', { name: profile.displayName })}
          icon="paper-plane-outline"
          onPress={requestProvider}
          isDisabled={profile.services.length === 0}
        />
      }>
      <Stack.Screen options={{ title: profile.displayName, headerRight: () => <OverflowMenu profile={profile} /> }} />

      <Row gap={14} style={styles.top}>
        <Avatar uri={profile.photoUrl} name={profile.displayName} size={80} />
        <View style={styles.flex}>
          <Text variant="title" numberOfLines={2}>
            {profile.displayName}
          </Text>
          {place ? (
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {[place, format.distanceLabel(profile.distanceKm)].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          <ProviderRating averageRating={profile.averageRating} reviewCount={profile.reviewCount} size={16} />
        </View>
        <SaveProviderButton code={profile.code} name={profile.displayName} isSaved={profile.isSaved} />
      </Row>
      <ProviderBadges badges={profile.badges} />
      <Text variant="caption" tone="muted">
        {[
          format.experienceLabel(profile.yearsExperience),
          t('customer:provider.memberSince', { date: formatDate(profile.memberSince, locale) }),
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>

      <Notice tone="info" icon="lock-closed-outline" body={t('customer:provider.contactAfterBooking')} />

      {profile.bio ? (
        <>
          <SectionHeader title={t('customer:provider.about')} />
          <Text>{profile.bio}</Text>
        </>
      ) : null}

      <SectionHeader title={t('customer:provider.services')} />
      <Card>
        {profile.services.length === 0 ? <Text tone="muted">{t('customer:provider.noServices')}</Text> : null}
        {profile.services.map((item, index) => (
          <View key={item.service.id} style={styles.serviceItem}>
            {index > 0 ? <Divider /> : null}
            <Text variant="bodyStrong">{pick(item.service.name)}</Text>
            <Text tone="default">
              {format.allRateLabels(item.rates).join(' · ') ||
                (item.rates.isNegotiable ? t('common:rates.negotiable') : t('customer:provider.rateOnRequest'))}
            </Text>
            <Text variant="caption" tone="muted">
              {[
                item.rates.isNegotiable && format.allRateLabels(item.rates).length > 0 ? t('common:rates.negotiable') : null,
                format.experienceLabel(item.yearsExperience),
                item.rates.minBookingMinutes > 0
                  ? t('customer:provider.minBooking', {
                      duration: t('common:units.hours', { count: Math.round((item.rates.minBookingMinutes / 60) * 10) / 10 }),
                    })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        ))}
      </Card>

      {profile.availabilityTypes.length > 0 || profile.dayParts.length > 0 ? (
        <>
          <SectionHeader title={t('customer:provider.availability')} />
          <Row gap={6} style={styles.wrap}>
            {profile.availabilityTypes.map((type) => (
              <Pill key={type} label={t(`customer:availabilityType.${type}`)} tone="info" />
            ))}
          </Row>
          <Row gap={6} style={styles.wrap}>
            {profile.dayParts.map((part) => (
              <Pill key={part} label={t(`customer:dayPart.${part}`)} icon="time-outline" />
            ))}
          </Row>
        </>
      ) : null}

      <SectionHeader title={t('customer:provider.details')} />
      <Card>
        <Row gap={12} style={styles.top}>
          <Icon name="language-outline" size={20} />
          <View style={styles.flex}>
            <Text variant="caption" tone="muted">
              {t('customer:provider.languages')}
            </Text>
            <Text>{format.languagesLabel(profile.languages) || '—'}</Text>
          </View>
        </Row>
        {profile.travelPreference ? (
          <Row gap={12} style={styles.top}>
            <Icon name="navigate-outline" size={20} />
            <View style={styles.flex}>
              <Text variant="caption" tone="muted">
                {t('customer:provider.travel')}
              </Text>
              <Text>{t(`customer:travel.${profile.travelPreference}`)}</Text>
            </View>
          </Row>
        ) : null}
      </Card>

      {profile.qualifications.length > 0 ? (
        <>
          <SectionHeader title={t('customer:provider.qualifications')} />
          <Card>
            {profile.qualifications.map((item, index) => (
              <View key={`${item.title}-${index}`} style={styles.serviceItem}>
                {index > 0 ? <Divider /> : null}
                <Text variant="bodyStrong">{item.title}</Text>
                <Text variant="caption" tone="muted">
                  {[t(`customer:qualificationKind.${item.kind}`), item.issuer, item.year ? String(item.year) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title={t('customer:provider.reviews', { count: profile.reviewCount })} />
      {profile.recentReviews.length === 0 ? (
        <Text tone="muted">{t('customer:provider.noReviews')}</Text>
      ) : (
        profile.recentReviews.map((review) => (
          <Card key={review.id}>
            <Row style={styles.between}>
              <RatingStars value={review.rating} size={14} />
              <Text variant="caption" tone="muted">
                {formatDate(review.createdAt, locale)}
              </Text>
            </Row>
            {review.comment ? <Text>{review.comment}</Text> : null}
            <Text variant="caption" tone="muted">
              {t('customer:provider.reviewBy', { name: review.customerFirstName, service: pick(review.serviceName) })}
            </Text>
          </Card>
        ))
      )}

      <Button
        label={t('customer:provider.reportSomething')}
        variant="ghost"
        icon="flag-outline"
        onPress={() => router.push({ pathname: '/report', params: { subjectUserId: profile.userId, name: profile.displayName } })}
        style={{ alignSelf: 'center' }}
      />
      <View style={{ height: theme.spacing(2) }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  top: { alignItems: 'flex-start' },
  between: { justifyContent: 'space-between' },
  wrap: { flexWrap: 'wrap' },
  serviceItem: { gap: 4 },
  menuButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
