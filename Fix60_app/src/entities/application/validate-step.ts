import type { ApplicationDraft, ServiceDetail, ServiceQuestion } from '@/shared/api/types';
import { ageFrom } from '@/shared/lib/format';

/** Field path → i18n key. Empty when valid. */
export type FieldErrors = Record<string, string>;

type Step<K extends keyof ApplicationDraft> = NonNullable<ApplicationDraft[K]>;
type Answer = Step<'service_details'>['services'][number]['answers'][string];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_INDIA = /^\+91[6-9]\d{9}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

export const MIN_BOOKING_OPTIONS = [60, 120, 240, 480] as const;
export const RADIUS_RANGE = { min: 1, max: 50 } as const;
export const MAX_HOURS_RANGE = { min: 1, max: 16 } as const;
export const BIO_MAX = 1000;
export const NOTE_MAX = 500;

const K = {
  required: 'provider:validation.required',
  fullName: 'provider:validation.fullName',
  underage: 'errors:underage',
  dateOfBirth: 'provider:validation.dateOfBirth',
  email: 'provider:validation.email',
  phone: 'errors:phone.invalid_phone',
  tooLong: 'provider:validation.tooLong',
  pickService: 'provider:validation.pickService',
  rateRequired: 'provider:validation.rateRequired',
  rateInvalid: 'provider:validation.rateInvalid',
  minBooking: 'provider:validation.minBooking',
  years: 'provider:validation.years',
  languages: 'provider:validation.languages',
  qualificationTitle: 'provider:validation.qualificationTitle',
  qualificationYear: 'provider:validation.qualificationYear',
  location: 'provider:validation.location',
  radius: 'provider:validation.radius',
  availabilityTypes: 'provider:validation.availabilityTypes',
  dayParts: 'provider:validation.dayParts',
  maxHours: 'provider:validation.maxHours',
  rulesEmpty: 'provider:validation.rulesEmpty',
  timeOrder: 'provider:validation.timeOrder',
  declaration: 'provider:validation.declaration',
} as const;

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function validatePersonal(data: Step<'personal'>, today: Date = new Date()): FieldErrors {
  const errors: FieldErrors = {};
  if (data.fullName.trim().length < 2) errors.fullName = K.fullName;
  if (!ISO_DATE.test(data.dateOfBirth)) errors.dateOfBirth = K.dateOfBirth;
  else if (ageFrom(data.dateOfBirth, today) < 18) errors.dateOfBirth = K.underage;
  if (data.whatsappPhone && !E164_INDIA.test(data.whatsappPhone)) errors.whatsappPhone = K.phone;
  if (data.email && !EMAIL_PATTERN.test(data.email.trim())) errors.email = K.email;
  return errors;
}

export function validateLocation(data: Step<'location'>): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.districtId) errors.districtId = K.required;
  if (!data.localityId) errors.localityId = K.required;
  if ((data.addressNote ?? '').length > NOTE_MAX) errors.addressNote = K.tooLong;
  return errors;
}

export function validateServices(data: Step<'services'>): FieldErrors {
  return data.serviceIds.length === 0 ? { serviceIds: K.pickService } : {};
}

function isAnswered(answer: Answer | undefined): boolean {
  if (answer === undefined) return false;
  if (typeof answer === 'string') return answer.trim().length > 0;
  if (typeof answer === 'number') return Number.isFinite(answer);
  if (Array.isArray(answer)) return answer.length > 0;
  return true;
}

function isValidRate(rate: number | null): boolean {
  return rate === null || (Number.isFinite(rate) && rate > 0 && rate <= 1_000_000);
}

/** `details` are the catalog entries for the selected services (questions + eligibility). */
export function validateServiceDetails(data: Step<'service_details'>, details: ServiceDetail[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const detail of details) {
    const entry = data.services.find((service) => service.serviceId === detail.id);
    const prefix = detail.id;
    if (!entry) {
      errors[`${prefix}.rates`] = K.rateRequired;
      continue;
    }
    if (entry.yearsExperience !== null && (entry.yearsExperience < 0 || entry.yearsExperience > 60)) {
      errors[`${prefix}.yearsExperience`] = K.years;
    }
    const { hourlyRate, dailyRate, monthlyRate, minBookingMinutes } = entry.rates;
    if (!isValidRate(hourlyRate) || !isValidRate(dailyRate) || !isValidRate(monthlyRate)) {
      errors[`${prefix}.rates`] = K.rateInvalid;
    } else if (hourlyRate === null && dailyRate === null && monthlyRate === null) {
      errors[`${prefix}.rates`] = K.rateRequired;
    }
    if (!(MIN_BOOKING_OPTIONS as readonly number[]).includes(minBookingMinutes)) {
      errors[`${prefix}.minBookingMinutes`] = K.minBooking;
    }
    for (const question of detail.questions) {
      if (question.isRequired && !isAnswered(entry.answers[question.key])) {
        errors[questionErrorKey(detail.id, question)] = K.required;
      }
    }
  }
  return errors;
}

export function questionErrorKey(serviceId: string, question: Pick<ServiceQuestion, 'key'>): string {
  return `${serviceId}.q.${question.key}`;
}

export function validateExperience(data: Step<'experience'>, now: Date = new Date()): FieldErrors {
  const errors: FieldErrors = {};
  if (data.yearsExperience !== null && (data.yearsExperience < 0 || data.yearsExperience > 60)) {
    errors.yearsExperience = K.years;
  }
  if ((data.bio ?? '').length > BIO_MAX) errors.bio = K.tooLong;
  if ((data.previousWork ?? '').length > BIO_MAX) errors.previousWork = K.tooLong;
  if (data.languages.length === 0) errors.languages = K.languages;
  const thisYear = now.getFullYear();
  data.qualifications.forEach((qualification, index) => {
    if (qualification.title.trim().length < 2) errors[`qualifications.${index}.title`] = K.qualificationTitle;
    if (qualification.year !== null && (qualification.year < 1950 || qualification.year > thisYear)) {
      errors[`qualifications.${index}.year`] = K.qualificationYear;
    }
  });
  return errors;
}

export function validateServiceArea(data: Step<'service_area'>): FieldErrors {
  const errors: FieldErrors = {};
  const isLatOk = Number.isFinite(data.latitude) && Math.abs(data.latitude) <= 90;
  const isLngOk = Number.isFinite(data.longitude) && Math.abs(data.longitude) <= 180;
  if (!isLatOk || !isLngOk || (data.latitude === 0 && data.longitude === 0)) errors.center = K.location;
  if (data.radiusKm < RADIUS_RANGE.min || data.radiusKm > RADIUS_RANGE.max) errors.radiusKm = K.radius;
  return errors;
}

/** Weekly rules: valid HH:mm and start before end. Keys are `rules.<weekday>`. */
export function validateRules(rules: { weekday: number; startTime: string; endTime: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const rule of rules) {
    if (!CLOCK.test(rule.startTime) || !CLOCK.test(rule.endTime) || rule.startTime >= rule.endTime) {
      errors[`rules.${rule.weekday}`] = K.timeOrder;
    }
  }
  return errors;
}

export function validateMaxHours(maxHoursPerDay: number | null): FieldErrors {
  if (maxHoursPerDay !== null && (maxHoursPerDay < MAX_HOURS_RANGE.min || maxHoursPerDay > MAX_HOURS_RANGE.max)) {
    return { maxHoursPerDay: K.maxHours };
  }
  return {};
}

export function validateAvailability(data: Step<'availability'>): FieldErrors {
  const errors: FieldErrors = { ...validateRules(data.rules), ...validateMaxHours(data.maxHoursPerDay) };
  if (data.availabilityTypes.length === 0) errors.availabilityTypes = K.availabilityTypes;
  if (data.dayParts.length === 0) errors.dayParts = K.dayParts;
  if (data.rules.length === 0) errors.rules = K.rulesEmpty;
  return errors;
}

export function validateReview(data: Step<'review'>): FieldErrors {
  return data.declarationAccepted ? {} : { declarationAccepted: K.declaration };
}
