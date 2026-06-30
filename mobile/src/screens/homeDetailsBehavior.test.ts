import fs from 'fs';
import path from 'path';

const homeScreenSource = fs.readFileSync(path.join(__dirname, 'HomeScreen.tsx'), 'utf8');

describe('HomeScreen details behavior', () => {
  it('routes match card Details to MatchDetail for the selected match', () => {
    expect(homeScreenSource).toContain('onDetailsPress={() => openMatchDetail(match.id)}');
    expect(homeScreenSource).not.toContain('navigateHomeDetailsToMatchesTab');
  });

  it('still opens MatchDetail for value bet cards', () => {
    expect(homeScreenSource).toContain('openMatchDetail(valueBet.match_id)');
  });
});
