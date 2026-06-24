import type { ReactNode } from 'react';

import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

type AsyncStateProps = {
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
  children: ReactNode;
  loadingMessage?: string;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
};

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

  if (error) {
    return (
      <ErrorState message={errorMessage ?? error.message} onRetry={onRetry} />
    );
  }

  if (isEmpty) {
    return <EmptyState message={emptyMessage} />;
  }

  return children;
}
