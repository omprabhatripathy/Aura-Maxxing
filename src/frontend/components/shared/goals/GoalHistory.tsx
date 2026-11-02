import Modal from '../ui/Modal';
import Timeline from '../ui/Timeline';
import ProgressBar from '../ui/ProgressBar';
import { formatDateTime } from '../../../../backend/core/dates';
import type { Goal, GoalProgress, GoalProgressType } from '../../../../backend/models';

const LABEL: Record<GoalProgressType, string> = {
  created: 'Goal created',
  milestone: 'Milestone completed',
  'milestone-undone': 'Milestone undone',
  completed: 'Goal completed',
  reopened: 'Goal reopened',
  edited: 'Goal edited',
};

export default function GoalHistory({ goal, history, onClose }: { goal: Goal; history: GoalProgress[]; onClose: () => void }) {
  const events = history.filter((h) => h.goalId === goal.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Modal eyebrow="Goal history" title={goal.title} size="lg" onClose={onClose}>
      <ProgressBar label="Progress" value={goal.progress} suffix="%" />
      {events.length === 0 ? (
        <p className="text-muted">No progress events recorded yet. Completing a milestone will start the timeline.</p>
      ) : (
        <Timeline
          items={events.map((e) => ({
            id: e.id,
            title: `${LABEL[e.type]}${e.type === 'milestone' && goal.milestoneNames[e.milestonesComplete - 1] ? `: ${goal.milestoneNames[e.milestonesComplete - 1]}` : ''} — ${e.milestonesComplete}/${goal.milestones} milestones (${e.progress}%)`,
            time: formatDateTime(e.createdAt),
          }))}
        />
      )}
    </Modal>
  );
}
