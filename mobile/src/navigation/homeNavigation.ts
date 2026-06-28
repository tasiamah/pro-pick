import type { NavigationProp } from '@react-navigation/native';

import type { HomeStackParamList, RootTabParamList } from './types';

export function navigateHomeDetailsToMatchesTab(
  navigation: NavigationProp<HomeStackParamList>,
) {
  navigation
    .getParent<NavigationProp<RootTabParamList>>()
    ?.navigate('MatchesTab', { screen: 'Matches' });
}
