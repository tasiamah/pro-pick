import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';
import { formatDateChipLabel, toLocalDateKey } from '../utils/matchDates';

type DatePickerRowProps = {
  dates: Date[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  isWeekSelected: boolean;
  onSelectWeek: () => void;
};

export function DatePickerRow({
  dates,
  selectedDate,
  onSelectDate,
  isWeekSelected,
  onSelectWeek,
}: DatePickerRowProps) {
  const selectedKey = toLocalDateKey(selectedDate);

  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.content}
      showsHorizontalScrollIndicator={false}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isWeekSelected }}
        onPress={onSelectWeek}
        style={[styles.chip, isWeekSelected && styles.chipSelected]}
      >
        <Text style={[styles.chipText, isWeekSelected && styles.chipTextSelected]}>
          This week
        </Text>
      </Pressable>
      {dates.map((date) => {
        const dateKey = toLocalDateKey(date);
        const isSelected = !isWeekSelected && dateKey === selectedKey;

        return (
          <Pressable
            key={dateKey}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelectDate(date)}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {formatDateChipLabel(date)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.card,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.label,
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: colors.primary,
  },
});
