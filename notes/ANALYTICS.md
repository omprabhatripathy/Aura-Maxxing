# Analytics

All analytics are **pure functions** in `src/backend` (no React, no I/O), so they are unit-tested and recomputed from raw history on every data change. Score formulas (radar, XP, levels, streaks, productivity) are documented once in [AURA_SYSTEM.md](AURA_SYSTEM.md); this file covers the metrics, charts and aggregation around them.

## Pipeline

```mermaid
flowchart LR
  Sub[Firestore / local subscriptions] --> Map[mappers → typed models]
  Map --> DS[DataProvider dataset memo]
  DS --> R[buildReport → radar now & 30 d ago, insights]
  DS --> P[buildProgression → XP ledger, level, streaks, productivity]
  R --> Snap[(analyticsSnapshots/{today})]
  R & P --> UI[Pages & charts]
  DS --> AI[auraInsights: breakdown, recommendations, trends — computed on demand in AuraRadarPanel]
```

- **Single derivation point:** `DataProvider` builds one `dataset` (`UserDataSet`) and passes it to `buildReport` and `buildProgression`; `logsByHabit` (habit logs grouped by habit) is computed once and shared.
- **Snapshots:** one `analyticsSnapshots/{yyyy-mm-dd}` per day (`{ scores, overall }`) when the radar's signature changes and the user has data. The last 120 are subscribed; they power the "Progress trend" line, the 7-day prediction and the score history.
- **Historical recomputation:** trends that need past radar values (`auraTrend`, `buildReport.previous`, the 15-day midpoint) call `calculateRadarScore(data, pastDate)`; every factor filters by `date <= asOf`, so past scores are reproducible even for days without a snapshot.

## Metrics by module

| Module                      | Function                                                                                           | Computes                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `analytics/habits.ts`       | `groupLogs`                                                                                        | `Map<habitId, Set<date>>`                                                                                                              |
|                             | `periodKey`, `isDone`                                                                              | Day (daily) or ISO-week start (weekly); done-this-period check                                                                         |
|                             | `expectedOccurrences`, `completedOccurrences`                                                      | Scheduled vs completed periods in a range (from habit creation)                                                                        |
|                             | `completionRate(habits, logs, from, to)`                                                           | **Priority-weighted** % of expected completions (high 3, medium 2, low 1); null when nothing was due                                   |
|                             | `habitStreak`                                                                                      | Consecutive completed periods ending now (or the previous period)                                                                      |
|                             | `dailyCompletionSeries`                                                                            | % of daily habits done per day (dashboard bars)                                                                                        |
| `analytics/metrics.ts`      | `moodSeries`                                                                                       | Daily average mood score (null gaps)                                                                                                   |
|                             | `moodDistribution`                                                                                 | Count and % per mood in a range                                                                                                        |
|                             | `journalStats`                                                                                     | Total, last 7/30, words, average words, writing streak, top weekday, top tags, entries per week                                        |
|                             | `goalStats`                                                                                        | Active, completed, overdue, success rate, milestones, average days to complete, milestones in 30 days                                  |
| `analytics/radar.ts`        | `buildReport`                                                                                      | Radar now vs 30 days ago, improvement %, strongest/weakest, streaks, 7-day completion, 14-day wellbeing, behaviour XP, insight strings |
| `analytics/auraInsights.ts` | see [AURA_SYSTEM.md §1.5](AURA_SYSTEM.md#15-insights-layer-aurainsightsts)                         | Breakdown, reasons, recommendations, summary, trends, best month                                                                       |
| `todo/analytics.ts`         | `taskProgress`                                                                                     | From subtasks, else focus minutes vs estimate (capped 95 %), else status                                                               |
|                             | `taskSummary`                                                                                      | Due today, completed today, overdue, open, in progress, blocked                                                                        |
|                             | `weeklyCompletion`, `onTimeRate`, `completionStreak`                                               | 7-day workload completion, on-time % over 30 days, days with ≥ 1 completion                                                            |
|                             | `productivityScore`                                                                                | 40 % weekly completion + 25 % on-time + 20 % focus minutes (300 min = full) + 15 % streak                                              |
|                             | `dueReminders`                                                                                     | 1-day, 1-hour and overdue notifications                                                                                                |
| `pomodoro/analytics.ts`     | `countsAsFocus`                                                                                    | completed and ≥ 15 min                                                                                                                 |
|                             | `focusFactors`, `focusQuality`                                                                     | Focus radar quality (50/20/15/10/5)                                                                                                    |
|                             | `pomodoroStats`                                                                                    | Sessions, today/week/month minutes, current/longest streak, focus score, by category, last 7 days, average                             |
| `finance/analytics.ts`      | `monthSummary`                                                                                     | Spent, income, savings, savings rate, daily average (elapsed days in the current month), category breakdown                            |
|                             | `monthlyTrend`                                                                                     | Last N months income/spent/savings                                                                                                     |
|                             | `financeAlerts`                                                                                    | Budget exceeded (> 100 %) / near (≥ 85 %), category over limit, high-spending category, low savings rate                               |
|                             | `financeFactors`, `financialWellness`                                                              | Financial Wellness quality (40/25/20/15)                                                                                               |
| `schedule/analytics.ts`     | `occursOn`, `occurrencesOn`                                                                        | Recurrence expansion (none/daily/weekdays/weekly minus skipped dates)                                                                  |
|                             | `planningStats`                                                                                    | Planned/completed minutes, completion rate, planned days, blocks                                                                       |
|                             | `planningScore`                                                                                    | 70 % completion + 30 % (planned days / 5) over 7 days                                                                                  |
|                             | `layoutDay`                                                                                        | Lane assignment for overlapping blocks                                                                                                 |
| `period/cycle.ts`           | `derivePeriods`, `deriveCycles`, `computeCycleStats`, `predictCycles`                              | Periods from logged days, cycle lengths (plausible 15–60 days), stats, next 3 periods + fertile window (luteal 14 days)                |
| `period/analytics.ts`       | `moodScore`, `phaseMoodAverages`, `symptomFrequency`, `moodSymptomCorrelation`, `generateInsights` | Cycle mood/symptom insights                                                                                                            |

## Trend calculations

| Trend                          | Method                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Area change %                  | `(current − previous) / previous × 100` vs the radar recalculated 30 days earlier; null without a non-zero baseline     |
| Trend direction                | up / down if \|Δ\| ≥ 3 points over 30 days, otherwise flat                                                              |
| Acceleration                   | Δ over the last 15 days > Δ over the 15 before + 2                                                                      |
| Weekly / monthly / yearly Aura | Radar sampled every 7 days (12 points), at month-ends (12) or year-ends (5), starting at the user's first active period |
| Period comparison              | Last point vs the previous one (overall and per area)                                                                   |
| Best month                     | Highest overall at a past month-end (current month excluded)                                                            |
| 7-day prediction               | Least-squares slope over the last 14 snapshots, projected 7 days (`AnalyticsOverview.forecast`)                         |
| Productivity trend             | Score now − score as of 7 days earlier                                                                                  |
| Rolling habit rate             | 7-day × 0.5 + 30-day × 0.3 + 90-day × 0.2                                                                               |

## Charts

chart.js 4 via react-chartjs-2. Shared theme and element registration: `components/shared/period/chartTheme.ts` (`CHART_COLORS`, `baseScale`); the radar registers its own elements.

| Chart                                                                         | Component                     | Used in                                                                                 |
| ----------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| Radar (gradient fill, score-band points, overlays, tooltips, click to select) | `AuraRadar`                   | Dashboard (compact), Analytics (`size="large"`)                                         |
| Line with gaps                                                                | `TrendLine`                   | Analytics trends, Expenses trends, Health                                               |
| Bars                                                                          | `TrendBars`, `WeeklyBarChart` | Pomodoro last 7 days, dashboard week                                                    |
| Doughnut / bar                                                                | inline in `expenses.tsx`      | Category distribution, monthly spending                                                 |
| Period charts                                                                 | `period/charts/*`             | Cycle length, mood trend, phase mood, mood distribution, symptom frequency, correlation |
| Heatmap / mosaic                                                              | CSS grids                     | Monthly report heatmap, yearly mosaic                                                   |

## Score bands (UI colouring)

`scoreBand(score)` in `src/frontend/lib/auraMeta.ts`: < 25 **Low** (red), 25–49 **Building** (amber), 50–74 **Strong** (green), ≥ 75 **Elite** (violet). Used for radar points, axis labels and breakdown scores.

## Performance notes

- Radar for one date is O(data); the Analytics panel computes ~1 (midpoint) + 12 (monthly, cached) + up to 12 (weekly/yearly on demand) radars, memoised on the dataset.
- `logsByHabit` is shared so habit rate calculations don't regroup logs.
- Snapshots are capped at 120 and activity at 300 in subscriptions.
