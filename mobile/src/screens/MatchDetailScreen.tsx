import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type {
  FavoritesStackParamList,
  HomeStackParamList,
  MatchesStackParamList,
} from '../navigation/types';
import { screenStyles } from '../theme';

type MatchDetailProps =
  | NativeStackScreenProps<HomeStackParamList, 'MatchDetail'>
  | NativeStackScreenProps<MatchesStackParamList, 'MatchDetail'>
  | NativeStackScreenProps<FavoritesStackParamList, 'MatchDetail'>;

export function MatchDetailScreen({ route }: MatchDetailProps) {
  return (
    <View style={screenStyles.centeredContainer}>
      <Text style={screenStyles.detailTitle}>Match Details</Text>
      <Text style={screenStyles.detailSubtitle}>Match ID: {route.params.matchId}</Text>
      <Text style={screenStyles.detailNote}>Full match detail UI comes in a later ticket.</Text>
    </View>
  );
}
