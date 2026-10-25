import type { ReactNode } from 'react';
import { Text as RNText, StyleSheet, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { fontFamilies, type FontWeightName, useTheme, type Theme } from '../theme/theme';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label';
export type TextTone = 'default' | 'muted' | 'primary' | 'accent' | 'danger' | 'success' | 'warning' | 'onPrimary';

/** Type scale from the original Fix60 apps (Plus Jakarta Sans). */
const variantStyles: Record<TextVariant, TextStyle & { weight: FontWeightName }> = {
  display: { fontSize: 32, lineHeight: 42, weight: 'extrabold' },
  title: { fontSize: 24, lineHeight: 32, weight: 'bold' },
  heading: { fontSize: 18, lineHeight: 26, weight: 'semibold' },
  body: { fontSize: 15, lineHeight: 22, weight: 'regular' },
  bodyStrong: { fontSize: 15, lineHeight: 22, weight: 'semibold' },
  caption: { fontSize: 12, lineHeight: 18, weight: 'regular' },
  label: { fontSize: 13, lineHeight: 18, weight: 'medium' },
};

const weightToFamily: Record<string, FontWeightName> = {
  '100': 'regular',
  '200': 'regular',
  '300': 'regular',
  '400': 'regular',
  normal: 'regular',
  '500': 'medium',
  '600': 'semibold',
  '700': 'bold',
  bold: 'bold',
  '800': 'extrabold',
  '900': 'extrabold',
};

function toneColor(theme: Theme, tone: TextTone): string {
  const map: Record<TextTone, string> = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    primary: theme.colors.primary,
    accent: theme.colors.accent,
    danger: theme.colors.danger,
    success: theme.colors.success,
    warning: theme.colors.warning,
    onPrimary: theme.colors.onPrimary,
  };
  return map[tone];
}

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextStyle['textAlign'];
  children?: ReactNode;
}

/**
 * Themed text. Android ignores fontWeight on custom fonts, so any fontWeight in `style`
 * is translated to the matching Plus Jakarta Sans family.
 */
export function Text({ variant = 'body', tone = 'default', align, style, ...rest }: TextProps): ReactNode {
  const theme = useTheme();
  const { weight, ...base } = variantStyles[variant];
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, ...overrides } = flat;
  const family = fontFamilies[fontWeight ? (weightToFamily[String(fontWeight)] ?? weight) : weight];
  return (
    <RNText
      {...rest}
      style={[base, { color: toneColor(theme, tone), textAlign: align, fontFamily: family }, overrides]}
    />
  );
}
