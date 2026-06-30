import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from './src/api/queryClient';
import { setupQueryFocusManager } from './src/api/setupQueryFocusManager';
import { DisclaimerBanner } from './src/components';
import { flushPendingNavigation, navigationRef, openMatchDetail } from './src/navigation/navigationRef';
import { RootStackNavigator } from './src/navigation/RootStackNavigator';
import {
  getInitialNotificationPayload,
  parseNotificationPayload,
  registerPushTokenWithBackend,
} from './src/services/pushNotifications';
import { colors } from './src/theme';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    primary: colors.primary,
    text: colors.text,
  },
};

export default function App() {
  useEffect(() => setupQueryFocusManager(), []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    void registerPushTokenWithBackend();

    void getInitialNotificationPayload().then((payload) => {
      if (payload?.matchId) {
        openMatchDetail(payload.matchId);
      }
    });

    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      // Foreground notifications are handled by setNotificationHandler.
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const payload = parseNotificationPayload(
          response.notification.request.content.data as Record<string, unknown>,
        );
        if (payload.matchId) {
          openMatchDetail(payload.matchId);
        }
      },
    );

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View style={styles.app}>
          <DisclaimerBanner />
          <View style={styles.navigation}>
            <NavigationContainer
              ref={navigationRef}
              theme={navigationTheme}
              onReady={flushPendingNavigation}
            >
              <RootStackNavigator />
            </NavigationContainer>
          </View>
          <StatusBar style="light" />
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    backgroundColor: colors.background,
    flex: 1,
  },
  navigation: {
    flex: 1,
  },
});
