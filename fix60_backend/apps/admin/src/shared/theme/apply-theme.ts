import type { ThemeTokens } from '@fix60/shared';

const tokenVars: Record<keyof Omit<ThemeTokens, 'fontHeading' | 'fontBody'>, string> = {
  primary: '--primary',
  primaryMid: '--primary-mid',
  primaryLight: '--primary-light',
  accent: '--accent',
  accentLight: '--accent-light',
  railMid: '--rail-mid',
  railDeep: '--rail-deep',
  tintSecondary: '--tint-secondary',
  tintTertiary: '--tint-tertiary',
  surfaceMuted: '--surface-muted',
  surfaceFog: '--surface-fog',
};

/** "#1F2937" → "31 41 55" so Tailwind can apply alpha. */
export function hexToChannels(hex: string): string | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) {
    return null;
  }
  const value = Number.parseInt(match[1]!, 16);
  return `${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255}`;
}

/** Writes branding tokens to CSS variables on <html>. */
export function applyThemeTokens(theme: ThemeTokens): void {
  const root = document.documentElement;
  for (const [token, cssVar] of Object.entries(tokenVars)) {
    const channels = hexToChannels(theme[token as keyof typeof tokenVars]);
    if (channels) {
      root.style.setProperty(cssVar, channels);
    }
  }
  if (theme.fontHeading) {
    root.style.setProperty('--brand-font-heading', theme.fontHeading);
  }
  if (theme.fontBody) {
    root.style.setProperty('--brand-font-body', theme.fontBody);
  }
}
