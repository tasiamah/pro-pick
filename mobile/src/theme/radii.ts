export const radii = {
  sm: 8,
  md: 12,
} as const;

export type RadiiName = keyof typeof radii;
