import { useQuery } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { api } from '../api/endpoints';
import type { ThemeTokens } from '../api/types';

/** Fix60 brand preset (the original consumer/provider app palette). Branding from the API overrides it. */
export const defaultThemeTokens: ThemeTokens = {
  primary: '#0000FF',
  primaryMid: '#4242FF',
  primaryLight: '#E0F2FE',
  accent: '#FF6B35',
  accentLight: '#FFF1EA',
  railMid: '#1E293B',
  railDeep: '#0F172A',
  tintSecondary: '#F0F7FF',
  tintTertiary: '#F8FAFC',
  surfaceMuted: '#F1F5F9',
  surfaceFog: '#F8FAFB',
  fontHeading: 'PlusJakartaSans-Bold',
  fontBody: 'PlusJakartaSans-Regular',
};

/** Light-only, as in the original apps. */
const neutrals = {
  light: {
    background: '#F8FAFB',
    surface: '#FFFFFF',
    text: '#1A1C1E',
    textMuted: '#6C7278',
    border: '#EDF1F3',
    success: '#059669',
    successLight: '#ECFDF5',
    warning: '#B45309',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#4D81E7',
    infoLight: '#F0F7FF',
    onPrimary: '#FFFFFF',
  },
} as const;

export type ColorScheme = 'light';

/** Plus Jakarta Sans weights (Android ignores fontWeight on custom fonts, so each weight is its own family). */
export const fontFamilies = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semibold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extrabold: 'PlusJakartaSans-ExtraBold',
} as const;
export type FontWeightName = keyof typeof fontFamilies;

export interface Theme {
  scheme: ColorScheme;
  brandName: string;
  logoUrl: string | null;
  colors: ThemeTokens & (typeof neutrals)['light'] & { surfaceAlt: string; primarySoft: string };
  spacing: (multiplier: number) => number;
  radius: { sm: number; md: number; lg: number; pill: number };
  font: typeof fontFamilies;
}

function buildTheme(tokens: ThemeTokens, brandName: string, logoUrl: string | null): Theme {
  return {
    scheme: 'light',
    brandName,
    logoUrl,
    colors: { ...tokens, ...neutrals.light, surfaceAlt: tokens.surfaceMuted, primarySoft: tokens.primaryLight },
    spacing: (multiplier) => multiplier * 4,
    radius: { sm: 8, md: 10, lg: 12, pill: 9999 },
    font: fontFamilies,
  };
}

const ThemeContext = createContext<Theme>(buildTheme(defaultThemeTokens, 'Fix60', null));

/** Applies live brand colours (GET /branding) on top of the Fix60 preset. Always on. */
export function ThemeProvider({ children }: { children: ReactNode }): ReactNode {
  const branding = useQuery({
    queryKey: ['branding'],
    queryFn: api.public.branding,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
  const theme = useMemo(
    () =>
      buildTheme(
        { ...defaultThemeTokens, ...branding.data?.theme },
        branding.data?.name ?? 'Fix60',
        branding.data?.logoUrl ?? null,
      ),
    [branding.data],
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
