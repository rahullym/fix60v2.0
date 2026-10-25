import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ProviderPublicProfile } from '@/shared/api/types';
import { formatDate } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';
import { Avatar, Card, Divider, Pill, RatingStars, Row, Text } from '@/shared/ui';

/** The profile exactly as customers see it. Rating appears only once the server publishes one. */
export function PublicProfilePreview({ profile }: { profile: ProviderPublicProfile }): ReactNode {
  const { t } = useTranslation();
  const { locale, pick } = useLocale();
  const place = [pick(profile.localityName), pick(profile.districtName)].filter(Boolean).join(', ');
  return (
    <Card>
      <Row gap={12}>
        <Avatar uri={profile.photoUrl} name={profile.displayName} size={64} />
        <View style={styles.flex}>
          <Text variant="heading">{profile.displayName}</Text>
          {place ? (
            <Text variant="caption" tone="muted">
              {place}
            </Text>
          ) : null}
          {profile.yearsExperience !== null ? (
            <Text variant="caption" tone="muted">
              {t('provider:profile.experience', { years: t('common:units.years', { count: profile.yearsExperience }) })}
            </Text>
          ) : null}
        </View>
      </Row>
      {profile.badges.length > 0 ? (
        <View style={styles.wrap}>
          {profile.badges.map((badge) => (
            <Pill key={badge} label={t(`common:badges.${badge}`)} tone="success" icon="shield-checkmark-outline" />
          ))}
        </View>
      ) : null}
      {profile.averageRating !== null ? (
        <Row>
          <RatingStars value={profile.averageRating} label={t('provider:profile.ratingA11y', { rating: profile.averageRating.toFixed(1) })} />
          <Text variant="caption" tone="muted">
            {t('provider:profile.reviewCount', { count: profile.reviewCount, rating: profile.averageRating.toFixed(1) })}
          </Text>
        </Row>
      ) : (
        <Text variant="caption" tone="muted">
          {t('provider:profile.noRatingYet')}
        </Text>
      )}
      {profile.languages.length > 0 ? (
        <Text variant="caption">{t('provider:profile.languages', {
            list: profile.languages.map((language) => t(`common:languages.${language}`, { defaultValue: language })).join(', '),
          })}</Text>
      ) : null}
      {profile.bio ? <Text>{profile.bio}</Text> : null}
      {profile.services.map((item) => (
        <Text key={item.service.id} variant="caption" tone="muted">
          {pick(item.service.name)}
        </Text>
      ))}
      {profile.recentReviews.length > 0 ? (
        <>
          <Divider />
          <Text variant="bodyStrong">{t('provider:profile.recentReviews')}</Text>
          {profile.recentReviews.map((review) => (
            <View key={review.id} style={styles.review}>
              <Row>
                <RatingStars value={review.rating} size={14} />
                <Text variant="caption" tone="muted" style={styles.flex}>
                  {`${review.customerFirstName} · ${pick(review.serviceName)} · ${formatDate(review.createdAt, locale)}`}
                </Text>
              </Row>
              {review.comment ? <Text variant="caption">{review.comment}</Text> : null}
            </View>
          ))}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  review: { gap: 4 },
});
