import { toLocalDateKey } from '../utils/matchDates';
import { useNow } from './useNow';

/** Local calendar day key for date-window queries; advances when the clock crosses local midnight. */
export function useLocalDayKey(): string {
  return toLocalDateKey(useNow());
}
