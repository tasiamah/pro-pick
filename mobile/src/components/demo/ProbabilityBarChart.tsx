import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { formatPercent } from '../formatters';
import { clampUnitInterval } from './demoUtils';

type ProbabilityBarChartProps = {
  home: number;
  draw: number;
  away: number;
};

const BAR_HEIGHT = 120;
const GRID_LINES = [0, 0.25, 0.5, 0.75, 1];

type BarProps = {
  color: string;
  label: string;
  value: number;
};

function ProbabilityBar({ color, label, value }: BarProps) {
  const clamped = clampUnitInterval(value);
  const height =
    clamped > 0 ? Math.min(Math.max(clamped * BAR_HEIGHT, spacing.xs), BAR_HEIGHT) : 0;

  return (
    <View style={styles.barColumn}>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { backgroundColor: color, height }]} />
      </View>
      <Text style={styles.barLabel}>{label}</Text>
      <Text style={styles.barValue}>{formatPercent(clamped)}</Text>
    </View>
  );
}

export function ProbabilityBarChart({ home, draw, away }: ProbabilityBarChartProps) {
  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.gridColumn}>
        {GRID_LINES.map((line) => (
          <View key={line} style={styles.gridRow}>
            <Text style={styles.gridLabel}>{formatPercent(line)}</Text>
            <View style={styles.gridLine} />
          </View>
        ))}
      </View>
      <View style={styles.barsRow}>
        <ProbabilityBar color={colors.chartHome} label="Home Win" value={home} />
        <ProbabilityBar color={colors.chartDraw} label="Draw" value={draw} />
        <ProbabilityBar color={colors.chartAway} label="Away Win" value={away} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  gridColumn: {
    justifyContent: 'space-between',
    paddingBottom: spacing.xl + spacing.sm,
    width: 44,
  },
  gridRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  gridLabel: {
    ...typography.caption,
    color: colors.textMuted,
    width: 32,
  },
  gridLine: {
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderTopWidth: 1,
    flex: 1,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  barTrack: {
    alignItems: 'center',
    height: BAR_HEIGHT,
    justifyContent: 'flex-end',
    width: '100%',
  },
  barFill: {
    borderRadius: radii.sm,
    width: '70%',
  },
  barLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  barValue: {
    ...typography.label,
    color: colors.text,
  },
});
