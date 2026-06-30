import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { AiPickLabel } from './AiPickLabel';
import { HeroStat } from './HeroStat';

export type AiPredictionsHeroStats = {
  winRate: string;
  winRateCaption?: string | null;
  avgOdds: string;
  valueBets: string;
};

type AiPredictionsHeroProps = {
  stats: AiPredictionsHeroStats;
};

export function AiPredictionsHero({ stats }: AiPredictionsHeroProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>AI Predictions</Text>
        <AiPickLabel />
      </View>
      <View style={styles.statsRow}>
        <HeroStat
          label="Win Rate"
          value={stats.winRate}
          caption={stats.winRateCaption}
        />
        <HeroStat label="Avg Odds" value={stats.avgOdds} />
        <HeroStat label="Value Bets" value={stats.valueBets} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.primaryGlow,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.hero,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
