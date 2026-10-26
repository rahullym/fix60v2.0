import { distanceBucket } from './geo';

/** The fields search ranking looks at. */
export interface RankCandidate {
  code: string;
  distanceKm: number | null;
  hourlyRate: number | null;
  yearsExperience: number | null;
  /** Already null when there are fewer than 3 reviews. */
  averageRating: number | null;
}

/** True when the hourly rate fits the budget (always true without a budget). */
export function isWithinBudget(hourlyRate: number | null, maxBudget: number | undefined): boolean {
  if (maxBudget === undefined) {
    return true;
  }
  return hourlyRate !== null && hourlyRate <= maxBudget;
}

/**
 * Search order: distance bucket, then rate within budget, then years of experience,
 * then rating (only with ≥ 3 reviews), then provider code as a stable tie-break.
 */
export function compareCandidates(a: RankCandidate, b: RankCandidate, maxBudget?: number): number {
  const bucketA = a.distanceKm === null ? 4 : distanceBucket(a.distanceKm);
  const bucketB = b.distanceKm === null ? 4 : distanceBucket(b.distanceKm);
  if (bucketA !== bucketB) return bucketA - bucketB;
  const budgetA = isWithinBudget(a.hourlyRate, maxBudget) ? 0 : 1;
  const budgetB = isWithinBudget(b.hourlyRate, maxBudget) ? 0 : 1;
  if (budgetA !== budgetB) return budgetA - budgetB;
  const yearsA = a.yearsExperience ?? 0;
  const yearsB = b.yearsExperience ?? 0;
  if (yearsA !== yearsB) return yearsB - yearsA;
  const ratingA = a.averageRating ?? 0;
  const ratingB = b.averageRating ?? 0;
  if (ratingA !== ratingB) return ratingB - ratingA;
  return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
}

/** Returns a new array sorted by `compareCandidates`. */
export function rankCandidates<T extends RankCandidate>(candidates: readonly T[], maxBudget?: number): T[] {
  return [...candidates].sort((a, b) => compareCandidates(a, b, maxBudget));
}
