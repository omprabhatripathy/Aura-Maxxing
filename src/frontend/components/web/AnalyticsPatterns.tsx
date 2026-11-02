import { useMemo, useState } from 'react';
import { SegmentedControl } from '../shared/ui';
import WidgetCard from './WidgetCard';
import { Stagger, StaggerItem } from '../../animations/Reveal';
import { useUserData } from '../../context/useUserData';
import { useTodo } from '../../context/useTodo';
import { completionRate } from '../../../backend/analytics/habits';
import { addDays, dateRange, formatDate, fromIso, weekStart } from '../../../backend/core/dates';
import { completedOn } from '../../../backend/todo/analytics';
import { HABIT_CATEGORY_OPTIONS } from '../../lib/options';
import './AnalyticsPatterns.css';

type Range = '7' | '30' | '90' | '365';
type Metric = 'habits' | 'tasks' | 'journal' | 'mood';

const RANGES: { value: Range; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
];

const METRICS: { value: Metric; label: string }[] = [
  { value: 'habits', label: 'Habits' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'journal', label: 'Journal' },
  { value: 'mood', label: 'Mood logs' },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function countBy(dates: (string | null)[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of dates) if (d) m.set(d, (m.get(d) ?? 0) + 1);
  return m;
}

const sumIn = (m: Map<string, number>, from: string, to: string) => {
  let n = 0;
  m.forEach((v, d) => {
    if (d >= from && d <= to) n += v;
  });
  return n;
};

function delta(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  return current - previous;
}

/** Desktop-only analytics: range filter, period comparison, heatmap, weekday + category patterns. */
export default function AnalyticsPatterns() {
  const { habits, habitLogs, logsByHabit, journalEntries, moodLogs, today } = useUserData();
  const { tasks } = useTodo();
  const [range, setRange] = useState<Range>('30');
  const [metric, setMetric] = useState<Metric>('habits');

  const days = Number(range);
  const from = addDays(today, -(days - 1));
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));

  const series = useMemo(
    () => ({
      habits: countBy(habitLogs.map((l) => l.date)),
      tasks: countBy(tasks.map(completedOn)),
      journal: countBy(journalEntries.map((j) => j.date)),
      mood: countBy(moodLogs.map((m) => m.date)),
    }),
    [habitLogs, tasks, journalEntries, moodLogs]
  );

  const comparison = useMemo(() => {
    const active = habits.filter((h) => !h.archived);
    const avgMood = (a: string, b: string) => {
      const logs = moodLogs.filter((m) => m.date >= a && m.date <= b);
      return logs.length ? Math.round((logs.reduce((s, m) => s + m.score, 0) / logs.length) * 20) : null;
    };
    const activeDays = (a: string, b: string) => {
      const set = new Set<string>();
      for (const m of Object.values(series)) m.forEach((_v, d) => d >= a && d <= b && set.add(d));
      return set.size;
    };
    return [
      { label: 'Habit completion', unit: '%', current: completionRate(active, logsByHabit, from, today), previous: completionRate(active, logsByHabit, prevFrom, prevTo) },
      { label: 'Active days', unit: '', current: activeDays(from, today), previous: activeDays(prevFrom, prevTo) },
      { label: 'Tasks completed', unit: '', current: sumIn(series.tasks, from, today), previous: sumIn(series.tasks, prevFrom, prevTo) },
      { label: 'Mood score', unit: '', current: avgMood(from, today), previous: avgMood(prevFrom, prevTo) },
    ];
  }, [habits, logsByHabit, moodLogs, series, from, today, prevFrom, prevTo]);

  const heatmap = useMemo(() => {
    const weeks = days >= 365 ? 53 : 26;
    const start = weekStart(addDays(today, -(weeks * 7 - 1)));
    const counts = series[metric];
    const cells = dateRange(start, today).map((date) => ({ date, count: counts.get(date) ?? 0 }));
    const max = Math.max(1, ...cells.map((c) => c.count));
    const columns: { date: string; count: number; level: number }[][] = [];
    cells.forEach((c, i) => {
      const col = Math.floor(i / 7);
      (columns[col] ??= []).push({ ...c, level: c.count === 0 ? 0 : Math.ceil((c.count / max) * 4) });
    });
    const total = cells.reduce((s, c) => s + c.count, 0);
    return { columns, total, start };
  }, [series, metric, days, today]);

  const weekdays = useMemo(() => {
    const totals = Array(7).fill(0) as number[];
    const occurrences = Array(7).fill(0) as number[];
    const counts = series[metric];
    for (const date of dateRange(from, today)) {
      const i = (fromIso(date).getDay() + 6) % 7;
      occurrences[i]++;
      totals[i] += counts.get(date) ?? 0;
    }
    const avg = totals.map((t, i) => (occurrences[i] ? t / occurrences[i] : 0));
    const max = Math.max(0.0001, ...avg);
    const best = avg.indexOf(Math.max(...avg));
    return { bars: avg.map((v, i) => ({ day: WEEKDAYS[i], value: v, share: Math.round((v / max) * 100) })), best: avg[best] > 0 ? WEEKDAYS[best] : null };
  }, [series, metric, from, today]);

  const categories = useMemo(() => {
    const byHabit = new Map(habits.map((h) => [h.id, h.category]));
    const totals = new Map(HABIT_CATEGORY_OPTIONS.map((c) => [c.value, 0]));
    for (const l of habitLogs) {
      if (l.date < from || l.date > today) continue;
      const cat = byHabit.get(l.habitId);
      if (cat) totals.set(cat, (totals.get(cat) ?? 0) + 1);
    }
    const sum = [...totals.values()].reduce((a, b) => a + b, 0);
    return HABIT_CATEGORY_OPTIONS.map((c) => ({ ...c, count: totals.get(c.value) ?? 0, share: sum ? Math.round(((totals.get(c.value) ?? 0) / sum) * 100) : 0 }));
  }, [habits, habitLogs, from, today]);

  return (
    <div className="web-patterns" data-no-auto-reveal>
      <div className="web-patterns__filters" role="group" aria-label="Analytics filters">
        <SegmentedControl ariaLabel="Date range" options={RANGES} value={range} onChange={setRange} />
        <SegmentedControl ariaLabel="Metric" options={METRICS} value={metric} onChange={setMetric} />
      </div>

      <Stagger className="web-patterns__compare">
        {comparison.map((c) => {
          const diff = delta(c.current, c.previous);
          return (
            <StaggerItem key={c.label} className="web-patterns__compare-card" direction="up">
              <span className="web-patterns__label">{c.label}</span>
              <div className="web-patterns__compare-row">
                <div>
                  <strong>{c.current === null ? '—' : `${c.current}${c.unit}`}</strong>
                  <small>This period</small>
                </div>
                <div className="web-patterns__vs">vs</div>
                <div>
                  <strong className="is-previous">{c.previous === null ? '—' : `${c.previous}${c.unit}`}</strong>
                  <small>Previous {days} days</small>
                </div>
              </div>
              {diff !== null && <span className={`web-patterns__delta ${diff >= 0 ? 'is-up' : 'is-down'}`}>{diff >= 0 ? `▲ +${diff}` : `▼ ${diff}`}</span>}
            </StaggerItem>
          );
        })}
      </Stagger>

      <Stagger className="web-patterns__grid">
        <StaggerItem className="web-patterns__heatmap-cell">
          <WidgetCard eyebrow="Heatmap" title={`${heatmap.total} ${METRICS.find((m) => m.value === metric)!.label.toLowerCase()} since ${formatDate(heatmap.start, { month: 'short', day: 'numeric', year: 'numeric' })}`} accent="#22c55e">
            <div className="web-heatmap" role="img" aria-label={`Activity heatmap for ${metric}`}>
              <div className="web-heatmap__days" aria-hidden="true">
                {WEEKDAYS.map((d, i) => (
                  <span key={d}>{i % 2 === 0 ? d : ''}</span>
                ))}
              </div>
              <div className="web-heatmap__grid">
                {heatmap.columns.map((col, i) => (
                  <div key={i} className="web-heatmap__col">
                    {col.map((c) => (
                      <span key={c.date} className={`web-heatmap__cell is-l${c.level}`} title={`${formatDate(c.date, { weekday: 'short', month: 'short', day: 'numeric' })}: ${c.count}`} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="web-heatmap__legend" aria-hidden="true">
              Less {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`web-heatmap__cell is-l${l}`} />)} More
            </div>
          </WidgetCard>
        </StaggerItem>

        <StaggerItem>
          <WidgetCard eyebrow="Completion pattern" title={weekdays.best ? `Strongest on ${weekdays.best}` : 'No pattern yet'} accent="#38bdf8">
            <div className="web-patterns__weekday">
              {weekdays.bars.map((b) => (
                <div key={b.day} className="web-patterns__weekday-col" title={`${b.day}: ${b.value.toFixed(1)} per day`}>
                  <span className="web-patterns__weekday-bar" style={{ height: `${Math.max(4, b.share)}%` }} />
                  <span className="web-patterns__weekday-label">{b.day}</span>
                </div>
              ))}
            </div>
          </WidgetCard>
        </StaggerItem>

        <StaggerItem>
          <WidgetCard eyebrow="Habit categories" title={`Completions · last ${days} days`} accent="#f59e0b">
            <ul className="web-patterns__categories">
              {categories.map((c) => (
                <li key={c.value}>
                  <span>{c.label}</span>
                  <span className="web-patterns__cat-track">
                    <span style={{ width: `${c.share}%` }} />
                  </span>
                  <strong>{c.count}</strong>
                </li>
              ))}
            </ul>
          </WidgetCard>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
