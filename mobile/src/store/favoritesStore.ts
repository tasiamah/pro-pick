import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type FavoritesState = {
  matchIds: number[];
  toggleMatch: (matchId: number) => void;
  removeMatch: (matchId: number) => void;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      matchIds: [],
      toggleMatch: (matchId) =>
        set((state) => ({
          matchIds: state.matchIds.includes(matchId)
            ? state.matchIds.filter((id) => id !== matchId)
            : [...state.matchIds, matchId],
        })),
      removeMatch: (matchId) =>
        set((state) => ({
          matchIds: state.matchIds.filter((id) => id !== matchId),
        })),
    }),
    {
      name: 'pro-pick-favorite-matches',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
