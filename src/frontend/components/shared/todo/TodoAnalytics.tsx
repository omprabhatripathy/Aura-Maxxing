import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import Card from '../Card';
import TrendBars from '../charts/TrendBars';
import TrendLine from '../charts/TrendLine';
import { addDays, dateRange, formatDate } from '../../../../backend/core/dates';
import { dailyCompletions, onTimeRate, tagBreakdown, taskInsights } from '../../../../backend/todo/analytics';
import { BOARD_STATUSES, STATUS_LABEL, type FocusSession, type Task, type TaskDayStats } from '../../../../backend/todo/types';
import { formatMinutes, STATUS_COLOR } from './meta';

interface Props {
  tasks: Task[];
  sessions: FocusSession[];
  dayStats: TaskDayStats[];
  today: string;
  now: Date;
}

export default function TodoAnalytics({ tasks, sessions, dayStats, today, now }: Props) {
  const data = useMemo(() => {
    const from = addDays(today, -13);
    const focusByDay = new Map<string, number>();
    sessions.forEach((s) => focusByDay.set(s.date, (focusByDay.get(s.date) ?? 0) + s.minutes));
    const statsByDay = new Map(dayStats.map((d) => [d.date, d]));
    const scoreDays = dateRange(addDays(today, -29), today);
    return {
      completions: dailyCompletions(tasks, from, today),
      focus: dateRange(from, today).map((date) => ({ date, minutes: focusByDay.get(date) ?? 0 })),
      scores: scoreDays.map((d) => ({ date: d, score: statsByDay.get(d)?.score ?? null })),
      tags: tagBreakdown(tasks.filter((t) => t.status !== 'archived')).slice(0, 8),
      insights: taskInsights(tasks, sessions, today, now),
      onTime: onTimeRate(tasks, today),
      statusCounts: BOARD_STATUSES.map((s) => ({ status: s, count: tasks.filter((t) => t.status === s).length })),
      focusTotal: sessions.reduce((sum, s) => sum + s.minutes, 0),
    };
  }, [tasks, sessions, dayStats, today, now]);

  const maxTag = Math.max(1, ...data.tags.map((t) => t.open + t.done));
  const totalStatus = Math.max(1, data.statusCounts.reduce((s, x) => s + x.count, 0));
  const hasScores = data.scores.filter((s) => s.score !== null).length >= 2;

  return (
    <div className="todo-analytics">
      <Card title="Smart insights" className="todo-analytics__wide">
        {data.insights.length === 0 ? (
          <p className="todo-muted">Complete a few tasks and focus sessions — insights appear once there's enough real data to back them up.</p>
        ) : (
          <ul className="todo-insights">
            {data.insights.map((text, i) => (
              <motion.li key={text} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                <span aria-hidden="true">💡</span>
                {text}
              </motion.li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Completed per day">
        <TrendBars
          points={data.completions.map((d) => ({ label: formatDate(d.date, { month: 'numeric', day: 'numeric' }), value: d.count }))}
          valueLabel="Completed"
          ariaLabel="Tasks completed per day, last 14 days"
        />
      </Card>

      <Card title={`Focus time · ${formatMinutes(data.focusTotal)} total`}>
        <TrendBars
          points={data.focus.map((d) => ({ label: formatDate(d.date, { month: 'numeric', day: 'numeric' }), value: d.minutes }))}
          valueLabel="Minutes"
          ariaLabel="Focus minutes per day, last 14 days"
        />
      </Card>

      <Card title="Productivity score">
        {hasScores ? (
          <TrendLine
            labels={data.scores.map((s) => formatDate(s.date, { month: 'numeric', day: 'numeric' }))}
            series={[{ label: 'Score', values: data.scores.map((s) => s.score) }]}
            max={100}
            height={200}
            ariaLabel="Daily productivity score, last 30 days"
          />
        ) : (
          <p className="todo-muted">A score is saved each day you use Todo. Come back tomorrow to see the trend.</p>
        )}
      </Card>

      <Card title="Workload by status">
        <div className="todo-stack-bar" role="img" aria-label={data.statusCounts.map((s) => `${STATUS_LABEL[s.status]} ${s.count}`).join(', ')}>
          {data.statusCounts.map((s) => (
            <motion.span
              key={s.status}
              style={{ '--c': STATUS_COLOR[s.status] } as CSSProperties}
              initial={{ width: 0 }}
              animate={{ width: `${(s.count / totalStatus) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </div>
        <ul className="todo-legend">
          {data.statusCounts.map((s) => (
            <li key={s.status} style={{ '--c': STATUS_COLOR[s.status] } as CSSProperties}>
              {STATUS_LABEL[s.status]} <strong>{s.count}</strong>
            </li>
          ))}
        </ul>
        {data.onTime !== null && <p className="todo-muted">{data.onTime}% of deadline tasks finished on time (30 days).</p>}
      </Card>

      <Card title="Categories" className="todo-analytics__wide">
        {data.tags.length === 0 ? (
          <p className="todo-muted">Add #tags to tasks to see where your time goes.</p>
        ) : (
          <ul className="todo-tag-bars">
            {data.tags.map((t) => (
              <li key={t.tag}>
                <span className="todo-tag-bars__name">#{t.tag}</span>
                <span className="todo-tag-bars__track">
                  <motion.span className="is-done" initial={{ width: 0 }} animate={{ width: `${(t.done / maxTag) * 100}%` }} />
                  <motion.span className="is-open" initial={{ width: 0 }} animate={{ width: `${(t.open / maxTag) * 100}%` }} />
                </span>
                <span className="todo-tag-bars__count">
                  {t.done} done · {t.open} open
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
