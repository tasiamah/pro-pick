import { formatMatchTeams, getTeamName } from './matchDisplay';

describe('matchDisplay', () => {
  it('formats team names with fallbacks', () => {
    expect(formatMatchTeams(undefined, undefined)).toBe('Home vs Away');
    expect(formatMatchTeams({ id: 1, name: 'Arsenal', logo_url: null }, undefined)).toBe(
      'Arsenal vs Away',
    );
  });

  it('returns fallback for missing team names', () => {
    expect(getTeamName(undefined, 'Home')).toBe('Home');
    expect(getTeamName({ id: 1, name: '  ', logo_url: null }, 'Home')).toBe('Home');
  });
});
