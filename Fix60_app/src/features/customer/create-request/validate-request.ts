import type { ClockTime, IsoDate } from '@/shared/api/types';
import { isSlotInPast, todayIso } from '../model/slot';

export const REQUEST_LIMITS = {
  minHours: 1,
  maxHours: 12,
  defaultHours: 2,
  maxAreaNote: 200,
  maxRequirements: 1000,
  maxBudget: 100_000,
} as const;

export interface RequestDraft {
  serviceId: string | null;
  districtId: string | null;
  localityId: string | null;
  areaNote: string;
  date: IsoDate | null;
  startTime: ClockTime | null;
  durationHours: number;
  budgetText: string;
  requirements: string;
  contactPhone: string | null;
  whatsappText: string;
}

export type RequestField = keyof RequestDraft;

/**
 * Client-side checks before POST /requests. Returns i18n keys per field (empty when valid).
 * `isValidPhone` is injected so this stays a pure function.
 */
export function validateRequest(
  draft: RequestDraft,
  isValidPhone: (input: string) => boolean,
  now: Date = new Date(),
): Partial<Record<RequestField, string>> {
  const errors: Partial<Record<RequestField, string>> = {};
  if (!draft.serviceId) errors.serviceId = 'customer:form.errors.service';
  if (!draft.districtId) errors.districtId = 'customer:form.errors.district';
  if (!draft.localityId) errors.localityId = 'customer:form.errors.locality';
  if (draft.areaNote.trim().length > REQUEST_LIMITS.maxAreaNote) errors.areaNote = 'customer:form.errors.tooLong';
  if (!draft.date) errors.date = 'customer:form.errors.date';
  else if (draft.date < todayIso()) errors.date = 'customer:form.errors.datePast';
  if (!draft.startTime) errors.startTime = 'customer:form.errors.startTime';
  else if (draft.date && draft.date >= todayIso() && isSlotInPast(draft.date, draft.startTime, now)) {
    errors.startTime = 'customer:form.errors.timePast';
  }
  if (draft.durationHours < REQUEST_LIMITS.minHours || draft.durationHours > REQUEST_LIMITS.maxHours) {
    errors.durationHours = 'customer:form.errors.duration';
  }
  if (draft.budgetText.trim()) {
    const budget = Number(draft.budgetText);
    if (!Number.isInteger(budget) || budget <= 0 || budget > REQUEST_LIMITS.maxBudget) {
      errors.budgetText = 'customer:form.errors.budget';
    }
  }
  if (draft.requirements.trim().length > REQUEST_LIMITS.maxRequirements) errors.requirements = 'customer:form.errors.tooLong';
  if (!draft.contactPhone) errors.contactPhone = 'customer:form.errors.noPhone';
  if (draft.whatsappText.trim() && !isValidPhone(draft.whatsappText)) errors.whatsappText = 'errors:phone.invalid_phone';
  return errors;
}
