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

export function toRoiTrendChartData(points: RoiTrendPoint[]): LineChartPoint[] {
  return points.map((point) => ({
    value: Math.round(point.roi * 100),
    label: formatTrendLabel(point.date),
  }));
}
