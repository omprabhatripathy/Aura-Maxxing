import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import Card from '../../Card';
import SegmentedControl from '../../ui/SegmentedControl';
import { EmptyState } from '../../ui/Status';
import { CHART_COLORS, baseScale, withAlpha } from '../chartTheme';
import { formatDate } from '../../../../../backend/core/dates';
import { rangeBounds, symptomFrequency, type RangeKey } from '../../../../../backend/period/analytics';
import type { Cycle } from '../../../../../backend/period/cycle';
import type { DailyLog } from '../../../../../backend/period/types';

const RANGES: { value: RangeKey; label: string }[] = [
  { value: 'cycle', label: 'This cycle' },
  { value: 'month', label: '30 days' },
  { value: '90days', label: '90 days' },
  { value: 'all', label: 'All' },
];

interface Props {
  logs: DailyLog[];
  cycles: Cycle[];
  today: string;
}

export default function SymptomFrequencyChart({ logs, cycles, today }: Props) {
  const [range, setRange] = useState<RangeKey>('90days');
  const [focus, setFocus] = useState<string | null>(null);
  const { from, to } = rangeBounds(range, today, cycles);
  const freq = symptomFrequency(logs, from, to);
  const focused = freq.find((f) => f.name === focus);

  return (
    <Card eyebrow="Chart D" title="Symptom frequency" className="period-chart">
      <SegmentedControl ariaLabel="Symptom range" options={RANGES} value={range} onChange={(r) => { setRange(r); setFocus(null); }} />
      {freq.length === 0 ? (
        <EmptyState>No symptoms logged in this range.</EmptyState>
      ) : (
        <>
          <div className="period-chart__canvas" style={{ height: Math.max(160, freq.length * 34 + 40) }}>
            <Bar
              role="img"
              aria-label="Horizontal bar chart of days each symptom was logged"
              data={{
                labels: freq.map((f) => f.name),
                datasets: [
                  {
                    label: 'Days logged',
                    data: freq.map((f) => f.days.length),
                    backgroundColor: freq.map((f) => withAlpha(f.name === focus ? CHART_COLORS.period : CHART_COLORS.primary, 0.8)),
                    borderRadius: 6,
                  },
                ],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { ...baseScale, ticks: { ...baseScale.ticks, stepSize: 1, precision: 0 } }, y: baseScale },
                onClick: (_e, elements) => {
                  if (elements[0]) setFocus(freq[elements[0].index].name);
                },
                onHover: (e, elements) => {
                  const target = e.native?.target as HTMLElement | undefined;
                  if (target) target.style.cursor = elements.length ? 'pointer' : 'default';
                },
              }}
            />
          </div>
          <label className="period-chart__picker">
            <span className="ui-field__label">Show dates for</span>
            <select value={focus ?? ''} onChange={(e) => setFocus(e.target.value || null)}>
              <option value="">Select a symptom (or tap a bar)</option>
              {freq.map((f) => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </select>
          </label>
          {focused && (
            <p className="period-chart__dates" aria-live="polite">
              <strong>{focused.name}</strong> on {focused.days.length} day{focused.days.length === 1 ? '' : 's'}:{' '}
              {focused.days.map((d) => `${formatDate(d.date)} (severity ${d.severity})`).join(', ')}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
