import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import Card from '../Card';
import AnimatedNumber from './AnimatedNumber';
import { computeXp, taskBadges } from '../../../../backend/todo/analytics';
import { useUserData } from '../../../context/useUserData';
import { useScoreHistory } from '../../../context/useScoreHistory';
import type { FocusSession, Task } from '../../../../backend/todo/types';

interface Props {
  tasks: Task[];
  sessions: FocusSession[];
  today: string;
  now: Date;
}

const RANK_LADDER = ['Novice', 'Apprentice', 'Adept', 'Achiever', 'Expert', 'Master', 'Grandmaster', 'Legend', 'Ascended'];

export default function TodoAchievements({ tasks, sessions, today, now }: Props) {
  const openHistory = useScoreHistory();
  const { progression } = useUserData();
  const level = progression.level;
  const { xp, badges } = useMemo(() => {
    const xp = computeXp(tasks, sessions, today);
    return { xp, badges: taskBadges(tasks, sessions, today, now) };
  }, [tasks, sessions, today, now]);
  const earned = badges.filter((b) => b.earned).length;

  return (
    <div className="todo-achievements">
      <Card className="todo-rank" onClick={() => openHistory({ kind: 'aura-points' })} ariaLabel="Productivity rank and XP: view history">
        <div className="todo-rank__head">
          <motion.div className="todo-rank__level" initial={{ rotate: -12, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
            <span>LVL</span>
            {level.level}
          </motion.div>
          <div>
            <p className="todo-tile__label">Account rank</p>
            <h3 className="todo-rank__name">{level.rank}</h3>
            <p className="todo-muted">
              <AnimatedNumber value={progression.xp.total} /> XP · {level.nextLevel - progression.xp.total} XP to level {level.level + 1}
            </p>
          </div>
        </div>
        <div className="todo-level__bar todo-level__bar--lg" role="progressbar" aria-valuenow={level.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Level progress">
          <motion.span initial={{ width: 0 }} animate={{ width: `${level.progress}%` }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} />
        </div>
        <ol className="todo-rank__ladder" aria-label="Rank ladder">
          {RANK_LADDER.map((r) => (
            <li key={r} className={r === level.rank ? 'is-current' : RANK_LADDER.indexOf(r) < RANK_LADDER.indexOf(level.rank) ? 'is-passed' : ''}>
              {r}
            </li>
          ))}
        </ol>
        <dl className="todo-xp-breakdown">
          <div>
            <dt>Tasks completed</dt>
            <dd>+{xp.tasks}</dd>
          </div>
          <div>
            <dt>Early & on-time bonus</dt>
            <dd>+{xp.early}</dd>
          </div>
          <div>
            <dt>Focus sessions</dt>
            <dd>+{xp.focus}</dd>
          </div>
          <div>
            <dt>Best streak</dt>
            <dd>+{xp.streak}</dd>
          </div>
        </dl>
        <p className="todo-muted todo-xp-rules">
          Low 10 · Medium 20 · High 35 · Critical 50 XP per task. +15 for finishing before the due date, +5 on time, +1 per 5 focus minutes, +10 per day of your best streak.
        </p>
      </Card>

      <Card title={`Badges · ${earned} of ${badges.length}`}>
        <ul className="todo-badges">
          {badges.map((b, i) => (
            <motion.li
              key={b.id}
              className={`todo-badge${b.earned ? ' is-earned' : ''}`}
              style={{ '--c': b.color, '--tilt': `${i % 2 ? 5 : -5}deg` } as CSSProperties}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <span className="todo-badge__sticker" role="img" aria-label={`${b.title}${b.earned ? '' : ' (locked)'}`}>
                {b.emoji}
              </span>
              <span>
                <strong>{b.title}</strong>
                <span>{b.description}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
