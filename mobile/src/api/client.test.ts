import { api } from './client';

describe('api client', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;

  beforeAll(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns parsed JSON on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ matches_today: 3 }),
    });

    await expect(api.getDashboard()).resolves.toEqual({ matches_today: 3 });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/dashboard',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      }),
    );
  });

  it('appends query parameters for list endpoints', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await api.getMatches({ limit: 10, offset: 5 });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/matches?limit=10&offset=5',
      expect.any(Object),
    );
  });

  it('throws ApiError with FastAPI detail message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ detail: 'Match not found' }),
    });

    await expect(api.getMatch(99)).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Match not found',
      status: 404,
    });
  });
});
