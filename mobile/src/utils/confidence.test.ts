import type { MatchDetail, Odds, Prediction } from '../api/types';

import {
  CANONICAL_CONFIDENCE_THRESHOLD,
  CONFIDENCE_FLOOR,
  filterHighConfidenceMatches,
  HIGH_ODDS_CONFIDENCE_FLOOR,
  isConfidentMatch,
  slateConfidenceThreshold,
} from './confidence';

function pred(home: number, draw: number, away: number): Prediction {
  return {
    match_id: 1,
    model_version: 'v1',
    prob_home: home,
    prob_draw: draw,
    prob_away: away,
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

describe('filterHighConfidenceMatches', () => {
  it('surfaces the strongest tier of an international slate (never empty)', () => {
    const matches = slate([0.41, 0.48, 0.52, 0.55, 0.59]);
    const kept = filterHighConfidenceMatches(matches);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.length).toBeLessThan(matches.length);
    // The single most confident match is always kept.
    expect(kept).toContainEqual(matches[matches.length - 1]);
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
});
