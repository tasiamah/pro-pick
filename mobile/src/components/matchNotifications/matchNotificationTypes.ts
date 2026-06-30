import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type MatchNotificationKey =
  | 'goal'
  | 'goalscorer'
  | 'assist'
  | 'match_start'
  | 'match_end'
  | 'penalty'
  | 'lineups_confirmed'
  | 'red_card'
  | 'yellow_card'
  | 'substitution'
  | 'var_decision'
  | 'half_time';

export type MatchNotificationOption = {
  key: MatchNotificationKey;
  label: string;
  emoji?: string;
  icon?: IoniconName;
  iconColor?: string;
  iconSize?: number;
};

export const POPULAR_MATCH_NOTIFICATIONS: MatchNotificationOption[] = [
  { key: 'goal', label: 'Goal', emoji: '⚽' },
  { key: 'goalscorer', label: 'Goalscorer', emoji: '👕' },
  { key: 'assist', label: 'Assist', emoji: '👕' },
  { key: 'match_start', label: 'Match Start', emoji: '🏁' },
  { key: 'match_end', label: 'Match End', emoji: '🏁' },
  { key: 'penalty', label: 'Penalty', emoji: '⚽' },
  {
    key: 'lineups_confirmed',
    label: 'Line-Ups Confirmed',
    icon: 'checkmark-outline',
    iconColor: '#FFFFFF',
    iconSize: 22,
  },
  { key: 'red_card', label: 'Red Card', emoji: '🟥' },
];

export const MORE_MATCH_NOTIFICATIONS: MatchNotificationOption[] = [
  { key: 'yellow_card', label: 'Yellow Card', emoji: '🟨' },
  { key: 'substitution', label: 'Start of Half', emoji: '🏁' },
  { key: 'var_decision', label: 'End of Half', emoji: '🏁' },
  { key: 'half_time', label: 'Penalty Shootout Reminder', emoji: '⚽' },
];

export const ALL_MATCH_NOTIFICATION_KEYS: MatchNotificationKey[] = [
  ...POPULAR_MATCH_NOTIFICATIONS.map((option) => option.key),
  ...MORE_MATCH_NOTIFICATIONS.map((option) => option.key),
];

export function createDefaultMatchNotificationSettings(): Record<
  MatchNotificationKey,
  boolean
> {
  return ALL_MATCH_NOTIFICATION_KEYS.reduce(
    (settings, key) => {
      settings[key] = false;
      return settings;
    },
    {} as Record<MatchNotificationKey, boolean>,
  );
}
