import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { formatPercent } from '../formatters';

type ProbabilityBarChartProps = {
  home: number;
  draw: number;
  away: number;
};

const BAR_HEIGHT = 96;

type BarProps = {
  color: string;
  label: string;
  value: number;
};

function ProbabilityBar({ color, label, value }: BarProps) {
  const height = Math.max(value * BAR_HEIGHT, spacing.xs);

  return (
    <View style={styles.barColumn}>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { backgroundColor: color, height }]} />
      </View>
      <Text style={styles.barLabel}>{label}</Text>
      <Text style={styles.barValue}>{formatPercent(value)}</Text>
    </View>
  );
}

export function ProbabilityBarChart({ home, draw, away }: ProbabilityBarChartProps) {
  return (
    <View style={styles.container}>
      <ProbabilityBar color={colors.chartHome} label="Home" value={home} />
      <ProbabilityBar color={colors.chartDraw} label="Draw" value={draw} />
      <ProbabilityBar color={colors.chartAway} label="Away" value={away} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  },
  barValue: {
    ...typography.label,
    color: colors.text,
  },
});
