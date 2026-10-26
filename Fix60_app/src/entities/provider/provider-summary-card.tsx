import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ProviderCard } from '@/shared/api/types';
import { useLocale } from '@/shared/lib/use-locale';
import { Avatar, Card, Row, Text } from '@/shared/ui';
import { ProviderBadges } from './provider-badges';
import { ProviderRating } from './provider-rating';
import { useProviderFormat } from './use-provider-format';

/** Public provider card: photo, name, place, distance, experience, languages, badges, rating and rate. */
export function ProviderSummaryCard({
  provider,
  onPress,
  action,
  footer,
}: {
  provider: ProviderCard;
  onPress?: () => void;
  /** Top-right slot, e.g. a save heart. */
  action?: ReactNode;
  /** Bottom slot, e.g. a Choose button. */
  footer?: ReactNode;
}): ReactNode {
  const { pick } = useLocale();
  const format = useProviderFormat();
  const place = [pick(provider.localityName) || pick(provider.districtName), format.distanceLabel(provider.distanceKm)]
    .filter(Boolean)
    .join(' · ');
  const meta = [format.experienceLabel(provider.yearsExperience), format.languagesLabel(provider.languages)]
    .filter(Boolean)
    .join(' · ');
  const rate = format.rateLabel(provider.rates);

  const label = [provider.displayName, place, rate].filter(Boolean).join(', ');
  // With inner buttons (save heart, Choose), the card must not swallow them for screen readers:
  // the card stays tappable by touch, and the name block is the accessible "open profile" button.
  const hasInnerButtons = Boolean(action || footer);
  const isHeaderButton = hasInnerButtons && Boolean(onPress);

  return (
    <Card onPress={onPress} accessible={!hasInnerButtons} accessibilityLabel={label}>
      <Row gap={12} style={styles.top}>
        <Pressable
          accessible={isHeaderButton}
          accessibilityRole={isHeaderButton ? 'button' : undefined}
          accessibilityLabel={isHeaderButton ? label : undefined}
          disabled={!isHeaderButton}
          onPress={onPress}
          style={styles.header}>
          <Avatar uri={provider.photoUrl} name={provider.displayName} size={56} />
          <View style={styles.flex}>
            <Text variant="heading" numberOfLines={2}>
              {provider.displayName}
            </Text>
            {place ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {place}
              </Text>
            ) : null}
            <ProviderRating averageRating={provider.averageRating} reviewCount={provider.reviewCount} />
          </View>
        </Pressable>
        {action}
      </Row>
      <ProviderBadges badges={provider.badges} />
      {meta ? (
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {meta}
        </Text>
      ) : null}
      {rate ? <Text variant="bodyStrong">{rate}</Text> : null}
      {footer}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  top: { alignItems: 'flex-start' },
  header: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
});
