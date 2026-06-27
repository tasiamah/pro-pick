import { BOOKMAKER_INDEPENDENCE_TEXT, RESPONSIBLE_PLAY_TEXT } from './legal';

describe('legal', () => {
  it('states 18+ and responsible-gambling guidance', () => {
    expect(RESPONSIBLE_PLAY_TEXT).toContain('18 and over');
    expect(RESPONSIBLE_PLAY_TEXT).toContain('responsible-gambling');
  });

  it('states independence from any bookmaker for informational use only', () => {
    expect(BOOKMAKER_INDEPENDENCE_TEXT).toContain('not affiliated');
    expect(BOOKMAKER_INDEPENDENCE_TEXT).toContain('bookmaker');
    expect(BOOKMAKER_INDEPENDENCE_TEXT).toContain('informational comparison only');
  });
});
