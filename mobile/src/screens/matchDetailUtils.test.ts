import { parseMatchId } from './matchDetailUtils';

describe('matchDetailUtils', () => {
  it('parses valid match ids', () => {
    expect(parseMatchId('42')).toBe(42);
  });

  it('rejects invalid match ids', () => {
    expect(parseMatchId('sample-home')).toBeNull();
    expect(parseMatchId('42abc')).toBeNull();
    expect(parseMatchId('0')).toBeNull();
    expect(parseMatchId('-1')).toBeNull();
  });
});
