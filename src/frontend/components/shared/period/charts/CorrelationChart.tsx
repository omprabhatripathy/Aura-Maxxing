import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import Card from '../../Card';
import SegmentedControl from '../../ui/SegmentedControl';
import { Select } from '../../ui/Field';
import { EmptyState } from '../../ui/Status';
import { CHART_COLORS, baseScale } from '../chartTheme';
import { formatDate } from '../../../../../backend/core/dates';
import { PAIN_KEY, moodSymptomCorrelation, rangeBounds, type RangeKey } from '../../../../../backend/period/analytics';
import type { Cycle } from '../../../../../backend/period/cycle';
import type { DailyLog } from '../../../../../backend/period/types';

const RANGES: { value: RangeKey; label: string }[] = [
  { value: 'month', label: '30 days' },
  { value: '90days', label: '90 days' },
  { value: 'all', label: 'All' },
];

interface Props {
  logs: DailyLog[];
  cycles: Cycle[];
  today: string;
  symptoms: string[];
}

export default function CorrelationChart({ logs, cycles, today, symptoms }: Props) {
  const options = [PAIN_KEY, ...symptoms];
  const [symptom, setSymptom] = useState(options[0]);
  const [range, setRange] = useState<RangeKey>('90days');
  const { from, to } = rangeBounds(range, today, cycles);
  const active = options.includes(symptom) ? symptom : options[0];
  const result = moodSymptomCorrelation(logs, active, from, to);
  const isPain = active === PAIN_KEY;
  const hasBoth = result.points.some((p) => p.mood !== null) && result.points.some((p) => p.severity !== null);

  return (
    <Card eyebrow="Chart E" title="Mood & symptom comparison" className="period-chart">
      <div className="period-chart__controls">
        <Select aria-label="Symptom to compare" options={options.map((s) => ({ value: s, label: s }))} value={active} onChange={setSymptom} />
        <SegmentedControl ariaLabel="Comparison range" options={RANGES} value={range} onChange={setRange} />
      </div>
      {!hasBoth ? (
        <EmptyState>Log both moods and “{active.toLowerCase()}” on some days to compare them.</EmptyState>
      ) : (
        <>
          <div className="period-chart__canvas">
            <Line
              role="img"
              aria-label={`Mood score compared with ${active} severity by date`}
              data={{
                labels: result.points.map((p) => formatDate(p.date)),
                datasets: [
                  {
                    label: 'Mood score (1–5)',
                    data: result.points.map((p) => p.mood),
                    borderColor: CHART_COLORS.primary,
                    backgroundColor: CHART_COLORS.primary,
                    showLine: false,
                    pointRadius: 5,
                    yAxisID: 'y',
                  },
                  {
                    label: `${active} severity (${isPain ? '0–10' : '1–5'})`,
                    data: result.points.map((p) => p.severity),
                    borderColor: CHART_COLORS.period,
                    backgroundColor: CHART_COLORS.period,
                    pointStyle: 'rectRot',
                    showLine: false,
                    pointRadius: 5,
                    yAxisID: 'y1',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { labels: { color: CHART_COLORS.text, boxWidth: 12 } },
                  tooltip: { filter: (item) => item.raw !== null },
                },
                scales: {
                  x: { ...baseScale, ticks: { ...baseScale.ticks, maxTicksLimit: 8 } },
                  y: { ...baseScale, min: 0, max: 5, position: 'left', title: { display: true, text: 'Mood', color: CHART_COLORS.text } },
                  y1: {
                    ...baseScale,
                    min: 0,
                    max: isPain ? 10 : 5,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Severity', color: CHART_COLORS.text },
                  },
                },
              }}
            />
          </div>
          {result.avgMoodWith !== null && result.avgMoodWithout !== null && result.daysWith >= 2 && result.daysWithout >= 2 ? (
            <p className="period-chart__note">
              On days you logged {active.toLowerCase()}, your average mood score was {result.avgMoodWith} ({result.daysWith} days), compared with{' '}
              {result.avgMoodWithout} on other logged days ({result.daysWithout} days). This is an association in your entries, not a cause.
            </p>
          ) : (
            <p className="period-chart__note">Only dates with a logged mood or symptom are plotted. More entries are needed for a comparison summary.</p>
          )}
        </>
      )}
    </Card>
  );
}
