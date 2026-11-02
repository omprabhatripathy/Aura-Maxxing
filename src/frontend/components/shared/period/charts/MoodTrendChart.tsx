import { useState } from 'react';
import { Chart } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import Card from '../../Card';
import { Select } from '../../ui/Field';
import { EmptyState } from '../../ui/Status';
import { CHART_COLORS, baseScale, withAlpha } from '../chartTheme';
import { formatDate } from '../../../../../backend/core/dates';
import { describeMoods, moodTrendForCycle } from '../../../../../backend/period/analytics';
import type { Cycle, Prediction } from '../../../../../backend/period/cycle';
import type { DailyLog } from '../../../../../backend/period/types';

interface Props {
  cycles: Cycle[];
  logsByDate: Map<string, DailyLog>;
  prediction: Prediction | null;
  today: string;
}

export default function MoodTrendChart({ cycles, logsByDate, prediction, today }: Props) {
  const [index, setIndex] = useState<number | null>(null);
  if (cycles.length === 0) {
    return (
      <Card eyebrow="Chart A" title="Mood across your cycle">
        <EmptyState>Log a period to see how your mood changes by cycle day.</EmptyState>
      </Card>
    );
  }

  const selected = cycles[index ?? cycles.length - 1];
  const points = moodTrendForCycle(selected, logsByDate, prediction, today);
  const logged = points.filter((p) => p.score !== null).length;

  const data: ChartData<'bar' | 'line', (number | null)[], string> = {
    labels: points.map((p) => `Day ${p.day}`),
    datasets: [
      {
        type: 'line',
        label: 'Mood score',
        data: points.map((p) => p.score),
        borderColor: CHART_COLORS.primary,
        backgroundColor: CHART_COLORS.primaryToken,
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: false,
        tension: 0.25,
        yAxisID: 'y',
        order: 1,
      },
      {
        type: 'bar',
        label: 'Logged period day',
        data: points.map((p) => (p.flow ? 5 : null)),
        backgroundColor: withAlpha(CHART_COLORS.period, 0.18),
        borderWidth: 0,
        barPercentage: 1,
        categoryPercentage: 1,
        yAxisID: 'y',
        order: 2,
      },
    ],
  };

  const options: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: CHART_COLORS.text, boxWidth: 12 } },
      tooltip: {
        filter: (item) => item.raw !== null,
        callbacks: {
          title: (items) => {
            const p = points[items[0].dataIndex];
            return `${formatDate(p.date, { weekday: 'short', month: 'short', day: 'numeric' })} · Cycle day ${p.day}`;
          },
          label: (item) => {
            const p = points[item.dataIndex];
            if (item.datasetIndex === 1) return `Period day (${p.flow} flow)`;
            return `Mood ${p.score} / 5 — ${describeMoods(p.moods)}`;
          },
        },
      },
    },
    scales: {
      x: { ...baseScale, ticks: { ...baseScale.ticks, autoSkip: true, maxTicksLimit: 10 } },
      y: { ...baseScale, min: 0, max: 5, ticks: { ...baseScale.ticks, stepSize: 1 }, title: { display: true, text: 'Mood score', color: CHART_COLORS.text } },
    },
  };

  const cycleOptions = cycles.map((c, i) => ({
    value: String(i),
    label: `${formatDate(c.start, { month: 'short', day: 'numeric', year: 'numeric' })}${c.completed ? ` (${c.length} days)` : ' (current)'}`,
  }));

  return (
    <Card eyebrow="Chart A" title="Mood across your cycle" className="period-chart">
      <Select aria-label="Choose cycle" options={cycleOptions} value={String(index ?? cycles.length - 1)} onChange={(v) => setIndex(Number(v))} />
      {logged === 0 ? (
        <EmptyState>No mood logged during this cycle yet.</EmptyState>
      ) : (
        <>
          <div className="period-chart__canvas">
            <Chart type="bar" data={data} options={options} aria-label="Line chart of mood score by cycle day" role="img" />
          </div>
          <p className="period-chart__note">
            {logged} of {points.length} days logged. Gaps are days without a mood entry — they are not filled in.
            {!selected.completed && ' Days after today are shown for reference only.'}
          </p>
        </>
      )}
    </Card>
  );
}
