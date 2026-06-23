import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type {
  FavoritesStackParamList,
  HomeStackParamList,
  MatchesStackParamList,
} from '../navigation/types';
import { colors } from '../theme/colors';

type MatchDetailProps =
  | NativeStackScreenProps<HomeStackParamList, 'MatchDetail'>
  | NativeStackScreenProps<MatchesStackParamList, 'MatchDetail'>
  | NativeStackScreenProps<FavoritesStackParamList, 'MatchDetail'>;

export function MatchDetailScreen({ route }: MatchDetailProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match Details</Text>
      <Text style={styles.subtitle}>Match ID: {route.params.matchId}</Text>
      <Text style={styles.note}>Full match detail UI comes in a later ticket.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.primary,
    fontSize: 16,
    marginBottom: 16,
  },
  note: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
