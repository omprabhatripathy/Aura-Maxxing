import { useMemo, useState } from 'react';
import { useUserData } from '../../context/useUserData';
import { ErrorState, PageSkeleton } from '../../components/shared/feedback/Feedback';
import './yearly.css';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export default function Yearly() {
  const { moodLogs, loading, error, retry } = useUserData();
  const [year, setYear] = useState(new Date().getFullYear());

  // Daily average mood (stored 1–10) mapped onto the mosaic's 1–5 colour scale.
  const moodGrid = useMemo(() => {
    const byDay = new Map<string, number[]>();
    moodLogs.forEach((m) => {
      if (Number(m.date.slice(0, 4)) !== year) return;
      const key = `${Number(m.date.slice(5, 7)) - 1}-${Number(m.date.slice(8, 10))}`;
      byDay.set(key, [...(byDay.get(key) ?? []), m.score]);
    });
    return new Map([...byDay.entries()].map(([k, s]) => [k, Math.max(1, Math.min(5, Math.round(s.reduce((a, b) => a + b, 0) / s.length / 2)))]));
  }, [moodLogs, year]);

  const insight = useMemo(() => {
    const scores = Array.from(moodGrid.values());
    const positiveDays = scores.filter((s) => s >= 4).length;
    const positivePercent = scores.length ? Math.round((positiveDays / scores.length) * 100) : null;

    const monthTotals = new Array(12).fill(0);
    const monthCounts = new Array(12).fill(0);
    moodGrid.forEach((score, key) => {
      const m = Number(key.split('-')[0]);
      monthTotals[m] += score;
      monthCounts[m] += 1;
    });
    let bestMonth = -1;
    let bestAvg = -1;
    monthTotals.forEach((total, i) => {
      if (monthCounts[i] === 0) return;
      const avg = total / monthCounts[i];
      if (avg > bestAvg) {
        bestAvg = avg;
        bestMonth = i;
      }
    });
    const bestMonthLabel = bestMonth >= 0 ? new Date(year, bestMonth, 1).toLocaleDateString('en-US', { month: 'long' }) : null;

    return { positivePercent, bestMonthLabel, loggedDays: scores.length };
  }, [moodGrid, year]);

  const maxDays = 31;

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (loading) return <PageSkeleton />;

  return (
    <div className="yearly-page">
      <section className="yearly-page__header">
        <div>
          <h2 className="text-headline-lg">{year} Mood Journey</h2>
          <p className="ui-page-header__desc">A bird's eye view of your emotional landscape throughout the year.</p>
        </div>
        <div className="yearly-page__year-nav">
          <button onClick={() => setYear((y) => y - 1)} aria-label="Previous year">‹</button>
          <span>{year}</span>
          <button onClick={() => setYear((y) => y + 1)} aria-label="Next year">›</button>
        </div>
      </section>

      <div className="yearly-page__layout">
        <div className="yearly-page__mosaic-card">
          <div className="yearly-page__scroll">
            <div className="yearly-page__grid">
              <div className="yearly-page__month-headers">
                <div className="yearly-page__corner" />
                {MONTH_LABELS.map((label, i) => (
                  <div key={i} className="yearly-page__month-label">{label}</div>
                ))}
              </div>
              {Array.from({ length: maxDays }, (_, dayIdx) => {
                const day = dayIdx + 1;
                return (
                  <div key={day} className="yearly-page__row">
                    <div className="yearly-page__day-label">{day}</div>
                    {Array.from({ length: 12 }, (_, month) => {
                      const valid = day <= daysInMonth(year, month);
                      const score = moodGrid.get(`${month}-${day}`);
                      return (
                        <div key={month} className="yearly-page__cell-wrap">
                          {valid && <div className={`yearly-page__cell ${score ? `yearly-page__cell--${score}` : ''}`} title={`${MONTH_LABELS[month]} ${day}`} />}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="yearly-page__sidebar">
          <div className="yearly-page__legend-card">
            <h3 className="text-headline-md">Legend</h3>
            <div className="yearly-page__legend-row">
              <span className="yearly-page__legend-dot yearly-page__cell--5" /> Joyful, Great
            </div>
            <div className="yearly-page__legend-row">
              <span className="yearly-page__legend-dot yearly-page__cell--4" /> Energetic, Active
            </div>
            <div className="yearly-page__legend-row">
              <span className="yearly-page__legend-dot yearly-page__cell--3" /> Calm, Neutral
            </div>
            <div className="yearly-page__legend-row">
              <span className="yearly-page__legend-dot yearly-page__cell--2" /> Tired, Low
            </div>
            <div className="yearly-page__legend-row">
              <span className="yearly-page__legend-dot yearly-page__cell--1" /> Stressed
            </div>
          </div>

          <div className="yearly-page__insight-card">
            <h3 className="text-label-sm">Yearly Insight</h3>
            <p className="yearly-page__insight-stat">{insight.positivePercent === null ? '—' : `${insight.positivePercent}%`}</p>
            <p className="text-muted">Positive days · {insight.loggedDays} day{insight.loggedDays === 1 ? '' : 's'} logged</p>
            {insight.bestMonthLabel && (
              <p className="yearly-page__insight-note">
                Your most positive month was <strong>{insight.bestMonthLabel}</strong>. Keep nurturing those habits.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
