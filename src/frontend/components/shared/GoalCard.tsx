import Card from './Card';
import ProgressRing from './ProgressRing';
import { Badge } from './ui/Layout';
import { diffDays, formatDate } from '../../../backend/core/dates';
import type { Goal, GoalStatus } from '../../../backend/models';
import './GoalCard.css';

const statusLabel: Record<GoalStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  complete: 'Complete',
};

const statusTone: Record<GoalStatus, 'default' | 'primary' | 'success'> = {
  'not-started': 'default',
  'in-progress': 'primary',
  complete: 'success',
};

interface GoalCardProps {
  goal: Goal;
  today: string;
  busy?: boolean;
  onMilestone: (delta: 1 | -1) => void;
  onEdit: () => void;
  onHistory: () => void;
  onDelete: () => void;
}

function dueLabel(goal: Goal, today: string): { text: string; overdue: boolean } | null {
  if (!goal.dueDate) return null;
  if (goal.status === 'complete') return { text: `Due ${formatDate(goal.dueDate)}`, overdue: false };
  const days = diffDays(today, goal.dueDate);
  if (days < 0) return { text: `Overdue by ${-days} day${days === -1 ? '' : 's'}`, overdue: true };
  if (days === 0) return { text: 'Due today', overdue: false };
  return { text: `Due in ${days} day${days === 1 ? '' : 's'}`, overdue: false };
}

export default function GoalCard({ goal, today, busy, onMilestone, onEdit, onHistory, onDelete }: GoalCardProps) {
  const due = dueLabel(goal, today);
  return (
    <Card className="goal-card">
      <div className="goal-card__row">
        <div className="goal-card__body">
          <h3 className="text-headline-md">{goal.title}</h3>
          {goal.detail && <p className="text-muted">{goal.detail}</p>}
          <div className="goal-card__badges">
            <Badge tone={statusTone[goal.status]}>{statusLabel[goal.status]}</Badge>
            <Badge>{goal.term === 'short' ? 'Short-term' : 'Long-term'}</Badge>
            {due && <Badge tone={due.overdue ? 'danger' : 'default'}>{due.text}</Badge>}
            <Badge>
              {goal.milestonesComplete}/{goal.milestones} milestones
            </Badge>
            {goal.completedAt && <Badge tone="success">Completed {formatDate(goal.completedAt.slice(0, 10))}</Badge>}
          </div>
          <ol className="goal-card__milestones" aria-label="Milestones">
            {goal.milestoneNames.map((name, i) => {
              const done = i < goal.milestonesComplete;
              const next = i === goal.milestonesComplete;
              return (
                <li key={i} className={`goal-card__milestone${done ? ' is-done' : ''}${next ? ' is-next' : ''}`}>
                  <span className="goal-card__milestone-mark" aria-hidden="true">{done ? '✓' : i + 1}</span>
                  <span>{name}</span>
                  {done && <span className="sr-only">(done)</span>}
                </li>
              );
            })}
          </ol>
          <div className="goal-card__actions">
            {goal.status !== 'complete' && (
              <button type="button" className="goal-card__link" disabled={busy} onClick={() => onMilestone(1)}>
                + Complete “{goal.milestoneNames[goal.milestonesComplete]}”
              </button>
            )}
            {goal.milestonesComplete > 0 && (
              <button type="button" className="goal-card__link goal-card__link--muted" disabled={busy} onClick={() => onMilestone(-1)}>
                Undo milestone
              </button>
            )}
            <button type="button" className="goal-card__link goal-card__link--muted" onClick={onHistory}>
              History
            </button>
            <button type="button" className="goal-card__link goal-card__link--muted" onClick={onEdit}>
              Edit
            </button>
            <button type="button" className="goal-card__delete" onClick={onDelete}>
              Delete
            </button>
          </div>
        </div>
        <ProgressRing value={goal.progress} size={64} strokeWidth={3} />
      </div>
    </Card>
  );
}
