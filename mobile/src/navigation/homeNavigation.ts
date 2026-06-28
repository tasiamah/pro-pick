import type { NavigationProp, ParamListBase } from '@react-navigation/native';

export function navigateHomeDetailsToMatchesTab(navigation: NavigationProp<ParamListBase>) {
  navigation.getParent()?.navigate('MatchesTab', { screen: 'Matches' });
}
