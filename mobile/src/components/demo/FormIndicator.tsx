import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme';
import type { FormResult } from './demoUtils';

const FORM_BADGE_SIZE = 14;
const FORM_BADGE_GAP = 3;

const FORM_BADGE_STYLES: Record<FormResult, { backgroundColor: string; color: string }> = {
  W: {
    backgroundColor: 'rgba(0, 255, 136, 0.16)',
    color: colors.primary,
  },
  D: {
    backgroundColor: 'rgba(100, 116, 139, 0.28)',
    color: '#cbd5e1',
  },
  L: {
    backgroundColor: 'rgba(248, 113, 113, 0.18)',
    color: '#fca5a5',
  },
};

type FormIndicatorProps = {
  form?: FormResult[];
};

function normalizeFormResults(form: FormResult[]): FormResult[] {
  return form.flatMap((result) => {
    const normalized = String(result).trim().toUpperCase();
    if (normalized === 'W' || normalized === 'D' || normalized === 'L') {
      return [normalized];
    }

    return [];
  });
}

function formatFormAccessibility(form: FormResult[]): string {
  const labels: Record<FormResult, string> = {
    W: 'win',
    D: 'draw',
    L: 'loss',
  };

  return form.map((result) => labels[result]).join(', ');
}

export function FormIndicator({ form }: FormIndicatorProps) {
  const normalizedForm = form?.length ? normalizeFormResults(form) : [];
  if (!normalizedForm.length) {
    return null;
  }

  return (
    <View
      accessibilityLabel={`Recent form: ${formatFormAccessibility(normalizedForm)}`}
      accessible
      style={styles.formRow}
    >
      {normalizedForm.map((result, index) => {
        const badgeStyle = FORM_BADGE_STYLES[result];

        return (
          <View
            key={`${result}-${index}`}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.formBadge, { backgroundColor: badgeStyle.backgroundColor }]}
          >
            <Text style={[styles.formLetter, { color: badgeStyle.color }]}>{result}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  formRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    flexWrap: 'nowrap',
    gap: FORM_BADGE_GAP,
  },
  formBadge: {
    alignItems: 'center',
    borderRadius: FORM_BADGE_SIZE / 2,
    flexShrink: 0,
    height: FORM_BADGE_SIZE,
    justifyContent: 'center',
    maxHeight: FORM_BADGE_SIZE,
    maxWidth: FORM_BADGE_SIZE,
    minHeight: FORM_BADGE_SIZE,
    minWidth: FORM_BADGE_SIZE,
    overflow: 'hidden',
    width: FORM_BADGE_SIZE,
  },
  formLetter: {
    fontSize: 9,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 10,
    textAlign: 'center',
    ...(Platform.OS === 'android' ? { textAlignVertical: 'center' as const } : {}),
  },
});
