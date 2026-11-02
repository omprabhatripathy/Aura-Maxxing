# Aura System — single source of truth

Everything in this document is implemented in code. If you change a formula, update this file in the same change.

| Concern                                                      | Code                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| XP, levels, streaks, radar, productivity score, overall Aura | [src/backend/services/progressionService.ts](../src/backend/services/progressionService.ts) |
| Radar factor type + weighted average                         | [src/backend/analytics/factors.ts](../src/backend/analytics/factors.ts)                     |
| Focus factors                                                | `focusFactors` in [src/backend/pomodoro/analytics.ts](../src/backend/pomodoro/analytics.ts) |
| Financial Wellness factors                                   | `financeFactors` in [src/backend/finance/analytics.ts](../src/backend/finance/analytics.ts) |
| Report (current vs 30 days ago, insights)                    | [src/backend/analytics/radar.ts](../src/backend/analytics/radar.ts)                         |
| Breakdown, explanations, recommendations, trends, benchmarks | [src/backend/analytics/auraInsights.ts](../src/backend/analytics/auraInsights.ts)           |
| Achievements                                                 | [src/backend/achievements/engine.ts](../src/backend/achievements/engine.ts)                 |
| Tests                                                        | `progression.test.ts`, `features.test.ts`, `auraInsights.test.ts`, `analytics.test.ts`      |

**Design principle:** nothing is incremented directly. Every score is _recalculated_ from the user's history each time data changes (`DataProvider` → `buildReport` + `buildProgression`). This makes scores impossible to farm by toggling, keeps them consistent across devices, and means a formula change applies retroactively.

---

## 1. Aura Radar

Six areas (`AREAS`): `discipline`, `growth`, `wellness`, `focus`, `mindfulness`, `finance` (label "Financial Wellness"; it replaced the old _Social_ area — social habits now feed Wellness).

### 1.1 Area score

```
areaScore = round(100 × clamp01(quality) × experience)
```

- **quality** — weighted average of the area's factors (0–1). Factors with no data (`value: null`) are skipped and their weight is redistributed (`weightedFactors`). If _no_ factor has data the area is **untracked**: score 0, `coverage[area] = false`.
- **experience** (a.k.a. maturity) — rewards a longer history with diminishing returns:

```
experience(d) = (1 − e^(−d/25)) / (1 − e^(−90/25))     d = days with area-relevant activity in the last 90 (capped at 90)
```

| Active days (last 90) | 5    | 10   | 20   | 30   | 45   | 60   | 90   |
| --------------------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| Experience            | 0.19 | 0.34 | 0.57 | 0.72 | 0.86 | 0.93 | 1.00 |

So a new user with perfect behaviour still starts low and climbs over weeks — the radar cannot jump to 100 in a day.

**Rolling habit rate** (used by several factors): priority-weighted habit completion rate blended over windows — 7 days × 0.5, 30 days × 0.3, 90 days × 0.2 (`completionRate` in `analytics/habits.ts`; weekly habits count per ISO week). Missed scheduled habits pull it down.

### 1.2 Factors and weights

Every factor is a `RadarFactor { key, label, value 0–1|null, weight, detail, current?, target? }` stored on `RadarResult.factors[area]` so the UI can show it.

**Discipline** — evidence days: days with any habit log.

| Key    | Factor             | Weight | Value                                                                                         |
| ------ | ------------------ | ------ | --------------------------------------------------------------------------------------------- |
| habits | Habit completion   | 0.45   | rolling rate of all active habits                                                             |
| streak | Activity streak    | 0.20   | current activity streak / 21                                                                  |
| weekly | Weekly consistency | 0.35   | mean of (active days / 7) over the last 4 weeks (weeks before the first activity are ignored) |

**Growth** — evidence: learning + productivity habit days, goal milestone/completion days, journal days.

| Key          | Factor              | Weight | Value                                                                        |
| ------------ | ------------------- | ------ | ---------------------------------------------------------------------------- |
| goalsDone    | Goals completed     | 0.20   | goals completed in 90 days / 3                                               |
| goalProgress | Open goal progress  | 0.15   | average progress of open goals _as of that date_ (from goalProgress history) |
| learning     | Learning habits     | 0.30   | rolling rate                                                                 |
| productivity | Productivity habits | 0.15   | rolling rate                                                                 |
| reflection   | Reflection          | 0.20   | journal days in 30 / 12                                                      |

**Wellness** — evidence: health + social habit days, mood days.

| Key          | Factor           | Weight | Value                                       |
| ------------ | ---------------- | ------ | ------------------------------------------- |
| health       | Health habits    | 0.35   | rolling rate                                |
| moodTracking | Mood tracking    | 0.25   | mood days in 30 / 20                        |
| moodLevel    | Mood level       | 0.15   | (average mood score in 30 days − 2) / 7     |
| checkIns     | Recent check-ins | 0.15   | days with a mood or health habit in 14 / 14 |
| social       | Social habits    | 0.10   | rolling rate                                |

**Focus** — Pomodoro only. Ticking off todos does **not** raise Focus. A session counts when `completed && actualMinutes ≥ 15` (`countsAsFocus`). Window: rolling 30 days. Evidence: days with a counted session.

| Key         | Factor                  | Weight | Value                                                     |
| ----------- | ----------------------- | ------ | --------------------------------------------------------- |
| sessions    | Completed sessions      | 0.50   | counted sessions / 40                                     |
| length      | Average session length  | 0.20   | average minutes / 50                                      |
| consistency | Focus consistency       | 0.15   | days with focus / 20                                      |
| deepWork    | Weekly deep work        | 0.10   | (minutes in 45+ min sessions / 60 / 4.3) / 6 h            |
| calm        | Distraction-free streak | 0.05   | most-recent consecutive sessions with 0 distractions / 10 |

**Mindfulness** — evidence: mindset habit days, journal days, mood days.

| Key           | Factor               | Weight | Value                                                                                               |
| ------------- | -------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| journalFreq   | Journaling frequency | 0.30   | journal days in 30 / 15                                                                             |
| journalDepth  | Journal depth        | 0.15   | average words per entry / 150                                                                       |
| gratitude     | Gratitude            | 0.15   | entries mentioning grateful/gratitude/thankful/thank you/appreciate (or a `grat…`/`thank…` tag) / 8 |
| moodAwareness | Mood awareness       | 0.20   | mood days in 30 / 20                                                                                |
| mindset       | Mindset habits       | 0.20   | rolling rate                                                                                        |

**Financial Wellness** — rolling 30 days. Evidence: days with an expense or income entry.

| Key      | Factor               | Weight | Value                                                                                                 |
| -------- | -------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| savings  | Savings rate         | 0.40   | ((income − spent) / income) / 0.20 — saving 20 %+ is full marks; null without income                  |
| budget   | Budget adherence     | 0.25   | mean over monthly budget + each category limit of (1 if within, else limit / spent); null if none set |
| tracking | Tracking consistency | 0.20   | days with money logged / min(15, 50 % of the days since tracking began)                               |
| goals    | Saving goals         | 0.15   | mean of saved / target across saving goals; null if none                                              |

### 1.3 Overall Aura score

```
overall = round( mean(score of tracked areas) × (0.5 + 0.5 × trackedAreas / 6) )
```

The breadth multiplier means a balanced Aura (all six areas tracked) is required to reach 100; tracking only one area caps the overall at 58 % of that area's score.

### 1.4 Report and comparisons

`buildReport(data, today)` returns `current` (radar as of today) and `previous` (radar recalculated as of today − 30 days, i.e. "last month"), plus:

- `improvement[area]` — integer % change vs 30 days ago (null without a non-zero baseline).
- `strongest` / `weakest` tracked area, `streaks`, `completionRate7d`, `wellbeing` (14-day mood average × 10), `behaviourXp` (XP excluding badges), `insights` (strings).

### 1.5 Insights layer (`auraInsights.ts`)

| Function                             | Output                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `explainArea(area, result)`          | "Reason" text: up to two strong factors (≥ 0.7), up to two weak factors (< 0.4), and an experience note when experience < 60 %.                                                                                                                                                         |
| `areaBreakdown(report, midpoint)`    | Per area: current, previous (30 d ago), delta, change % (1 decimal), trend `up/down/flat` (                                                                                                                                                                                             | Δ   | < 3 points = flat), `accelerating` (last 15 days moved > 2 points more than the 15 before), factors, quality, experience, evidence days. `midpoint` = radar as of today − 15. |
| `recommendations(report, limit = 4)` | For each tracked area, the factor with the largest potential gain `= 100 × experience × (weight / presentWeight) × (1 − value)`; mapped to a concrete action (e.g. "Complete 4 additional Pomodoro sessions per week"). Sorted by gain; untracked areas ("Start tracking X") come last. |
| `healthSummary(report, breakdown)`   | Human sentences: overall change, strongest area, accelerating / improving / slipping / unchanged areas, most room to grow, lopsided warning (spread ≥ 40), untracked areas.                                                                                                             |
| `auraTrend(data, today, period)`     | Radar + overall at the end of each period: `week` (12 points, every 7 days), `month` (12 month-ends), `year` (5 year-ends); trimmed to start at the period containing the first active day; the last point is always today.                                                             |
| `bestMonth(monthly)`                 | Highest-overall month-end _before_ the current month (benchmark overlay).                                                                                                                                                                                                               |
| `compareLastPeriods(points)`         | Overall and per-area change between the last two trend points ("this week vs last week").                                                                                                                                                                                               |

UI: `AuraRadarPanel` (Analytics → Trends & insights) renders all of the above and the "How this score is calculated" panel, using live `RadarResult.factors`, so the explanation can never drift from the maths.

---

## 2. XP (Aura points)

`calculateXP(data, badges)` builds a ledger (`XpEntry[]`, one row per rewarded action). Total XP = sum of the ledger.

| Source                         | XP                         | Anti-farming rule                                                                |
| ------------------------------ | -------------------------- | -------------------------------------------------------------------------------- |
| Habit completion               | 5                          | One log per habit per period (log id = `habitId_periodKey`).                     |
| Perfect day                    | 25                         | All daily habits that existed that day completed, **and at least 2** of them.    |
| Short-term goal completed      | 50                         | 0 if created and completed the same day.                                         |
| Long-term goal completed       | 200                        | Same rule.                                                                       |
| Journal entry                  | 3                          | 1st entry/day × 1, 2nd × 0.5, later × 0; duplicate text earns 0.                 |
| Detailed journal (≥ 150 words) | 10                         | Same diminishing rule.                                                           |
| Mood check-in                  | 2                          | 1st × 1, 2nd × 0.5, later 0 (source `check-in` only).                            |
| Todo completed                 | 2                          | First 5/day full, next 5 half, then 0; completed < 2 min after creation earns 0. |
| Pomodoro session               | 10                         | Counted sessions only (completed, ≥ 15 min); max 4/day.                          |
| Schedule block completed       | 2                          | Max 6/day.                                                                       |
| Weekly consistency             | 100                        | 6+ active days in an ISO week (paid on the 6th day).                             |
| Monthly consistency            | 500                        | 25+ active days in a month.                                                      |
| Badge                          | 10 standard / 25 legendary | Badges are recognition, not a shortcut.                                          |

**Active day** (`activeDays`): any habit log, journal entry, mood log, goal milestone/completion, completed task, counted Pomodoro session, completed schedule block, expense or income entry.

## 3. Levels

```
xpForLevel(n) = round((100·n + 4·n^2.2) / 10) × 10      cumulative XP needed to finish level n
```

L1 ≈ 104 · L5 ≈ 640 · L10 ≈ 1.6k · L25 ≈ 6.9k · L50 ≈ 27k (≈ 8 months of daily effort) · L100 ≈ 110k.

Ranks: 1 Novice · 5 Apprentice · 10 Adept · 20 Achiever · 30 Expert · 40 Master · 50 Grandmaster · 75 Legend · 100 Ascended.

## 4. Streaks (`calculateStreaks`)

| Streak   | Rule                                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| Activity | Consecutive active days; **streak shield**: one missed day per 7 is forgiven. An unfinished today does not break it. |
| Habit    | Best current streak of a single active habit (periods, so weekly habits count weeks).                                |
| Goal     | Consecutive ISO weeks with a milestone or completion.                                                                |
| Journal  | Consecutive days with an entry.                                                                                      |

## 5. Productivity score

`calculateProductivityScore` — 0–100, based on **completed days only** (as of yesterday, so it changes once per day). Daily index (weighted, missing signals skipped):

| Signal                                | Weight |
| ------------------------------------- | ------ |
| Daily habit completion that day       | 0.30   |
| Tasks: done / (done + due-and-missed) | 0.20   |
| Goal milestone in the trailing 7 days | 0.10   |
| Pomodoro minutes / 50                 | 0.15   |
| Schedule: completed / planned minutes | 0.10   |
| Active that day                       | 0.15   |

Score = 0.6 × 7-day average + 0.4 × 30-day average; days before the user started count as 0. Trend = score − score a week earlier.

Other per-feature scores (not part of the radar): Todo `productivityScore` (40 % weekly completion, 25 % on-time, 20 % focus minutes/300, 15 % streak), Schedule `planningScore` (70 % completion + 30 % planned days/5 over 7 days), Pomodoro `focusScore` (= focus quality × 100, before experience).

## 6. Achievements

Evaluated in `DataProvider` after each data change (`calculateAchievements` → `newlyEarned`), persisted to `users/{uid}/achievements/{id}` with an activity entry, and announced by the `AchievementUnlocked` pop-up.

| Id                 | Title              | Tier      | Condition                                           |
| ------------------ | ------------------ | --------- | --------------------------------------------------- |
| first-habit        | First Step         | standard  | Create a habit                                      |
| first-completion   | Momentum           | standard  | Complete a habit once                               |
| streak-7           | 7-Day Streak       | standard  | Longest activity streak ≥ 7                         |
| streak-30          | 30-Day Streak      | legendary | ≥ 30                                                |
| completions-100    | Centurion          | legendary | 100 habit logs                                      |
| first-goal         | Goal Setter        | standard  | Create a goal                                       |
| goal-complete      | Goal Getter        | standard  | 1 "real" goal done (not created+completed same day) |
| goals-5            | Achiever           | legendary | 5 real goals                                        |
| first-entry        | Dear Diary         | standard  | 1 journal entry                                     |
| entries-10         | Reflective Mind    | standard  | 10 entries                                          |
| words-5000         | Storyteller        | standard  | 5,000 journal words                                 |
| mood-7             | Self-Aware         | standard  | Mood on 7 distinct days                             |
| balanced           | Balanced Aura      | legendary | Every area tracked and ≥ 50                         |
| aura-farmer        | Aura Farmer        | legendary | 1,000 behaviour XP (badges excluded)                |
| habit-master       | Habit Master       | legendary | A single habit streak ≥ 60                          |
| goal-crusher       | Goal Crusher       | legendary | 10 real goals                                       |
| journal-veteran    | Journal Veteran    | legendary | 100 entries across 60+ days                         |
| focus-legend       | Focus Legend       | legendary | 3,000 counted Pomodoro minutes (50 h)               |
| consistency-king   | Consistency King   | legendary | Activity streak ≥ 90                                |
| achievement-hunter | Achievement Hunter | legendary | 10 other achievements                               |

20 achievements: 9 standard, 11 legendary.

## 7. Score history

Every scoreboard opens a history modal (`ScoreHistoryProvider`, kinds `aura-points`, `aura-score`, `streak`, `wellbeing`): XP ledger grouped by day, radar snapshots (`analyticsSnapshots`, one per day, last 120 kept in memory), the 30-day streak calendar, and the mood series.

## 8. Changing the system safely

1. Change the formula in `progressionService.ts` (or the feature's `*Factors`).
2. Keep `RadarFactor` keys stable — `auraInsights.ts` maps `area.key` to recommendation text.
3. Update this file, `AREA_HOW_TO` / `RADAR_RULE` in `radar.ts`, and `AREA_SOURCES` in `src/frontend/lib/auraMeta.ts`.
4. Run `npx vitest run` — `progression.test.ts` pins the anti-farming rules and growth curve.
