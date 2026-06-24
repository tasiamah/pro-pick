import {
  filterValueBetsByMatchId,
  parseMatchId,
} from './matchDetailUtils';

describe('matchDetailUtils', () => {
  it('parses valid match ids', () => {
    expect(parseMatchId('42')).toBe(42);
  });

  it('rejects invalid match ids', () => {
    expect(parseMatchId('sample-home')).toBeNull();
    expect(parseMatchId('0')).toBeNull();
    expect(parseMatchId('-1')).toBeNull();
  });

  it('filters value bets by match id', () => {
    const valueBets = [
      { id: 1, match_id: 10, outcome: 'home' },
      { id: 2, match_id: 11, outcome: 'away' },
      { id: 3, match_id: 10, outcome: 'draw' },
    ] as const;

    expect(filterValueBetsByMatchId([...valueBets], 10)).toHaveLength(2);
    expect(filterValueBetsByMatchId([...valueBets], 99)).toHaveLength(0);
  });
});
