export function isInitialQueryLoad(isLoading: boolean, data: unknown): boolean {
  return isLoading && data == null;
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
