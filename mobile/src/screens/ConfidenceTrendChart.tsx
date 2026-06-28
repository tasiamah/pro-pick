import { useCallback, useMemo, useState } from 'react';
import {
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, radii, spacing, typography } from '../theme';

import {
  CONFIDENCE_CHART_HEIGHT,
  CONFIDENCE_CHART_RIGHT_PADDING,
  CONFIDENCE_CHART_Y_AXIS_WIDTH,
  buildAreaPath,
  buildConfidenceTrendGeometry,
  buildSmoothLinePath,
  getYAxisLabels,
  nearestPointIndex,
  yForAxisLabel,
  type ConfidenceTrendPoint,
} from './confidenceTrendChartLayout';
import { formatConfidenceTooltipValue } from './confidenceTrendChartUtils';

type ConfidenceTrendChartProps = {
  chartWidth: number;
  values: number[];
};

type PointerEvent = GestureResponderEvent;

function getPointerX(event: PointerEvent, boundsWidth: number): number | null {
  const nativeEvent = event.nativeEvent as GestureResponderEvent['nativeEvent'] & {
    offsetX?: number;
  };
  const rawX =
    typeof nativeEvent.locationX === 'number'
      ? nativeEvent.locationX
      : nativeEvent.offsetX;

  if (typeof rawX !== 'number' || Number.isNaN(rawX)) {
    return null;
  }

  return Math.max(0, Math.min(rawX, boundsWidth));
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
        // React Native Web mouse/pointer events for hover scrubbing in dev preview.
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

export function ConfidenceTrendChart({ chartWidth, values }: ConfidenceTrendChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [boundsWidth, setBoundsWidth] = useState(chartWidth);

  const geometry = useMemo(
    () => buildConfidenceTrendGeometry(values, chartWidth),
    [chartWidth, values],
  );
  const linePath = useMemo(() => buildSmoothLinePath(geometry.points), [geometry.points]);
  const areaPath = useMemo(
    () => buildAreaPath(geometry.points, geometry.baselineY),
    [geometry.baselineY, geometry.points],
  );
  const yAxisLabels = useMemo(() => getYAxisLabels(), []);
  const activePoint: ConfidenceTrendPoint | null =
    activeIndex == null ? null : (geometry.points[activeIndex] ?? null);

  const updateActiveIndex = useCallback(
    (pointerX: number | null) => {
      if (pointerX == null) {
        setActiveIndex(null);
        return;
      }

      setActiveIndex(nearestPointIndex(geometry.points, pointerX));
    },
    [geometry.points],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      updateActiveIndex(getPointerX(event, boundsWidth));
    },
    [boundsWidth, updateActiveIndex],
  );

  const handlePointerRelease = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setBoundsWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartSurface} onLayout={handleLayout}>
        <View pointerEvents="none" style={styles.chartContent}>
          <View style={styles.yAxisLabels}>
            {yAxisLabels.map((label) => (
              <Text
                key={label}
                style={[
                  styles.axisLabel,
                  { top: yForAxisLabel(label, geometry) - spacing.sm },
                ]}
              >
                {label}
              </Text>
            ))}
          </View>

          <Svg width={chartWidth} height={CONFIDENCE_CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="confidenceAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.35} />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity={0.05} />
              </LinearGradient>
            </Defs>

            {yAxisLabels.map((label) => {
              const y = yForAxisLabel(label, geometry);
              return (
                <Line
                  key={`grid-${label}`}
                  x1={geometry.yAxisWidth}
                  y1={y}
                  x2={chartWidth - CONFIDENCE_CHART_RIGHT_PADDING}
                  y2={y}
                  stroke={colors.border}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
              );
            })}

            <Path d={areaPath} fill="url(#confidenceAreaGradient)" />
            <Path
              d={linePath}
              fill="none"
              stroke={colors.primary}
              strokeLinecap="round"
              strokeWidth={2}
            />

            {activePoint ? (
              <>
                <Line
                  x1={activePoint.x}
                  y1={geometry.topPadding}
                  x2={activePoint.x}
                  y2={geometry.baselineY}
                  stroke={colors.text}
                  strokeWidth={1}
                />
                <Circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={6}
                  fill={colors.text}
                  stroke={colors.primary}
                  strokeWidth={2}
                />
              </>
            ) : null}
          </Svg>

          <View style={styles.xAxisLabels}>
            {geometry.points.map((point) => (
              <Text
                key={point.label}
                style={[
                  styles.xAxisLabel,
                  { left: point.x - spacing.sm, top: geometry.baselineY + spacing.xs },
                ]}
              >
                {point.label}
              </Text>
            ))}
          </View>
        </View>

        <ChartInteractionOverlay
          height={CONFIDENCE_CHART_HEIGHT}
          width={boundsWidth}
          onMove={handlePointerMove}
          onRelease={handlePointerRelease}
        />

        {activePoint ? (
          <View
            pointerEvents="none"
            style={[
              styles.tooltip,
              {
                left: Math.min(activePoint.x + spacing.md, chartWidth - 128),
                top: Math.max(activePoint.y - 56, spacing.sm),
              },
            ]}
          >
            <Text style={styles.tooltipLabel}>{activePoint.label}</Text>
            <Text style={styles.tooltipValue}>
              {formatConfidenceTooltipValue(activePoint.value)}
            </Text>
          </View>
        ) : null}
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
  chartSurface: {
    minHeight: CONFIDENCE_CHART_HEIGHT,
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
    ...(Platform.OS === 'web' ? ({ cursor: 'crosshair' } as object) : null),
  },
  yAxisLabels: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  xAxisLabels: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  axisLabel: {
    ...typography.caption,
    color: colors.textMuted,
    position: 'absolute',
    width: CONFIDENCE_CHART_Y_AXIS_WIDTH,
    textAlign: 'right',
    paddingRight: spacing.xs,
  },
  xAxisLabel: {
    ...typography.caption,
    color: colors.textMuted,
    position: 'absolute',
    textAlign: 'center',
    width: spacing.lg,
  },
  tooltip: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
    zIndex: 11,
  },
  tooltipLabel: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  tooltipValue: {
    ...typography.caption,
    color: colors.primary,
  },
});
