import { useSyncExternalStore } from 'react';
import { MEDIA, type Device } from '../lib/designTokens';

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  };
}

const subscribeTablet = subscribeMedia(MEDIA.tablet);
const subscribeDesktop = subscribeMedia(MEDIA.desktop);
const subscribeMotion = subscribeMedia(MEDIA.reducedMotion);

const matches = (query: string) => () => typeof window !== 'undefined' && window.matchMedia(query).matches;
const isTablet = matches(MEDIA.tablet);
const isDesktop = matches(MEDIA.desktop);
const isReduced = matches(MEDIA.reducedMotion);
const serverFalse = () => false;

/** Current device class, read synchronously so the first paint already uses the right shell. */
export function useDevice(): Device {
  const tablet = useSyncExternalStore(subscribeTablet, isTablet, serverFalse);
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, serverFalse);
  return desktop ? 'desktop' : tablet ? 'tablet' : 'mobile';
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeMotion, isReduced, serverFalse);
}

export interface ResponsiveLayout {
  device: Device;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** True on tablet + desktop, where the web shell renders. */
  isWeb: boolean;
  /** Suggested widget columns for dashboard-style grids. */
  columns: 1 | 2 | 4;
  reducedMotion: boolean;
}

export function useResponsiveLayout(): ResponsiveLayout {
  const device = useDevice();
  const reducedMotion = usePrefersReducedMotion();
  return {
    device,
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
    isWeb: device !== 'mobile',
    columns: device === 'desktop' ? 4 : device === 'tablet' ? 2 : 1,
    reducedMotion,
  };
}
