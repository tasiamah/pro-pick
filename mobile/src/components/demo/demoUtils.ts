export type FormResult = 'W' | 'D' | 'L';

export type OddsTier = 'low' | 'medium' | 'high';

export type OddsMovement = 'up' | 'down' | 'flat';

export type ValueStatus = 'overpriced' | 'weak' | 'fair' | 'value';

export function classifyOddsTier(decimalOdd: number): OddsTier {
  if (decimalOdd < 2) {
    return 'low';
  }

  if (decimalOdd < 3.5) {
    return 'medium';
  }

  return 'high';
}

export function formatOddsTierLabel(tier: OddsTier): string {
  if (tier === 'low') {
    return 'LOW ODDS';
  }

  if (tier === 'medium') {
    return 'MEDIUM ODDS';
  }

  return 'HIGH ODDS';
}

export function formatValueStatusLabel(status: ValueStatus): string {
  if (status === 'overpriced') {
    return 'Overpriced';
  }

  if (status === 'weak') {
    return 'Weak';
  }

  if (status === 'value') {
    return 'Value Bet Detected';
  }

  return 'Fair';
}

export function clampPercentage(value: number): number {
  return Math.min(100, Math.max(0, value));
}
