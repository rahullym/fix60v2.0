import { useQuery } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { api } from '../api/endpoints';
import type { ThemeTokens } from '../api/types';

/** Default preset (`graphite-signal`), used before branding loads or when it fails. */
export const defaultThemeTokens: ThemeTokens = {
  primary: '#1F2937',
  primaryMid: '#374151',
  primaryLight: '#E5E7EB',
  accent: '#F97316',
  accentLight: '#FFEDD5',
  railMid: '#111827',
  railDeep: '#030712',
  tintSecondary: '#F3F4F6',
  tintTertiary: '#F9FAFB',
  surfaceMuted: '#F4F4F5',
  surfaceFog: '#FAFAFA',
};

const neutrals = {
  light: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#111827',
    textMuted: '#6B7280',
    border: '#E5E7EB',
    success: '#15803D',
    successLight: '#DCFCE7',
    warning: '#B45309',
    warningLight: '#FEF3C7',
    danger: '#B91C1C',
    dangerLight: '#FEE2E2',
    info: '#1D4ED8',
    infoLight: '#DBEAFE',
    onPrimary: '#FFFFFF',
  },
  dark: {
    background: '#0B0F14',
    surface: '#151B23',
    text: '#F3F4F6',
    textMuted: '#9CA3AF',
    border: '#273142',
    success: '#4ADE80',
    successLight: '#14532D',
    warning: '#FBBF24',
    warningLight: '#451A03',
    danger: '#F87171',
    dangerLight: '#450A0A',
    info: '#93C5FD',
    infoLight: '#1E3A8A',
    onPrimary: '#FFFFFF',
  },
} as const;

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  brandName: string;
  logoUrl: string | null;
  colors: ThemeTokens & (typeof neutrals)['light' | 'dark'] & { surfaceAlt: string; primarySoft: string };
  spacing: (multiplier: number) => number;
  radius: { sm: number; md: number; lg: number; pill: number };
  font: { heading: string | undefined; body: string | undefined };
}

function buildTheme(scheme: ColorScheme, tokens: ThemeTokens, brandName: string, logoUrl: string | null): Theme {
  const base = neutrals[scheme];
  const isDark = scheme === 'dark';
  return {
    scheme,
    brandName,
    logoUrl,
    colors: {
      ...tokens,
      ...base,
      // Brand primary can be very dark; lift it for contrast on dark surfaces.
      primary: isDark ? tokens.accent : tokens.primary,
      surfaceAlt: isDark ? '#1C2430' : tokens.surfaceMuted,
      primarySoft: isDark ? '#1F2937' : tokens.primaryLight,
    },
    spacing: (multiplier) => multiplier * 4,
    radius: { sm: 8, md: 12, lg: 16, pill: 999 },
    font: { heading: tokens.fontHeading, body: tokens.fontBody },
  };
}

const ThemeContext = createContext<Theme>(buildTheme('light', defaultThemeTokens, 'Fix60', null));

/** Applies live branding (GET /branding) on top of the default preset. Always on. */
export function ThemeProvider({ children }: { children: ReactNode }): ReactNode {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const branding = useQuery({
    queryKey: ['branding'],
    queryFn: api.public.branding,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
  const theme = useMemo(
    () =>
      buildTheme(
        scheme,
        { ...defaultThemeTokens, ...branding.data?.theme },
        branding.data?.name ?? 'Fix60',
        branding.data?.logoUrl ?? null,
      ),
    [scheme, branding.data],
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
