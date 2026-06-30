import type { Match, Prediction } from '../../api/types';

import { getConfidence, getRecommendedOutcome } from './matchCardUtils';

type FormResult = 'W' | 'D' | 'L';

const RECENT_FORM_WINDOW = 5;

function recentForm(form: FormResult[] | undefined): FormResult[] {
  return form ? form.slice(-RECENT_FORM_WINDOW) : [];
}

function winCount(form: FormResult[] | undefined): number {
  return recentForm(form).filter((result) => result === 'W').length;
}

function isUnbeaten(form: FormResult[] | undefined, minGames = 4): boolean {
  const recent = recentForm(form);
  return recent.length >= minGames && recent.every((result) => result !== 'L');
}

function isWinStreak(form: FormResult[] | undefined, minGames = 4): boolean {
  const recent = recentForm(form);
  return recent.length >= minGames && recent.every((result) => result === 'W');
}

/**
 * Pick a deterministic variant for a fixture so the same match always shows the
 * same line, but different matches in the same confidence band get different
 * wording. Seeded by the match id (falls back to the team names) so it is stable
 * across renders.
 */
function pickVariant(variants: string[], match: Match): string {
  const idSeed = Math.abs(Math.trunc(match.id ?? 0));
  const nameSeed = `${match.home_team.name}${match.away_team.name}`
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = idSeed > 0 ? idSeed : nameSeed;
  return variants[seed % variants.length];
}

/**
 * Build a concise, match-specific headline for the card from the signals we have
 * client-side (recommended outcome, model confidence and each side's recent
 * form). Venue-neutral on purpose — tournaments like the World Cup are played at
 * neutral grounds, so there is no "home" or "away" advantage to lean on. Returns
 * a non-empty string that varies per fixture rather than repeating a template.
 */
export function buildDynamicMatchInsight(
  match: Match,
  prediction: Prediction,
): string {
  const outcome = getRecommendedOutcome(prediction);
  const confidence = getConfidence(prediction);
  const homeName = match.home_team.name;
  const awayName = match.away_team.name;
  const homeForm = match.home_team.form;
  const awayForm = match.away_team.form;

  if (outcome === 'draw') {
    if (winCount(homeForm) <= 1 && winCount(awayForm) <= 1) {
      return pickVariant(
        [
          'Tight, low-scoring affair on the cards',
          'Cagey one, stalemate on the cards',
          'Few clear chances, spoils likely shared',
        ],
        match,
      );
    }
    return pickVariant(
      [
        'Evenly matched, honours likely shared',
        'Nothing to separate these two',
        'Could go either way, leaning to a draw',
      ],
      match,
    );
  }

  const winnerName = outcome === 'home' ? homeName : awayName;
  const loserName = outcome === 'home' ? awayName : homeName;
  const winnerForm = outcome === 'home' ? homeForm : awayForm;

  if (confidence >= 0.65 && isWinStreak(winnerForm)) {
    return pickVariant(
      [
        `${winnerName} unstoppable right now`,
        `${winnerName} rolling and hard to stop`,
        `${winnerName} in red-hot form`,
      ],
      match,
    );
  }

  if (confidence >= 0.6 && isUnbeaten(winnerForm)) {
    return pickVariant(
      [
        `${winnerName} in excellent form`,
        `${winnerName} flying into this one`,
        `${winnerName} unbeaten and dangerous`,
      ],
      match,
    );
  }

  if (confidence >= 0.6) {
    return pickVariant(
      [
        `${winnerName} firm favourites here`,
        `${winnerName} should have too much`,
        `${winnerName} hold a clear edge`,
        `Expect ${winnerName} to take charge`,
      ],
      match,
    );
  }

  if (confidence >= 0.45) {
    return pickVariant(
      [
        `${winnerName} shade a tight one`,
        `Slim lean towards ${winnerName}`,
        `${winnerName} the marginal pick over ${loserName}`,
        `${winnerName} just about edge it`,
        `Tight call, ${winnerName} the value side`,
      ],
      match,
    );
  }

  if (winCount(homeForm) <= 1 && winCount(awayForm) <= 1) {
    return pickVariant(
      [
        'Neither side in convincing form',
        'Both stuttering, wide open',
        'Little to choose, both out of sorts',
      ],
      match,
    );
  }

  return pickVariant(
    [
      `Too close to call, slight lean to ${winnerName}`,
      `Coin-flip, narrow nod to ${winnerName}`,
      `Wide open, ${winnerName} the slight pick`,
    ],
    match,
  );
}
