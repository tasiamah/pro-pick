import type { NavigatorScreenParams } from '@react-navigation/native';

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
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  MatchesTab: NavigatorScreenParams<MatchesStackParamList> | undefined;
  FavoritesTab: NavigatorScreenParams<FavoritesStackParamList> | undefined;
  AnalyticsTab: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  About: undefined;
  PrivacyPolicy: undefined;
};
