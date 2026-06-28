import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { colors, radii, spacing, typography } from '../theme';

import { toConfidenceTrendChartData } from './analyticsUtils';
import { formatConfidenceTooltipValue } from './confidenceTrendChartUtils';

const CHART_HEIGHT = 200;

type ConfidenceTrendChartProps = {
  chartWidth: number;
  values: number[];
};

type PointerItem = {
  label?: string;
  value?: number;
};

export function ConfidenceTrendChart({ chartWidth, values }: ConfidenceTrendChartProps) {
  const chartData = useMemo(() => toConfidenceTrendChartData(values), [values]);

  const pointerConfig = useMemo(
    () => ({
      activatePointersInstantlyOnTouch: true,
      activatePointersOnLongPress: false,
      pointerStripUptoDataPoint: false,
      pointerStripHeight: CHART_HEIGHT,
      pointerStripWidth: 1,
      pointerStripColor: colors.text,
      pointerColor: colors.primary,
      radius: 6,
      pointerLabelWidth: 120,
      pointerLabelHeight: 56,
      autoAdjustPointerLabelPosition: true,
      shiftPointerLabelX: 12,
      shiftPointerLabelY: -8,
      pointerVanishDelay: 0,
      persistPointer: false,
      resetPointerIndexOnRelease: true,
      pointerComponent: () => <View style={styles.pointerDot} />,
      pointerLabelComponent: (items: PointerItem[]) => {
        const point = items[0];
        if (point?.label == null || point.value == null) {
          return null;
        }

        return (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipLabel}>{point.label}</Text>
            <Text style={styles.tooltipValue}>{formatConfidenceTooltipValue(point.value)}</Text>
          </View>
        );
      },
    }),
    [],
  );

  return (
    <View style={styles.chartCard}>
      <LineChart
        areaChart
        curved
        data={chartData}
        width={chartWidth}
        height={CHART_HEIGHT}
        color={colors.primary}
        thickness={2}
        hideDataPoints
        dataPointsColor={colors.primary}
        yAxisColor={colors.border}
        xAxisColor={colors.border}
        rulesColor={colors.border}
        rulesType="dashed"
        yAxisTextStyle={styles.axisLabel}
        xAxisLabelTextStyle={styles.axisLabel}
        noOfSections={4}
        maxValue={100}
        backgroundColor={colors.surface}
        startFillColor={colors.primary}
        startOpacity={0.35}
        endFillColor={colors.primary}
        endOpacity={0.05}
        pointerConfig={pointerConfig}
      />
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
  axisLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  pointerDot: {
    backgroundColor: colors.text,
    borderColor: colors.primary,
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  tooltip: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
