export const CONFIDENCE_CHART_HEIGHT = 200;
export const CONFIDENCE_CHART_MAX_VALUE = 100;
export const CONFIDENCE_CHART_Y_AXIS_WIDTH = 44;
export const CONFIDENCE_CHART_TOP_PADDING = 12;
export const CONFIDENCE_CHART_BOTTOM_PADDING = 28;
export const CONFIDENCE_CHART_RIGHT_PADDING = 12;

export type ConfidenceTrendPoint = {
  x: number;
  y: number;
  label: string;
  value: number;
};

export type ConfidenceTrendGeometry = {
  points: ConfidenceTrendPoint[];
  plotWidth: number;
  plotHeight: number;
  baselineY: number;
  yAxisWidth: number;
  topPadding: number;
};

export function buildConfidenceTrendGeometry(
  values: number[],
  width: number,
  maxValue = CONFIDENCE_CHART_MAX_VALUE,
): ConfidenceTrendGeometry {
  const yAxisWidth = CONFIDENCE_CHART_Y_AXIS_WIDTH;
  const topPadding = CONFIDENCE_CHART_TOP_PADDING;
  const bottomPadding = CONFIDENCE_CHART_BOTTOM_PADDING;
  const plotWidth = width - yAxisWidth - CONFIDENCE_CHART_RIGHT_PADDING;
  const plotHeight = CONFIDENCE_CHART_HEIGHT - bottomPadding - topPadding;
  const baselineY = topPadding + plotHeight;
  const lastIndex = Math.max(values.length - 1, 1);

  const points = values.map((value, index) => ({
    x: yAxisWidth + (index / lastIndex) * plotWidth,
    y: topPadding + plotHeight - (value / maxValue) * plotHeight,
    label: String(index + 1),
    value,
  }));

  return {
    points,
    plotWidth,
    plotHeight,
    baselineY,
    yAxisWidth,
    topPadding,
  };
}

export function buildSmoothLinePath(points: Pick<ConfidenceTrendPoint, 'x' | 'y'>[]): string {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const following = points[index + 2] ?? next;

    const controlPoint1X = current.x + (next.x - previous.x) / 6;
    const controlPoint1Y = current.y + (next.y - previous.y) / 6;
    const controlPoint2X = next.x - (following.x - current.x) / 6;
    const controlPoint2Y = next.y - (following.y - current.y) / 6;

    path += ` C ${controlPoint1X} ${controlPoint1Y} ${controlPoint2X} ${controlPoint2Y} ${next.x} ${next.y}`;
  }

  return path;
}

export function buildAreaPath(
  points: Pick<ConfidenceTrendPoint, 'x' | 'y'>[],
  baselineY: number,
): string {
  if (points.length === 0) {
    return '';
  }

  const linePath = buildSmoothLinePath(points);
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];

  return `${linePath} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;
}

export function nearestPointIndex(
  points: Pick<ConfidenceTrendPoint, 'x'>[],
  pointerX: number,
): number {
  if (points.length === 0) {
    return 0;
  }

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  points.forEach((point, index) => {
    const distance = Math.abs(point.x - pointerX);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

export function getYAxisLabels(maxValue = CONFIDENCE_CHART_MAX_VALUE): number[] {
  return [0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue];
}

export function yForAxisLabel(
  label: number,
  geometry: ConfidenceTrendGeometry,
  maxValue = CONFIDENCE_CHART_MAX_VALUE,
): number {
  return geometry.topPadding + geometry.plotHeight - (label / maxValue) * geometry.plotHeight;
}
