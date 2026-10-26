import type { StoredThemeTokens } from './schema/branding';

export const DEFAULT_THEME_SLUG = 'graphite-signal';

export interface SystemThemePreset {
  slug: string;
  name: string;
  tokens: StoredThemeTokens;
}

/** Built-in presets. Slugs describe the look only. */
export const systemThemePresets: SystemThemePreset[] = [
  {
    slug: DEFAULT_THEME_SLUG,
    name: 'Graphite Signal',
    tokens: {
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
    },
  },
  {
    slug: 'ocean-tide',
    name: 'Ocean Tide',
    tokens: {
      primary: '#0F4C81',
      primaryMid: '#1D6FB8',
      primaryLight: '#DBEAFE',
      accent: '#14B8A6',
      accentLight: '#CCFBF1',
      railMid: '#0B3A63',
      railDeep: '#072743',
      tintSecondary: '#EFF6FF',
      tintTertiary: '#F8FAFC',
      surfaceMuted: '#F1F5F9',
      surfaceFog: '#F8FAFC',
    },
  },
  {
    slug: 'forest-ember',
    name: 'Forest Ember',
    tokens: {
      primary: '#14532D',
      primaryMid: '#166534',
      primaryLight: '#DCFCE7',
      accent: '#EA580C',
      accentLight: '#FFEDD5',
      railMid: '#0F3D22',
      railDeep: '#052E16',
      tintSecondary: '#F0FDF4',
      tintTertiary: '#F7FEE7',
      surfaceMuted: '#F4F4F5',
      surfaceFog: '#FAFAF9',
    },
  },
];
