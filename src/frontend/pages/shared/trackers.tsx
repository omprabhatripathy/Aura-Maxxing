import { useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import TrendBars from '../../components/shared/charts/TrendBars';
import TrendLine from '../../components/shared/charts/TrendLine';
import MoodOverview from '../../components/shared/health/MoodOverview';
import { Card, EmptyState, Grid, PageHeader, SegmentedControl, Select, StatCard, Timeline } from '../../components/shared/ui';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import { useUserData } from '../../context/useUserData';
import { completionRate, dailyCompletionSeries, isDone } from '../../../backend/analytics/habits';
import { goalStats, journalStats } from '../../../backend/analytics/metrics';
import { addDays, formatDate, formatDateTime, isoFromTimestamp, weekStart } from '../../../backend/core/dates';
import type { ActivityType } from '../../../backend/models';
import './trackers.css';

type TabKey = 'habits' | 'goals' | 'journal' | 'mood' | 'activity';

const TABS: { value: TabKey; label: string }[] = [
  { value: 'habits', label: 'Habits' },
  { value: 'goals', label: 'Goals' },
  { value: 'journal', label: 'Journal' },
  { value: 'mood', label: 'Mood' },
  { value: 'activity', label: 'All activity' },
];

const ACTIVITY_GROUPS: Record<TabKey, ActivityType[] | null> = {
  habits: ['habit-created', 'habit-updated', 'habit-archived', 'habit-deleted', 'habit-completed'],
  goals: ['goal-created', 'goal-updated', 'goal-deleted', 'goal-completed', 'milestone-completed'],
  journal: ['journal-created', 'journal-updated', 'journal-deleted'],
  mood: ['mood-logged'],
  activity: null,
};

const FEED_FILTERS = [
  { value: 'all', label: 'Everything' },
  { value: 'habits', label: 'Habits' },
  { value: 'goals', label: 'Goals' },
  { value: 'journal', label: 'Journal' },
  { value: 'mood', label: 'Mood' },
  { value: 'account', label: 'Account & achievements' },
] as const;
type FeedFilter = (typeof FEED_FILTERS)[number]['value'];

export default function Trackers() {
  const data = useUserData();
  const { habits, habitLogs, logsByHabit, goals, goalProgress, journalEntries, activity, report, today, loading, error, retry } = data;
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: TabKey = TABS.some((t) => t.value === requested) ? (requested as TabKey) : 'habits';
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');

  const active = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const habitSeries = useMemo(() => dailyCompletionSeries(active, logsByHabit, today, 30), [active, logsByHabit, today]);
  const gStats = useMemo(() => goalStats(goals, goalProgress, today), [goals, goalProgress, today]);
  const jStats = useMemo(() => journalStats(journalEntries, today), [journalEntries, today]);

  const timeline = useMemo(() => {
    let types: ActivityType[] | null = null;
    if (tab === 'activity') {
      if (feedFilter === 'account') types = ['login', 'registration', 'achievement-unlocked', 'profile-updated', 'data-exported'];
      else if (feedFilter !== 'all') types = ACTIVITY_GROUPS[feedFilter];
    } else {
      types = ACTIVITY_GROUPS[tab];
    }
    return activity.filter((a) => !types || types.includes(a.type)).slice(0, 100);
  }, [activity, tab, feedFilter]);

  // Analytics moved to its own page; keep old links working.
  if (requested === 'analytics') return <Navigate to="/analytics" replace />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading) return <PageSkeleton />;

  const milestoneWeeks = Array.from({ length: 8 }, (_, i) => {
    const week = addDays(weekStart(today), (i - 7) * 7);
    return { label: formatDate(week), value: goalProgress.filter((g) => g.type === 'milestone' && weekStart(isoFromTimestamp(g.createdAt)) === week).length };
  });
  const goalTitle = new Map(goals.map((g) => [g.id, g.title]));

  return (
    <div className="trackers-page">
      <PageHeader eyebrow="Trackers" title="Activity & History" subtitle="Every action you take is recorded here and feeds your analytics." />

      <SegmentedControl ariaLabel="Tracker" options={TABS} value={tab} onChange={(t) => setParams({ tab: t })} />

      {tab === 'habits' && (
        <>
          <Grid minItemWidth={160}>
            <StatCard label="Today" value={`${active.filter((h) => isDone(h, logsByHabit, today)).length}/${active.length}`} description="Habits done" />
            <StatCard label="7-day rate" value={report.completionRate7d === null ? '—' : `${report.completionRate7d}%`} description="Priority-weighted" />
            <StatCard label="30-day rate" value={`${completionRate(active, logsByHabit, addDays(today, -29), today) ?? 0}%`} />
            <StatCard label="Streak" value={`${report.streak} d`} description={`Longest: ${report.longestStreak} d`} />
            <StatCard label="Completions" value={habitLogs.length} description="All time" />
          </Grid>
          <Card title="Daily completion · last 30 days">
            {active.length ? (
              <TrendLine
                labels={habitSeries.map((d) => formatDate(d.date))}
                series={[{ label: 'Completion %', values: habitSeries.map((d) => d.percent) }]}
                max={100}
                ariaLabel="Line chart of daily habit completion percentage over the last 30 days"
              />
            ) : (
              <EmptyState>Create a habit to start tracking completion.</EmptyState>
            )}
          </Card>
        </>
      )}

      {tab === 'goals' && (
        <>
          <Grid minItemWidth={160}>
            <StatCard label="Completed" value={gStats.completed} description={`of ${gStats.total} goals`} />
            <StatCard label="Success rate" value={gStats.successRate === null ? '—' : `${gStats.successRate}%`} />
            <StatCard label="Overdue" value={gStats.overdue} />
            <StatCard label="Milestones" value={`${gStats.milestonesDone}/${gStats.milestonesTotal}`} />
            <StatCard label="Avg. time to finish" value={gStats.avgDaysToComplete === null ? '—' : `${gStats.avgDaysToComplete} d`} />
          </Grid>
          <Card title="Milestones completed per week">
            <TrendBars points={milestoneWeeks} valueLabel="Milestones" ariaLabel="Bar chart of milestones completed per week over the last 8 weeks" />
          </Card>
          <Card title="Progress timeline">
            {goalProgress.length === 0 ? (
              <EmptyState>No goal progress yet.</EmptyState>
            ) : (
              <Timeline
                items={[...goalProgress]
                  .reverse()
                  .slice(0, 50)
                  .map((g) => ({
                    id: g.id,
                    title: `${goalTitle.get(g.goalId) ?? 'Deleted goal'}: ${g.type.replace('-', ' ')} — ${g.progress}%`,
                    time: formatDateTime(g.createdAt),
                  }))}
              />
            )}
          </Card>
        </>
      )}

      {tab === 'journal' && (
        <>
          <Grid minItemWidth={160}>
            <StatCard label="Entries" value={jStats.total} description={`${jStats.last7} this week · ${jStats.last30} this month`} />
            <StatCard label="Writing streak" value={`${jStats.writingStreak} d`} />
            <StatCard label="Words" value={jStats.totalWords.toLocaleString()} description={`avg ${jStats.avgWords}`} />
            <StatCard label="Most active day" value={jStats.topWeekday ?? '—'} />
          </Grid>
          <Card title="Words written per week">
            <TrendBars points={jStats.weekly.map((w) => ({ label: formatDate(w.week), value: w.words }))} valueLabel="Words" ariaLabel="Bar chart of words written per week" />
          </Card>
        </>
      )}

      {tab === 'mood' && <MoodOverview />}

      <Card title={tab === 'activity' ? 'Activity feed' : 'Timeline'}>
        {tab === 'activity' && <Select aria-label="Filter activity" options={[...FEED_FILTERS]} value={feedFilter} onChange={setFeedFilter} />}
        {timeline.length === 0 ? (
          <p className="text-muted">No activity recorded yet.</p>
        ) : (
          <Timeline items={timeline.map((a) => ({ id: a.id, title: a.message, time: formatDateTime(a.createdAt) }))} />
        )}
      </Card>
    </div>
  );
}
