import { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

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

type PointerMoveEvent = GestureResponderEvent & {
  nativeEvent: GestureResponderEvent['nativeEvent'] & {
    offsetX?: number;
  };
};

function getPointerX(event: PointerMoveEvent, boundsWidth: number): number | null {
  const locationX = event.nativeEvent.locationX;
  if (typeof locationX !== 'number' || Number.isNaN(locationX)) {
    return null;
  }

  return Math.max(0, Math.min(locationX, boundsWidth));
}

function getWebHoverHandlers(
  onMove: (event: PointerMoveEvent) => void,
  onLeave: () => void,
) {
  if (Platform.OS !== 'web') {
    return {};
  }

  return {
    onMouseMove: onMove,
    onMouseLeave: onLeave,
  };
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
    (event: PointerMoveEvent) => {
      updateActiveIndex(getPointerX(event, boundsWidth));
    },
    [boundsWidth, updateActiveIndex],
  );

  const handlePointerLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setBoundsWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <View style={styles.chartCard}>
      <View
        style={styles.chartSurface}
        onLayout={handleLayout}
        {...getWebHoverHandlers(handlePointerMove, handlePointerLeave)}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerLeave}
        onTouchCancel={handlePointerLeave}
      >
        <View style={styles.yAxisLabels} pointerEvents="none">
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

        <Svg width={chartWidth} height={CONFIDENCE_CHART_HEIGHT} pointerEvents="none">
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
              <Path
                d={`M ${activePoint.x} ${activePoint.y} m -6,0 a 6,6 0 1,0 12,0 a 6,6 0 1,0 -12,0`}
                fill={colors.text}
                stroke={colors.primary}
                strokeWidth={2}
              />
            </>
          ) : null}
        </Svg>

        <View style={styles.xAxisLabels} pointerEvents="none">
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
    zIndex: 2,
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
