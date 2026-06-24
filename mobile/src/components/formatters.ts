export function formatKickoff(kickoff: string | null): string {
  if (!kickoff) {
    return 'Kickoff TBD';
  }

  const date = new Date(kickoff);
  if (Number.isNaN(date.getTime())) {
    return 'Kickoff TBD';
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatOutcome(outcome: string): string {
  return outcome.charAt(0).toUpperCase() + outcome.slice(1);
}

export function formatOdd(value: number): string {
  return value.toFixed(2);
}
