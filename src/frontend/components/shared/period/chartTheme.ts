import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(ArcElement, BarController, BarElement, CategoryScale, Filler, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip);

// Mirrors of tokens.css values (canvas charts cannot read CSS variables directly).
export const CHART_COLORS = {
  period: '#f3aeff', // --color-tertiary
  primary: '#8b5cf6', // --color-primary
  primaryToken: '#d0bcff', // --color-primary-token
  secondary: '#cebdff', // --color-secondary
  outline: '#958ea0', // --color-outline
  grid: 'rgba(203, 195, 215, 0.15)',
  text: 'rgba(203, 195, 215, 0.85)',
};

export const PALETTE = [
  '#8b5cf6', // --color-primary
  '#d0bcff', // --color-primary-token
  '#f3aeff', // --color-tertiary
  '#a78bfa', // --color-secondary-accent
  '#a078ff', // --color-primary-container
  '#b979c6', // --color-tertiary-container
  '#6d3bd7', // --color-inverse-primary
  '#cebdff', // --color-secondary
  '#4f319c', // --color-secondary-container
  '#4ade80', // --color-success
  '#ffb4ab', // --color-error
  '#958ea0', // --color-outline
];

export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const isLight = () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';

// Scriptable colours are re-read on every draw, so charts follow the active theme.
export const baseScale = {
  grid: { color: () => (isLight() ? 'rgba(60, 50, 80, 0.12)' : CHART_COLORS.grid) },
  ticks: { color: () => (isLight() ? '#3b3843' : CHART_COLORS.text) },
  border: { color: 'rgba(150, 140, 170, 0.25)' },
};
