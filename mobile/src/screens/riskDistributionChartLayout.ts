export type RiskDistributionSegmentInput = {
  label: string;
  value: number;
  color: string;
};

export type RiskDistributionArc = RiskDistributionSegmentInput & {
  startAngle: number;
  endAngle: number;
};

export const RISK_CHART_MAX_RADIUS = 96;
export const RISK_CHART_INNER_RADIUS_RATIO = 0.62;
export const RISK_CHART_EXPLODE_OFFSET = 14;
export const RISK_CHART_STROKE_WIDTH = 2;
export const RISK_CHART_HORIZONTAL_PADDING = 16;
export const RISK_CHART_VERTICAL_PADDING = 16;

export type RiskDistributionChartMetrics = {
  chartWidth: number;
  chartHeight: number;
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
};

export function getRiskDistributionChartMetrics(
  chartWidth: number,
): RiskDistributionChartMetrics {
  const outerRadius = Math.min(
    Math.floor(chartWidth / 2) - RISK_CHART_HORIZONTAL_PADDING,
    RISK_CHART_MAX_RADIUS,
  );
  const innerRadius = outerRadius * RISK_CHART_INNER_RADIUS_RATIO;
  const chartHeight = outerRadius * 2 + RISK_CHART_VERTICAL_PADDING;

  return {
    chartWidth,
    chartHeight,
    centerX: chartWidth / 2,
    centerY: chartHeight / 2,
    innerRadius,
    outerRadius,
  };
}

export function buildRiskDistributionArcs(
  segments: RiskDistributionSegmentInput[],
): RiskDistributionArc[] {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;

  return segments.map((segment) => {
    const sweep = total === 0 ? 0 : (segment.value / total) * 360;
    const startAngle = cursor;
    const endAngle = cursor + sweep;
    cursor = endAngle;

    return {
      ...segment,
      startAngle,
      endAngle,
    };
  });
}

function degreesFromTopClockwiseToRadians(angle: number): number {
  return ((angle - 90) * Math.PI) / 180;
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleFromTopClockwise: number,
) {
  const radians = degreesFromTopClockwiseToRadians(angleFromTopClockwise);
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  };
}

export function buildDonutSegmentPath(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  explodeOffset = 0,
): string {
  const midAngle = (startAngle + endAngle) / 2;
  const explodeRadians = degreesFromTopClockwiseToRadians(midAngle);
  const offsetX = explodeOffset * Math.cos(explodeRadians);
  const offsetY = explodeOffset * Math.sin(explodeRadians);
  const cx = centerX + offsetX;
  const cy = centerY + offsetY;
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

export function getPointerAngleFromTop(x: number, y: number, centerX: number, centerY: number) {
  const radians = Math.atan2(y - centerY, x - centerX);
  let degrees = (radians * 180) / Math.PI + 90;
  if (degrees < 0) {
    degrees += 360;
  }
  if (degrees >= 360) {
    degrees -= 360;
  }
  return degrees;
}

export function getRiskSegmentIndexAtPoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  arcs: Pick<RiskDistributionArc, 'startAngle' | 'endAngle'>[],
): number | null {
  const distance = Math.hypot(x - centerX, y - centerY);
  if (distance < innerRadius || distance > outerRadius + RISK_CHART_EXPLODE_OFFSET + 4) {
    return null;
  }

  const angle = getPointerAngleFromTop(x, y, centerX, centerY);

  for (let index = 0; index < arcs.length; index += 1) {
    const arc = arcs[index];
    const isLast = index === arcs.length - 1;
    if (angle >= arc.startAngle && (angle < arc.endAngle || (isLast && angle <= arc.endAngle))) {
      return index;
    }
  }

  return null;
}

export function resolveRiskDistributionHover(
  pointerX: number,
  pointerY: number,
  chartWidth: number,
  segments: RiskDistributionSegmentInput[],
): {
  activeIndex: number | null;
  metrics: RiskDistributionChartMetrics;
  arcs: RiskDistributionArc[];
} {
  const metrics = getRiskDistributionChartMetrics(chartWidth);
  const arcs = buildRiskDistributionArcs(segments);
  const activeIndex = getRiskSegmentIndexAtPoint(
    pointerX,
    pointerY,
    metrics.centerX,
    metrics.centerY,
    metrics.innerRadius,
    metrics.outerRadius,
    arcs,
  );

  return { activeIndex, metrics, arcs };
}

export function getPointOnArcMidline(
  arc: Pick<RiskDistributionArc, 'startAngle' | 'endAngle'>,
  metrics: RiskDistributionChartMetrics,
) {
  const midAngle = (arc.startAngle + arc.endAngle) / 2;
  const radians = degreesFromTopClockwiseToRadians(midAngle);
  const centroidRadius = (metrics.innerRadius + metrics.outerRadius) / 2;
  return {
    x: metrics.centerX + Math.cos(radians) * centroidRadius,
    y: metrics.centerY + Math.sin(radians) * centroidRadius,
  };
}

export function getRiskSegmentTooltipPosition(
  arc: RiskDistributionArc,
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  explodeOffset: number,
) {
  const midAngle = (arc.startAngle + arc.endAngle) / 2;
  const radians = degreesFromTopClockwiseToRadians(midAngle);
  const centroidRadius = (innerRadius + outerRadius) / 2 + explodeOffset;
  return {
    left: centerX + Math.cos(radians) * centroidRadius,
    top: centerY + Math.sin(radians) * centroidRadius,
  };
}
