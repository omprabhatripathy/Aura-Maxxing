import Modal from '../ui/Modal';
import { Grid } from '../ui/Layout';
import StatCard from '../ui/StatCard';
import { addDays, formatDate, isoFromTimestamp, weekStart } from '../../../../backend/core/dates';
import { completionRate, habitStreak, type LogsByHabit } from '../../../../backend/analytics/habits';
import type { Habit, HabitLog } from '../../../../backend/models';
import './habits.css';

interface Props {
  habit: Habit;
  logs: HabitLog[];
  logsByHabit: LogsByHabit;
  today: string;
  busyDate: string | null;
  onToggleDate: (date: string, done: boolean) => void;
  onClose: () => void;
}

const WEEKS = 12;

export default function HabitHistory({ habit, logs, logsByHabit, today, busyDate, onToggleDate, onClose }: Props) {
  const own = logs.filter((l) => l.habitId === habit.id).sort((a, b) => b.date.localeCompare(a.date));
  const dates = new Set(own.map((l) => l.date));
  const created = isoFromTimestamp(habit.createdAt);
  const start = addDays(weekStart(today), -(WEEKS - 1) * 7);
  const weekly = habit.frequency === 'weekly';

  // Longest streak across all completions (per day or per week).
  const keys = [...new Set(own.map((l) => (weekly ? weekStart(l.date) : l.date)))].sort();
  let longest = 0;
  let run = 0;
  keys.forEach((k, i) => {
    run = i > 0 && addDays(keys[i - 1], weekly ? 7 : 1) === k ? run + 1 : 1;
    longest = Math.max(longest, run);
  });

  return (
    <Modal eyebrow="Habit history" title={habit.label} size="lg" onClose={onClose}>
      <Grid minItemWidth={120}>
        <StatCard label="Current streak" value={`${habitStreak(habit, logsByHabit, today)} ${weekly ? 'wk' : 'd'}`} />
        <StatCard label="Longest" value={`${longest} ${weekly ? 'wk' : 'd'}`} />
        <StatCard label="Completions" value={own.length} />
        <StatCard label="30-day rate" value={`${completionRate([habit], logsByHabit, addDays(today, -29), today) ?? 0}%`} />
      </Grid>

      <div className="habit-heatmap" role="grid" aria-label={`Completions over the last ${WEEKS} weeks`}>
        {Array.from({ length: WEEKS }, (_, w) => {
          const week = addDays(start, w * 7);
          return (
            <div key={week} className="habit-heatmap__week" role="row">
              {Array.from({ length: 7 }, (_, d) => {
                const date = addDays(week, d);
                const done = weekly ? own.some((l) => weekStart(l.date) === week) : dates.has(date);
                const editable = !weekly && date <= today && date >= created && !habit.archived;
                return (
                  <button
                    key={date}
                    type="button"
                    role="gridcell"
                    disabled={!editable || busyDate === date}
                    className={`habit-heatmap__cell ${done ? 'habit-heatmap__cell--done' : ''} ${date > today ? 'habit-heatmap__cell--future' : ''}`}
                    aria-label={`${formatDate(date, { weekday: 'long', month: 'short', day: 'numeric' })}: ${done ? 'completed' : 'not completed'}${editable ? '. Activate to toggle.' : ''}`}
                    title={formatDate(date)}
                    onClick={() => onToggleDate(date, !done)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="text-muted habit-heatmap__hint">
        {weekly ? 'Each column is a week; a filled week means you completed it.' : 'Tap a past day to log or remove a completion you forgot to record.'}
      </p>

      <h3 className="text-label-sm">Recent completions</h3>
      {own.length === 0 ? (
        <p className="text-muted">No completions yet.</p>
      ) : (
        <ul className="habit-history__list">
          {own.slice(0, 20).map((l) => (
            <li key={l.id}>{formatDate(l.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
