import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import AuraRadar, { type RadarOverlay } from '../AuraRadar';
import TrendLine from '../charts/TrendLine';
import { Card, SegmentedControl } from '../ui';
import { useUserData } from '../../../context/useUserData';
import { AREA_LABELS, AREAS, type UserDataSet } from '../../../../backend/analytics/radar';
import { auraTrend, bestMonth, buildAuraInsights, compareLastPeriods, type AreaBreakdown, type TrendPeriod } from '../../../../backend/analytics/auraInsights';
import { MATURITY_WINDOW } from '../../../../backend/services/progressionService';
import type { RadarScores } from '../../../../backend/models';
import { AREA_COLORS, AREA_SOURCES, scoreBand } from '../../../lib/auraMeta';
import './AuraRadarPanel.css';

type Area = keyof RadarScores;

const PERIODS: { value: TrendPeriod; label: string }[] = [
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
];
const COMPARE_LABEL: Record<TrendPeriod, string> = { week: 'This week vs last week', month: 'This month vs last month', year: 'This year vs last year' };
const LAST_MONTH_COLOR = '#94a3b8';
const BEST_MONTH_COLOR = '#fbbf24';

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n)}`;

function ChangeChip({ b }: { b: AreaBreakdown }) {
  if (!b.covered) return <span className="aura-chip aura-chip--muted">no data</span>;
  if (b.previous === null || (b.changePct === null && b.delta === null)) return <span className="aura-chip aura-chip--up">new</span>;
  const cls = b.trend === 'up' ? 'aura-chip--up' : b.trend === 'down' ? 'aura-chip--down' : 'aura-chip--flat';
  const arrow = b.trend === 'up' ? '↑' : b.trend === 'down' ? '↓' : '→';
  const value = b.changePct !== null ? `${signed(b.changePct)}%` : `${signed(b.delta ?? 0)} pts`;
  return (
    <span className={`aura-chip ${cls}`}>
      {arrow} {value}
    </span>
  );
}

export default function AuraRadarPanel() {
  const { habits, habitLogs, goals, goalProgress, journalEntries, moodLogs, tasks, pomodoro, expenses, income, financeSettings, schedule, today, report, logsByHabit } = useUserData();
  const data = useMemo<UserDataSet>(
    () => ({ habits, habitLogs, goals, goalProgress, journalEntries, moodLogs, tasks, pomodoro, expenses, income, financeSettings, schedule }),
    [habits, habitLogs, goals, goalProgress, journalEntries, moodLogs, tasks, pomodoro, expenses, income, financeSettings, schedule]
  );
  const insights = useMemo(() => buildAuraInsights(data, today, report, logsByHabit), [data, today, report, logsByHabit]);
  const monthly = useMemo(() => auraTrend(data, today, 'month', logsByHabit), [data, today, logsByHabit]);
  const best = useMemo(() => bestMonth(monthly), [monthly]);

  const [period, setPeriod] = useState<TrendPeriod>('week');
  const trend = useMemo(() => (period === 'month' ? monthly : auraTrend(data, today, period, logsByHabit)), [period, monthly, data, today, logsByHabit]);
  const periodChange = useMemo(() => compareLastPeriods(trend), [trend]);
  const [trendArea, setTrendArea] = useState<Area | 'overall'>('overall');
  const [showLast, setShowLast] = useState(true);
  const [showBest, setShowBest] = useState(false);
  const [picked, setPicked] = useState<Area | null>(null);

  const { current, previous } = report;
  const selected: Area | null = picked ?? report.weakest;
  const overlays: RadarOverlay[] = [];
  if (showLast) overlays.push({ label: 'Last month', scores: previous.scores, color: LAST_MONTH_COLOR });
  if (showBest && best) overlays.push({ label: `Best month (${best.label})`, scores: best.scores, color: BEST_MONTH_COLOR });
  const notes = Object.fromEntries(insights.breakdown.map((b) => [b.area, b.reason])) as Record<Area, string>;
  const overallBand = scoreBand(report.overall);
  const overallDelta = report.overall - report.previousOverall;
  const coveredCount = AREAS.filter((a) => current.coverage[a]).length;
  const avgCovered = coveredCount ? AREAS.filter((a) => current.coverage[a]).reduce((s, a) => s + current.scores[a], 0) / coveredCount : 0;
  const values = trend.map((p) => (trendArea === 'overall' ? p.overall : p.coverage[trendArea] ? p.scores[trendArea] : null));
  const present = values.filter((v): v is number => v !== null);

  return (
    <section className="aura-panel" aria-label="Aura radar analysis">
      <header className="aura-panel__head">
        <div>
          <p className="aura-panel__eyebrow">Aura Radar</p>
          <div className="aura-panel__overall">
            <strong style={{ color: overallBand.color }}>{report.overall}</strong>
            <span>/100 · {overallBand.label}</span>
            <span className={`aura-chip ${overallDelta > 0 ? 'aura-chip--up' : overallDelta < 0 ? 'aura-chip--down' : 'aura-chip--flat'}`}>{signed(overallDelta)} vs 30 days ago</span>
          </div>
        </div>
        <div className="aura-panel__bench" role="group" aria-label="Compare with">
          <span className="aura-panel__bench-now">● Now</span>
          <button type="button" aria-pressed={showLast} className="aura-bench" style={{ '--bench': LAST_MONTH_COLOR } as CSSProperties} onClick={() => setShowLast((v) => !v)}>
            Last month
          </button>
          <button type="button" aria-pressed={showBest} disabled={!best} title={best ? `Highest month-end Aura: ${best.overall}` : 'Needs at least one finished month'} className="aura-bench" style={{ '--bench': BEST_MONTH_COLOR } as CSSProperties} onClick={() => setShowBest((v) => !v)}>
            Best month{best ? ` · ${best.label}` : ''}
          </button>
        </div>
      </header>

      <div className="aura-panel__main">
        <div className="aura-panel__chart">
          <AuraRadar size="large" maxWidth={600} current={current.scores} coverage={current.coverage} overlays={overlays} notes={notes} activeArea={selected} onSelectArea={setPicked} currentLabel="Now" />
          <p className="aura-panel__hint">Hover a point for details · tap an area to analyse it</p>
        </div>

        <div className="aura-panel__breakdown">
          <h3 className="aura-panel__h">Aura breakdown</h3>
          <ul className="aura-rows">
            {insights.breakdown.map((b) => {
              const open = b.area === selected;
              return (
                <li key={b.area} className={`aura-row${open ? ' is-open' : ''}`} style={{ '--area': AREA_COLORS[b.area] } as CSSProperties}>
                  <button type="button" className="aura-row__head" aria-expanded={open} onClick={() => setPicked(open ? null : b.area)}>
                    <span className="aura-row__dot" aria-hidden="true" />
                    <span className="aura-row__label">{b.label}</span>
                    <span className="aura-row__score" style={{ color: b.covered ? scoreBand(b.current).color : undefined }}>
                      {b.covered ? b.current : '—'}
                    </span>
                    <span className="aura-row__prev">prev {b.previous ?? '—'}</span>
                    <ChangeChip b={b} />
                  </button>
                  {open && (
                    <div className="aura-row__body">
                      <p className="aura-row__reason">
                        <strong>Reason: </strong>
                        {b.reason}
                      </p>
                      {b.covered && (
                        <ul className="aura-factors">
                          {b.factors.map((f) => (
                            <li key={f.key} className={f.value === null ? 'is-empty' : ''}>
                              <div className="aura-factors__top">
                                <span>{f.label}</span>
                                <span className="aura-factors__weight">{Math.round(f.weight * 100)}%</span>
                              </div>
                              <div className="aura-factors__bar">
                                <span style={{ width: `${Math.round((f.value ?? 0) * 100)}%` }} />
                              </div>
                              {f.detail && <small>{f.detail}</small>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {b.covered && (
                        <p className="aura-row__meta">
                          Quality {Math.round(b.quality * 100)}% × experience {Math.round(b.maturity * 100)}% ({b.evidenceDays} active days in {MATURITY_WINDOW}){b.accelerating ? ' · accelerating' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="aura-panel__grid">
        <Card title="Aura health summary" className="aura-panel__card">
          <ul className="aura-summary">
            {insights.summary.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
        <Card title="Improvement suggestions" className="aura-panel__card">
          {insights.recommendations.length === 0 ? (
            <p className="text-muted">Every tracked area is maxed out for now — keep it up.</p>
          ) : (
            <ul className="aura-recs">
              {insights.recommendations.map((r) => (
                <li key={r.area} style={{ '--area': AREA_COLORS[r.area] } as CSSProperties}>
                  <div className="aura-recs__top">
                    <strong>{r.title}</strong>
                    {r.gain > 0 && <span className="aura-chip aura-chip--up">up to +{r.gain} pts</span>}
                  </div>
                  <p>
                    <span className="aura-recs__label">Recommendation: </span>
                    {r.text}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Historical Aura trends" className="aura-panel__card">
        <div className="aura-trend__controls">
          <SegmentedControl ariaLabel="Trend period" options={PERIODS} value={period} onChange={setPeriod} />
          <div className="aura-trend__areas" role="group" aria-label="Series">
            {(['overall', ...AREAS] as const).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={trendArea === a}
                className="aura-bench"
                style={{ '--bench': a === 'overall' ? '#a78bfa' : AREA_COLORS[a] } as CSSProperties}
                onClick={() => setTrendArea(a)}
              >
                {a === 'overall' ? 'Overall' : AREA_LABELS[a]}
              </button>
            ))}
          </div>
        </div>
        {trend.length < 2 ? (
          <p className="text-muted">Your {period === 'week' ? 'weekly' : period === 'month' ? 'monthly' : 'yearly'} trend appears once you have more than one {period} of history.</p>
        ) : (
          <TrendLine
            labels={trend.map((p) => p.label)}
            series={[
              { label: trendArea === 'overall' ? 'Overall Aura' : AREA_LABELS[trendArea], values, color: trendArea === 'overall' ? '#a78bfa' : AREA_COLORS[trendArea] },
              ...(trendArea === 'overall' ? [] : [{ label: 'Overall Aura', values: trend.map((p) => p.overall), color: 'rgba(203, 195, 215, 0.45)' }]),
            ]}
            max={100}
            height={240}
            ariaLabel={`${period} Aura trend`}
          />
        )}
        {periodChange && (
          <div className="aura-trend__compare">
            <p>
              <strong>{COMPARE_LABEL[period]}:</strong> overall <span className={periodChange.overall >= 0 ? 'is-up' : 'is-down'}>{signed(periodChange.overall)}</span>
              {present.length > 1 && (
                <span className="text-muted">
                  {' '}
                  · range {Math.min(...present)}–{Math.max(...present)} · average {Math.round(present.reduce((a, b) => a + b, 0) / present.length)}
                </span>
              )}
            </p>
            <ul>
              {AREAS.map((a) =>
                periodChange.areas[a] === null ? null : (
                  <li key={a} style={{ '--area': AREA_COLORS[a] } as CSSProperties}>
                    {AREA_LABELS[a]} <span className={periodChange.areas[a]! >= 0 ? 'is-up' : 'is-down'}>{signed(periodChange.areas[a]!)}</span>
                  </li>
                )
              )}
            </ul>
          </div>
        )}
      </Card>

      <details className="aura-calc">
        <summary>How this score is calculated</summary>
        <div className="aura-calc__body">
          <div className="aura-calc__formulas">
            <p>
              <strong>Area score</strong> = 100 × <em>quality</em> × <em>experience</em>
            </p>
            <p>
              <strong>Quality</strong> = weighted average of the area's factors below, measured over rolling 7/30/90-day windows. Factors without data are skipped and their weight is shared among the rest.
            </p>
            <p>
              <strong>Experience</strong> = (1 − e<sup>−days/25</sup>) ÷ (1 − e<sup>−90/25</sup>), where <em>days</em> = days with activity for that area in the last {MATURITY_WINDOW}. About 10 days ≈ 34%, 30 days ≈ 72%, 60 days ≈ 93%.
            </p>
            <p>
              <strong>Overall Aura</strong> = average of tracked areas × (0.5 + 0.5 × tracked ÷ 6). Yours: {avgCovered.toFixed(1)} × {(0.5 + 0.5 * (coveredCount / AREAS.length)).toFixed(2)} = <strong>{report.overall}</strong> ({coveredCount} of 6 areas tracked).
            </p>
          </div>
          <div className="aura-calc__areas">
            {AREAS.map((a) => (
              <section key={a} className="aura-calc__area" style={{ '--area': AREA_COLORS[a] } as CSSProperties}>
                <h4>
                  {AREA_LABELS[a]} <span>{current.coverage[a] ? current.scores[a] : '—'}</span>
                </h4>
                <p className="aura-calc__sources">Data sources: {AREA_SOURCES[a].join(' · ')}</p>
                {current.factors[a].length ? (
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Factor</th>
                        <th scope="col">Weight</th>
                        <th scope="col">Your data</th>
                        <th scope="col">Quality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {current.factors[a].map((f) => (
                        <tr key={f.key}>
                          <td>{f.label}</td>
                          <td>{Math.round(f.weight * 100)}%</td>
                          <td>{f.detail ?? '—'}</td>
                          <td>{f.value === null ? 'skipped' : `${Math.round(f.value * 100)}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted">No data yet.</p>
                )}
                {current.coverage[a] && (
                  <p className="aura-calc__math">
                    100 × {Math.round(current.quality[a] * 100)}% × {Math.round(current.maturity[a] * 100)}% ({current.evidenceDays[a]} days) = {current.scores[a]}
                  </p>
                )}
              </section>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}
