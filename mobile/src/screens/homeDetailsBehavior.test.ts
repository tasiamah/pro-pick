import fs from 'fs';
import path from 'path';

const homeScreenSource = fs.readFileSync(path.join(__dirname, 'HomeScreen.tsx'), 'utf8');

describe('HomeScreen details behavior', () => {
  it('routes match card Details to the Matches tab, not MatchDetail', () => {
    expect(homeScreenSource).toContain('navigateHomeDetailsToMatchesTab');
    expect(homeScreenSource).toContain('onDetailsPress={onHomeDetailsPress}');
    expect(homeScreenSource).not.toMatch(/onDetailsPress=\{[^}]*openMatchDetail/);
  });

  it('still opens MatchDetail for value bet cards', () => {
    expect(homeScreenSource).toContain('openMatchDetail(valueBet.match_id)');
  });
});
