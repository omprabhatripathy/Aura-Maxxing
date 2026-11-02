import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatMinutes, pomodoroStats } from '../../../../backend/pomodoro/analytics';
import { planningScore, planningStats } from '../../../../backend/schedule/analytics';
import { monthKey, monthSummary } from '../../../../backend/finance/analytics';
import { addDays } from '../../../../backend/core/dates';
import type { CSSProperties, ReactNode } from 'react';
import AuraRadarPanel from './AuraRadarPanel';
import TrendLine from '../charts/TrendLine';
import { Card, EmptyState, Grid, StatCard } from '../ui';
import { useUserData } from '../../../context/useUserData';
import { useScoreHistory } from '../../../context/useScoreHistory';
import { AREA_HOW_TO, AREA_LABELS, AREAS } from '../../../../backend/analytics/radar';
import type { RadarScores } from '../../../../backend/models';
import { formatDate } from '../../../../backend/core/dates';
import { LuFlower2, LuHeartPulse, LuShieldCheck, LuSprout, LuTarget, LuWallet } from 'react-icons/lu';
import '../../../pages/shared/trackers.css';
import './AreaCards.css';

const ICON_SIZE = 26;

const AREA_CARD: Record<keyof RadarScores, { accent: string; tagline: string; chips: string[]; icon: ReactNode }> = {
  discipline: {
    accent: '#a78bfa',
    tagline: 'Habits on schedule, an unbroken activity streak and 6+ active days a week.',
    chips: ['Completion rate', 'Streak', 'Weekly consistency'],
    icon: <LuShieldCheck size={ICON_SIZE} aria-hidden="true" />,
  },
  growth: {
    accent: '#22d3ee',
    tagline: 'Finish goals, keep learning habits going and reflect regularly.',
    chips: ['Goals', 'Learning', 'Reflection'],
    icon: <LuSprout size={ICON_SIZE} aria-hidden="true" />,
  },
  wellness: {
    accent: '#4ade80',
    tagline: 'Health habits, regular mood check-ins and a steady mood.',
    chips: ['Health habits', 'Mood tracking', 'Check-ins'],
    icon: <LuHeartPulse size={ICON_SIZE} aria-hidden="true" />,
  },
  focus: {
    accent: '#fbbf24',
    tagline: 'Pomodoro sessions: how many, how long, how often, weekly deep work and distraction-free streaks.',
    chips: ['Pomodoro', 'Deep work', 'Consistency'],
    icon: <LuTarget size={ICON_SIZE} aria-hidden="true" />,
  },
  mindfulness: {
    accent: '#f472b6',
    tagline: 'Frequent, thoughtful journaling, gratitude and mood awareness.',
    chips: ['Journal', 'Gratitude', 'Mood awareness'],
    icon: <LuFlower2 size={ICON_SIZE} aria-hidden="true" />,
  },
  finance: {
    accent: '#2dd4bf',
    tagline: 'Healthy savings rate, budgets respected, expenses tracked and saving goals funded.',
    chips: ['Savings rate', 'Budget', 'Tracking'],
    icon: <LuWallet size={ICON_SIZE} aria-hidden="true" />,
  },
};

/** Least-squares trend over recent daily snapshots, projected one week ahead. */
function forecast(points: number[]): { projected: number; perWeek: number } | null {
  if (points.length < 3) return null;
  const n = points.length;
  const meanX = (n - 1) / 2;
  const meanY = points.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  points.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  const slope = den ? num / den : 0;
  const projected = Math.round(Math.min(100, Math.max(0, points[n - 1] + slope * 7)));
  return { projected, perWeek: Math.round(slope * 7) };
}

export default function AnalyticsOverview() {
  const { report, snapshots, pomodoro, schedule, expenses, income, today, progression } = useUserData();
  const openHistory = useScoreHistory();
  const history = useMemo(() => [...snapshots].reverse(), [snapshots]);
  const prediction = useMemo(() => forecast(history.slice(-14).map((s) => s.overall)), [history]);
  const change = report.overall - report.previousOverall;
  const focus = useMemo(() => pomodoroStats(pomodoro, today), [pomodoro, today]);
  const planning = useMemo(() => ({ week: planningStats(schedule, addDays(today, -6), today), score: planningScore(schedule, today) }), [schedule, today]);
  const money = useMemo(() => monthSummary(expenses, income, monthKey(today), today), [expenses, income, today]);

  return (
    <>
      <AuraRadarPanel />
      <Card title="Life OS · this week" className="lifeos">
        <div className="lifeos__grid">
          <Link to="/pomodoro" className="lifeos__tile" style={{ '--tile': '#f43f5e' } as CSSProperties}>
            <span>🍅 Focus</span>
            <strong>{formatMinutes(focus.weekMinutes)}</strong>
            <small>
              {focus.sessionsCompleted} sessions · focus score {focus.focusScore}
            </small>
          </Link>
          <Link to="/schedule" className="lifeos__tile" style={{ '--tile': '#818cf8' } as CSSProperties}>
            <span>🗓️ Planning</span>
            <strong>{planning.week.completionRate === null ? '—' : `${Math.round(planning.week.completionRate * 100)}%`}</strong>
            <small>
              {formatMinutes(planning.week.completedMinutes)} of {formatMinutes(planning.week.plannedMinutes)} planned · score {planning.score ?? '—'}
            </small>
          </Link>
          <Link to="/expenses" className="lifeos__tile" style={{ '--tile': '#2dd4bf' } as CSSProperties}>
            <span>💰 Finance</span>
            <strong>{money.savingsRate === null ? '—' : `${Math.round(money.savingsRate * 100)}%`}</strong>
            <small>savings rate this month · wellness {report.current.coverage.finance ? report.current.scores.finance : '—'}</small>
          </Link>
          <button type="button" className="lifeos__tile" style={{ '--tile': '#a78bfa' } as CSSProperties} onClick={() => openHistory({ kind: 'aura-points' })}>
            <span>⚡ Productivity</span>
            <strong>{progression.productivity.score}</strong>
            <small>
              7/30-day moving average · level {progression.level.level}
            </small>
          </button>
        </div>
      </Card>
      <Grid minItemWidth={160}>
        <StatCard label="Aura score" value={`${report.overall}/100`} description={`${change >= 0 ? '+' : ''}${change} vs previous 30 days`} onClick={() => openHistory({ kind: 'aura-score' })} />
        <StatCard label="Habit completion" value={report.completionRate7d === null ? '—' : `${report.completionRate7d}%`} description="Last 7 days" onClick={() => openHistory({ kind: 'aura-points' })} />
        <StatCard label="Streak" value={`${report.streak} d`} description={`Best ${report.longestStreak} d`} onClick={() => openHistory({ kind: 'streak' })} />
        <StatCard label="Wellbeing" value={report.wellbeing === null ? '—' : `${report.wellbeing}/100`} description="Last 14 days" onClick={() => openHistory({ kind: 'wellbeing' })} />
        <StatCard
          label="Strongest"
          value={report.strongest && report.overall > 0 ? AREA_LABELS[report.strongest] : '—'}
          description={report.weakest && report.weakest !== report.strongest ? `Focus: ${AREA_LABELS[report.weakest]}` : undefined}
        />
      </Grid>

      <Card title="Prediction">
        {prediction ? (
          <p className="trackers-page__forecast">
            At your current pace your Aura score will be about <strong>{prediction.projected}/100</strong> in 7 days
            <span className={prediction.perWeek >= 0 ? 'is-up' : 'is-down'}>
              {' '}
              ({prediction.perWeek >= 0 ? '+' : ''}
              {prediction.perWeek} per week)
            </span>
            .
          </p>
        ) : (
          <EmptyState>Predictions appear after three days of snapshots.</EmptyState>
        )}
      </Card>

      <Card title="Progress trend">
        {history.length < 2 ? (
          <EmptyState>A daily snapshot is saved each day you use Aura. Come back tomorrow to see your trend.</EmptyState>
        ) : (
          <TrendLine
            labels={history.map((s) => formatDate(s.date))}
            series={[{ label: 'Overall score', values: history.map((s) => s.overall) }]}
            max={100}
            ariaLabel="Line chart of overall aura score by day"
          />
        )}
      </Card>

      <Card title="Performance insights">
        {report.insights.length === 0 ? (
          <EmptyState>Keep logging to unlock insights.</EmptyState>
        ) : (
          <ul className="trackers-page__insights">
            {report.insights.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="How to raise each area">
        <ul className="area-cards">
          {AREAS.map((a) => {
            const meta = AREA_CARD[a];
            const focus = report.weakest === a && report.overall > 0;
            const score = report.current.coverage[a] ? report.current.scores[a] : null;
            return (
              <li key={a} className={`area-card${focus ? ' is-active' : ''}`} style={{ '--accent': meta.accent } as CSSProperties} title={AREA_HOW_TO[a]}>
                <div className="area-card__top">
                  <span className="area-card__icon">{meta.icon}</span>
                  <span className="area-card__score">{score === null ? '—' : score}</span>
                </div>
                <div className="area-card__body">
                  {focus && <span className="area-card__flag">Focus area</span>}
                  <h4 className="area-card__title">{AREA_LABELS[a]}</h4>
                  <p className="area-card__text">{meta.tagline}</p>
                </div>
                <ul className="area-card__chips" aria-label="Counts toward this area">
                  {meta.chips.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        <p className="text-muted trackers-page__note">Scores cover the last 30 days, so steady effort beats a single big day.</p>
      </Card>
    </>
  );
}
