import {
  buildAreaPath,
  buildConfidenceTrendGeometry,
  buildSmoothLinePath,
  nearestPointIndex,
} from './confidenceTrendChartLayout';

describe('confidenceTrendChartLayout', () => {
  it('maps values into chart geometry', () => {
    const geometry = buildConfidenceTrendGeometry([40, 80], 300);

    expect(geometry.points).toHaveLength(2);
    expect(geometry.points[0]).toMatchObject({ label: '1', value: 40 });
    expect(geometry.points[1]).toMatchObject({ label: '2', value: 80 });
    expect(geometry.points[0].x).toBeLessThan(geometry.points[1].x);
    expect(geometry.points[0].y).toBeGreaterThan(geometry.points[1].y);
  });

  it('builds smooth line and area paths', () => {
    const geometry = buildConfidenceTrendGeometry([42, 48, 51], 280);
    const linePath = buildSmoothLinePath(geometry.points);
    const areaPath = buildAreaPath(geometry.points, geometry.baselineY);

    expect(linePath.startsWith('M ')).toBe(true);
    expect(linePath.includes('C ')).toBe(true);
    expect(areaPath.endsWith('Z')).toBe(true);
  });

  it('finds the nearest point index for hover tracking', () => {
    const geometry = buildConfidenceTrendGeometry([10, 20, 30], 320);

    expect(nearestPointIndex(geometry.points, geometry.points[0].x)).toBe(0);
    expect(nearestPointIndex(geometry.points, geometry.points[2].x)).toBe(2);
    expect(
      nearestPointIndex(
        geometry.points,
        geometry.points[1].x - 1,
      ),
    ).toBe(1);
  });
});
