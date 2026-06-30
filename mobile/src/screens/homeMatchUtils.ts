import type { MatchDetail, ValueBet } from '../api/types';
import { classifyOddsTier, type OddsTier } from '../components/demo/demoUtils';
import {
  getOddForOutcome,
  getRecommendedOutcome,
} from '../components/matchCard/matchCardUtils';
import {
  addLocalDays,
  filterMatchesByDate,
  filterMatchesByWeek,
  parseMatchDate,
  startOfLocalDay,
} from '../utils/matchDates';
import { hasKickedOff } from './matchesFilterUtils';

/**
 * Floor for how many matches the Home tab shows. A busy day renders its full
 * slate (this is only a minimum); a quiet day is topped up to this many from the
 * soonest upcoming days so Home never looks sparse. The Matches tab remains the
 * complete browse. ~12 ≈ a full-looking slate, roughly four per odds tier.
 */
export const HOME_MATCH_TARGET = 12;

export type HomeOddsTierGroup = {
  tier: OddsTier;
  matches: MatchDetail[];
};

/** Display order of the Home odds-tier sections (highest odds first). */
const ODDS_TIER_ORDER: readonly OddsTier[] = ['high', 'medium', 'low'];

/**
 * Odds tier of a match, classified from the price of the model's recommended
 * outcome (the same value that drives the card's odds-tier badge). Returns
 * ``null`` when the match has no prediction or odds to classify.
 */
export function classifyMatchOddsTier(match: MatchDetail): OddsTier | null {
  const prediction = match.prediction;
  const primaryOdds = match.odds[0];
  if (!prediction || !primaryOdds) {
    return null;
  }

  return classifyOddsTier(
    getOddForOutcome(primaryOdds, getRecommendedOutcome(prediction)),
  );
}

/**
 * Group matches into Low/Medium/High odds-tier buckets (in that order),
 * preserving the incoming order within each bucket and dropping empty tiers.
 * Matches that can't be classified (no prediction/odds) are omitted, mirroring
 * the Matches tab's odds-tier filter.
 */
export function groupHomeMatchesByOddsTier(
  matches: MatchDetail[],
): HomeOddsTierGroup[] {
  const buckets = new Map<OddsTier, MatchDetail[]>();
  for (const match of matches) {
    const tier = classifyMatchOddsTier(match);
    if (tier === null) {
      continue;
    }
    const bucket = buckets.get(tier);
    if (bucket) {
      bucket.push(match);
    } else {
      buckets.set(tier, [match]);
    }
  }

  return ODDS_TIER_ORDER.flatMap((tier) => {
    const tierMatches = buckets.get(tier);
    return tierMatches && tierMatches.length > 0
      ? [{ tier, matches: tierMatches }]
      : [];
  });
}

/**
 * Matches on the selected local day that have not kicked off yet. The Home tab
 * is an "upcoming" view, so a match whose kickoff is in the past (e.g. one that
 * already started today) should drop off even though it still falls on the
 * selected calendar day.
 */
export function filterUpcomingMatchesForDay(
  matches: MatchDetail[],
  selectedDate: Date,
  now: Date,
): MatchDetail[] {
  return filterMatchesByDate(matches, selectedDate).filter(
    (match) => !hasKickedOff(match.kickoff, now),
  );
}

function kickoffTime(match: MatchDetail): number {
  return match.kickoff ? parseMatchDate(match.kickoff).getTime() : 0;
}

/**
 * Upcoming matches for the current calendar week (Mon–Sun) containing `now`.
 * Mirrors the day view's "upcoming only" rule so the Home tab stays a forward
 * looking slate while widening the window from a single day to the whole week.
 */
export function selectHomeWeekMatches(
  matches: MatchDetail[],
  now: Date,
): MatchDetail[] {
  return filterMatchesByWeek(matches, now).filter(
    (match) => !hasKickedOff(match.kickoff, now),
  );
}

/**
 * Matches to show on the Home tab: the selected day's upcoming matches, topped
 * up with the soonest upcoming matches from later days so the list never shrinks
 * below ``target`` while the loaded window still has upcoming fixtures. Days that
 * already have ``target`` or more upcoming matches are returned unchanged.
 */
export function selectHomeMatches(
  matches: MatchDetail[],
  selectedDate: Date,
  now: Date,
  target = HOME_MATCH_TARGET,
): MatchDetail[] {
  const dayMatches = filterUpcomingMatchesForDay(matches, selectedDate, now);
  if (dayMatches.length >= target) {
    return dayMatches;
  }

  const nextDayStart = addLocalDays(startOfLocalDay(selectedDate), 1).getTime();
  const alreadyShown = new Set(dayMatches.map((match) => match.id));
  const fillers = matches
    .filter(
      (match) =>
        !alreadyShown.has(match.id) &&
        match.kickoff !== null &&
        !hasKickedOff(match.kickoff, now) &&
        kickoffTime(match) >= nextDayStart,
    )
    .sort((left, right) => kickoffTime(left) - kickoffTime(right))
    .slice(0, target - dayMatches.length);

  return [...dayMatches, ...fillers];
}

/**
 * Value bets whose match is loaded and has not kicked off yet. ``ValueBet``
 * carries no kickoff, so we resolve it from the loaded matches by ``match_id``.
 * A bet is only shown when its match is present in ``matches`` and still
 * upcoming; bets whose match is unknown (not yet loaded or outside the window)
 * are hidden so an already-started pick can't leak onto Home. Callers should
 * therefore pass the matches only once they have loaded.
 */
export function filterUpcomingValueBets(
  valueBets: ValueBet[],
  matches: MatchDetail[],
  now: Date,
): ValueBet[] {
  const kickoffByMatchId = new Map(
    matches.map((match) => [match.id, match.kickoff]),
  );
  return valueBets.filter((bet) => {
    const kickoff = kickoffByMatchId.get(bet.match_id);
    return kickoff !== undefined && !hasKickedOff(kickoff, now);
  });
}
