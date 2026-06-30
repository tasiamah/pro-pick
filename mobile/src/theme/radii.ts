export const radii = {
  sm: 8,
  md: 12,
  pill: 999,
} as const;

export type RadiiName = keyof typeof radii;
