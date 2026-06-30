import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { HeroStat } from './HeroStat';
import { LiveBadge } from './LiveBadge';

export type AiPredictionsHeroStats = {
  winRate: string;
  avgOdds: string;
  valueBets: string;
  subtitle?: string | null;
};

type AiPredictionsHeroProps = {
  stats: AiPredictionsHeroStats;
};

export function AiPredictionsHero({ stats }: AiPredictionsHeroProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>AI Predictions</Text>
          {stats.subtitle ? (
            <Text style={styles.subtitle}>{stats.subtitle}</Text>
          ) : null}
        </View>
        <LiveBadge />
      </View>
      <View style={styles.statsRow}>
        <HeroStat label="Win Rate" value={stats.winRate} />
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
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.hero,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
