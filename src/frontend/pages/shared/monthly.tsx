import { useMemo, useState } from 'react';
import MoodIcon from '../../icons/moodicon';
import { moodFromScore } from '../../icons/moodMeta';
import { usePeriodData } from '../../hooks/usePeriodData';
import { useUserData } from '../../context/useUserData';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import { FLOW_LEVEL } from '../../../backend/period/types';
import { addDays, diffDays } from '../../../backend/core/dates';
import './monthly.css';

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export default function Monthly() {
  const { logsByDate } = usePeriodData();
  const { habits, habitLogs, logsByHabit, moodLogs, loading, error, retry } = useUserData();

  const [today] = useState(() => new Date());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const numDays = daysInMonth(year, month);
  const dayList = Array.from({ length: numDays }, (_, i) => i + 1);
  const monthStart = isoDate(year, month, 1);
  const monthEnd = isoDate(year, month, numDays);

  function goToMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setMonth(newMonth);
    setYear(newYear);
  }

  const monthMoods = useMemo(() => moodLogs.filter((m) => m.date >= monthStart && m.date <= monthEnd), [moodLogs, monthStart, monthEnd]);

  // Mood scores are stored 1–10; this page's icons and heatmap use a 1–5 scale.
  const moodByDay = useMemo(() => {
    const byDay = new Map<number, number[]>();
    monthMoods.forEach((m) => {
      const day = Number(m.date.slice(8, 10));
      byDay.set(day, [...(byDay.get(day) ?? []), m.score]);
    });
    return new Map([...byDay.entries()].map(([day, scores]) => [day, Math.max(1, Math.min(5, Math.round(avg(scores)! / 2)))]));
  }, [monthMoods]);

  const flowLevels = useMemo(
    () =>
      Array.from({ length: numDays }, (_, i) => {
        const period = logsByDate.get(isoDate(year, month, i + 1))?.period;
        return period?.isPeriodDay ? FLOW_LEVEL[period.flow] : 0;
      }),
    [logsByDate, year, month, numDays]
  );
  const hasCycleData = flowLevels.some((l) => l > 0);

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const average10 = avg(monthMoods.map((m) => m.score));
  const avgScore = average10 === null ? null : average10 / 2;
  const auraScore = average10 === null ? null : Math.round(average10 * 10);

  const distribution = useMemo(() => {
    const buckets = { Bright: 0, Grounded: 0, Heavy: 0 };
    monthMoods.forEach((m) => {
      if (m.score >= 7) buckets.Bright += 1;
      else if (m.score >= 5) buckets.Grounded += 1;
      else buckets.Heavy += 1;
    });
    const total = monthMoods.length;
    return Object.entries(buckets).map(([label, count]) => ({ label, pct: total ? Math.round((count / total) * 100) : 0 }));
  }, [monthMoods]);

  const primaryState = monthMoods.length ? distribution.reduce((best, cur) => (cur.pct > best.pct ? cur : best)) : null;

  const narrative =
    avgScore === null || !primaryState
      ? 'No mood check-ins this month. Log one from the dashboard or a journal entry to see your emotional weather.'
      : avgScore >= 3.6
        ? `Your emotional climate has been mostly clear, with ${primaryState.label.toLowerCase()} moods in ${primaryState.pct}% of ${monthMoods.length} check-ins.`
        : avgScore >= 2.6
          ? `A mixed month — ${primaryState.label.toLowerCase()} moods showed up most often (${primaryState.pct}% of ${monthMoods.length} check-ins).`
          : `This month leaned heavier, with ${primaryState.label.toLowerCase()} moods in ${primaryState.pct}% of ${monthMoods.length} check-ins. Consider lighter days and reaching out for support where needed.`;

  const linePoints = useMemo(() => [...moodByDay.entries()].sort((a, b) => a[0] - b[0]), [moodByDay]);
  const linePath = useMemo(() => {
    if (linePoints.length < 2) return '';
    const width = 300;
    const height = 80;
    // x follows the day of month so gaps between check-ins stay visible.
    return linePoints
      .map(([day, score], i) => `${i === 0 ? 'M' : 'L'}${((day - 1) / Math.max(1, numDays - 1)) * width},${height - (score / 5) * height}`)
      .join(' ');
  }, [linePoints, numDays]);

  const areaPath = linePath ? `${linePath} L${((linePoints[linePoints.length - 1][0] - 1) / Math.max(1, numDays - 1)) * 300},80 L${((linePoints[0][0] - 1) / Math.max(1, numDays - 1)) * 300},80 Z` : '';

  // Habit categories whose completions changed most vs. the previous month.
  const influencers = useMemo(() => {
    const prevStart = isoDate(month === 0 ? year - 1 : year, (month + 11) % 12, 1);
    const prevEnd = addDays(monthStart, -1);
    const categoryOf = new Map(habits.map((h) => [h.id, h.category]));
    const counts = new Map<string, { now: number; prev: number }>();
    habitLogs.forEach((l) => {
      const category = categoryOf.get(l.habitId);
      if (!category) return;
      const entry = counts.get(category) ?? { now: 0, prev: 0 };
      if (l.date >= monthStart && l.date <= monthEnd) entry.now++;
      else if (l.date >= prevStart && l.date <= prevEnd) entry.prev++;
      counts.set(category, entry);
    });
    return [...counts.entries()]
      .filter(([, c]) => c.now + c.prev > 0)
      .map(([category, c]) => ({ category, now: c.now, prev: c.prev, delta: c.now - c.prev }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3);
  }, [habits, habitLogs, year, month, monthStart, monthEnd]);

  const heatmapWeeks = useMemo(() => {
    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = new Array(new Date(year, month, 1).getDay()).fill(null);
    dayList.forEach((day) => {
      week.push(moodByDay.get(day) ?? null);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    });
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
    return weeks;
  }, [dayList, moodByDay, year, month]);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading) return <PageSkeleton />;

  return (
    <div className="monthly-page">
      <section className="monthly-page__nav">
        <button onClick={() => goToMonth(-1)} aria-label="Previous month">‹</button>
        <h2 className="text-headline-lg">{monthLabel}</h2>
        <button onClick={() => goToMonth(1)} aria-label="Next month" disabled={diffDays(monthEnd, isoDate(today.getFullYear(), today.getMonth(), 1)) > 0}>›</button>
      </section>

      <section className="monthly-review">
        <div className="monthly-review__weather">
          <p className="monthly-review__eyebrow">Emotional Weather</p>
          <p className="monthly-review__narrative">{narrative}</p>
          <div className="monthly-review__weather-stats">
            <div>
              <span className="monthly-review__score">{auraScore ?? '—'}</span>
              <span className="monthly-review__score-label">Mood score (avg, /100)</span>
            </div>
            {avgScore !== null && primaryState && (
              <div>
                <span className="monthly-review__state-icon"><MoodIcon mood={moodFromScore(avgScore)} size={40} /></span>
                <span className="monthly-review__score-label">Primary state: {primaryState.label}</span>
              </div>
            )}
          </div>
        </div>

        <div className="monthly-review__chart">
          <p className="monthly-review__eyebrow">Mood Fluctuations · {monthLabel}</p>
          {linePath ? (
            <svg viewBox="0 0 300 80" className="monthly-review__svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(160,120,255,0.4)" />
                  <stop offset="100%" stopColor="rgba(160,120,255,0)" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#moodGradient)" stroke="none" />
              <path d={linePath} fill="none" stroke="rgba(160,120,255,1)" strokeWidth="2" />
            </svg>
          ) : (
            <p className="text-muted">Log mood on at least two days this month to chart a trend.</p>
          )}
        </div>

        <div className="monthly-review__distribution">
          <p className="monthly-review__eyebrow">Distribution</p>
          {distribution.map((d) => (
            <div key={d.label} className="monthly-review__dist-row">
              <span className="monthly-review__dist-label">{d.label}</span>
              <div className="monthly-review__dist-bar-track">
                <div className="monthly-review__dist-bar" style={{ width: `${d.pct}%` }} />
              </div>
              <span className="monthly-review__dist-pct">{d.pct}%</span>
            </div>
          ))}
        </div>

        <div className="monthly-review__influencers">
          <p className="monthly-review__eyebrow">Habit changes vs. last month</p>
          {influencers.length === 0 ? (
            <p className="text-muted">No habit completions in this or the previous month.</p>
          ) : (
            influencers.map((inf) => (
              <div key={inf.category} className="monthly-review__inf-row">
                <span className="monthly-review__inf-label">{inf.category} habits</span>
                <span className={`monthly-review__inf-delta ${inf.delta >= 0 ? 'monthly-review__inf-delta--up' : 'monthly-review__inf-delta--down'}`}>
                  {inf.prev} → {inf.now} ({inf.delta >= 0 ? '+' : ''}{inf.delta})
                </span>
              </div>
            ))
          )}
        </div>

        <div className="monthly-review__heatmap">
          <p className="monthly-review__eyebrow">Intensity Heatmap</p>
          <div className="monthly-review__heatmap-grid">
            {heatmapWeeks.map((week, wi) =>
              week.map((score, di) => (
                <div
                  key={`${wi}-${di}`}
                  className="monthly-review__heat-cell"
                  style={{ opacity: score ? score / 5 : 0.08 }}
                />
              ))
            )}
          </div>
        </div>
      </section>

      <div className="monthly-page__canvas">
        <section className="monthly-page__section">
          <header className="monthly-page__section-header">
            <MoodIcon mood="happy" size={24} />
            <h3>Mood</h3>
          </header>
          <div className="monthly-page__scroll">
            <div className="monthly-page__row">
              <div className="monthly-page__row-label">Score</div>
              <div className="monthly-page__cells">
                {dayList.map((day) => {
                  const score = moodByDay.get(day);
                  return (
                    <div key={day} className="monthly-page__mood-cell">
                      <div className={`monthly-page__mood-dot ${score ? `monthly-page__mood-dot--${score}` : ''}`}>
                        {score ? <MoodIcon mood={moodFromScore(score)} size={20} /> : ''}
                      </div>
                      <span className="monthly-page__day-label">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <hr />

        <section className="monthly-page__section">
          <header className="monthly-page__section-header">
            <span>✅</span>
            <h3>Habit Matrix</h3>
          </header>
          {habits.length === 0 ? (
            <p className="text-muted">No habits yet. Add some from the Habits page.</p>
          ) : (
            <div className="monthly-page__scroll">
              <div className="monthly-page__matrix">
                <div className="monthly-page__matrix-headers">
                  <div className="monthly-page__habit-name-col" />
                  <div className="monthly-page__cells">
                    {dayList.map((day) => (
                      <div key={day} className="monthly-page__day-header">
                        {day}
                      </div>
                    ))}
                  </div>
                </div>
                {habits.filter((h) => !h.archived).map((h) => (
                  <div key={h.id} className="monthly-page__matrix-row">
                    <div className="monthly-page__habit-name-col" title={h.label}>
                      {h.label}
                    </div>
                    <div className="monthly-page__cells">
                      {dayList.map((day) => {
                        const filled = Boolean(logsByHabit.get(h.id)?.has(isoDate(year, month, day)));
                        return <div key={day} className={`monthly-page__habit-cell ${filled ? 'monthly-page__habit-cell--filled' : ''}`} />;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {hasCycleData && (
          <>
            <hr />
            <section className="monthly-page__section">
              <header className="monthly-page__section-header">
                <span>💧</span>
                <h3>Cycle</h3>
              </header>
              <div className="monthly-page__scroll">
                <div className="monthly-page__row">
                  <div className="monthly-page__row-label">Flow</div>
                  <div className="monthly-page__cells">
                    {dayList.map((day) => {
                      const level = flowLevels[day - 1];
                      return (
                        <div key={day} className="monthly-page__cycle-cell">
                          {level > 0 && <div className={`monthly-page__cycle-dot monthly-page__cycle-dot--${level}`} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
