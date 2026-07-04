import type { MatchDetail, MarketPick, Odds, Prediction } from '../api/types';

import {
  CANONICAL_CONFIDENCE_THRESHOLD,
  CONFIDENCE_FLOOR,
  HIGH_ODDS_CONFIDENCE_FLOOR,
  isConfidentMarketPick,
  isConfidentMatch,
  isHighConfidenceSecondaryPick,
  slateConfidenceThreshold,
  slateConfidenceThresholdForMarket,
} from './confidence';
import { filterHighConfidenceMatches, getQualifyingPicksForMatch } from './marketPicks';

function pred(home: number, draw: number, away: number): Prediction {
  return {
    match_id: 1,
    model_version: 'v1',
    prob_home: home,
    prob_draw: draw,
    prob_away: away,
  };
}

function marketPick(
  market: MarketPick['market'],
  confidence: number,
  recommended_outcome: string,
): MarketPick {
  return {
    market,
    model_version: 'test',
    probabilities: {},
    recommended_outcome,
    confidence,
  };
}

function match(
  id: number,
  prediction: Prediction | null,
  odds: Odds[] = [],
): MatchDetail {
  return {
    id,
    kickoff: '2026-06-30T15:00:00Z',
    status: 'scheduled',
    home_team: { id: 1, name: 'Home', logo_url: null },
    away_team: { id: 2, name: 'Away', logo_url: null },
    competition_name: 'World Cup',
    odds,
    prediction,
  };
}

/** Odds where the home outcome (the recommended pick below) is high-odds (>=3.5). */
function highOdds(): Odds {
  return { bookmaker: 'Demo', home: 4.2, draw: 3.6, away: 1.8 };
}

/** Build a no-odds slate from a list of top-outcome confidences. */
function slate(confidences: number[]): MatchDetail[] {
  return confidences.map((confidence, index) =>
    match(index + 1, pred(confidence, (1 - confidence) / 2, (1 - confidence) / 2)),
  );
}

describe('slateConfidenceThreshold', () => {
  it('falls back to the canonical threshold for an empty slate', () => {
    expect(slateConfidenceThreshold([])).toBe(CANONICAL_CONFIDENCE_THRESHOLD);
  });

  it('never drops below the floor for a low-confidence (international) slate', () => {
    const threshold = slateConfidenceThreshold(
      slate([0.41, 0.48, 0.52, 0.55, 0.59]),
    );
    expect(threshold).toBeGreaterThanOrEqual(CONFIDENCE_FLOOR);
    expect(threshold).toBeLessThan(CANONICAL_CONFIDENCE_THRESHOLD);
  });

  it('caps at the canonical threshold for a very confident slate', () => {
    expect(slateConfidenceThreshold(slate([0.8, 0.85, 0.9, 0.95]))).toBe(
      CANONICAL_CONFIDENCE_THRESHOLD,
    );
  });
});

describe('slateConfidenceThresholdForMarket', () => {
  it('computes a bar from secondary-market confidences only', () => {
    const matches = [
      match(1, {
        ...pred(0.4, 0.3, 0.3),
        markets: [marketPick('btts', 0.62, 'yes')],
      }),
      match(2, {
        ...pred(0.4, 0.3, 0.3),
        markets: [marketPick('btts', 0.58, 'yes')],
      }),
    ];

    const threshold = slateConfidenceThresholdForMarket(matches, 'btts');
    expect(threshold).toBeGreaterThanOrEqual(CONFIDENCE_FLOOR);
    expect(threshold).toBeLessThanOrEqual(CANONICAL_CONFIDENCE_THRESHOLD);
  });
});

describe('isConfidentMatch', () => {
  it('is true when confidence clears the bar', () => {
    expect(isConfidentMatch(match(1, pred(0.6, 0.25, 0.15)), 0.55)).toBe(true);
  });

  it('is false when confidence is below the bar', () => {
    expect(isConfidentMatch(match(1, pred(0.52, 0.28, 0.2)), 0.55)).toBe(false);
  });

  it('is false without a prediction', () => {
    expect(isConfidentMatch(match(1, null), 0.55)).toBe(false);
  });

  it('lets a high-odds pick through below the bar, down to its floor', () => {
    const highOddsPick = match(1, pred(0.45, 0.3, 0.25), [highOdds()]);
    expect(isConfidentMatch(highOddsPick, 0.6)).toBe(true);
  });

  it('still rejects a high-odds pick below its relaxed floor', () => {
    const tooLow = match(
      1,
      pred(HIGH_ODDS_CONFIDENCE_FLOOR - 0.02, 0.32, 0.2),
      [highOdds()],
    );
    expect(isConfidentMatch(tooLow, 0.6)).toBe(false);
  });
});

describe('isConfidentMarketPick', () => {
  it('keeps a secondary market that clears its own slate bar', () => {
    const matches = [
      match(1, {
        ...pred(0.4, 0.3, 0.3),
        markets: [marketPick('btts', 0.62, 'yes')],
      }),
      match(2, {
        ...pred(0.4, 0.3, 0.3),
        markets: [marketPick('btts', 0.51, 'yes')],
      }),
    ];
    const bar = slateConfidenceThresholdForMarket(matches, 'btts');
    expect(isConfidentMarketPick(matches[0], 'btts', bar)).toBe(true);
  });
});

describe('isHighConfidenceSecondaryPick', () => {
  it('shows a secondary market at or above the canonical threshold', () => {
    expect(isHighConfidenceSecondaryPick(CANONICAL_CONFIDENCE_THRESHOLD)).toBe(true);
    expect(isHighConfidenceSecondaryPick(0.82)).toBe(true);
  });

  it('hides a secondary market below the canonical threshold', () => {
    expect(isHighConfidenceSecondaryPick(CANONICAL_CONFIDENCE_THRESHOLD - 0.01)).toBe(
      false,
    );
    expect(isHighConfidenceSecondaryPick(0.55)).toBe(false);
  });
});

describe('getQualifyingPicksForMatch', () => {
  it('returns both 1X2 and qualifying secondary markets', () => {
    const entry = match(1, {
      ...pred(0.72, 0.15, 0.13),
      markets: [marketPick('btts', 0.61, 'yes')],
    });
    const slateMatches = [entry, match(2, pred(0.55, 0.25, 0.2))];

    const picks = getQualifyingPicksForMatch(entry, slateMatches);
    expect(picks.map((pick) => pick.market)).toEqual(['1x2', 'btts']);
    expect(picks[0].confidence).toBeGreaterThanOrEqual(picks[1].confidence);
  });
});

describe('filterHighConfidenceMatches', () => {
  it('surfaces the strongest tier of an international slate (never empty)', () => {
    const matches = slate([0.41, 0.48, 0.52, 0.55, 0.59]);
    const kept = filterHighConfidenceMatches(matches);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(matches.length);
    expect(kept).toContainEqual(matches[matches.length - 1]);
  });

  it('is strict: keeps only a minority (~top third) of a spread slate', () => {
    const matches = slate([
      0.5, 0.52, 0.54, 0.56, 0.58, 0.6, 0.62, 0.64, 0.66, 0.68,
    ]);
    const kept = filterHighConfidenceMatches(matches);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThanOrEqual(4);
  });

  it('drops prediction-less matches', () => {
    const matches = [
      match(1, pred(0.8, 0.1, 0.1)),
      match(2, null),
      match(3, pred(0.75, 0.15, 0.1)),
    ];
    expect(filterHighConfidenceMatches(matches).map((m) => m.id)).toEqual([1, 3]);
  });

  it('keeps high-odds value picks the relative bar would otherwise drop', () => {
    const matches = [
      match(1, pred(0.85, 0.1, 0.05)),
      match(2, pred(0.82, 0.12, 0.06)),
      match(3, pred(0.45, 0.3, 0.25), [highOdds()]),
    ];
    expect(filterHighConfidenceMatches(matches).map((m) => m.id)).toContain(3);
  });

  it('keeps a match when only a secondary market qualifies', () => {
    const matches = [
      match(1, {
        ...pred(0.45, 0.3, 0.25),
        markets: [marketPick('btts', 0.68, 'yes')],
      }),
      match(2, {
        ...pred(0.45, 0.3, 0.25),
        markets: [marketPick('btts', 0.51, 'yes')],
      }),
    ];

    expect(filterHighConfidenceMatches(matches).map((entry) => entry.id)).toEqual([1]);
  });
});
