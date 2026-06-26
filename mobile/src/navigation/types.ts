export type MatchDetailParams = {
  matchId: string;
};

export type HomeStackParamList = {
  Home: undefined;
  MatchDetail: MatchDetailParams;
};

export type MatchesStackParamList = {
  Matches: undefined;
  MatchDetail: MatchDetailParams;
};

export type FavoritesStackParamList = {
  Favorites: undefined;
  MatchDetail: MatchDetailParams;
};

export type RootTabParamList = {
  HomeTab: undefined;
  MatchesTab: undefined;
  FavoritesTab: undefined;
  AnalyticsTab: undefined;
  AboutTab: undefined;
};
