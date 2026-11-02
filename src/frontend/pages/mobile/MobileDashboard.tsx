import { Link } from 'react-router-dom';
import AuraRadar from '../../components/shared/AuraRadar';
import WeeklyBarChart from '../../components/shared/WeeklyBarChart';
import MoodCheckIn from '../../components/shared/MoodCheckIn';
import HabitPill from '../../components/shared/HabitPill';
import NeonFlame from '../../components/shared/NeonFlame';
import { ArrowLink, Card, EmptyState, Grid, MoodIcon, ProgressBar, ProgressRing, Section, StatCard } from '../../components/shared/ui';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import { useAuth } from '../../context/useAuth';
import { greeting, useDashboardData } from '../../hooks/useDashboardData';
import { useScoreHistory } from '../../context/useScoreHistory';
import { AREA_LABELS, AREAS } from '../../../backend/analytics/radar';
import { formatDate, formatDateTime, fromIso } from '../../../backend/core/dates';
import { MOOD_META } from '../../icons/moodMeta';
import './MobileDashboard.css';

export default function MobileDashboard() {
  const { profile } = useAuth();
  const {
    report,
    today,
    loading,
    error,
    retry,
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
  } = useDashboardData();
  const openHistory = useScoreHistory();

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading) return <PageSkeleton cards={4} />;

  return (
    <div className="home">
      <header className="home__header">
        <div className="home__header-text">
          <p className="home__date">{formatDate(today, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          <h1 className="home__greeting">
            {greeting()}, {profile?.username ?? 'there'}
          </h1>
          <span className="home__hero-sub">
            {active.length ? (
              <>
                {doneCount}/{active.length} habits ·{' '}
                <button type="button" className="score-link" onClick={() => openHistory({ kind: 'aura-points' })}>
                  +{pointsToday} XP today
                </button>
              </>
            ) : (
              'Create a habit to start earning XP.'
            )}
          </span>
        </div>
        <div className="home__header-ring" aria-label={`Today's habit completion ${completion}%`}>
          <ProgressRing value={completion} size={88} label="Today" />
        </div>
      </header>

      <div className="home__bento">
        <Card className="home__hero-card" glow>
          <div className="home__hero-radar">
            <p className="home__eyebrow">Aura Balance · last 30 days</p>
            <AuraRadar current={report.current.scores} />
          </div>
          <div className="home__hero-scores">
            <p className="home__eyebrow">Breakdown</p>
            {AREAS.map((key) =>
              report.current.coverage[key] ? (
                <ProgressBar key={key} label={AREA_LABELS[key]} value={report.current.scores[key]} />
              ) : (
                <p key={key} className="home__no-data">
                  {AREA_LABELS[key]}: <span className="text-muted">no data yet</span>
                </p>
              )
            )}
            <div className="home__hero-links">
              <ArrowLink to="/analytics">Full analytics</ArrowLink>
            </div>
          </div>
        </Card>

        <Card className="home__streak-card" onClick={() => openHistory({ kind: 'streak' })} ariaLabel={`Current streak ${report.streak} days: view history`}>
          <div className="home__streak-top">
            <p className="home__eyebrow">Current Streak</p>
            <NeonFlame size={26} lit={report.streak > 0} />
          </div>
          <span className="home__stat-xl">{report.streak}</span>
          <span className="home__stat-sub">Days in a row · best {report.longestStreak}</span>
          <div className="home__streak-dots" aria-hidden="true">
            {week.map((d) => (
              <div key={d.date} className={`home__streak-dot ${d.percent ? 'home__streak-dot--filled' : ''}`} />
            ))}
          </div>
        </Card>

        <Card className="home__mood-card-small" onClick={() => openHistory({ kind: 'wellbeing' })} ariaLabel="Latest mood and wellbeing: view history">
          <p className="home__eyebrow">Latest Mood</p>
          <div className="home__mood-current">
            <div className="home__mood-avatar">{lastMood ? <MoodIcon mood={lastMood.mood} size={34} /> : '—'}</div>
            <div>
              <span className="home__mood-label">{lastMood ? MOOD_META[lastMood.mood].label : 'Not logged'}</span>
              <span className="home__mood-sub">{lastMood ? formatDateTime(lastMood.createdAt) : 'Log your first mood below'}</span>
            </div>
          </div>
          <span className="home__stat-sub">Wellbeing (14d): {report.wellbeing === null ? '—' : `${report.wellbeing}/100`}</span>
        </Card>

        <Card className="home__consistency-card">
          <div className="home__consistency-head">
            <p className="home__eyebrow">Weekly Consistency</p>
            <span className="home__consistency-avg">{weeklyAverage === null ? 'No habits yet' : `${weeklyAverage}% avg`}</span>
          </div>
          <WeeklyBarChart values={weekValues} labels={week.map((d) => fromIso(d.date).toLocaleDateString('en-US', { weekday: 'narrow' }))} />
        </Card>
      </div>

      <Section title={loggedMoodToday ? 'Log another mood check-in' : 'How are you feeling today?'}>
        <MoodCheckIn onSelect={handleMood} busy={isPending('mood')} />
      </Section>

      <Section title="Today's Habits" action={<ArrowLink to="/habits">Manage</ArrowLink>}>
        {active.length === 0 ? (
          <EmptyState action={<Link to="/habits">Create your first habit</Link>}>No habits yet.</EmptyState>
        ) : (
          <div className="home__habit-scroll">
            {active.map((h) => {
              const done = isHabitDone(h);
              return (
                <HabitPill
                  key={h.id}
                  habit={h}
                  done={done}
                  busy={isPending(`toggle:${h.id}`)}
                  onToggle={() => toggleHabit(h)}
                />
              );
            })}
          </div>
        )}
      </Section>

      <Grid minItemWidth={220}>
        <StatCard
          label="Overall Score"
          value={`${report.overall}/100`}
          trend={report.previous.coverage && report.previousOverall ? trend : undefined}
          description={report.previousOverall ? 'vs. previous 30 days' : 'Builds as you log more activity'}
          onClick={() => openHistory({ kind: 'aura-score' })}
        />
        <StatCard
          label="Goals"
          value={`${activeGoals.length} active`}
          description={nextGoal ? <>Next due: {nextGoal.title} ({formatDate(nextGoal.dueDate!)})</> : <ArrowLink to="/goals">Set a goal</ArrowLink>}
        />
        <StatCard
          label={report.weakest ? `Focus: ${AREA_LABELS[report.weakest]}` : 'Insight'}
          value={report.weakest ? `${report.current.scores[report.weakest]}/100` : '—'}
          description={report.insights[0] ?? 'Log habits, moods and journal entries to unlock insights.'}
        />
      </Grid>
    </div>
  );
}
