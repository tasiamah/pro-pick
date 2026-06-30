import {
  ALL_MATCH_NOTIFICATION_KEYS,
  createDefaultMatchNotificationSettings,
  POPULAR_MATCH_NOTIFICATIONS,
} from './matchNotificationTypes';

describe('matchNotificationTypes', () => {
  it('defines eight popular notification options', () => {
    expect(POPULAR_MATCH_NOTIFICATIONS).toHaveLength(8);
    expect(POPULAR_MATCH_NOTIFICATIONS[0]?.label).toBe('Goal');
  });

  it('creates default disabled settings for every key', () => {
    const settings = createDefaultMatchNotificationSettings();

    expect(Object.keys(settings)).toEqual(ALL_MATCH_NOTIFICATION_KEYS);
    expect(Object.values(settings).every((enabled) => enabled === false)).toBe(true);
  });
});
