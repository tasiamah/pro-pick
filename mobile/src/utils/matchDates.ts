import type { Match } from '../api/types';

export const DATE_RANGE_DAYS = 7;

export function startOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toLocalDateKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
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
    return startOfLocalDay(new Date(latestKickoff));
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
      const leftTime = left.kickoff ? new Date(left.kickoff).getTime() : 0;
      const rightTime = right.kickoff ? new Date(right.kickoff).getTime() : 0;
      return leftTime - rightTime;
    });
}
