export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!configured) {
    throw new Error('EXPO_PUBLIC_API_URL is required');
  }
  return configured.replace(/\/+$/, '');
}
