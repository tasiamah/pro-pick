import { getApiBaseUrl } from './config';
import type {
  Analytics,
  Dashboard,
  Match,
  MatchDetail,
  MatchListParams,
  Prediction,
  PredictionListParams,
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
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

  getMatches(params: MatchListParams = {}): Promise<Match[]> {
    return request<Match[]>(`/matches${buildQueryString(params)}`);
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
};
