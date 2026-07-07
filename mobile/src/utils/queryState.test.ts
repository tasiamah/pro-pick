import {
  getErrorMessage,
  isInitialQueryLoad,
  isMatchesBrowseLoading,
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

  it('keeps matches browse in loading until visible rows or paging finishes', () => {
    const base = {
      isInitialLoad: false,
      isPlaceholderData: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false as boolean | undefined,
      visibleMatchCount: 0,
    };

    expect(isMatchesBrowseLoading({ ...base, isInitialLoad: true })).toBe(true);
    expect(
      isMatchesBrowseLoading({ ...base, isPlaceholderData: true }),
    ).toBe(true);
    expect(
      isMatchesBrowseLoading({ ...base, visibleMatchCount: 2 }),
    ).toBe(false);
    expect(
      isMatchesBrowseLoading({ ...base, hasCachedResults: true }),
    ).toBe(false);
    expect(
      isMatchesBrowseLoading({ ...base, isFetching: true }),
    ).toBe(true);
    expect(
      isMatchesBrowseLoading({ ...base, isFetchingNextPage: true }),
    ).toBe(true);
    expect(
      isMatchesBrowseLoading({ ...base, hasNextPage: true }),
    ).toBe(true);
    expect(isMatchesBrowseLoading(base)).toBe(false);
  });
});
