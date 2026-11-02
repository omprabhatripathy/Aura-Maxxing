import { useMemo } from 'react';
import { useUserData } from '../context/useUserData';
import { useAction } from './useAction';
import { setHabitCompletion } from '../../backend/services/habitService';
import { logMood } from '../../backend/services/journalService';
import { dailyCompletionSeries, isDone } from '../../backend/analytics/habits';
import { PRIORITY_WEIGHT, type Habit, type Mood } from '../../backend/models';
import { MOOD_META } from '../icons/moodMeta';

export function greeting(hour = new Date().getHours()): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Dashboard numbers + actions shared by the mobile and desktop dashboards. */
export function useDashboardData() {
  const data = useUserData();
  const { uid, habits, logsByHabit, goals, moodLogs, report, today } = data;
  const { run, isPending } = useAction();

  const active = useMemo(
    () => habits.filter((h) => !h.archived).sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]),
    [habits]
  );
  const doneCount = active.filter((h) => isDone(h, logsByHabit, today)).length;
  const completion = active.length ? Math.round((doneCount / active.length) * 100) : 0;
  const pointsToday = data.progression.xp.today;
  const week = useMemo(() => dailyCompletionSeries(active, logsByHabit, today, 7), [active, logsByHabit, today]);
  const weekValues = week.map((d) => d.percent);
  const scheduled = weekValues.filter((v): v is number => v !== null);
  const weeklyAverage = scheduled.length ? Math.round(scheduled.reduce((a, b) => a + b, 0) / scheduled.length) : null;
  const lastMood = moodLogs[0];
  const loggedMoodToday = moodLogs.some((m) => m.date === today);
  const activeGoals = goals.filter((g) => g.status !== 'complete');
  const nextGoal = [...activeGoals].filter((g) => g.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0];
  const trend = report.overall - report.previousOverall;

  const handleMood = (mood: Mood) => {
    void run('mood', () => logMood(uid, mood, '', today), { success: `Mood logged: ${MOOD_META[mood].label}` });
  };

  const isHabitDone = (h: Habit) => isDone(h, logsByHabit, today);
  const toggleHabit = (h: Habit) => {
    const done = isHabitDone(h);
    void run(`toggle:${h.id}`, () => setHabitCompletion(uid, h, today, !done), { error: 'Could not update this habit.' });
  };

  return {
    ...data,
    isPending,
    active,
    doneCount,
    completion,
    pointsToday,
    week,
    weekValues,
    weeklyAverage,
    lastMood,
    loggedMoodToday,
    activeGoals,
    nextGoal,
    trend,
    handleMood,
    isHabitDone,
    toggleHabit,
  };
}
