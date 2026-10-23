import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill, RatingStars, Row, Text } from '@/shared/ui';

/** Stars + count when rated; "New on Fix60" until the provider has a published rating. */
export function ProviderRating({
  averageRating,
  reviewCount,
  size = 14,
}: {
  averageRating: number | null;
  reviewCount: number;
  size?: number;
}): ReactNode {
  const { t } = useTranslation();
  if (averageRating === null) {
    return <Pill label={t('customer:provider.newOnFix60')} tone="info" icon="sparkles-outline" />;
  }
  const label = t('customer:provider.ratingA11y', { rating: averageRating.toFixed(1), count: reviewCount });
  return (
    <Row gap={6}>
      <RatingStars value={averageRating} size={size} label={label} />
      <Text variant="caption" tone="muted" importantForAccessibility="no">
        {t('customer:provider.ratingShort', { rating: averageRating.toFixed(1), count: reviewCount })}
      </Text>
    </Row>
  );
}
