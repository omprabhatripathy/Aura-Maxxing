import { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import Card from '../../Card';
import SegmentedControl from '../../ui/SegmentedControl';
import { EmptyState } from '../../ui/Status';
import { ChipToggle } from '../../ui/RatingScale';
import CycleMoodIcon from '../../../../icons/CycleMoodIcon';
import { CHART_COLORS, PALETTE } from '../chartTheme';
import { formatDate } from '../../../../../backend/core/dates';
import { moodDistribution, rangeBounds, type RangeKey } from '../../../../../backend/period/analytics';
import type { Cycle } from '../../../../../backend/period/cycle';
import { CYCLE_MOOD_LABEL, CYCLE_MOODS, type CycleMood, type DailyLog } from '../../../../../backend/period/types';

const RANGES: { value: RangeKey; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'cycle', label: 'Cycle' },
];

const colorFor = (mood: CycleMood) => PALETTE[CYCLE_MOODS.indexOf(mood) % PALETTE.length];

interface Props {
  logs: DailyLog[];
  cycles: Cycle[];
  today: string;
}

export default function MoodDistributionChart({ logs, cycles, today }: Props) {
  const [range, setRange] = useState<RangeKey>('month');
  const [focus, setFocus] = useState<CycleMood | null>(null);
  const { from, to } = rangeBounds(range, today, cycles);
  const dist = moodDistribution(logs, from, to);
  const focused = dist.slices.find((s) => s.mood === focus);

  return (
    <Card eyebrow="Chart B" title="Mood distribution" className="period-chart">
      <SegmentedControl ariaLabel="Distribution range" options={RANGES} value={range} onChange={(r) => { setRange(r); setFocus(null); }} />
      {dist.totalSelections === 0 ? (
        <EmptyState>No moods logged in this period.</EmptyState>
      ) : (
        <>
          <div className="period-chart__donut">
            <Doughnut
              role="img"
              aria-label="Donut chart of logged mood percentages"
              data={{
                labels: dist.slices.map((s) => CYCLE_MOOD_LABEL[s.mood]),
                datasets: [
                  {
                    data: dist.slices.map((s) => s.count),
                    backgroundColor: dist.slices.map((s) => colorFor(s.mood)),
                    borderColor: 'transparent',
                    hoverOffset: 8,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                cutout: '62%',
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: (item) => `${item.label}: ${dist.slices[item.dataIndex].percent}% (${item.raw})` } },
                },
                onClick: (_event, elements) => {
                  if (elements[0]) setFocus(dist.slices[elements[0].index].mood);
                },
              }}
            />
            <div className="period-chart__donut-center" aria-hidden="true">
              <strong>{dist.daysLogged}</strong>
              <span>days logged</span>
            </div>
          </div>
          <p className="period-chart__note">
            {dist.totalSelections} mood selection{dist.totalSelections === 1 ? '' : 's'} across {dist.daysLogged} logged day{dist.daysLogged === 1 ? '' : 's'}. Days without a mood are excluded.
          </p>
          <div className="period-chart__legend" role="list">
            {dist.slices.map((s) => (
              <ChipToggle key={s.mood} role="listitem" active={focus === s.mood} onToggle={() => setFocus(focus === s.mood ? null : s.mood)}>
                <span className="period-chart__swatch" style={{ background: colorFor(s.mood) }} />
                <CycleMoodIcon mood={s.mood} size={20} />
                {CYCLE_MOOD_LABEL[s.mood]} · {s.percent}%
              </ChipToggle>
            ))}
          </div>
          {focused && (
            <p className="period-chart__dates" aria-live="polite">
              <strong style={{ color: CHART_COLORS.primaryToken }}>{CYCLE_MOOD_LABEL[focused.mood]}</strong> logged on:{' '}
              {focused.dates.map((d) => formatDate(d)).join(', ')}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
