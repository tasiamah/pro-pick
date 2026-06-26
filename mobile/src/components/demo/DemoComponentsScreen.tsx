import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../theme';
import { AiPickLabel } from './AiPickLabel';
import { AlertBanner } from './AlertBanner';
import { ConfidenceBadge } from './ConfidenceBadge';
import { ConfidenceRing } from './ConfidenceRing';
import { DetailsLink } from './DetailsLink';
import { EdgeBar } from './EdgeBar';
import { FilterChipRow } from './FilterChipRow';
import { FormIndicator } from './FormIndicator';
import { InsightBullet } from './InsightBullet';
import { OddsMarketCard } from './OddsMarketCard';
import { OddsTierBadge } from './OddsTierBadge';
import { ProbabilityBarChart } from './ProbabilityBarChart';
import { SearchInput } from './SearchInput';
import { SectionHeader } from './SectionHeader';
import { SegmentedControl } from './SegmentedControl';
import { ValueStatusBadge } from './ValueStatusBadge';

export function DemoComponentsScreen() {
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<'upcoming' | 'live' | 'completed'>('upcoming');
  const [tier, setTier] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader
        subtitle="Dev-only preview of shared demo UI components"
        title="Demo Components"
      />

      <SearchInput onChangeText={setSearch} value={search} />

      <SegmentedControl
        onChange={setSegment}
        options={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'live', label: 'Live' },
          { value: 'completed', label: 'Completed' },
        ]}
        value={segment}
      />

      <FilterChipRow
        onChange={setTier}
        options={[
          { value: 'all', label: 'All' },
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ]}
        value={tier}
      />

      <FormIndicator form={['W', 'D', 'L', 'W', 'W']} />

      <View style={styles.row}>
        <AiPickLabel />
        <ConfidenceBadge confidence={0.81} />
        <OddsTierBadge tier="medium" />
      </View>

      <InsightBullet text="Strong home advantage in recent meetings." />
      <DetailsLink onPress={() => undefined} />

      <ConfidenceRing value={81} />
      <ProbabilityBarChart away={0.18} draw={0.24} home={0.58} />

      <View style={styles.row}>
        <OddsMarketCard label="Home Win" movement="up" price={1.85} />
        <OddsMarketCard label="Draw" movement="flat" price={3.4} />
        <OddsMarketCard label="Away Win" movement="down" price={4.5} />
      </View>

      <AlertBanner message="Significant Odds Movement Detected" />

      <View style={styles.row}>
        <ValueStatusBadge status="value" />
        <ValueStatusBadge status="overpriced" />
      </View>

      <EdgeBar edge={0.12} />
      <EdgeBar edge={-0.08} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
