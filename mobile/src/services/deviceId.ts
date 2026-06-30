import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'pro-pick-device-id';

function createDeviceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const deviceId = createDeviceId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}
