import type { ReactNode } from 'react';

import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

type AsyncStateProps = {
  isLoading: boolean;
  error: unknown;
  isEmpty: boolean;
  children: ReactNode;
  loadingMessage?: string;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
};

function getErrorMessage(error: unknown, fallback?: string): string {
  if (fallback) {
    return fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error) {
    return error;
  }

  return 'Something went wrong';
}

export function AsyncState({
  isLoading,
  error,
  isEmpty,
  children,
  loadingMessage,
  emptyMessage,
  errorMessage,
  onRetry,
}: AsyncStateProps) {
  if (isLoading) {
    return <LoadingState message={loadingMessage} />;
  }

  if (error != null) {
    return (
      <ErrorState message={getErrorMessage(error, errorMessage)} onRetry={onRetry} />
    );
  }

  if (isEmpty) {
    return <EmptyState message={emptyMessage} />;
  }

  return children;
}
