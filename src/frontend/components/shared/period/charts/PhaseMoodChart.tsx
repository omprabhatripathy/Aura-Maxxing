import { Bar } from 'react-chartjs-2';
import Card from '../../Card';
import { EmptyState } from '../../ui/Status';
import { CHART_COLORS, baseScale, withAlpha } from '../chartTheme';
import { PHASES, PHASE_LABEL, phaseMoodAverages } from '../../../../../backend/period/analytics';
import type { Cycle, Prediction } from '../../../../../backend/period/cycle';
import type { DailyLog } from '../../../../../backend/period/types';

interface Props {
  logs: DailyLog[];
  cycles: Cycle[];
  prediction: Prediction | null;
}

export default function PhaseMoodChart({ logs, cycles, prediction }: Props) {
  const averages = phaseMoodAverages(logs, cycles, prediction);
  const total = PHASES.reduce((sum, p) => sum + averages[p].count, 0);

  return (
    <Card eyebrow="Chart C" title="Mood by cycle phase" className="period-chart">
      {total === 0 ? (
        <EmptyState>
          Not enough data yet. Log moods across at least one full cycle (two period start dates) so phases can be estimated.
        </EmptyState>
      ) : (
        <>
          <div className="period-chart__canvas">
            <Bar
              role="img"
              aria-label="Bar chart of average mood score per estimated cycle phase"
              data={{
                labels: PHASES.map((p) => [PHASE_LABEL[p], `${averages[p].count} day${averages[p].count === 1 ? '' : 's'}`]),
                datasets: [
                  {
                    label: 'Average mood score',
                    data: PHASES.map((p) => averages[p].average),
                    backgroundColor: PHASES.map((p) => (p === 'menstrual' ? withAlpha(CHART_COLORS.period, 0.75) : withAlpha(CHART_COLORS.primary, 0.75))),
                    borderRadius: 8,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (item) => {
                        const phase = PHASES[item.dataIndex];
                        return averages[phase].average === null
                          ? 'No logged moods'
                          : `Average ${averages[phase].average} / 5 from ${averages[phase].count} logged days`;
                      },
                    },
                  },
                },
                scales: {
                  x: baseScale,
                  y: { ...baseScale, min: 0, max: 5, ticks: { ...baseScale.ticks, stepSize: 1 } },
                },
              }}
            />
          </div>
          <p className="period-chart__note">
            Menstrual days come from your logs. Other phases are estimates based on your own cycle lengths (ovulation assumed ~14 days before
            the next period), so they may not match your body exactly. This shows patterns in your entries, not their cause.
          </p>
        </>
      )}
    </Card>
  );
}
