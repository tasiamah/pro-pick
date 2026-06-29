import { focusManager } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

export function setupQueryFocusManager(): () => void {
  if (Platform.OS === 'web') {
    return () => {};
  }

  const onChange = (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active');
  };

  const subscription = AppState.addEventListener('change', onChange);
  return () => subscription.remove();
}
