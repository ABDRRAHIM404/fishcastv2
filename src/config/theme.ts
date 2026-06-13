/**
 * Central design tokens for FishCast V2 (dark ocean theme).
 *
 * These mirror the CSS variables declared in `globals.css`. Keep them in sync.
 * They are exported so non-CSS code (charts, map styles in later phases) can
 * reference the same palette without hardcoding values.
 */

export const themeTokens = {
  colors: {
    background: '202 47% 6%',
    foreground: '195 30% 92%',
    card: '203 40% 9%',
    primary: '190 85% 45%',
    secondary: '205 35% 18%',
    muted: '205 25% 14%',
    accent: '168 70% 45%',
    oceanGlow: '190 90% 50%',
    border: '205 30% 16%',
    ring: '190 85% 50%',
  },
  condition: {
    excellent: '152 65% 45%',
    good: '168 70% 45%',
    moderate: '38 92% 55%',
    poor: '0 72% 55%',
  },
  radius: '0.875rem',
} as const;

export type ThemeTokens = typeof themeTokens;
