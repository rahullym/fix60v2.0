/**
 * Fixed colours from the original Fix60 consumer and provider apps (constants/Colors.ts, utils/randomColors.ts).
 * Brand colours come from the theme; these are the shared status, chip and gradient values.
 */
export const palette = {
  status: {
    active: { bg: '#0066FF', fg: '#FFFFFF' },
    upcoming: { bg: '#FFF7ED', fg: '#FF6B35' },
    scheduled: { bg: '#FF6B35', fg: '#FFFFFF' },
    completed: { bg: '#10B981', fg: '#FFFFFF' },
    attention: { bg: '#FEF3C7', fg: '#B45309' },
    danger: { bg: '#FEE2E2', fg: '#DC2626' },
    neutral: { bg: '#F1F5F9', fg: '#64748B' },
  },
  chip: { bg: '#F1F5F9', border: '#E2E8F0' },
  emptyIcon: '#99CCFF',
  successCircle: '#4242FF',
  successCheck: '#10B981',
  onBlueSoft: 'rgba(255,255,255,0.2)',
  onBlueMuted: 'rgba(255,255,255,0.7)',
  textStrong: '#0F172A',
  /** Service tile gradients (randomColors.ts) and the teal "view more" tile. */
  gradients: [
    ['#3B82F6', '#60A5FA'],
    ['#FBBF24', '#FCD34D'],
    ['#A855F7', '#C084FC'],
    ['#F97316', '#FB923C'],
    ['#10B981', '#34D399'],
    ['#EC4899', '#F472B6'],
  ] as const,
  viewMore: ['#00D9C0', '#00B8A3'] as const,
  hero: ['#0000FF', '#06B6D4'] as const,
  stats: {
    earnings: { border: '#10B981', bg: '#D1FAE5', fg: '#15803D' },
    jobs: { border: '#F59E0B', bg: '#FEF3C7', fg: '#B45309' },
    rating: { border: '#8B5CF6', bg: '#EDE9FE', fg: '#8B5CF6' },
  },
} as const;

/** Stable gradient for an id/slug, so a service keeps its colour across screens. */
export function gradientFor(key: string): readonly [string, string] {
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return palette.gradients[Math.abs(hash) % palette.gradients.length]!;
}
