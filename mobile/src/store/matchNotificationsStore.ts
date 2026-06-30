import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { api } from '../api/client';
import {
  ALL_MATCH_NOTIFICATION_KEYS,
  createDefaultMatchNotificationSettings,
  type MatchNotificationKey,
} from '../components/matchNotifications/matchNotificationTypes';
import { getDeviceId } from '../services/deviceId';
import { ensurePushPermissions } from '../services/pushNotifications';

type MatchNotificationSettings = Record<MatchNotificationKey, boolean>;

type MatchNotificationsState = {
  byMatchId: Record<string, MatchNotificationSettings>;
  getSettings: (matchId: number) => MatchNotificationSettings;
  toggleSetting: (matchId: number, key: MatchNotificationKey) => Promise<void>;
  syncMatchPreferences: (matchId: number) => Promise<void>;
  hydrateMatchPreferences: (matchId: number) => Promise<void>;
};

function normalizeSettings(
  settings: Partial<MatchNotificationSettings> | undefined,
): MatchNotificationSettings {
  const defaults = createDefaultMatchNotificationSettings();
  if (!settings) {
    return defaults;
  }

  return ALL_MATCH_NOTIFICATION_KEYS.reduce((normalized, key) => {
    normalized[key] = settings[key] ?? false;
    return normalized;
  }, defaults);
}

async function persistPreferencesToBackend(
  matchId: number,
  settings: MatchNotificationSettings,
): Promise<void> {
  const deviceId = await getDeviceId();
  await api.saveNotificationPreferences({
    device_id: deviceId,
    match_id: matchId,
    settings,
  });
}

export const useMatchNotificationsStore = create<MatchNotificationsState>()(
  persist(
    (set, get) => ({
      byMatchId: {},
      getSettings: (matchId) =>
        normalizeSettings(get().byMatchId[String(matchId)]),
      toggleSetting: async (matchId, key) => {
        await ensurePushPermissions();

        const matchKey = String(matchId);
        const current = normalizeSettings(get().byMatchId[matchKey]);
        const nextSettings = {
          ...current,
          [key]: !current[key],
        };

        set((state) => ({
          byMatchId: {
            ...state.byMatchId,
            [matchKey]: nextSettings,
          },
        }));

        try {
          await persistPreferencesToBackend(matchId, nextSettings);
        } catch (error) {
          console.warn('Failed to sync notification preferences', error);
        }
      },
      syncMatchPreferences: async (matchId) => {
        const settings = get().getSettings(matchId);
        try {
          await persistPreferencesToBackend(matchId, settings);
        } catch (error) {
          console.warn('Failed to sync notification preferences', error);
        }
      },
      hydrateMatchPreferences: async (matchId) => {
        try {
          const deviceId = await getDeviceId();
          const remote = await api.getNotificationPreferences(deviceId, matchId);
          set((state) => ({
            byMatchId: {
              ...state.byMatchId,
              [String(matchId)]: normalizeSettings(remote.settings),
            },
          }));
        } catch (error) {
          console.warn('Failed to load notification preferences', error);
        }
      },
    }),
    {
      name: 'pro-pick-match-notifications',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
