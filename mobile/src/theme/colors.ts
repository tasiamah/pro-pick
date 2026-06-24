export const colors = {
  background: '#0a0e14',
  surface: '#111827',
  card: '#161b22',
  cardElevated: '#0d1117',
  border: '#1f2937',
  primary: '#00ff88',
  text: '#ffffff',
  textMuted: '#9ca3af',
  win: '#22c55e',
  loss: '#ef4444',
  draw: '#6b7280',
  oddsLow: '#00ff88',
  oddsMedium: '#eab308',
  oddsHigh: '#f97316',
  buttonBackground: '#1f2937',
} as const;

export type ColorName = keyof typeof colors;
