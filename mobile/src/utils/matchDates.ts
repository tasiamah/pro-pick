import type { Match } from '../api/types';

export const DATE_RANGE_DAYS = 7;

export function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function toUtcDateKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export function formatDateChipLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function buildDateRange(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => addUtcDays(start, index));
}

export function buildDateWindowParams(
  start = startOfUtcDay(),
  end = addUtcDays(start, DATE_RANGE_DAYS),
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
  now = startOfUtcDay(),
): Date {
  if (upcomingMatches > 0) {
    return now;
  }

  if (latestKickoff) {
    return startOfUtcDay(new Date(latestKickoff));
  }

  return now;
}

export function buildDateRangeEndingAt(anchor: Date, count = DATE_RANGE_DAYS): Date[] {
  const start = addUtcDays(anchor, -(count - 1));
  return buildDateRange(start, count);
}

export function filterMatchesByDate<T extends Match>(
  matches: T[],
  selectedDate: Date,
): T[] {
  const selectedKey = toUtcDateKey(selectedDate);

  return matches
    .filter((match) => match.kickoff && toUtcDateKey(match.kickoff) === selectedKey)
    .sort((left, right) => {
      const leftTime = left.kickoff ? new Date(left.kickoff).getTime() : 0;
      const rightTime = right.kickoff ? new Date(right.kickoff).getTime() : 0;
      return leftTime - rightTime;
    });
}
