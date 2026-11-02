import type { Habit } from '../../../backend/models';
import { habitIcon } from '../../lib/habitEmoji';
import './HabitPill.css';

interface HabitPillProps {
  habit: Habit;
  done: boolean;
  busy?: boolean;
  onToggle: () => void;
}

export default function HabitPill({ habit, done, busy, onToggle }: HabitPillProps) {
  return (
    <button
      type="button"
      aria-pressed={done}
      disabled={busy}
      className={`habit-pill ${done ? 'habit-pill--complete' : ''}`}
      onClick={onToggle}
    >
      <span className="habit-pill__check">{done ? '✓' : ''}</span>
      <span>
        <span className="habit-pill__title">
          <span aria-hidden="true">{habitIcon(habit)} </span>
          {habit.label}
        </span>
        <span className="habit-pill__sub">
          {habit.category}
          {habit.frequency === 'weekly' ? ' · this week' : ''}
        </span>
      </span>
    </button>
  );
}
