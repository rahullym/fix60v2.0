import type { ReactNode } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme, type Theme } from '../theme/theme';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label';
export type TextTone = 'default' | 'muted' | 'primary' | 'accent' | 'danger' | 'success' | 'warning' | 'onPrimary';

const variantStyles: Record<TextVariant, TextStyle> = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.2 },
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

/** Themed text. Malayalam glyphs need the generous line heights set here. */
export function Text({ variant = 'body', tone = 'default', align, style, ...rest }: TextProps): ReactNode {
  const theme = useTheme();
  const isHeading = variant === 'display' || variant === 'title' || variant === 'heading';
  return (
    <RNText
      {...rest}
      style={[
        variantStyles[variant],
        {
          color: toneColor(theme, tone),
          textAlign: align,
          fontFamily: isHeading ? theme.font.heading : theme.font.body,
        },
        style,
      ]}
    />
  );
}
