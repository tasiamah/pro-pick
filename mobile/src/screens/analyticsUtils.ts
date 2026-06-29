import type { RoiTrendPoint } from '../api/types';

export type LineChartPoint = {
  key: string;
  value: number;
  label: string;
};

export function formatTrendLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function toRoiTrendChartData(
  points: RoiTrendPoint[] | null | undefined,
): LineChartPoint[] {
  if (!points?.length) {
    return [];
  }

  return points.map((point) => ({
    key: point.date,
    value: Math.round(point.roi * 100),
    label: formatTrendLabel(point.date),
  }));
}

export function formatAccuracyMetric(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return `${(value * 100).toFixed(1)}%`;
}

export function formatRoiMetric(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  const percent = value * 100;
  const prefix = percent > 0 ? '+' : '';
  return `${prefix}${percent.toFixed(1)}%`;
}

export function formatLogLossMetric(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return value.toFixed(3);
}

export function formatCountMetric(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return String(value);
}
