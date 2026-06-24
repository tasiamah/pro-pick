import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { FavoritesStackParamList } from '../navigation/types';
import { screenStyles } from '../theme';

type Props = NativeStackScreenProps<FavoritesStackParamList, 'Favorites'>;

export function FavoritesScreen({ navigation }: Props) {
  return (
    <View style={screenStyles.centeredContainer}>
      <Text style={screenStyles.screenTitle}>Favorites</Text>
      <Pressable
        style={screenStyles.outlineButton}
        onPress={() => navigation.navigate('MatchDetail', { matchId: 'sample-favorites' })}
      >
        <Text style={screenStyles.outlineButtonText}>Details</Text>
      </Pressable>
    </View>
  );
}
