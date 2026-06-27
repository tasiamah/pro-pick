import type { TextStyle } from 'react-native';

export const typography = {
  titleLarge: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodySemibold: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  labelStrong: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  micro: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0.3,
    lineHeight: 13,
  },
  metric: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  hero: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  badge: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.6,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
} satisfies Record<string, TextStyle>;

export type TypographyName = keyof typeof typography;
