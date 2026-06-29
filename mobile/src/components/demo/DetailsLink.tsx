import { Pressable, StyleSheet, Text } from 'react-native';

import { MATCH_DETAILS_LINK_TEXT } from '../../constants/matchCardDetails';

type DetailsLinkProps = {
  onPress: () => void;
  compact?: boolean;
};

export function DetailsLink({ onPress, compact = false }: DetailsLinkProps) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Details"
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={[styles.text, compact && styles.textCompact]}>Details {'>'}</Text>
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
  textCompact: {
    ...MATCH_DETAILS_LINK_TEXT,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.85,
  },
});
