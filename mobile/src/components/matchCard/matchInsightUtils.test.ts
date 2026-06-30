import type { Match, Prediction } from '../../api/types';

import { buildDynamicMatchInsight } from './matchInsightUtils';

type FormResult = 'W' | 'D' | 'L';

function makeMatch(
  homeForm: FormResult[] | undefined,
  awayForm: FormResult[] | undefined,
  id = 1,
): Match {
  return {
    id,
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

const VENUE_WORDS = /\b(home|away|road)\b/i;
const DASHES = /—|–|\s-\s/;

const DRAW_SHARED = [
  'Evenly matched, honours likely shared',
  'Nothing to separate these two',
  'Could go either way, leaning to a draw',
];
const DRAW_LOW = [
  'Tight, low-scoring affair on the cards',
  'Cagey one, stalemate on the cards',
  'Few clear chances, spoils likely shared',
];
const STREAK = [
  'Alpha unstoppable right now',
  'Alpha rolling and hard to stop',
  'Alpha in red-hot form',
];
const UNBEATEN = [
  'Alpha in excellent form',
  'Alpha flying into this one',
  'Alpha unbeaten and dangerous',
];
const CONFIDENT = [
  'Alpha firm favourites here',
  'Alpha should have too much',
  'Alpha hold a clear edge',
  'Expect Alpha to take charge',
];
const NEITHER = [
  'Neither side in convincing form',
  'Both stuttering, wide open',
  'Little to choose, both out of sorts',
];

describe('buildDynamicMatchInsight', () => {
  it('calls out a shared result for a draw pick', () => {
    const match = makeMatch(['W', 'W', 'D', 'W', 'L'], ['W', 'D', 'W', 'W', 'D']);
    expect(DRAW_SHARED).toContain(
      buildDynamicMatchInsight(match, pred(0.3, 0.4, 0.3)),
    );
  });

  it('flags a low-scoring draw when neither side is winning', () => {
    const match = makeMatch(['L', 'D', 'L', 'D', 'L'], ['D', 'L', 'L', 'D', 'L']);
    expect(DRAW_LOW).toContain(
      buildDynamicMatchInsight(match, pred(0.3, 0.4, 0.3)),
    );
  });

  it('hails an unstoppable favourite on a winning streak', () => {
    const match = makeMatch(['W', 'W', 'W', 'W', 'W'], ['L', 'D', 'W', 'L', 'W']);
    expect(STREAK).toContain(
      buildDynamicMatchInsight(match, pred(0.72, 0.18, 0.1)),
    );
  });

  it('credits excellent form for an unbeaten favourite', () => {
    const match = makeMatch(['W', 'D', 'W', 'W'], ['L', 'W', 'L', 'D', 'W']);
    expect(UNBEATEN).toContain(
      buildDynamicMatchInsight(match, pred(0.62, 0.23, 0.15)),
    );
  });

  it('calls a confident pick by name without venue framing', () => {
    const match = makeMatch(['W', 'L', 'W', 'W', 'W'], ['L', 'W', 'L', 'D', 'W']);
    const insight = buildDynamicMatchInsight(match, pred(0.61, 0.2, 0.19));
    expect(CONFIDENT).toContain(insight);
    expect(insight).not.toMatch(VENUE_WORDS);
  });

  it('names the favourite for a confident away pick without venue framing', () => {
    const match = makeMatch(['L', 'W', 'L', 'D', 'W'], ['W', 'L', 'W', 'W', 'L']);
    const insight = buildDynamicMatchInsight(match, pred(0.15, 0.2, 0.65));
    expect(insight).toContain('Beta');
    expect(insight).not.toMatch(VENUE_WORDS);
  });

  it('describes a moderate pick as a slight edge without venue framing', () => {
    const match = makeMatch(['W', 'D', 'L', 'W', 'D'], ['D', 'W', 'L', 'D', 'W']);
    const insight = buildDynamicMatchInsight(match, pred(0.5, 0.3, 0.2));
    expect(insight).toContain('Alpha');
    expect(insight).not.toMatch(VENUE_WORDS);
  });

  it('notes when neither side is in convincing form on a coin-flip', () => {
    const match = makeMatch(['L', 'D', 'L', 'D', 'W'], ['L', 'L', 'D', 'D', 'L']);
    expect(NEITHER).toContain(
      buildDynamicMatchInsight(match, pred(0.44, 0.3, 0.26)),
    );
  });

  it('leans slightly to the favourite on a close call with form', () => {
    const match = makeMatch(['W', 'W', 'W', 'D', 'L'], ['L', 'L', 'D', 'D', 'L']);
    const insight = buildDynamicMatchInsight(match, pred(0.44, 0.3, 0.26));
    expect(insight).toContain('Alpha');
    expect(insight).not.toMatch(VENUE_WORDS);
  });

  it('varies the wording across different fixtures in the same band', () => {
    const form: FormResult[] = ['W', 'D', 'L', 'W', 'D'];
    const insights = new Set(
      [1, 2, 3, 4, 5].map((id) =>
        buildDynamicMatchInsight(
          makeMatch(form, ['D', 'W', 'L', 'D', 'W'], id),
          pred(0.5, 0.3, 0.2),
        ),
      ),
    );
    expect(insights.size).toBeGreaterThan(1);
  });

  it('never uses venue language or dashes for any outcome', () => {
    const scenarios: Prediction[] = [
      pred(0.7, 0.2, 0.1),
      pred(0.5, 0.3, 0.2),
      pred(0.2, 0.3, 0.5),
      pred(0.34, 0.33, 0.33),
    ];
    for (let id = 1; id <= 6; id += 1) {
      for (const prediction of scenarios) {
        const insight = buildDynamicMatchInsight(
          makeMatch(['W', 'L', 'D', 'W', 'L'], ['L', 'D', 'W', 'L', 'W'], id),
          prediction,
        );
        expect(insight).not.toMatch(VENUE_WORDS);
        expect(insight).not.toMatch(DASHES);
      }
    }
  });
});
