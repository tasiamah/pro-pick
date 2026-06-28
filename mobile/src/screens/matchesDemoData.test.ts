import { buildDemoKickoff, findDemoMatchById, MATCHES_DEMO_DATA } from './matchesDemoData';

describe('matchesDemoData', () => {
  it('builds demo kickoffs relative to a reference date', () => {
    expect(buildDemoKickoff(new Date('2026-06-01T12:00:00Z'), 7)).toBe(
      '2026-06-08T15:00:00.000Z',
    );
  });

  it('uses upcoming kickoffs for demo cards', () => {
    const now = Date.now();
    for (const match of MATCHES_DEMO_DATA) {
      expect(new Date(match.kickoff ?? 0).getTime()).toBeGreaterThanOrEqual(now);
    }
  });
  it('exports eight demo match cards for the browse grid', () => {
    expect(MATCHES_DEMO_DATA).toHaveLength(8);
    expect(MATCHES_DEMO_DATA[0]?.home_team.name).toBe('Bournemouth');
    expect(MATCHES_DEMO_DATA[0]?.away_team.name).toBe('Luton');
  });

  it('includes one card without an AI pick block', () => {
    const withoutPrediction = MATCHES_DEMO_DATA.find((match) => match.prediction == null);
    expect(withoutPrediction?.home_team.name).toBe('Osasuna');
    expect(withoutPrediction?.away_team.name).toBe('Alaves');
  });

  it('finds demo matches by negative id', () => {
    expect(findDemoMatchById(-1)?.home_team.name).toBe('Bournemouth');
    expect(findDemoMatchById(-1)?.prediction?.insights).toEqual([
      'Bournemouth in form',
      'Luton poor away form',
      'Home team confident',
    ]);
    expect(findDemoMatchById(-999)).toBeNull();
  });
});
