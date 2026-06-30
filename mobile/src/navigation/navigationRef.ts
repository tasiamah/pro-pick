import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let aboutRequestPending = false;
let pendingMatchId: string | null = null;

export function openAbout() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('About');
    return;
  }
  // The disclaimer banner is pressable before the container mounts; remember the
  // request so a cold-start tap still reaches the compliance copy once ready.
  aboutRequestPending = true;
}

export function openMatchDetail(matchId: string) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Tabs', {
      screen: 'MatchesTab',
      params: {
        screen: 'MatchDetail',
        params: { matchId },
      },
    });
    return;
  }

  pendingMatchId = matchId;
}

export function flushPendingNavigation() {
  if (!navigationRef.isReady()) {
    return;
  }

  if (aboutRequestPending) {
    aboutRequestPending = false;
    navigationRef.navigate('About');
  }

  if (pendingMatchId) {
    const matchId = pendingMatchId;
    pendingMatchId = null;
    openMatchDetail(matchId);
  }
}
