import type { MatchDetail, MarketPick, Odds, Prediction } from '../api/types';

import {
  CANONICAL_CONFIDENCE_THRESHOLD,
  HIGH_ODDS_CONFIDENCE_FLOOR,
  isConfidentMarketPick,
  isConfidentMatch,
  isHighConfidenceSecondaryPick,
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

describe('isConfidentMatch', () => {
  it('is true when confidence clears the high-confidence threshold', () => {
    expect(isConfidentMatch(match(1, pred(0.72, 0.16, 0.12)))).toBe(true);
  });

  it('is false when confidence is below the threshold on a normal pick', () => {
    // 0.62 would have passed the old slate-relative bar; now it does not.
    expect(isConfidentMatch(match(1, pred(0.62, 0.22, 0.16)))).toBe(false);
  });

  it('is false without a prediction', () => {
    expect(isConfidentMatch(match(1, null))).toBe(false);
  });

  it('lets a high-odds pick through below the threshold, down to its floor', () => {
    const highOddsPick = match(1, pred(0.45, 0.3, 0.25), [highOdds()]);
    expect(isConfidentMatch(highOddsPick)).toBe(true);
  });

  it('still rejects a high-odds pick below its relaxed floor', () => {
    const tooLow = match(
      1,
      pred(HIGH_ODDS_CONFIDENCE_FLOOR - 0.02, 0.32, 0.2),
      [highOdds()],
    );
    expect(isConfidentMatch(tooLow)).toBe(false);
  });
});

describe('isConfidentMarketPick', () => {
  it('keeps a secondary market at or above the high-confidence threshold', () => {
    const entry = match(1, {
      ...pred(0.4, 0.3, 0.3),
      markets: [marketPick('btts', 0.74, 'yes')],
    });
    expect(isConfidentMarketPick(entry, 'btts')).toBe(true);
  });

  it('drops a secondary market below the high-confidence threshold', () => {
    const entry = match(1, {
      ...pred(0.4, 0.3, 0.3),
      markets: [marketPick('btts', 0.62, 'yes')],
    });
    expect(isConfidentMarketPick(entry, 'btts')).toBe(false);
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
  it('returns 1X2 and secondary markets that clear the high-confidence bar', () => {
    const entry = match(1, {
      ...pred(0.72, 0.15, 0.13),
      markets: [marketPick('btts', 0.74, 'yes'), marketPick('over_under_25', 0.61, 'over')],
    });

    // 1X2 (0.72) and BTTS (0.74) qualify; Over/Under (0.61) is below 0.70.
    const picks = getQualifyingPicksForMatch(entry);
    expect(picks.map((pick) => pick.market)).toEqual(['btts', '1x2']);
    expect(picks[0].confidence).toBeGreaterThanOrEqual(picks[1].confidence);
  });
});

describe('filterHighConfidenceMatches', () => {
  it('returns nothing for a low-confidence (international) slate', () => {
    // None of these clear the high-confidence bar, and none are high-odds, so
    // we deliberately show nothing rather than the "best of a weak slate".
    const matches = slate([0.41, 0.48, 0.52, 0.55, 0.59, 0.62, 0.66, 0.68]);
    expect(filterHighConfidenceMatches(matches)).toEqual([]);
  });

  it('keeps only the matches at or above the high-confidence threshold', () => {
    const matches = slate([0.62, 0.68, 0.7, 0.74, 0.81]);
    const kept = filterHighConfidenceMatches(matches);
    expect(kept.map((entry) => entry.id)).toEqual([3, 4, 5]);
  });

  it('drops prediction-less matches', () => {
    const matches = [
      match(1, pred(0.8, 0.1, 0.1)),
      match(2, null),
      match(3, pred(0.75, 0.15, 0.1)),
    ];
    expect(filterHighConfidenceMatches(matches).map((m) => m.id)).toEqual([1, 3]);
  });

  it('keeps high-odds value picks below the high-confidence threshold', () => {
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
        markets: [marketPick('btts', 0.72, 'yes')],
      }),
      match(2, {
        ...pred(0.45, 0.3, 0.25),
        markets: [marketPick('btts', 0.68, 'yes')],
      }),
    ];

    expect(filterHighConfidenceMatches(matches).map((entry) => entry.id)).toEqual([1]);
  });
});
