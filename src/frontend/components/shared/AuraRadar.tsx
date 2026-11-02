import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartDataset,
  type ChartOptions,
  type ScriptableContext,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { AREA_LABELS, AREAS } from '../../../backend/analytics/radar';
import type { RadarScores } from '../../../backend/models';
import { scoreBand } from '../../lib/auraMeta';
import './AuraRadar.css';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type Area = keyof RadarScores;

export interface RadarOverlay {
  label: string;
  scores: RadarScores;
  color: string;
}

interface AuraRadarProps {
  current: RadarScores;
  previous?: RadarScores;
  /** Extra comparison datasets drawn as dashed outlines (e.g. last month, best month). */
  overlays?: RadarOverlay[];
  maxWidth?: number;
  size?: 'compact' | 'large';
  coverage?: Record<Area, boolean>;
  /** Extra tooltip text per area. */
  notes?: Partial<Record<Area, string>>;
  activeArea?: Area | null;
  onSelectArea?: (area: Area) => void;
  currentLabel?: string;
}

const UNTRACKED = 'rgba(160, 155, 175, 0.55)';

/** Tooltips don't wrap, so long notes are split into lines. */
function wrap(text: string, width = 46): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if ((line + ' ' + word).trim().length > width && line) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines;
}

function auraGradient(ctx: ScriptableContext<'radar'>): CanvasGradient | string {
  const { chart } = ctx;
  const scale = chart.scales.r as RadialLinearScale | undefined;
  // The scale has no geometry until the first layout pass.
  if (!chart.chartArea || !scale || ![scale.xCenter, scale.yCenter, scale.drawingArea].every(Number.isFinite)) return 'rgba(139, 92, 246, 0.25)';
  const g = chart.ctx.createRadialGradient(scale.xCenter, scale.yCenter, 0, scale.xCenter, scale.yCenter, Math.max(1, scale.drawingArea));
  g.addColorStop(0, 'rgba(34, 211, 238, 0.12)');
  g.addColorStop(0.55, 'rgba(139, 92, 246, 0.3)');
  g.addColorStop(1, 'rgba(244, 114, 182, 0.45)');
  return g;
}

export default function AuraRadar({ current, previous, overlays = [], maxWidth = 320, size = 'compact', coverage, notes, activeArea = null, onSelectArea, currentLabel = 'Last 30 days' }: AuraRadarProps) {
  const large = size === 'large';
  const covered = (a: Area) => coverage?.[a] ?? true;
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const datasets: ChartDataset<'radar', number[]>[] = [
    {
      label: currentLabel,
      data: AREAS.map((k) => current[k]),
      backgroundColor: auraGradient,
      borderColor: 'rgba(167, 139, 250, 1)',
      borderWidth: large ? 2.5 : 2,
      pointBackgroundColor: AREAS.map((k) => (covered(k) ? scoreBand(current[k]).color : UNTRACKED)),
      pointBorderColor: 'rgba(15, 12, 25, 0.9)',
      pointBorderWidth: 1.5,
      pointRadius: AREAS.map((k) => (k === activeArea ? (large ? 8 : 5) : large ? 5 : 3)),
      pointHoverRadius: large ? 9 : 6,
      fill: true,
      order: 0,
    },
  ];
  if (previous) {
    datasets.push({
      label: 'Previous 30 days',
      data: AREAS.map((k) => previous[k]),
      backgroundColor: 'rgba(203, 195, 215, 0.08)',
      borderColor: 'rgba(203, 195, 215, 0.6)',
      borderWidth: 1,
      pointRadius: 0,
      order: 1,
    });
  }
  overlays.forEach((o, i) => {
    datasets.push({
      label: o.label,
      data: AREAS.map((k) => o.scores[k]),
      backgroundColor: `${o.color}12`,
      borderColor: o.color,
      borderWidth: 1.5,
      borderDash: [6, 4],
      pointRadius: large ? 2.5 : 0,
      pointBackgroundColor: o.color,
      pointHoverRadius: 5,
      fill: true,
      order: 2 + i,
    });
  });

  const labels = AREAS.map((k) => (large ? AREA_LABELS[k] : AREA_LABELS[k].includes(' ') ? AREA_LABELS[k].split(' ') : AREA_LABELS[k]));

  const options: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1,
    animation: reduceMotion ? false : { duration: large ? 1300 : 900, easing: 'easeOutQuart' },
    interaction: { mode: 'nearest', intersect: false },
    layout: { padding: large ? 6 : 2 },
    onClick: (_evt, elements) => {
      if (onSelectArea && elements.length) onSelectArea(AREAS[elements[0].index]);
    },
    onHover: (evt, elements) => {
      const target = evt.native?.target as HTMLElement | undefined;
      if (target && onSelectArea) target.style.cursor = elements.length ? 'pointer' : 'default';
    },
    plugins: {
      legend: {
        display: datasets.length > 1,
        position: 'bottom',
        labels: { color: 'rgba(203, 195, 215, 0.9)', usePointStyle: true, boxWidth: 8, padding: 14 },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 13, 30, 0.95)',
        borderColor: 'rgba(167, 139, 250, 0.4)',
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 13, weight: 'bold' },
        callbacks: {
          title: (items) => AREA_LABELS[AREAS[items[0].dataIndex]],
          label: (item) => {
            const area = AREAS[item.dataIndex];
            const value = item.raw as number;
            if (item.datasetIndex === 0 && !covered(area)) return `${item.dataset.label}: no data yet`;
            return `${item.dataset.label}: ${value}${item.datasetIndex === 0 ? ` · ${scoreBand(value).label}` : ''}`;
          },
          afterBody: (items) => {
            const note = notes?.[AREAS[items[0].dataIndex]];
            return note ? ['', ...wrap(note)] : [];
          },
        },
      },
    },
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: { display: large, stepSize: 25, backdropColor: 'transparent', color: 'rgba(203, 195, 215, 0.4)', font: { size: 9 } },
        grid: { color: (ctx) => (ctx.index % 2 ? 'rgba(203, 195, 215, 0.1)' : 'rgba(203, 195, 215, 0.18)'), circular: large },
        angleLines: { color: 'rgba(203, 195, 215, 0.15)' },
        pointLabels: {
          padding: large ? 12 : 6,
          color: large ? (ctx) => (covered(AREAS[ctx.index]) ? scoreBand(current[AREAS[ctx.index]]).color : UNTRACKED) : 'rgba(203, 195, 215, 0.85)',
          font: (ctx) => (large ? { size: ctx.chart.width < 340 ? 10 : ctx.chart.width < 480 ? 12 : 13, weight: 600 } : { size: ctx.chart.width < 260 ? 9 : 11 }),
          callback: large ? (label, index) => [label, covered(AREAS[index]) ? String(current[AREAS[index]]) : '—'] : undefined,
        },
      },
    },
  };

  return (
    <div className={`aura-radar${large ? ' aura-radar--large' : ''}`} style={{ maxWidth }}>
      <Radar data={{ labels, datasets }} options={options} aria-label="Aura radar chart" role="img" />
    </div>
  );
}
