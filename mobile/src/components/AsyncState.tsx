import type { ReactNode } from 'react';

import { getErrorMessage } from '../utils/queryState';
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
  emptySubtext?: string;
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
  emptySubtext,
  errorMessage,
  onRetry,
}: AsyncStateProps) {
  if (isLoading) {
    return <LoadingState message={loadingMessage} />;
  }

  if (error != null) {
    return (
      <ErrorState
        message={getErrorMessage(error, errorMessage ?? 'Something went wrong')}
        onRetry={onRetry}
      />
    );
  }

  if (isEmpty) {
    return <EmptyState message={emptyMessage} subtext={emptySubtext} />;
  }

  return children;
}
