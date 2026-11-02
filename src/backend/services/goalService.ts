import { paths, type WriteOp } from '../db';
import { newId, nowIso } from '../core/ids';
import { ValidationError } from '../core/errors';
import { validateGoal, type GoalInput } from '../validators';
import type { Goal, GoalProgress, GoalProgressType } from '../models';
import { activityOp, commit, deleteOp, setOp } from './ops';

function progressOf(milestonesComplete: number, milestones: number): number {
  return Math.round((milestonesComplete / milestones) * 100);
}

function progressEvent(uid: string, goalId: string, type: GoalProgressType, milestonesComplete: number, milestones: number): WriteOp {
  return setOp(paths.goalProgress(uid), newId(), {
    goalId,
    type,
    progress: progressOf(milestonesComplete, milestones),
    milestonesComplete,
    createdAt: nowIso(),
  });
}

export async function createGoal(uid: string, input: GoalInput, today: string): Promise<string> {
  const valid = validateGoal(input, today);
  const id = newId();
  const now = nowIso();
  await commit([
    setOp(paths.goals(uid), id, { ...valid, milestonesComplete: 0, progress: 0, status: 'not-started', createdAt: now, updatedAt: now, completedAt: null }),
    progressEvent(uid, id, 'created', 0, valid.milestones),
    activityOp(uid, 'goal-created', `Created goal: ${valid.title}`, id),
  ]);
  return id;
}

/** Edits a goal; changing the milestone total recalculates progress and may complete or reopen it. */
export async function updateGoal(uid: string, goal: Goal, input: GoalInput, today: string): Promise<void> {
  const valid = validateGoal(input, today, { allowPastDue: input.dueDate === goal.dueDate, minMilestones: goal.milestonesComplete });
  const progress = progressOf(goal.milestonesComplete, valid.milestones);
  const nowComplete = progress >= 100;
  const wasComplete = goal.status === 'complete';
  const ops: WriteOp[] = [
    setOp(
      paths.goals(uid),
      goal.id,
      {
        ...valid,
        progress,
        status: nowComplete ? 'complete' : progress > 0 ? 'in-progress' : 'not-started',
        completedAt: nowComplete ? goal.completedAt ?? nowIso() : null,
        updatedAt: nowIso(),
      },
      true
    ),
    progressEvent(uid, goal.id, nowComplete && !wasComplete ? 'completed' : wasComplete && !nowComplete ? 'reopened' : 'edited', goal.milestonesComplete, valid.milestones),
    activityOp(uid, 'goal-updated', `Updated goal: ${valid.title}`, goal.id),
  ];
  if (nowComplete && !wasComplete) ops.push(activityOp(uid, 'goal-completed', `Completed goal: ${valid.title}`, goal.id));
  await commit(ops);
}

/** Completes (+1) or undoes (-1) a milestone, recording progress history and completion events. */
export async function changeMilestone(uid: string, goal: Goal, delta: 1 | -1): Promise<void> {
  const next = goal.milestonesComplete + delta;
  if (next < 0 || next > goal.milestones) throw new ValidationError(delta > 0 ? 'All milestones are already complete.' : 'No milestones to undo.');
  const progress = progressOf(next, goal.milestones);
  const completing = progress >= 100 && goal.status !== 'complete';
  const reopening = goal.status === 'complete' && progress < 100;
  const now = nowIso();
  const ops: WriteOp[] = [
    setOp(
      paths.goals(uid),
      goal.id,
      {
        milestonesComplete: next,
        progress,
        status: progress >= 100 ? 'complete' : progress > 0 ? 'in-progress' : 'not-started',
        completedAt: progress >= 100 ? goal.completedAt ?? now : null,
        updatedAt: now,
      },
      true
    ),
    progressEvent(uid, goal.id, delta > 0 ? 'milestone' : 'milestone-undone', next, goal.milestones),
  ];
  if (delta > 0) ops.push(activityOp(uid, 'milestone-completed', `Milestone ${next}/${goal.milestones} (${goal.milestoneNames[next - 1] ?? `Milestone ${next}`}) for ${goal.title}`, goal.id));
  if (completing) {
    ops.push(progressEvent(uid, goal.id, 'completed', next, goal.milestones));
    ops.push(activityOp(uid, 'goal-completed', `Completed goal: ${goal.title}`, goal.id));
  }
  if (reopening) ops.push(progressEvent(uid, goal.id, 'reopened', next, goal.milestones));
  await commit(ops);
}

export async function deleteGoal(uid: string, goal: Goal, history: GoalProgress[]): Promise<void> {
  await commit([
    deleteOp(paths.goals(uid), goal.id),
    ...history.filter((h) => h.goalId === goal.id).map((h) => deleteOp(paths.goalProgress(uid), h.id)),
    activityOp(uid, 'goal-deleted', `Deleted goal: ${goal.title}`, goal.id),
  ]);
}
