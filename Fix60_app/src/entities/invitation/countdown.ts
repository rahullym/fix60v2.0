import { useEffect, useState } from 'react';

/** Remaining time split for display; `isExpired` when the deadline passed. */
export interface Countdown {
  isExpired: boolean;
  hours: number;
  minutes: number;
  seconds: number;
  /** Under 10 minutes left. */
  isUrgent: boolean;
}

/** Pure: time left until `expiresAt`. */
export function countdownTo(expiresAt: string, now: Date): Countdown {
  const totalSeconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 1000));
  return {
    isExpired: totalSeconds === 0,
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isUrgent: totalSeconds > 0 && totalSeconds < 600,
  };
}

/** Current time, re-rendering every `intervalMs`. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
