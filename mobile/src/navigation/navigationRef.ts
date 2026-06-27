import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let aboutRequestPending = false;

export function openAbout() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('About');
    return;
  }
  // The disclaimer banner is pressable before the container mounts; remember the
  // request so a cold-start tap still reaches the compliance copy once ready.
  aboutRequestPending = true;
}

export function flushPendingNavigation() {
  if (aboutRequestPending && navigationRef.isReady()) {
    aboutRequestPending = false;
    navigationRef.navigate('About');
  }
}
