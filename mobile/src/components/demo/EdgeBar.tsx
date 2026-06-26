import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { formatPercent } from '../formatters';
import { clampPercentage } from './demoUtils';

type EdgeBarProps = {
  edge: number;
};

export function EdgeBar({ edge }: EdgeBarProps) {
  const isPositive = edge >= 0;
  const fillColor = isPositive ? colors.win : colors.loss;
  const widthPercent = clampPercentage(Math.abs(edge) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { backgroundColor: fillColor, width: `${widthPercent}%` }]} />
      </View>
      <Text style={[styles.label, { color: fillColor }]}>{formatPercent(edge)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  track: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    height: spacing.sm,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: radii.sm,
    height: '100%',
  },
  label: {
    ...typography.caption,
  },
});
