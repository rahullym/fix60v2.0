export const ADULT_AGE = 18;

/** Today's calendar date in India (YYYY-MM-DD), independent of the server's timezone. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

/** Whole years between a YYYY-MM-DD birth date and a YYYY-MM-DD reference date. */
export function ageOn(dateOfBirth: string, onDate: string): number {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const [year, month, day] = onDate.split('-').map(Number) as [number, number, number];
  const hadBirthday = month > birthMonth || (month === birthMonth && day >= birthDay);
  return year - birthYear - (hadBirthday ? 0 : 1);
}

export function isAdult(dateOfBirth: string, now: Date = new Date()): boolean {
  return ageOn(dateOfBirth, todayInIndia(now)) >= ADULT_AGE;
}
