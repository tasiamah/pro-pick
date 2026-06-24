import {
  getErrorMessage,
  isInitialQueryLoad,
  queryErrorForDisplay,
} from './queryState';

describe('queryState', () => {
  it('detects initial query loading', () => {
    expect(isInitialQueryLoad(true, undefined)).toBe(true);
    expect(isInitialQueryLoad(true, [])).toBe(false);
    expect(isInitialQueryLoad(false, undefined)).toBe(false);
  });

  it('shows query errors only without cached data', () => {
    const error = new Error('Network failed');

    expect(queryErrorForDisplay(error, undefined)).toBe(error);
    expect(queryErrorForDisplay(error, { id: 1 })).toBeNull();
    expect(queryErrorForDisplay(null, undefined)).toBeNull();
  });

  it('formats error messages', () => {
    expect(getErrorMessage(new Error('Request failed'))).toBe('Request failed');
    expect(getErrorMessage('Offline')).toBe('Offline');
    expect(getErrorMessage(null, 'Fallback')).toBe('Fallback');
  });
});
