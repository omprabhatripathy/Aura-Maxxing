import { Line } from 'react-chartjs-2';
import { CHART_COLORS, baseScale } from '../period/chartTheme';

interface Series {
  label: string;
  values: (number | null)[];
  color?: string;
}

interface Props {
  labels: string[];
  series: Series[];
  min?: number;
  max?: number;
  ariaLabel: string;
  height?: number;
}

/** Line chart that leaves gaps for missing values instead of interpolating them. */
export default function TrendLine({ labels, series, min = 0, max, ariaLabel, height = 220 }: Props) {
  const palette = [CHART_COLORS.primary, CHART_COLORS.period, CHART_COLORS.primaryToken];
  return (
    <div style={{ position: 'relative', height }}>
      <Line
        role="img"
        aria-label={ariaLabel}
        data={{
          labels,
          datasets: series.map((s, i) => ({
            label: s.label,
            data: s.values,
            borderColor: s.color ?? palette[i % palette.length],
            backgroundColor: s.color ?? palette[i % palette.length],
            spanGaps: false,
            tension: 0.25,
            pointRadius: 3,
          })),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: series.length > 1, labels: { color: CHART_COLORS.text, boxWidth: 12 } } },
          scales: { x: { ...baseScale, ticks: { ...baseScale.ticks, maxTicksLimit: 8 } }, y: { ...baseScale, min, max } },
        }}
      />
    </div>
  );
}
