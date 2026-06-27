import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DISCLAIMER_TEXT } from '../constants/disclaimer';
import { BOOKMAKER_INDEPENDENCE_TEXT, RESPONSIBLE_PLAY_TEXT } from '../constants/legal';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii, screenStyles, spacing, typography } from '../theme';

type LegalSectionProps = {
  title: string;
  body: string;
};

function LegalSection({ title, body }: LegalSectionProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

export function AboutScreen({ navigation }: Props) {
  return (
    <ScrollView style={screenStyles.screenContainer} contentContainerStyle={screenStyles.stackContent}>
      <LegalSection title="Entertainment only" body={DISCLAIMER_TEXT} />
      <LegalSection title="18+ and responsible play" body={RESPONSIBLE_PLAY_TEXT} />
      <LegalSection title="Independent analysis" body={BOOKMAKER_INDEPENDENCE_TEXT} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Privacy</Text>
        <Text style={styles.cardBody}>
          Learn what data Pro Pick collects and how it is used.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Read the full privacy policy"
          onPress={() => navigation.navigate('PrivacyPolicy')}
          style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
        >
          <Text style={styles.linkText}>Read more {'>'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.bodySemibold,
    color: colors.text,
  },
  cardBody: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  link: {
    alignSelf: 'flex-start',
  },
  linkText: {
    ...typography.bodySemibold,
    color: colors.primary,
  },
  linkPressed: {
    opacity: 0.85,
  },
});
