import { useCallback, useMemo, useState } from 'react';
import {
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radii, spacing, typography } from '../theme';

import type { RiskDistributionSegment } from './analyticsDemoData';
import {
  RISK_CHART_EXPLODE_OFFSET,
  RISK_CHART_STROKE_WIDTH,
  buildDonutSegmentPath,
  buildRiskDistributionArcs,
  getRiskDistributionChartMetrics,
  getRiskSegmentTooltipPosition,
  resolveRiskDistributionHover,
} from './riskDistributionChartLayout';
import { formatRiskDistributionTooltip } from './riskDistributionChartUtils';

type RiskDistributionChartProps = {
  chartWidth: number;
  segments: RiskDistributionSegment[];
};

type PointerEvent = GestureResponderEvent;

function getPointerPosition(event: PointerEvent) {
  const nativeEvent = event.nativeEvent as GestureResponderEvent['nativeEvent'] & {
    offsetX?: number;
    offsetY?: number;
  };

  const x =
    typeof nativeEvent.locationX === 'number' ? nativeEvent.locationX : nativeEvent.offsetX;
  const y =
    typeof nativeEvent.locationY === 'number' ? nativeEvent.locationY : nativeEvent.offsetY;

  return { x, y };
}

type ChartInteractionOverlayProps = {
  height: number;
  width: number;
  onMove: (event: PointerEvent) => void;
  onRelease: () => void;
};

function ChartInteractionOverlay({
  height,
  width,
  onMove,
  onRelease,
}: ChartInteractionOverlayProps) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: onMove,
        onPanResponderMove: onMove,
        onPanResponderRelease: onRelease,
        onPanResponderTerminate: onRelease,
      }),
    [onMove, onRelease],
  );

  if (Platform.OS === 'web') {
    return (
      <View
        style={[styles.interactionLayer, styles.interactionLayerWeb, { height, width }]}
        {...({
          onMouseMove: onMove,
          onMouseLeave: onRelease,
          onPointerMove: onMove,
          onPointerLeave: onRelease,
        } as object)}
      />
    );
  }

  return (
    <View
      style={[styles.interactionLayer, { height, width }]}
      {...panResponder.panHandlers}
    />
  );
}

export function RiskDistributionChart({ chartWidth, segments }: RiskDistributionChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const metrics = useMemo(() => getRiskDistributionChartMetrics(chartWidth), [chartWidth]);
  const arcs = useMemo(() => buildRiskDistributionArcs(segments), [segments]);
  const explodeOffset = activeIndex == null ? 0 : RISK_CHART_EXPLODE_OFFSET;
  const activeArc = activeIndex == null ? null : (arcs[activeIndex] ?? null);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const { x, y } = getPointerPosition(event);
      if (typeof x !== 'number' || typeof y !== 'number' || Number.isNaN(x) || Number.isNaN(y)) {
        return;
      }

      const { activeIndex: nextIndex } = resolveRiskDistributionHover(x, y, chartWidth, segments);
      setActiveIndex(nextIndex);
    },
    [chartWidth, segments],
  );

  const handlePointerRelease = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const tooltipPosition =
    activeArc == null
      ? null
      : getRiskSegmentTooltipPosition(
          activeArc,
          metrics.centerX,
          metrics.centerY,
          metrics.innerRadius,
          metrics.outerRadius,
          explodeOffset,
        );

  return (
    <View style={styles.chartCard}>
      <View style={[styles.pieWrap, { height: metrics.chartHeight, width: metrics.chartWidth }]}>
        <View pointerEvents="none" style={styles.chartContent}>
          <Svg width={metrics.chartWidth} height={metrics.chartHeight}>
            {arcs.map((arc, index) => (
              <Path
                key={arc.label}
                d={buildDonutSegmentPath(
                  metrics.centerX,
                  metrics.centerY,
                  metrics.innerRadius,
                  metrics.outerRadius,
                  arc.startAngle,
                  arc.endAngle,
                  activeIndex === index ? explodeOffset : 0,
                )}
                fill={arc.color}
                stroke={colors.text}
                strokeWidth={RISK_CHART_STROKE_WIDTH}
              />
            ))}
          </Svg>
        </View>

        <ChartInteractionOverlay
          height={metrics.chartHeight}
          width={metrics.chartWidth}
          onMove={handlePointerMove}
          onRelease={handlePointerRelease}
        />

        {activeArc && tooltipPosition ? (
          <View
            pointerEvents="none"
            style={[
              styles.tooltip,
              {
                left: Math.min(
                  Math.max(tooltipPosition.left - 72, spacing.sm),
                  metrics.chartWidth - 148,
                ),
                top: Math.min(
                  Math.max(tooltipPosition.top - 20, spacing.sm),
                  metrics.chartHeight - 56,
                ),
              },
            ]}
          >
            <Text style={styles.tooltipText}>
              {formatRiskDistributionTooltip(activeArc.label, activeArc.value)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.legendList}>
        {segments.map((segment) => (
          <View key={segment.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
            <Text style={styles.legendText}>
              {segment.label}: {segment.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: spacing.lg,
  },
  pieWrap: {
    alignSelf: 'center',
    position: 'relative',
  },
  chartContent: {
    position: 'relative',
  },
  interactionLayer: {
    left: 0,
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  interactionLayerWeb: {
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
  },
  legendList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  legendDot: {
    borderRadius: radii.sm,
    height: spacing.sm,
    width: spacing.sm,
  },
  legendText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  tooltip: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
    zIndex: 11,
  },
  tooltipText: {
    ...typography.bodySemibold,
    color: colors.text,
  },
});
