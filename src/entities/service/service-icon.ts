import type { IconName } from '@/shared/ui';

const rules: [RegExp, IconName][] = [
  [/clean|maid|house/, 'sparkles-outline'],
  [/cook|chef|kitchen|meal/, 'restaurant-outline'],
  [/elder|senior/, 'accessibility-outline'],
  [/patient|nurs|medic|health/, 'medkit-outline'],
  [/baby|child|nanny/, 'happy-outline'],
  [/driv|car/, 'car-outline'],
  [/garden|plant/, 'leaf-outline'],
  [/pet|dog/, 'paw-outline'],
];

/** Ionicon for a category or service slug. */
export function serviceIcon(slug: string): IconName {
  return rules.find(([pattern]) => pattern.test(slug))?.[1] ?? 'home-outline';
}
