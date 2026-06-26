import { DISCLAIMER_SHORT, DISCLAIMER_TEXT } from './disclaimer';

describe('disclaimer', () => {
  it('states entertainment-only AI analysis and no guaranteed outcomes', () => {
    expect(DISCLAIMER_TEXT).toMatch(/entertainment only/i);
    expect(DISCLAIMER_TEXT).toMatch(/not a gambling or betting service/i);
    expect(DISCLAIMER_TEXT).toMatch(/does not guarantee outcomes/i);
  });

  it('keeps the short banner label entertainment-focused', () => {
    expect(DISCLAIMER_SHORT).toMatch(/entertainment only/i);
  });
});
