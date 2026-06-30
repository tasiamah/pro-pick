import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import type { Match } from '../../api/types';
import { useMatchNotificationsStore } from '../../store/matchNotificationsStore';
import { colors } from '../../theme';
import { formatMatchTeams } from '../../utils/matchDisplay';
import {
  MORE_MATCH_NOTIFICATIONS,
  POPULAR_MATCH_NOTIFICATIONS,
  type MatchNotificationOption,
} from './matchNotificationTypes';

const MODAL_WIDTH = 400;
const MODAL_MAX_HEIGHT_RATIO = 0.88;
const HEADER_BLOCK_HEIGHT = 132;
const ROW_ICON_WIDTH = 24;

const modalColors = {
  overlay: 'rgba(0, 0, 0, 0.85)',
  sheet: '#111827',
  sheetBorder: '#1E293B',
  subtitle: '#94A3B8',
  sectionLabel: '#64748B',
  row: '#1F2937',
  infoBannerBg: '#0F172A',
  infoBannerBorder: '#1D4ED8',
  infoBannerText: '#60A5FA',
  toggleTrackOff: '#64748B',
  toggleTrackOn: '#22C55E',
  toggleThumb: '#FFFFFF',
  closeIcon: '#64748B',
} as const;

type MatchNotificationsModalProps = {
  match: Match;
  visible: boolean;
  onClose: () => void;
};

type NotificationSwitchProps = {
  enabled: boolean;
  label: string;
  onToggle: () => void;
};

function NotificationSwitch({ enabled, label, onToggle }: NotificationSwitchProps) {
  return (
    <Pressable
      accessibilityLabel={`${label} notifications`}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      onPress={onToggle}
      style={[styles.toggleTrack, enabled && styles.toggleTrackOn]}
    >
      <View style={[styles.toggleThumb, enabled && styles.toggleThumbOn]} />
    </Pressable>
  );
}

type NotificationRowIconProps = {
  option: MatchNotificationOption;
};

function NotificationRowIcon({ option }: NotificationRowIconProps) {
  if (option.emoji) {
    return (
      <View style={styles.rowIconSlot}>
        <Text style={styles.rowEmoji}>{option.emoji}</Text>
      </View>
    );
  }

  return (
    <View style={styles.rowIconSlot}>
      <Ionicons
        name={option.icon ?? 'ellipse-outline'}
        size={option.iconSize ?? 20}
        color={option.iconColor ?? '#FFFFFF'}
      />
    </View>
  );
}

type NotificationToggleRowProps = {
  matchId: number;
  option: MatchNotificationOption;
};

function NotificationToggleRow({ matchId, option }: NotificationToggleRowProps) {
  const enabled = useMatchNotificationsStore(
    (state) => state.getSettings(matchId)[option.key],
  );
  const toggleSetting = useMatchNotificationsStore((state) => state.toggleSetting);

  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeading}>
        <NotificationRowIcon option={option} />
        <Text style={styles.toggleLabel}>{option.label}</Text>
      </View>
      <NotificationSwitch
        enabled={enabled}
        label={option.label}
        onToggle={() => toggleSetting(matchId, option.key)}
      />
    </View>
  );
}

type NotificationSectionProps = {
  matchId: number;
  options: MatchNotificationOption[];
  title: string;
};

function NotificationSection({ matchId, options, title }: NotificationSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.rows}>
        {options.map((option) => (
          <NotificationToggleRow key={option.key} matchId={matchId} option={option} />
        ))}
      </View>
    </View>
  );
}

export function MatchNotificationsModal({
  match,
  visible,
  onClose,
}: MatchNotificationsModalProps) {
  const { width, height } = useWindowDimensions();
  const hydrateMatchPreferences = useMatchNotificationsStore(
    (state) => state.hydrateMatchPreferences,
  );
  const sheetWidth = Math.min(width - 48, MODAL_WIDTH);
  const sheetMaxHeight = height * MODAL_MAX_HEIGHT_RATIO;
  const scrollMaxHeight = Math.max(sheetMaxHeight - HEADER_BLOCK_HEIGHT, 160);

  useEffect(() => {
    if (!visible) {
      return;
    }

    void hydrateMatchPreferences(match.id);
  }, [hydrateMatchPreferences, match.id, visible]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Close match notifications"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { maxHeight: sheetMaxHeight, width: sheetWidth }]}
        >
          <View style={styles.headerBlock}>
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.bellIconWrap}>
                  <Ionicons color={colors.primary} name="notifications-outline" size={20} />
                </View>
                <View style={styles.titleStack}>
                  <Text style={styles.title}>Match Notifications</Text>
                  <Text style={styles.matchTitle}>
                    {formatMatchTeams(match.home_team, match.away_team)}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel="Close"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Ionicons color={modalColors.closeIcon} name="close" size={22} />
              </Pressable>
            </View>

            <View style={styles.infoBanner}>
              <Ionicons
                color={modalColors.infoBannerText}
                name="information-circle-outline"
                size={16}
              />
              <Text style={styles.infoBannerText}>Settings apply to this match only</Text>
            </View>
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            style={[styles.scrollView, { maxHeight: scrollMaxHeight }]}
          >
            <NotificationSection
              matchId={match.id}
              options={POPULAR_MATCH_NOTIFICATIONS}
              title="POPULAR"
            />
            <NotificationSection
              matchId={match.id}
              options={MORE_MATCH_NOTIFICATIONS}
              title="MORE"
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: modalColors.overlay,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: modalColors.sheet,
    borderColor: modalColors.sheetBorder,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
    zIndex: 1,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 24px 64px rgba(0, 0, 0, 0.65)' } as object)
      : null),
  },
  headerBlock: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingRight: 12,
  },
  bellIconWrap: {
    height: 24,
    justifyContent: 'center',
    marginTop: 1,
  },
  titleStack: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  matchTitle: {
    color: modalColors.subtitle,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  closeButton: {
    marginTop: 0,
    padding: 2,
  },
  infoBanner: {
    alignItems: 'center',
    backgroundColor: modalColors.infoBannerBg,
    borderColor: modalColors.infoBannerBorder,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoBannerText: {
    color: modalColors.infoBannerText,
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    gap: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: modalColors.sectionLabel,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  rows: {
    gap: 4,
  },
  toggleRow: {
    alignItems: 'center',
    backgroundColor: modalColors.row,
    borderRadius: 8,
    flexDirection: 'row',
    height: 52,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  toggleLeading: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 12,
    marginRight: 12,
  },
  rowIconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ROW_ICON_WIDTH,
  },
  rowEmoji: {
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
  },
  toggleLabel: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  toggleTrack: {
    backgroundColor: modalColors.toggleTrackOff,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    padding: 2,
    width: 48,
  },
  toggleTrackOn: {
    backgroundColor: modalColors.toggleTrackOn,
  },
  toggleThumb: {
    alignSelf: 'flex-start',
    backgroundColor: modalColors.toggleThumb,
    borderRadius: 12,
    height: 24,
    width: 24,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  pressed: {
    opacity: 0.85,
  },
});
