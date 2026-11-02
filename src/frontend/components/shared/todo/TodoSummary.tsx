import { useMemo } from 'react';
import { motion } from 'framer-motion';
import ProgressRing from '../ProgressRing';
import TrendBars from '../charts/TrendBars';
import AnimatedNumber from './AnimatedNumber';
import NeonFlame from '../NeonFlame';
import { addDays, formatDate } from '../../../../backend/core/dates';
import {
  completionStreak,
  dailyCompletions,
  productivityScore,
  taskSummary,
  weeklyCompletion,
} from '../../../../backend/todo/analytics';
import type { FocusSession, Task } from '../../../../backend/todo/types';
import { useScoreHistory } from '../../../context/useScoreHistory';
import { useUserData } from '../../../context/useUserData';

interface Props {
  tasks: Task[];
  sessions: FocusSession[];
  today: string;
  now: Date;
}

const tile = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } }),
};

export default function TodoSummary({ tasks, sessions, today, now }: Props) {
  const openHistory = useScoreHistory();
  const { progression } = useUserData();
  const data = useMemo(() => {
    const summary = taskSummary(tasks, today, now);
    return {
      summary,
      streak: completionStreak(tasks, today),
      score: productivityScore(tasks, sessions, today),
      weekly: weeklyCompletion(tasks, today),
      week: dailyCompletions(tasks, addDays(today, -6), today),
    };
  }, [tasks, sessions, today, now]);

  const { summary, streak, score, weekly, week } = data;
  const xp = { total: progression.xp.total };
  const level = progression.level;
  const todayPct = summary.todayTotal ? Math.round((summary.completedToday / Math.max(summary.todayTotal, summary.completedToday)) * 100) : summary.completedToday ? 100 : 0;

  const tiles = [
    {
      key: 'today',
      label: "Today's tasks",
      body: (
        <div className="todo-tile__ring">
          <ProgressRing value={todayPct} size={72} strokeWidth={5} />
          <div>
            <strong className="todo-tile__value">
              <AnimatedNumber value={summary.dueToday} />
            </strong>
            <span className="todo-tile__hint">still due today</span>
          </div>
        </div>
      ),
    },
    {
      key: 'done',
      label: 'Completed today',
      body: (
        <>
          <strong className="todo-tile__value todo-tile__value--success">
            <AnimatedNumber value={summary.completedToday} />
          </strong>
          <span className="todo-tile__hint">{summary.inProgress} in progress</span>
        </>
      ),
    },
    {
      key: 'overdue',
      label: 'Overdue',
      body: (
        <>
          <strong className={`todo-tile__value ${summary.overdue ? 'todo-tile__value--danger' : ''}`}>
            <AnimatedNumber value={summary.overdue} />
          </strong>
          <span className="todo-tile__hint">{summary.overdue ? 'needs attention' : 'all clear'}</span>
        </>
      ),
    },
    {
      key: 'streak',
      label: 'Current streak',
      body: (
        <>
          <strong className="todo-tile__value todo-tile__value--streak">
            <NeonFlame size={24} lit={streak.current > 0} />
            <AnimatedNumber value={streak.current} />
          </strong>
          <span className="todo-tile__hint">best {streak.longest} day{streak.longest === 1 ? '' : 's'}</span>
        </>
      ),
    },
    {
      key: 'score',
      label: 'Productivity score',
      body: (
        <div className="todo-tile__ring">
          <ProgressRing value={score} size={72} strokeWidth={5} />
          <div>
            <strong className="todo-tile__value">
              <AnimatedNumber value={score} />
            </strong>
            <span className="todo-tile__hint">out of 100</span>
          </div>
        </div>
      ),
    },
    {
      key: 'weekly',
      label: 'Weekly completion',
      body: (
        <div className="todo-tile__ring">
          <ProgressRing value={weekly ?? 0} size={72} strokeWidth={5} />
          <div>
            <strong className="todo-tile__value">{weekly === null ? '—' : <AnimatedNumber value={weekly} suffix="%" />}</strong>
            <span className="todo-tile__hint">last 7 days</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="todo-summary" aria-label="Productivity summary">
      <div className="todo-summary__tiles">
        {tiles.map((t, i) => (
          <motion.div key={t.key} className="todo-tile" variants={tile} initial="hidden" animate="show" custom={i}>
            <span className="todo-tile__label">{t.label}</span>
            {t.body}
          </motion.div>
        ))}
      </div>
      <motion.div className="todo-summary__side" variants={tile} initial="hidden" animate="show" custom={6}>
        <div
          className="todo-level score-clickable"
          role="button"
          tabIndex={0}
          aria-label={`Level ${level.level}, ${xp.total} XP: view history`}
          onClick={() => openHistory({ kind: 'aura-points' })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openHistory({ kind: 'aura-points' });
            }
          }}
        >
          <div className="todo-level__badge" aria-hidden="true">
            {level.level}
          </div>
          <div className="todo-level__text">
            <span className="todo-tile__label">Level {level.level} · {level.rank}</span>
            <strong>
              <AnimatedNumber value={xp.total} /> XP
            </strong>
            <div className="todo-level__bar" role="progressbar" aria-valuenow={level.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next level">
              <motion.span initial={{ width: 0 }} animate={{ width: `${level.progress}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            <span className="todo-tile__hint">{level.nextLevel - xp.total} XP to level {level.level + 1}</span>
          </div>
        </div>
        <TrendBars
          height={110}
          points={week.map((d) => ({ label: formatDate(d.date, { weekday: 'narrow' }), value: d.count }))}
          valueLabel="Completed"
          ariaLabel="Tasks completed per day over the last 7 days"
        />
      </motion.div>
    </section>
  );
}
