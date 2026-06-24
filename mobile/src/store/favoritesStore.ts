import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { FavoriteCompetition, FavoriteTeam } from './favoritesFilter';

type FavoritesState = {
  teams: FavoriteTeam[];
  competitions: FavoriteCompetition[];
  toggleTeam: (team: FavoriteTeam) => void;
  toggleCompetition: (competition: FavoriteCompetition) => void;
  removeTeam: (teamId: number) => void;
  removeCompetition: (name: string) => void;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      teams: [],
      competitions: [],
      toggleTeam: (team) =>
        set((state) => {
          const exists = state.teams.some((item) => item.id === team.id);
          return {
            teams: exists
              ? state.teams.filter((item) => item.id !== team.id)
              : [...state.teams, team],
          };
        }),
      toggleCompetition: (competition) =>
        set((state) => {
          const normalizedName = competition.name.toLowerCase();
          const exists = state.competitions.some(
            (item) => item.name.toLowerCase() === normalizedName,
          );
          return {
            competitions: exists
              ? state.competitions.filter(
                  (item) => item.name.toLowerCase() !== normalizedName,
                )
              : [...state.competitions, competition],
          };
        }),
      removeTeam: (teamId) =>
        set((state) => ({
          teams: state.teams.filter((team) => team.id !== teamId),
        })),
      removeCompetition: (name) =>
        set((state) => ({
          competitions: state.competitions.filter(
            (competition) => competition.name.toLowerCase() !== name.toLowerCase(),
          ),
        })),
    }),
    {
      name: 'pro-pick-favorites',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
