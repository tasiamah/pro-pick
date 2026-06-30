import { getApiBaseUrl } from './config';
import type {
  Analytics,
  Dashboard,
  MatchDetail,
  MatchListParams,
  MatchNotificationSettings,
  Prediction,
  PredictionListParams,
  PushTokenRegisterRequest,
  PushTokenRegisterResponse,
  ValueBet,
  ValueBetListParams,
} from './types';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function buildQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

export const REQUEST_TIMEOUT_MS = 45000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : null),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      let message = response.statusText;

      try {
        const body = (await response.json()) as { detail?: unknown };
        if (typeof body.detail === 'string') {
          message = body.detail;
        }
      } catch {}

      throw new ApiError(response.status, message);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  getDashboard(): Promise<Dashboard> {
    return request<Dashboard>('/dashboard');
  },

  getMatches(params: MatchListParams = {}): Promise<MatchDetail[]> {
    return request<MatchDetail[]>(`/matches${buildQueryString(params)}`);
  },

  getMatch(matchId: number): Promise<MatchDetail> {
    return request<MatchDetail>(`/matches/${matchId}`);
  },

  getPredictions(params: PredictionListParams = {}): Promise<Prediction[]> {
    return request<Prediction[]>(`/predictions${buildQueryString(params)}`);
  },

  getValueBets(params: ValueBetListParams = {}): Promise<ValueBet[]> {
    return request<ValueBet[]>(`/value-bets${buildQueryString(params)}`);
  },

  getAnalytics(): Promise<Analytics> {
    return request<Analytics>('/analytics');
  },

  registerPushToken(payload: PushTokenRegisterRequest): Promise<PushTokenRegisterResponse> {
    return request<PushTokenRegisterResponse>('/notifications/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getNotificationPreferences(
    deviceId: string,
    matchId: number,
  ): Promise<MatchNotificationSettings> {
    return request<MatchNotificationSettings>(
      `/notifications/preferences?device_id=${encodeURIComponent(deviceId)}&match_id=${matchId}`,
    );
  },

  saveNotificationPreferences(payload: {
    device_id: string;
    match_id: number;
    settings: Record<string, boolean>;
  }): Promise<MatchNotificationSettings> {
    return request<MatchNotificationSettings>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
