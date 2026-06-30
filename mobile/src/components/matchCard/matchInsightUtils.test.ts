import type { Match, Prediction } from '../../api/types';

import { buildDynamicMatchInsight } from './matchInsightUtils';

type FormResult = 'W' | 'D' | 'L';

function makeMatch(
  homeForm: FormResult[] | undefined,
  awayForm: FormResult[] | undefined,
): Match {
  return {
    id: 1,
    kickoff: null,
    status: 'scheduled',
    home_team: { id: 1, name: 'Alpha', logo_url: null, form: homeForm },
    away_team: { id: 2, name: 'Beta', logo_url: null, form: awayForm },
    competition_name: 'League',
  };
}

function pred(home: number, draw: number, away: number): Prediction {
  return {
    match_id: 1,
    model_version: 'v1',
    prob_home: home,
    prob_draw: draw,
    prob_away: away,
  };
}

describe('buildDynamicMatchInsight', () => {
  it('calls out a shared result for a draw pick', () => {
    const match = makeMatch(['W', 'W', 'D', 'W', 'L'], ['W', 'D', 'W', 'W', 'D']);
    expect(buildDynamicMatchInsight(match, pred(0.3, 0.4, 0.3))).toBe(
      'Evenly matched — honours likely shared',
    );
  });

  it('flags a low-scoring draw when neither side is winning', () => {
    const match = makeMatch(['L', 'D', 'L', 'D', 'L'], ['D', 'L', 'L', 'D', 'L']);
    expect(buildDynamicMatchInsight(match, pred(0.3, 0.4, 0.3))).toBe(
      'Tight, low-scoring affair on the cards',
    );
  });

  it('hails an unstoppable favourite on a winning streak', () => {
    const match = makeMatch(['W', 'W', 'W', 'W', 'W'], ['L', 'D', 'W', 'L', 'W']);
    expect(buildDynamicMatchInsight(match, pred(0.72, 0.18, 0.1))).toBe(
      'Alpha unstoppable right now',
    );
  });

  it('credits excellent form for an unbeaten favourite', () => {
    const match = makeMatch(['W', 'D', 'W', 'W'], ['L', 'W', 'L', 'D', 'W']);
    expect(buildDynamicMatchInsight(match, pred(0.62, 0.23, 0.15))).toBe(
      'Alpha in excellent form',
    );
  });

  it('calls a confident home pick firm favourites at home', () => {
    const match = makeMatch(['W', 'L', 'W', 'W', 'W'], ['L', 'W', 'L', 'D', 'W']);
    expect(buildDynamicMatchInsight(match, pred(0.61, 0.2, 0.19))).toBe(
      'Alpha firm favourites at home',
    );
  });

  it('fancies a confident away pick on the road', () => {
    const match = makeMatch(['L', 'W', 'L', 'D', 'W'], ['W', 'L', 'W', 'W', 'L']);
    expect(buildDynamicMatchInsight(match, pred(0.15, 0.2, 0.65))).toBe(
      'Beta fancied to win on the road',
    );
  });

  it('describes a moderate home pick as edging a tight one', () => {
    const match = makeMatch(['W', 'D', 'L', 'W', 'D'], ['D', 'W', 'L', 'D', 'W']);
    expect(buildDynamicMatchInsight(match, pred(0.5, 0.3, 0.2))).toBe(
      'Alpha edge a tight one at home',
    );
  });

  it('notes when neither side is in convincing form on a coin-flip', () => {
    const match = makeMatch(['L', 'D', 'L', 'D', 'W'], ['L', 'L', 'D', 'D', 'L']);
    expect(buildDynamicMatchInsight(match, pred(0.44, 0.3, 0.26))).toBe(
      'Neither side in convincing form',
    );
  });

  it('leans slightly to the favourite on a close call with form', () => {
    const match = makeMatch(['W', 'W', 'W', 'D', 'L'], ['L', 'L', 'D', 'D', 'L']);
    expect(buildDynamicMatchInsight(match, pred(0.44, 0.3, 0.26))).toBe(
      'Too close to call — slight lean to Alpha',
    );
  });
});
