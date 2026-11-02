# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/) · versions follow semver. Git currently contains only the initial prototype commit (`dc02c12`, 2026-10-30); everything under _Unreleased_ is in the working tree and should be committed as `0.1.0`.

## [Unreleased] — target 0.1.0 (2026-10-30 → 2026-11-01)

### Features added

- **Architecture**: `src/backend` (services, db adapters, models, validators, analytics) and `src/frontend` (pages/components split into mobile, web and shared; layouts; hooks; context); facade `backend/api`.
- **Firebase**: email/mobile + password auth, Google sign-in (popup → redirect fallback), password reset, `phoneIndex` for mobile login, Firestore persistent cache, Storage avatars/attachments, production-only Analytics, security rules for every collection; **local mode** with demo account when Firebase is not configured.
- **Responsive shells**: `MobileShell` with the radial navigation wheel; lazy `WebShell` with sidebar (colour-coded icons), top bar, quick actions and motion.
- **Habits**: categories, priorities, weekly habits, emoji picker grouped by category from `emojilib`, histories.
- **Goals**: named milestones, progress history, overdue tracking.
- **Journal**: moods, tags, search, writing stats.
- **Todo**: list / Kanban / calendar / timeline / analytics / achievements, recurrence, subtasks, attachments, dependencies, due reminders, search with `#tags`.
- **Pomodoro** (`/pomodoro`): Focus 25/5, Deep Work 50/10, Custom; categories; history with edit/delete; stats; Todo "Focus" opens the timer with the task's estimate and completes the task.
- **Expenses** (`/expenses`): expenses, income, budgets, category limits, saving goals, alerts, monthly/category/savings charts.
- **Daily Schedule** (`/schedule`): day/week/month views, drag & drop, recurring blocks, reminders, task/goal links, planning score.
- **Health Hub**: mood tracking and period & cycle tracker with predictions, charts and reminders.
- **Progression engine** (`progressionService.ts`): anti-farming XP ledger, level curve, streaks with shield, productivity score, Aura Radar with experience curve; Focus radar driven only by Pomodoro; **Financial Wellness** replaces Social.
- **Achievements**: 20 badges (11 legendary), real-time unlock pop-up, collector score and filters on the profile.
- **Score history** for every scoreboard (XP, Aura score, streak, wellbeing).
- **Aura Radar redesign**: large animated centrepiece with gradient fill, score-band colours, tooltips and click-to-analyse; benchmarks (now / last month / best month); per-area breakdown with reasons and factor bars; ranked improvement suggestions; health summary; weekly/monthly/yearly trends with period comparison; "How this score is calculated" panel. Backed by `analytics/auraInsights.ts` and `RadarResult.factors`.
- **Profile**: initial-letter avatar fallback, editable display name (Edit → Save/Cancel).
- **Settings**: theme switch, gender, reminders, browser notifications, export/delete data.
- **Documentation**: `notes/` (this folder).

### Bug fixes

- Buttons stuck on "Saving…/Deleting…" when Firestore was unreachable — commits now stop waiting for the server ack after 4 s.
- gtag `ERR_SSL_PROTOCOL_ERROR` on localhost — Analytics only in production builds.
- Goals page content hidden on desktop — reveal animation re-observes elements after StrictMode double effects.
- Points and radar rising too fast — replaced with recalculated, capped XP and the experience curve.
- Pomodoro completion caused "Cannot update a component while rendering" — side effects moved out of the state updater; the finished task is unlinked after completion.
- Aura radar gradient crashed before first layout (non-finite canvas gradient) — guarded.

### Removed

- Todo's built-in Focus mode (replaced by the Pomodoro page) and the `todo-xp` score history.

## [0.0.0] — 2026-10-30

Initial prototype (commit `dc02c12`): Vite + React template with localStorage auth (`src/utils/auth.ts`), Home, Habits, Goals, Journal and Period Tracker pages, `NavMenu`, design tokens.
