import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '../api/client';
import { getDeviceId } from './deviceId';

async function configureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('match-events', {
    name: 'Match events',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#00ff88',
  });
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getExpoProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
}

export async function ensurePushPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  if (!Device.isDevice) {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) {
    return null;
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    console.warn(
      'Missing EAS projectId in app.json (extra.eas.projectId). Push tokens require an Expo project.',
    );
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export async function registerPushTokenWithBackend(): Promise<string | null> {
  const granted = await ensurePushPermissions();
  if (!granted) {
    return null;
  }

  await configureAndroidNotificationChannel();

  const expoPushToken = await getExpoPushToken();
  if (!expoPushToken) {
    return null;
  }

  const deviceId = await getDeviceId();
  await api.registerPushToken({
    device_id: deviceId,
    expo_push_token: expoPushToken,
    platform: Platform.OS,
  });

  return expoPushToken;
}

export type NotificationTapPayload = {
  matchId?: string;
  eventType?: string;
};

export function parseNotificationPayload(
  data: Record<string, unknown> | undefined,
): NotificationTapPayload {
  if (!data) {
    return {};
  }

  const matchId = data.matchId;
  const eventType = data.eventType;

  return {
    matchId: typeof matchId === 'string' ? matchId : undefined,
    eventType: typeof eventType === 'string' ? eventType : undefined,
  };
}

export async function getInitialNotificationPayload(): Promise<NotificationTapPayload | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) {
    return null;
  }

  const payload = parseNotificationPayload(
    response.notification.request.content.data as Record<string, unknown>,
  );
  return payload.matchId ? payload : null;
}
