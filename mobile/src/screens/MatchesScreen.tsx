import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MatchesStackParamList } from '../navigation/types';
import { screenStyles } from '../theme';

type Props = NativeStackScreenProps<MatchesStackParamList, 'Matches'>;

export function MatchesScreen({ navigation }: Props) {
  return (
    <View style={screenStyles.centeredContainer}>
      <Text style={screenStyles.screenTitle}>Matches</Text>
      <Pressable
        style={screenStyles.outlineButton}
        onPress={() => navigation.navigate('MatchDetail', { matchId: 'sample-matches' })}
      >
        <Text style={screenStyles.outlineButtonText}>Details</Text>
      </Pressable>
    </View>
  );
}
