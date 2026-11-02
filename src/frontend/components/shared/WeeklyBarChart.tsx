import './WeeklyBarChart.css';

interface WeeklyBarChartProps {
  /** null = nothing was scheduled that day (drawn as an empty slot, not 0%). */
  values: (number | null)[];
  labels: string[];
  height?: number;
}

export default function WeeklyBarChart({ values, labels, height = 96 }: WeeklyBarChartProps) {
  return (
    <div className="weekly-bars">
      <div className="weekly-bars__plot" style={{ height }} role="img" aria-label={labels.map((l, i) => `${l}: ${values[i] === null ? 'no habits' : `${values[i]}%`}`).join(', ')}>
        {values.map((pct, i) => (
          <div key={i} className="weekly-bars__col" title={`${labels[i]}: ${pct === null ? 'no habits scheduled' : `${pct}%`}`}>
            {pct !== null && <div className="weekly-bars__bar" style={{ height: `${Math.max(4, pct)}%` }} />}
          </div>
        ))}
      </div>
      <div className="weekly-bars__labels">
        {labels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
    </div>
  );
}
