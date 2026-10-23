import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { useTheme } from '../theme/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Ionicons wrapper defaulting to the theme text colour. */
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }): ReactNode {
  const theme = useTheme();
  return <Ionicons name={name} size={size} color={color ?? theme.colors.text} />;
}
