import Card from './Card';
import IconButton from './ui/IconButton';
import { Checkbox } from './ui/Checkbox';
import { Badge } from './ui/Layout';
import type { Habit } from '../../../backend/models';
import { XP_RULES } from '../../../backend/services/progressionService';
import { habitIcon } from '../../lib/habitEmoji';
import { useScoreHistory } from '../../context/useScoreHistory';
import './HabitCard.css';

interface HabitCardProps {
  habit: Habit;
  done: boolean;
  streak: number;
  rate30: number | null;
  busy?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onHistory: () => void;
}

export default function HabitCard({ habit, done, streak, rate30, busy, onToggle, onEdit, onHistory }: HabitCardProps) {
  const unit = habit.frequency === 'weekly' ? 'Weeks' : 'Days';
  const openHistory = useScoreHistory();
  return (
    <Card className={`habit-card ${done ? 'habit-card--complete' : ''} ${habit.archived ? 'habit-card--archived' : ''}`}>
      <div className="habit-card__top">
        <div className="habit-card__identity">
          <div className="habit-card__icon" aria-hidden="true">{habitIcon(habit)}</div>
          <div>
            <h3 className="habit-card__name">{habit.label}</h3>
            <span className="habit-card__category">
              {habit.category} · {habit.frequency === 'weekly' ? 'weekly' : 'daily'} · {habit.priority} priority
            </span>
          </div>
        </div>
        {!habit.archived && (
          <Checkbox
            checked={done}
            disabled={busy}
            onChange={onToggle}
            aria-label={`Mark ${habit.label} ${done ? 'not done' : 'done'} ${habit.frequency === 'weekly' ? 'this week' : 'today'}`}
          />
        )}
      </div>
      <div className="habit-card__bottom">
        <div>
          <span className="habit-card__stat-label">Streak</span>
          <span className="habit-card__stat">
            {streak} <small>{unit}</small>
          </span>
        </div>
        <div>
          <span className="habit-card__stat-label">30-day rate</span>
          <span className="habit-card__stat habit-card__stat--muted">{rate30 === null ? '—' : `${rate30}%`}</span>
        </div>
        <button
          type="button"
          className="habit-card__right habit-card__points-btn"
          onClick={() => openHistory({ kind: 'aura-points', habitId: habit.id })}
          aria-label={`Aura points for ${habit.label}: view history`}
        >
          <span className="habit-card__stat-label">XP / tick</span>
          <span className="habit-card__points">+{XP_RULES.habit}</span>
        </button>
      </div>
      <div className="habit-card__actions">
        {habit.archived && <Badge>Archived</Badge>}
        <button type="button" className="habit-card__link" onClick={onHistory}>History</button>
        <IconButton label={`Edit ${habit.label}`} size="sm" plain onClick={onEdit}>
          ✎
        </IconButton>
      </div>
    </Card>
  );
}
