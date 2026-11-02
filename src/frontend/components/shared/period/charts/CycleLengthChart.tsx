import { Bar } from 'react-chartjs-2';
import Card from '../../Card';
import StatCard from '../../ui/StatCard';
import { Grid } from '../../ui/Layout';
import { EmptyState } from '../../ui/Status';
import { CHART_COLORS, baseScale, withAlpha } from '../chartTheme';
import { formatDate } from '../../../../../backend/core/dates';
import type { Cycle, CycleStats } from '../../../../../backend/period/cycle';

interface Props {
  cycles: Cycle[];
  stats: CycleStats;
}

export default function CycleLengthChart({ cycles, stats }: Props) {
  const completed = cycles.filter((c) => c.completed);

  return (
    <Card eyebrow="Chart F" title="Cycle length history" className="period-chart period-chart--wide">
      {completed.length === 0 ? (
        <EmptyState>Cycle lengths appear once you have logged at least two period start dates.</EmptyState>
      ) : (
        <>
          <Grid minItemWidth={130}>
            <StatCard label="Average cycle" value={stats.averageCycle !== null ? `${stats.averageCycle} d` : '—'} />
            <StatCard label="Shortest" value={stats.shortest !== null ? `${stats.shortest} d` : '—'} />
            <StatCard label="Longest" value={stats.longest !== null ? `${stats.longest} d` : '—'} />
            <StatCard label="Variation" value={stats.variation !== null ? `${stats.variation} d` : '—'} />
            <StatCard label="Avg period" value={stats.averagePeriod !== null ? `${stats.averagePeriod} d` : '—'} />
          </Grid>
          <div className="period-chart__canvas">
            <Bar
              role="img"
              aria-label="Bar chart of completed cycle lengths"
              data={{
                labels: completed.map((c) => formatDate(c.start, { month: 'short', year: '2-digit' })),
                datasets: [
                  {
                    label: 'Cycle length (days)',
                    data: completed.map((c) => c.length),
                    backgroundColor: completed.map((c) => withAlpha(c.outlier ? CHART_COLORS.outline : CHART_COLORS.primary, 0.8)),
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
                      title: (items) => `Started ${formatDate(completed[items[0].dataIndex].start, { month: 'long', day: 'numeric', year: 'numeric' })}`,
                      label: (item) => {
                        const c = completed[item.dataIndex];
                        return `${c.length} days · period ${c.periodLength} days${c.outlier ? ' · excluded from averages (possible tracking gap)' : ''}`;
                      },
                    },
                  },
                },
                scales: { x: baseScale, y: { ...baseScale, beginAtZero: true, ticks: { ...baseScale.ticks, precision: 0 } } },
              }}
            />
          </div>
          <p className="period-chart__note">
            Calculated only from the start dates you logged. Grey bars fall outside 15–60 days — often a missed log rather than a real cycle — and
            are left out of averages and estimates.
          </p>
        </>
      )}
    </Card>
  );
}
