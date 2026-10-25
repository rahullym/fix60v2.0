import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Icon, type IconName } from './icon';

/** Square gradient tile with a white icon (old GradientIcon: radius 12, centred). */
export function GradientIcon({
  icon,
  colors,
  size = 56,
  isRound = false,
}: {
  icon: IconName;
  colors: readonly [string, string];
  size?: number;
  isRound?: boolean;
}): ReactNode {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.tile, { width: size, height: size, borderRadius: isRound ? size / 2 : Math.round(size * 0.2) }]}>
      <Icon name={icon} size={Math.round(size * 0.5)} color="#FFFFFF" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
