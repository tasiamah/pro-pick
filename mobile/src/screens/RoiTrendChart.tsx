import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';
import type { LineChartPoint } from './analyticsUtils';
import { buildRoiTrendRows } from './roiTrendChartLayout';

type RoiTrendChartProps = {
  points: LineChartPoint[];
};

export function RoiTrendChart({ points }: RoiTrendChartProps) {
  const rows = buildRoiTrendRows(points);

  return (
    <View style={styles.card}>
      {rows.map((row) => {
        const accent = row.positive ? colors.win : colors.loss;

        return (
          <View key={row.key} style={styles.row}>
            <Text style={styles.label}>{row.label}</Text>
            <View style={styles.track}>
              <View
                style={[styles.fill, { backgroundColor: accent, width: `${row.widthPercent}%` }]}
              />
            </View>
            <Text style={[styles.value, { color: accent }]}>{row.valueLabel}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    width: 56,
  },
  track: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    flex: 1,
    height: spacing.sm,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radii.sm,
    height: '100%',
  },
  value: {
    ...typography.bodySemibold,
    textAlign: 'right',
    width: 64,
  },
});
