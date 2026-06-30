import type { Match } from '../api/types';
import { parseMatchDate } from '../utils/matchDates';

export function sortMatchesByKickoff<T extends Match>(matches: T[]): T[] {
  return [...matches].sort((left, right) => {
    const leftTime = left.kickoff ? parseMatchDate(left.kickoff).getTime() : null;
    const rightTime = right.kickoff
      ? parseMatchDate(right.kickoff).getTime()
      : null;
    if (leftTime === null && rightTime === null) {
      return 0;
    }
    if (leftTime === null) {
      return 1;
    }
    if (rightTime === null) {
      return -1;
    }
    return leftTime - rightTime;
  });
}
