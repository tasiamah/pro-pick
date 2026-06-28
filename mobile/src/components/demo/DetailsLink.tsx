import { Pressable, StyleSheet, Text } from 'react-native';

import { MATCH_DETAILS_LINK_TEXT } from '../../constants/matchCardDetails';

type DetailsLinkProps = {
  onPress: () => void;
};

export function DetailsLink({ onPress }: DetailsLinkProps) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Details"
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={styles.text}>Details {'>'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  text: MATCH_DETAILS_LINK_TEXT,
  pressed: {
    opacity: 0.85,
  },
});
