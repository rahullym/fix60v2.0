import type { ClockTime, IsoDate, ProviderSearchQuery } from '@/shared/api/types';

export interface SearchFilters {
  districtId: string | null;
  localityId: string | null;
  date: IsoDate | null;
  startTime: ClockTime | null;
  durationHours: number;
  maxBudget: number | null;
  minExperience: number;
  language: string | null;
}

/** Language codes (providers store codes: ml, en, ta, hi, kn, other). */
export const SEARCH_LANGUAGES = ['ml', 'en', 'ta', 'hi', 'kn'] as const;
export const DEFAULT_START_TIME = '09:00';
export const DEFAULT_DURATION_HOURS = 2;
export const MAX_DURATION_HOURS = 12;

export function defaultFilters(districtId: string | null, localityId: string | null): SearchFilters {
  return {
    districtId,
    localityId,
    date: null,
    startTime: null,
    durationHours: DEFAULT_DURATION_HOURS,
    maxBudget: null,
    minExperience: 0,
    language: null,
  };
}

/** Number of non-default filters (for the filter button badge). */
export function activeFilterCount(filters: SearchFilters): number {
  return [filters.date, filters.maxBudget, filters.minExperience > 0 ? 1 : null, filters.language].filter(
    (value) => value !== null,
  ).length;
}

/** Filters → API query (without page). Slot fields are sent only when a date is chosen. */
export function toSearchQuery(serviceId: string, filters: SearchFilters): Omit<ProviderSearchQuery, 'page'> {
  return {
    serviceId,
    localityId: filters.localityId ?? undefined,
    date: filters.date ?? undefined,
    startTime: filters.date ? (filters.startTime ?? DEFAULT_START_TIME) : undefined,
    durationHours: filters.date ? filters.durationHours : undefined,
    maxBudget: filters.maxBudget ?? undefined,
    minExperience: filters.minExperience > 0 ? filters.minExperience : undefined,
    language: filters.language ?? undefined,
    pageSize: 20,
  };
}
