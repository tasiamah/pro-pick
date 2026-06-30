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
 * Build a concise, match-specific headline for the card from the signals we have
 * client-side (recommended outcome, model confidence and each side's recent
 * form). It replaces the backend's repetitive templated insight with something
 * that varies per fixture. Always returns a non-empty string.
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
      return 'Tight, low-scoring affair on the cards';
    }
    return 'Evenly matched — honours likely shared';
  }

  const winnerName = outcome === 'home' ? homeName : awayName;
  const winnerForm = outcome === 'home' ? homeForm : awayForm;

  if (confidence >= 0.65 && isWinStreak(winnerForm)) {
    return `${winnerName} unstoppable right now`;
  }

  if (confidence >= 0.6 && isUnbeaten(winnerForm)) {
    return `${winnerName} in excellent form`;
  }

  if (confidence >= 0.6) {
    return outcome === 'home'
      ? `${homeName} firm favourites at home`
      : `${awayName} fancied to win on the road`;
  }

  if (confidence >= 0.45) {
    return outcome === 'home'
      ? `${homeName} edge a tight one at home`
      : `${awayName} hold a slight edge away`;
  }

  if (winCount(homeForm) <= 1 && winCount(awayForm) <= 1) {
    return 'Neither side in convincing form';
  }

  return `Too close to call — slight lean to ${winnerName}`;
}
