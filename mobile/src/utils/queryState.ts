export function isInitialQueryLoad(isLoading: boolean, data: unknown): boolean {
  return isLoading && data == null;
}

type MatchesBrowseLoadingParams = {
  isInitialLoad: boolean;
  isPlaceholderData: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean | undefined;
  visibleMatchCount: number;
  hasCachedResults?: boolean;
};

/**
 * Avoid flashing an empty state while a tab switch or paginated fetch is still
 * resolving. Once every page is in and nothing qualifies, callers may show empty.
 */
export function isMatchesBrowseLoading({
  isInitialLoad,
  isPlaceholderData,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  visibleMatchCount,
  hasCachedResults = false,
}: MatchesBrowseLoadingParams): boolean {
  if (hasCachedResults) {
    return false;
  }

  if (isInitialLoad) {
    return true;
  }

  if (isPlaceholderData && visibleMatchCount === 0) {
    return true;
  }

  if (visibleMatchCount > 0) {
    return false;
  }

  return isFetching || isFetchingNextPage || hasNextPage === true;
}

export function queryErrorForDisplay(error: unknown, data: unknown): unknown {
  if (error != null && data == null) {
    return error;
  }

  return null;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error) {
    return error;
  }

  return fallback;
}
