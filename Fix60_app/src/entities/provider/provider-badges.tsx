import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Badge } from '@/shared/api/types';
import { Pill, Row, type IconName, type PillTone } from '@/shared/ui';

const badgeIcon: Record<Badge, IconName> = {
  verified: 'shield-checkmark-outline',
  police_verified: 'shield-checkmark',
  experienced: 'ribbon-outline',
  top_rated: 'star-outline',
};

const badgeTone: Record<Badge, PillTone> = {
  verified: 'success',
  police_verified: 'success',
  experienced: 'accent',
  top_rated: 'accent',
};

/** Trust badges as pills; wraps on narrow screens. */
export function ProviderBadges({ badges }: { badges: Badge[] }): ReactNode {
  const { t } = useTranslation();
  if (badges.length === 0) return null;
  return (
    <Row gap={6} style={{ flexWrap: 'wrap' }}>
      {badges.map((badge) => (
        <Pill key={badge} label={t(`common:badges.${badge}`)} tone={badgeTone[badge]} icon={badgeIcon[badge]} />
      ))}
    </Row>
  );
}
