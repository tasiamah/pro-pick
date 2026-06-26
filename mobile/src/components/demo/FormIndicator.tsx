import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../../theme';
import type { FormResult } from './demoUtils';

type FormIndicatorProps = {
  form?: FormResult[];
};

export function FormIndicator({ form }: FormIndicatorProps) {
  if (!form?.length) {
    return null;
  }

  return (
    <View style={styles.formRow}>
      {form.map((result, index) => (
        <View
          key={`${result}-${index}`}
          style={[
            styles.formDot,
            result === 'W' && styles.formWin,
            result === 'D' && styles.formDraw,
            result === 'L' && styles.formLoss,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  formRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  formDot: {
    borderRadius: radii.sm,
    height: 8,
    width: 8,
  },
  formWin: {
    backgroundColor: colors.win,
  },
  formDraw: {
    backgroundColor: colors.draw,
  },
  formLoss: {
    backgroundColor: colors.loss,
  },
});
