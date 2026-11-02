/** One weighted input to an Aura Radar area, kept so the UI can explain every score. */
export interface RadarFactor {
  key: string;
  label: string;
  /** 0–1 quality, or null when there is no data for it (its weight is then redistributed). */
  value: number | null;
  weight: number;
  /** Human-readable measurement, e.g. "18 of 40 sessions". */
  detail?: string;
  current?: number;
  target?: number;
}

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Weighted average of the factors that have data; null when none do. */
export function weightedFactors(factors: { value: number | null; weight: number }[]): number | null {
  const present = factors.filter((f) => f.value !== null);
  const w = present.reduce((s, f) => s + f.weight, 0);
  return w ? present.reduce((s, f) => s + (f.value as number) * f.weight, 0) / w : null;
}
