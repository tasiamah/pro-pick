/* eslint-disable @typescript-eslint/no-require-imports -- Metro sync require for React Navigation lazy tabs */
function lazyScreenComponent<T>(
  load: () => Record<string, unknown>,
  exportName: string,
): () => T {
  return () => {
    const module = load();
    const component = module[exportName];
    if (typeof component !== 'function') {
      throw new Error(`lazyScreenComponent: missing export "${exportName}"`);
    }
    return component as T;
  };
}

export const getMatchesStackNavigator: () => typeof import('./MatchesStackNavigator').MatchesStackNavigator =
  lazyScreenComponent(() => require('./MatchesStackNavigator'), 'MatchesStackNavigator');

export const getFavoritesStackNavigator: () => typeof import('./FavoritesStackNavigator').FavoritesStackNavigator =
  lazyScreenComponent(() => require('./FavoritesStackNavigator'), 'FavoritesStackNavigator');

export const getAnalyticsScreen: () => typeof import('../screens/AnalyticsScreen').AnalyticsScreen =
  lazyScreenComponent(() => require('../screens/AnalyticsScreen'), 'AnalyticsScreen');

export const getMatchesScreen: () => typeof import('../screens/MatchesScreen').MatchesScreen =
  lazyScreenComponent(() => require('../screens/MatchesScreen'), 'MatchesScreen');

export const getMatchDetailScreen: () => typeof import('../screens/MatchDetailScreen').MatchDetailScreen =
  lazyScreenComponent(() => require('../screens/MatchDetailScreen'), 'MatchDetailScreen');

export const getFavoritesScreen: () => typeof import('../screens/FavoritesScreen').FavoritesScreen =
  lazyScreenComponent(() => require('../screens/FavoritesScreen'), 'FavoritesScreen');

export const getAboutScreen: () => typeof import('../screens/AboutScreen').AboutScreen =
  lazyScreenComponent(() => require('../screens/AboutScreen'), 'AboutScreen');

export const getPrivacyPolicyScreen: () => typeof import('../screens/PrivacyPolicyScreen').PrivacyPolicyScreen =
  lazyScreenComponent(() => require('../screens/PrivacyPolicyScreen'), 'PrivacyPolicyScreen');
