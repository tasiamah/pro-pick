import type { RoiTrendPoint } from '../api/types';

export type LineChartPoint = {
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

export function toConfidenceTrendChartData(values: number[]): LineChartPoint[] {
  return values.map((value, index) => ({
    value,
    label: String(index + 1),
  }));
}

export function toRiskDistributionChartData(
  segments: { value: number; color: string }[],
): { value: number; color: string }[] {
  return segments.map((segment) => ({
    value: segment.value,
    color: segment.color,
  }));
}

export function toRoiTrendChartData(
  points: RoiTrendPoint[] | null | undefined,
): LineChartPoint[] {
  if (!points?.length) {
    return [];
  }

  return points.map((point) => ({
    value: Math.round(point.roi * 100),
    label: formatTrendLabel(point.date),
  }));
}
