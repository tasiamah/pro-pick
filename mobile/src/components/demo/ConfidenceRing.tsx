import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, typography } from '../../theme';
import { clampPercentage } from './demoUtils';

type ConfidenceRingProps = {
  value: number;
};

const RING_SIZE = 88;
const STROKE_WIDTH = 8;

export function ConfidenceRing({ value }: ConfidenceRingProps) {
  const radius = (RING_SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = clampPercentage(value);
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <View style={styles.container}>
      <Svg height={RING_SIZE} width={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          r={radius}
          stroke={colors.border}
          strokeWidth={STROKE_WIDTH}
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          r={radius}
          rotation="-90"
          stroke={colors.primary}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth={STROKE_WIDTH}
        />
      </Svg>
      <Text style={styles.value}>{Math.round(clamped)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    height: RING_SIZE,
    justifyContent: 'center',
    width: RING_SIZE,
  },
  value: {
    ...typography.statValue,
    color: colors.primary,
    fontSize: 18,
    lineHeight: 22,
    position: 'absolute',
  },
});
