import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MoodCheckIn from '../../components/shared/MoodCheckIn';
import MoodOverview from '../../components/shared/health/MoodOverview';
import { Card, EmptyState, Grid, PageHeader, SegmentedControl, StatCard, Timeline } from '../../components/shared/ui';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import { useAuth } from '../../context/useAuth';
import { useUserData } from '../../context/useUserData';
import { useScoreHistory } from '../../context/useScoreHistory';
import { useAction } from '../../hooks/useAction';
import { usePeriodData } from '../../hooks/usePeriodData';
import { logMood } from '../../../backend/services/journalService';
import { completionRate } from '../../../backend/analytics/habits';
import { AREA_HOW_TO } from '../../../backend/analytics/radar';
import { addDays, formatDate } from '../../../backend/core/dates';
import { CYCLE_MOOD_LABEL, type DailyLog } from '../../../backend/period/types';
import type { Mood } from '../../../backend/models';
import { MOOD_META } from '../../icons/moodMeta';
import PeriodTracker from './periodtracker';
import './health.css';

type Tab = 'overview' | 'mood' | 'cycle' | 'history';

const avg = (values: number[]) => (values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null);

function describePeriodLog(log: DailyLog): string {
  const parts: string[] = [];
  if (log.period?.isPeriodDay) parts.push(`Period day · ${log.period.flow} flow`);
  if (log.moods.length) parts.push(log.moods.map((m) => CYCLE_MOOD_LABEL[m]).join(', '));
  if (log.symptoms.length) parts.push(`${log.symptoms.length} symptom${log.symptoms.length === 1 ? '' : 's'}`);
  return parts.join(' · ') || 'Cycle log';
}

/** Cycle logs subscribe separately, so this is only mounted for users who track their cycle. */
function CycleHistory() {
  const { logs, loading } = usePeriodData();
  if (loading) return <p className="text-muted">Loading cycle history…</p>;
  const recent = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  return recent.length ? (
    <Timeline items={recent.map((l) => ({ id: l.id, title: describePeriodLog(l), time: formatDate(l.date, { weekday: 'short', month: 'short', day: 'numeric' }) }))} />
  ) : (
    <EmptyState>No cycle logs yet.</EmptyState>
  );
}

export default function HealthHub() {
  const { gender } = useAuth();
  const { uid, habits, habitLogs, logsByHabit, moodLogs, report, today, loading, error, retry } = useUserData();
  const openHistory = useScoreHistory();
  const { run, isPending } = useAction();
  const [params, setParams] = useSearchParams();
  const tracksCycle = gender === 'female';

  const tabs = useMemo(
    () => [
      { value: 'overview' as Tab, label: 'Overview' },
      { value: 'mood' as Tab, label: 'Mood tracking' },
      { value: 'cycle' as Tab, label: tracksCycle ? 'Period & cycle' : 'Cycle' },
      { value: 'history' as Tab, label: 'Health history' },
    ],
    [tracksCycle]
  );
  const requested = params.get('tab');
  const tab: Tab = tabs.some((t) => t.value === requested) ? (requested as Tab) : 'overview';

  const healthHabits = useMemo(() => habits.filter((h) => !h.archived && h.category === 'health'), [habits]);

  const wellness = (() => {
    const mood7 = avg(moodLogs.filter((m) => m.date > addDays(today, -7)).map((m) => m.score));
    const moodPrev = avg(moodLogs.filter((m) => m.date > addDays(today, -14) && m.date <= addDays(today, -7)).map((m) => m.score));
    const healthRate = healthHabits.length ? completionRate(healthHabits, logsByHabit, addDays(today, -6), today) : null;
    const lastMood = moodLogs[0]?.date ?? null;
    const insights: string[] = [];
    if (mood7 !== null && moodPrev !== null) {
      const diff = Math.round((mood7 - moodPrev) * 10) / 10;
      insights.push(
        diff === 0 ? 'Your mood has been steady compared with last week.' : `Your average mood is ${diff > 0 ? 'up' : 'down'} ${Math.abs(diff)} points compared with last week.`
      );
    }
    if (!lastMood || lastMood < addDays(today, -2)) insights.push('You haven’t checked in for a few days — a quick mood log keeps your wellbeing score accurate.');
    if (healthRate !== null) insights.push(`You completed ${healthRate}% of your health habits this week.`);
    else insights.push('Add a habit in the Health category (sleep, water, exercise…) to track your physical wellness.');
    if (report.current.coverage.wellness && report.current.scores.wellness < 60) insights.push(AREA_HOW_TO.wellness);
    if (report.current.coverage.mindfulness && report.current.scores.mindfulness < 60) insights.push(AREA_HOW_TO.mindfulness);
    return { mood7, healthRate, insights };
  })();

  const history = useMemo(() => {
    const healthIds = new Set(healthHabits.map((h) => h.id));
    const habitName = new Map(habits.map((h) => [h.id, h.label]));
    const items = [
      ...moodLogs.slice(0, 60).map((m) => ({ id: `m-${m.id}`, at: m.createdAt, title: `Mood: ${MOOD_META[m.mood].label} · ${m.score}/10` })),
      ...habitLogs.filter((l) => healthIds.has(l.habitId)).map((l) => ({ id: `h-${l.id}`, at: l.createdAt, title: `Completed ${habitName.get(l.habitId) ?? 'health habit'}` })),
    ];
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
  }, [moodLogs, habitLogs, healthHabits, habits]);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading) return <PageSkeleton />;

  const handleMood = (mood: Mood) => void run('mood', () => logMood(uid, mood, '', today), { success: `Mood logged: ${MOOD_META[mood].label}` });

  return (
    <div className="health-page">
      <PageHeader title="Health Hub" subtitle="Mood, cycle and wellness in one place — built to grow with new health features." />
      <SegmentedControl ariaLabel="Health Hub section" options={tabs} value={tab} onChange={(t) => setParams({ tab: t })} />

      {tab === 'overview' && (
        <>
          <Card title="How are you feeling?" className="health-page__checkin">
            <MoodCheckIn onSelect={handleMood} busy={isPending('mood')} />
          </Card>
          <Grid minItemWidth={160}>
            <StatCard label="Wellbeing" value={report.wellbeing === null ? '—' : `${report.wellbeing}/100`} description="Last 14 days" onClick={() => openHistory({ kind: 'wellbeing' })} />
            <StatCard label="Mood · 7 days" value={wellness.mood7 === null ? '—' : `${wellness.mood7}/10`} />
            <StatCard label="Health habits" value={wellness.healthRate === null ? '—' : `${wellness.healthRate}%`} description="This week" />
            <StatCard label="Wellness score" value={report.current.coverage.wellness ? `${report.current.scores.wellness}/100` : '—'} description="Aura radar" />
          </Grid>
          <Card title="Wellness insights">
            <ul className="health-page__insights">
              {wellness.insights.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </Card>
          <div className="health-page__modules">
            {[
              { tab: 'mood' as Tab, icon: '💜', title: 'Mood tracking', text: 'Trends, distribution and every check-in.' },
              { tab: 'cycle' as Tab, icon: '🌸', title: 'Period & cycle', text: tracksCycle ? 'Calendar, predictions and cycle analytics.' : 'Available for female profiles.' },
              { tab: 'history' as Tab, icon: '🩺', title: 'Health history', text: 'Moods, health habits and cycle logs over time.' },
            ].map((m) => (
              <button key={m.tab} type="button" className="health-page__module" onClick={() => setParams({ tab: m.tab })}>
                <span aria-hidden="true">{m.icon}</span>
                <strong>{m.title}</strong>
                <span>{m.text}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'mood' && (
        <>
          <Card title="Log a mood">
            <MoodCheckIn onSelect={handleMood} busy={isPending('mood')} />
          </Card>
          <MoodOverview />
        </>
      )}

      {tab === 'cycle' &&
        (tracksCycle ? (
          <PeriodTracker />
        ) : (
          <Card title="Period & cycle tracking">
            <p className="text-muted">
              Cycle tracking, predictions and cycle analytics are available when your profile gender is set to Female. You can change it in{' '}
              <Link to="/settings">Settings</Link>.
            </p>
          </Card>
        ))}

      {tab === 'history' && (
        <>
          <Card title="Mood & health habits">
            {history.length ? <Timeline items={history.map((h) => ({ id: h.id, title: h.title, time: new Date(h.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }))} /> : <EmptyState>No health activity yet.</EmptyState>}
          </Card>
          {tracksCycle && (
            <Card title="Cycle logs">
              <CycleHistory />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
