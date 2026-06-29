import type { LineChartPoint } from './analyticsUtils';

export type RoiTrendRow = {
  label: string;
  valueLabel: string;
  widthPercent: number;
  positive: boolean;
};

export function formatRoiValueLabel(value: number): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value}%`;
}

export function buildRoiTrendRows(points: LineChartPoint[]): RoiTrendRow[] {
  const maxMagnitude = points.reduce(
    (max, point) => Math.max(max, Math.abs(point.value)),
    0,
  );

  return points.map((point) => {
    const magnitude = Math.abs(point.value);
    const widthPercent =
      maxMagnitude === 0 || magnitude === 0
        ? 0
        : Math.round(Math.max(8, (magnitude / maxMagnitude) * 100));

    return {
      label: point.label,
      valueLabel: formatRoiValueLabel(point.value),
      widthPercent,
      positive: point.value >= 0,
    };
  });
}
