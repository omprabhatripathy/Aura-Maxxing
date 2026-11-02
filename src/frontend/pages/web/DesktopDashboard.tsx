import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import AuraRadar from '../../components/shared/AuraRadar';
import WeeklyBarChart from '../../components/shared/WeeklyBarChart';
import MoodCheckIn from '../../components/shared/MoodCheckIn';
import HabitPill from '../../components/shared/HabitPill';
import NeonFlame from '../../components/shared/NeonFlame';
import WidgetCard from '../../components/web/WidgetCard';
import { ArrowLink, EmptyState, MoodIcon, ProgressBar, ProgressRing } from '../../components/shared/ui';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import { Parallax, Reveal, Stagger, StaggerItem } from '../../animations/Reveal';
import { useAuth } from '../../context/useAuth';
import { useTodo } from '../../context/useTodo';
import { useScoreHistory } from '../../context/useScoreHistory';
import { greeting, useDashboardData } from '../../hooks/useDashboardData';
import { AREA_LABELS, AREAS } from '../../../backend/analytics/radar';
import { addDays, formatDate, formatDateTime, fromIso } from '../../../backend/core/dates';
import { productivityScore, taskInsights, taskSummary, weeklyCompletion } from '../../../backend/todo/analytics';
import { MOOD_META, MOOD_ORDER } from '../../icons/moodMeta';
import './DesktopDashboard.css';

export default function DesktopDashboard() {
  const { profile } = useAuth();
  const d = useDashboardData();
  const todo = useTodo();
  const openHistory = useScoreHistory();

  const tasks = useMemo(() => taskSummary(todo.tasks, todo.today, todo.now), [todo.tasks, todo.today, todo.now]);
  const productivity = useMemo(
    () => ({
      score: productivityScore(todo.tasks, todo.sessions, todo.today),
      weekly: weeklyCompletion(todo.tasks, todo.today),
      insights: taskInsights(todo.tasks, todo.sessions, todo.today, todo.now).slice(0, 3),
    }),
    [todo.tasks, todo.sessions, todo.today, todo.now]
  );

  const moodCounts = useMemo(() => {
    const from = addDays(d.today, -13);
    const counts = new Map(MOOD_ORDER.map((m) => [m, 0]));
    for (const log of d.moodLogs) if (log.date >= from) counts.set(log.mood, (counts.get(log.mood) ?? 0) + 1);
    const max = Math.max(1, ...counts.values());
    return MOOD_ORDER.map((m) => ({ mood: m, count: counts.get(m)!, share: Math.round((counts.get(m)! / max) * 100) }));
  }, [d.moodLogs, d.today]);

  if (d.error) return <ErrorState message={d.error} onRetry={d.retry} />;
  if (d.loading) return <PageSkeleton cards={6} />;

  const recentJournals = d.journalEntries.slice(0, 3);
  const goalList = d.activeGoals.slice(0, 4);
  const recentActivity = d.activity.slice(0, 6);
  const insights = [...productivity.insights, ...d.report.insights].slice(0, 4);

  return (
    <div className="web-dash" data-no-auto-reveal>
      {/* ---------- Hero ---------- */}
      <Reveal as="section" className="web-dash__hero">
        <Parallax className="web-dash__hero-orbs" strength={60} />
        <div className="web-dash__hero-text">
          <p className="web-dash__hero-date">{formatDate(d.today, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h2 className="web-dash__hero-title">
            {greeting()}, <span>{profile?.username ?? 'there'}</span>
          </h2>
          <p className="web-dash__hero-sub">
            {d.active.length
              ? `${d.doneCount} of ${d.active.length} habits done · +${d.pointsToday} XP · ${tasks.dueToday} task${tasks.dueToday === 1 ? '' : 's'} due today`
              : 'Create a habit to start earning XP.'}
          </p>
          <div className="web-dash__hero-chips">
            <button type="button" className="web-dash__chip" onClick={() => openHistory({ kind: 'aura-score' })} title="See how your Aura score is built">
              Aura <strong>{d.report.overall}</strong>/100
              {d.report.previousOverall > 0 && <em className={d.trend >= 0 ? 'is-up' : 'is-down'}>{d.trend >= 0 ? `+${d.trend}` : d.trend}</em>}
            </button>
            <button type="button" className="web-dash__chip" onClick={() => openHistory({ kind: 'streak' })} title="See your streak history">
              <NeonFlame size={16} lit={d.report.streak > 0} /> <strong>{d.report.streak}</strong> day streak
            </button>
            <button type="button" className="web-dash__chip" onClick={() => openHistory({ kind: 'streak' })} title="See your streak history">
              Best <strong>{d.report.longestStreak}</strong> days
            </button>
          </div>
        </div>
        <div className="web-dash__hero-ring" aria-label={`Today's habit completion ${d.completion}%`}>
          <ProgressRing value={d.completion} size={132} label="Today" />
        </div>
      </Reveal>

      {/* ---------- Today's overview ---------- */}
      <Stagger className="web-dash__overview">
        <StaggerItem className="web-dash__tile" direction="up">
          <span className="web-dash__tile-label">Habits today</span>
          <span className="web-dash__tile-value">
            {d.doneCount}
            <small>/{d.active.length}</small>
          </span>
          <span className="web-dash__tile-sub">{d.completion}% complete</span>
        </StaggerItem>
        <StaggerItem className="web-dash__tile" direction="up">
          <span className="web-dash__tile-label">Tasks due</span>
          <span className="web-dash__tile-value">{tasks.dueToday}</span>
          <span className="web-dash__tile-sub">{tasks.overdue ? `${tasks.overdue} overdue` : `${tasks.completedToday} completed today`}</span>
        </StaggerItem>
        <StaggerItem className="web-dash__tile" direction="up">
          <button type="button" className="web-dash__tile-btn" onClick={() => openHistory({ kind: 'wellbeing' })}>
            <span className="web-dash__tile-label">Mood</span>
            <span className="web-dash__tile-value web-dash__tile-value--mood">
              {d.lastMood ? <MoodIcon mood={d.lastMood.mood} size={30} /> : '—'}
              {d.lastMood ? MOOD_META[d.lastMood.mood].label : ''}
            </span>
            <span className="web-dash__tile-sub">{d.loggedMoodToday ? 'Logged today' : 'Not logged today'} · history ›</span>
          </button>
        </StaggerItem>
        <StaggerItem className="web-dash__tile" direction="up">
          <button type="button" className="web-dash__tile-btn" onClick={() => openHistory({ kind: 'aura-points' })}>
            <span className="web-dash__tile-label">XP today</span>
            <span className="web-dash__tile-value">+{d.pointsToday}</span>
            <span className="web-dash__tile-sub">Earned today · history ›</span>
          </button>
        </StaggerItem>
      </Stagger>

      {/* ---------- Widget grid ---------- */}
      <Stagger className="web-dash__grid">
        <StaggerItem className="web-dash__cell web-dash__cell--radar">
          <WidgetCard eyebrow="Last 30 days" title="Aura balance" accent="#a855f7" action={<ArrowLink to="/analytics">Analytics</ArrowLink>}>
            <div className="web-dash__radar">
              <AuraRadar current={d.report.current.scores} />
              <div className="web-dash__radar-bars">
                {AREAS.map((key) =>
                  d.report.current.coverage[key] ? (
                    <ProgressBar key={key} label={AREA_LABELS[key]} value={d.report.current.scores[key]} />
                  ) : (
                    <p key={key} className="web-dash__muted">
                      {AREA_LABELS[key]}: no data yet
                    </p>
                  )
                )}
              </div>
            </div>
          </WidgetCard>
        </StaggerItem>

        <StaggerItem className="web-dash__cell web-dash__cell--weekly">
          <WidgetCard eyebrow="Weekly progress" title={d.weeklyAverage === null ? 'No habits yet' : `${d.weeklyAverage}% average`} accent="#22c55e">
            <WeeklyBarChart values={d.weekValues} labels={d.week.map((w) => fromIso(w.date).toLocaleDateString('en-US', { weekday: 'short' }))} />
          </WidgetCard>
        </StaggerItem>

        <StaggerItem className="web-dash__cell web-dash__cell--mood">
          <WidgetCard eyebrow="Mood summary" title={d.report.wellbeing === null ? 'Wellbeing —' : `Wellbeing ${d.report.wellbeing}/100`} accent="#ec4899">
            <ul className="web-dash__mood-bars">
              {moodCounts.map((m) => (
                <li key={m.mood}>
                  <MoodIcon mood={m.mood} size={20} />
                  <span className="web-dash__mood-name">{MOOD_META[m.mood].label}</span>
                  <span className="web-dash__mood-track">
                    <span style={{ width: `${m.share}%` }} />
                  </span>
                  <span className="web-dash__mood-count">{m.count}</span>
                </li>
              ))}
            </ul>
            <MoodCheckIn onSelect={d.handleMood} busy={d.isPending('mood')} />
          </WidgetCard>
        </StaggerItem>

        <StaggerItem className="web-dash__cell web-dash__cell--habits">
          <WidgetCard eyebrow="Habit completion" title="Today's habits" accent="#22c55e" action={<ArrowLink to="/habits">Manage</ArrowLink>}>
            {d.active.length === 0 ? (
              <EmptyState action={<Link to="/habits">Create your first habit</Link>}>No habits yet.</EmptyState>
            ) : (
              <div className="web-dash__habits">
                {d.active.map((h) => (
                  <HabitPill key={h.id} habit={h} done={d.isHabitDone(h)} busy={d.isPending(`toggle:${h.id}`)} onToggle={() => d.toggleHabit(h)} />
                ))}
              </div>
            )}
          </WidgetCard>
        </StaggerItem>

        <StaggerItem className="web-dash__cell web-dash__cell--goals">
          <WidgetCard eyebrow="Goal status" title={`${d.activeGoals.length} active goal${d.activeGoals.length === 1 ? '' : 's'}`} accent="#f59e0b" action={<ArrowLink to="/goals">All goals</ArrowLink>}>
            {goalList.length === 0 ? (
              <EmptyState action={<Link to="/goals">Set a goal</Link>}>No active goals.</EmptyState>
            ) : (
              <ul className="web-dash__goals">
                {goalList.map((g) => (
                  <li key={g.id}>
                    <ProgressBar label={g.title} value={g.progress} suffix="%" />
                    <span className="web-dash__muted">
                      {g.milestonesComplete}/{g.milestones} milestones{g.dueDate ? ` · due ${formatDate(g.dueDate)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </WidgetCard>
        </StaggerItem>

        <StaggerItem className="web-dash__cell web-dash__cell--journals">
          <WidgetCard eyebrow="Recent journals" title="Your latest reflections" accent="#3b82f6" action={<ArrowLink to="/journal">Journal</ArrowLink>}>
            {recentJournals.length === 0 ? (
              <EmptyState action={<Link to="/journal">Write an entry</Link>}>Nothing written yet.</EmptyState>
            ) : (
              <ul className="web-dash__journals">
                {recentJournals.map((j) => (
                  <li key={j.id}>
                    <div className="web-dash__journal-meta">
                      {j.mood && <MoodIcon mood={j.mood} size={18} />}
                      <span>{formatDate(j.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span>· {j.wordCount} words</span>
                    </div>
                    <p className="web-dash__journal-text">{j.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </WidgetCard>
        </StaggerItem>

        <StaggerItem className="web-dash__cell web-dash__cell--productivity">
          <WidgetCard eyebrow="Productivity insights" title={`Score ${productivity.score}/100`} accent="#f97316" action={<ArrowLink to="/todo">Todo</ArrowLink>}>
            <div className="web-dash__prod-stats">
              <div>
                <span className="web-dash__tile-label">Weekly completion</span>
                <strong>{productivity.weekly === null ? '—' : `${productivity.weekly}%`}</strong>
              </div>
              <div>
                <span className="web-dash__tile-label">In progress</span>
                <strong>{tasks.inProgress}</strong>
              </div>
              <div>
                <span className="web-dash__tile-label">Open</span>
                <strong>{tasks.open}</strong>
              </div>
            </div>
            {insights.length ? (
              <ul className="web-dash__insights">
                {insights.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            ) : (
              <p className="web-dash__muted">Log habits, tasks and moods to unlock insights.</p>
            )}
          </WidgetCard>
        </StaggerItem>

        <StaggerItem className="web-dash__cell web-dash__cell--activity">
          <WidgetCard eyebrow="Activity snapshot" title="Recent activity" accent="#22d3ee" action={<ArrowLink to="/trackers">History</ArrowLink>}>
            {recentActivity.length === 0 ? (
              <p className="web-dash__muted">No activity yet.</p>
            ) : (
              <ul className="web-dash__activity">
                {recentActivity.map((a) => (
                  <li key={a.id}>
                    <span className="web-dash__activity-dot" aria-hidden="true" />
                    <span className="web-dash__activity-text">{a.message}</span>
                    <time className="web-dash__muted">{formatDateTime(a.createdAt)}</time>
                  </li>
                ))}
              </ul>
            )}
          </WidgetCard>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
