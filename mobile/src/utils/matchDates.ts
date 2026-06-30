import type { Match } from '../api/types';

export const DATE_RANGE_DAYS = 7;

const TIMEZONE_SUFFIX = /([zZ]|[+-]\d{2}:?\d{2})$/;

/**
 * Parse an API datetime into a `Date`. The backend serializes naive UTC
 * timestamps with no timezone (e.g. "2026-06-30T17:00:00"), which `new Date()`
 * would otherwise interpret in the device's local zone — showing kickoff times
 * off by the local UTC offset. Treat a missing timezone as UTC so times render
 * correctly once converted back to the user's local zone for display.
 */
export function parseMatchDate(value: string): Date {
  return new Date(TIMEZONE_SUFFIX.test(value) ? value : `${value}Z`);
}

export function startOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toLocalDateKey(value: string | Date): string {
  const date = typeof value === 'string' ? parseMatchDate(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function localDayKeyToDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateChipLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function buildDateRange(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => addLocalDays(start, index));
}

export function buildDateWindowParams(
  start = startOfLocalDay(),
  end = addLocalDays(start, DATE_RANGE_DAYS),
): {
  kickoff_from: string;
  kickoff_to: string;
  limit: number;
} {
  return {
    kickoff_from: start.toISOString(),
    kickoff_to: end.toISOString(),
    limit: 200,
  };
}

export function resolveMatchAnchorDate(
  upcomingMatches: number,
  latestKickoff: string | null,
  now = startOfLocalDay(),
): Date {
  if (upcomingMatches > 0) {
    return now;
  }

  if (latestKickoff) {
    return startOfLocalDay(parseMatchDate(latestKickoff));
  }

  return now;
}

export function buildDateRangeEndingAt(anchor: Date, count = DATE_RANGE_DAYS): Date[] {
  const start = addLocalDays(anchor, -(count - 1));
  return buildDateRange(start, count);
}

export function filterMatchesByDate<T extends Match>(
  matches: T[],
  selectedDate: Date,
): T[] {
  const selectedKey = toLocalDateKey(selectedDate);

  return matches
    .filter((match) => match.kickoff && toLocalDateKey(match.kickoff) === selectedKey)
    .sort((left, right) => {
      const leftTime = left.kickoff ? parseMatchDate(left.kickoff).getTime() : 0;
      const rightTime = right.kickoff ? parseMatchDate(right.kickoff).getTime() : 0;
      return leftTime - rightTime;
    });
}
