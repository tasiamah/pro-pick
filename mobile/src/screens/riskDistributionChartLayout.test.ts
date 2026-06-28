import fs from 'fs';
import path from 'path';

import { ANALYTICS_DEMO_RISK_DISTRIBUTION } from './analyticsDemoData';
import {
  buildDonutSegmentPath,
  buildRiskDistributionArcs,
  getPointOnArcMidline,
  getRiskDistributionChartMetrics,
  getRiskSegmentIndexAtPoint,
  resolveRiskDistributionHover,
} from './riskDistributionChartLayout';

describe('riskDistributionChartLayout', () => {
  const segments = [
    { label: 'Low Risk', value: 7, color: '#00ff88' },
    { label: 'Medium Risk', value: 14, color: '#eab308' },
    { label: 'High Risk', value: 1, color: '#f97316' },
  ];

  it('builds arc angles from segment values', () => {
    const arcs = buildRiskDistributionArcs(segments);

    expect(arcs).toHaveLength(3);
    expect(arcs[0]?.startAngle).toBe(0);
    expect(arcs[2]?.endAngle).toBeCloseTo(360, 5);
  });

  it('builds a closed donut segment path', () => {
    const path = buildDonutSegmentPath(100, 100, 40, 80, 0, 120, 0);

    expect(path.startsWith('M ')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('detects each demo segment from its midpoint', () => {
    const chartWidth = 327;
    const metrics = getRiskDistributionChartMetrics(chartWidth);
    const arcs = buildRiskDistributionArcs(segments);

    arcs.forEach((arc, index) => {
      const point = getPointOnArcMidline(arc, metrics);
      expect(
        getRiskSegmentIndexAtPoint(
          point.x,
          point.y,
          metrics.centerX,
          metrics.centerY,
          metrics.innerRadius,
          metrics.outerRadius,
          arcs,
        ),
      ).toBe(index);
    });
  });

  it('resolves hover for demo data on a phone-width chart', () => {
    const chartWidth = 327;
    const metrics = getRiskDistributionChartMetrics(chartWidth);
    const arcs = buildRiskDistributionArcs(ANALYTICS_DEMO_RISK_DISTRIBUTION);
    const mediumPoint = getPointOnArcMidline(arcs[1], metrics);

    expect(
      resolveRiskDistributionHover(
        mediumPoint.x,
        mediumPoint.y,
        chartWidth,
        ANALYTICS_DEMO_RISK_DISTRIBUTION,
      ).activeIndex,
    ).toBe(1);
  });

  it('returns null when the pointer is outside the donut ring', () => {
    const chartWidth = 327;
    const metrics = getRiskDistributionChartMetrics(chartWidth);

    expect(
      resolveRiskDistributionHover(
        metrics.centerX,
        metrics.centerY,
        chartWidth,
        ANALYTICS_DEMO_RISK_DISTRIBUTION,
      ).activeIndex,
    ).toBeNull();
  });
});

describe('RiskDistributionChart wiring', () => {
  it('uses a top interaction overlay for hover and touch', () => {
    const source = fs.readFileSync(path.join(__dirname, 'RiskDistributionChart.tsx'), 'utf8');

    expect(source).toContain('ChartInteractionOverlay');
    expect(source).toContain('onMouseMove');
    expect(source).toContain('resolveRiskDistributionHover');
  });
});
