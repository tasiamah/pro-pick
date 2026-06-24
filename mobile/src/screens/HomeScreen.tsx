import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { HomeStackParamList } from '../navigation/types';
import { screenStyles } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  return (
    <View style={screenStyles.centeredContainer}>
      <Text style={screenStyles.screenTitle}>Home</Text>
      <Pressable
        style={screenStyles.outlineButton}
        onPress={() => navigation.navigate('MatchDetail', { matchId: 'sample-home' })}
      >
        <Text style={screenStyles.outlineButtonText}>Details</Text>
      </Pressable>
    </View>
  );
}
