import { Bar } from 'react-chartjs-2';
import { CHART_COLORS, baseScale, withAlpha } from '../period/chartTheme';

interface Props {
  points: { label: string; value: number }[];
  valueLabel: string;
  ariaLabel: string;
  height?: number;
}

/** Simple themed bar chart for weekly/daily counts. */
export default function TrendBars({ points, valueLabel, ariaLabel, height = 180 }: Props) {
  return (
    <div style={{ position: 'relative', height }}>
      <Bar
        role="img"
        aria-label={ariaLabel}
        data={{
          labels: points.map((p) => p.label),
          datasets: [{ label: valueLabel, data: points.map((p) => p.value), backgroundColor: withAlpha(CHART_COLORS.primary, 0.8), borderRadius: 6 }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: baseScale, y: { ...baseScale, beginAtZero: true, ticks: { ...baseScale.ticks, precision: 0 } } },
        }}
      />
    </div>
  );
}
