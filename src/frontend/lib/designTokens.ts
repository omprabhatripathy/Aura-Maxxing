/** Shared design tokens for JS (CSS mirrors these in styles/tokens.css + styles/responsive.css). */
export const BREAKPOINTS = {
  /** Tablet starts here; anything narrower is mobile. */
  tablet: 768,
  desktop: 1200,
} as const;

export type Device = 'mobile' | 'tablet' | 'desktop';

export const MEDIA = {
  tablet: `(min-width: ${BREAKPOINTS.tablet}px)`,
  desktop: `(min-width: ${BREAKPOINTS.desktop}px)`,
  reducedMotion: '(prefers-reduced-motion: reduce)',
} as const;

export const SIDEBAR = {
  expanded: 248,
  collapsed: 76,
  storageKey: 'aura-sidebar-collapsed',
} as const;

export const MOTION = {
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  fast: 0.18,
  base: 0.32,
  slow: 0.55,
  stagger: 0.06,
} as const;
