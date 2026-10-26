import type { IconName } from '@/shared/ui';

/** Exact slugs (categories and services) from the catalog. */
const bySlug: Record<string, IconName> = {
  transport: 'car-outline',
  'taxi-personal-driver': 'car-outline',
  'driver-shopping-assistance': 'car-outline',
  'patient-support': 'medkit-outline',
  'patient-care-assistance': 'medkit-outline',
  'patient-companion': 'medkit-outline',
  'personal-daily-assistance': 'bag-handle-outline',
  'shopping-assistance': 'bag-handle-outline',
  'travel-assistance': 'bag-handle-outline',
  'home-stay-assistance': 'home-outline',
  'home-services': 'home-outline',
  'home-assistance': 'home-outline',
  cleaning: 'sparkles-outline',
  electrician: 'flash-outline',
  plumber: 'water-outline',
  mechanic: 'construct-outline',
  'personal-care': 'cut-outline',
  'beauty-grooming': 'cut-outline',
  childcare: 'happy-outline',
  'childcare-daycare': 'happy-outline',
  food: 'restaurant-outline',
  'homemade-food': 'restaurant-outline',
};

/** Keyword fallbacks for slugs not listed above. */
const rules: [RegExp, IconName][] = [
  [/clean|maid/, 'sparkles-outline'],
  [/cook|chef|kitchen|meal|food/, 'restaurant-outline'],
  [/elder|senior/, 'accessibility-outline'],
  [/patient|nurs|medic|health/, 'medkit-outline'],
  [/baby|child|nanny|daycare/, 'happy-outline'],
  [/driv|car|taxi|transport/, 'car-outline'],
  [/shop|travel/, 'bag-handle-outline'],
  [/electric/, 'flash-outline'],
  [/plumb/, 'water-outline'],
  [/mechanic|repair/, 'construct-outline'],
  [/beauty|groom|salon/, 'cut-outline'],
  [/garden|plant/, 'leaf-outline'],
  [/pet|dog/, 'paw-outline'],
];

/** Ionicon for a category or service slug. */
export function serviceIcon(slug: string): IconName {
  return bySlug[slug] ?? rules.find(([pattern]) => pattern.test(slug))?.[1] ?? 'home-outline';
}
