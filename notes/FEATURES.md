# Features

Each section: **Purpose · Current implementation · Data · Future improvements.** All pages work on phone (MobileShell + navigation wheel) and desktop (WebShell + sidebar).

---

## Home (Dashboard) — `/`

- **Purpose:** today at a glance and the fastest way to act.
- **Implementation:** `ResponsivePage` → `pages/mobile/MobileDashboard` or `pages/web/DesktopDashboard`.
  - Greeting, habits done/total ring, XP today, Aura score with trend (opens history), streak flame (`NeonFlame`).
  - Compact Aura Radar with per-area bars; weekly habit bar chart; mood check-in; recent journal, active goals, recent activity.
  - Desktop adds framer-motion parallax hero, staggered tiles, task summary (due/overdue/in progress/blocked), productivity score, combined insights, `QuickActionsFab`.
- **Data:** `useUserData()` (report, progression, habits, logs…), `useTodo()`, `hooks/useDashboardData`.
- **Future:** customisable widget layout; "plan my day" suggestion from schedule + tasks.

## Todo — `/todo`

- **Purpose:** full task manager feeding productivity and focus.
- **Implementation:** `pages/shared/todo.tsx` + `components/shared/todo/*`.
  - Views: List, Board (Kanban drag between statuses), Calendar, Timeline (activity), Analytics, Achievements.
  - Filters (all, due today, this week, overdue, high priority, completed), sorts, search with `#tag` parsing in quick add.
  - Task editor: description, notes, priority (low→critical), due date/time, estimate, recurrence (daily/weekly/monthly spawns the next occurrence), subtasks, attachments (Storage, 10 MB), dependencies, linked goal/habit.
  - **Focus**: every "Focus" button opens `/pomodoro?task=<id>`; the timer uses the task's estimate and marks the task done when it completes.
  - Due reminders (1 day, 1 hour, overdue) as in-app notifications + browser notifications.
- **Data:** `tasks`, `taskActivity`, `taskNotifications`, `taskStats` (TodoProvider); XP from `progressionService` (+2 per task, capped).
- **Future:** natural-language dates; shared lists; drag-to-schedule into Daily Schedule.

## Habits — `/habits`

- **Purpose:** daily/weekly routines that drive Discipline and most radar areas.
- **Implementation:** `pages/shared/habits.tsx`, `HabitComposer`, `HabitEditor`, `HabitHistory`, `EmojiPicker` (groups Health/Learning/Productivity/Mindset/Social built from `emojilib`, lazy-loaded).
  - Categories `health | learning | productivity | mindset | social`, priority (weights completion rate), frequency daily/weekly, archive.
  - Sort by priority, streak, completion rate, name; per-habit 30-day history.
- **Data:** `habits`, `habitLogs` (one doc per habit per period: `habitId_periodKey`).
- **Future:** custom schedules (e.g. Mon/Wed/Fri), habit stacking, quantity habits (glasses of water).

## Goals — `/goals`

- **Purpose:** short- and long-term outcomes broken into milestones.
- **Implementation:** `pages/shared/goals.tsx`, `GoalForm`, `GoalHistory`, `GoalCard`.
  - Filters Active/Completed/Overdue/All; stats (active, completed, overdue, milestones in 30 days).
  - Named milestones (1–50), progress = milestones done / total, due dates, edit history.
- **Data:** `goals`, `goalProgress` (append-only events: created, milestone, milestone-undone, completed, reopened, edited).
- **Future:** sub-goals; link habits/tasks to milestones automatically.

## Journal — `/journal`

- **Purpose:** reflection; drives Mindfulness and Growth.
- **Implementation:** `pages/shared/journal.tsx`, `JournalForm`, `JournalEntryCard`.
  - Mood per entry, tags, full-text + `#tag` search, mood filter, pagination.
  - Stats: total, writing streak, words, most active weekday, entries per week (8 weeks), top tags.
- **Data:** `journalEntries` (+ a `moodLogs` doc with `source: 'journal'` when a mood is set).
- **Future:** prompts, rich text, private lock.

## Analytics — `/analytics`

- **Purpose:** understand _why_ the Aura moves and what to do next.
- **Implementation:** `pages/shared/analytics.tsx` (tabs: Trends & insights, Monthly report, Yearly report); desktop wrapper `DesktopAnalytics` adds `AnalyticsPatterns`.
  - **Aura Radar panel** (`AuraRadarPanel`): large animated radar (gradient fill, score-band colours, tooltips with the reason, click an area to analyse it), benchmark overlays (Now vs Last month vs Best month), **Aura breakdown** (current, previous, change %, trend, reason, factor bars), **Improvement suggestions** (ranked by potential points), **Aura health summary**, **Historical trends** (weekly / monthly / yearly, per area, period-vs-period comparison), **How this score is calculated** (formulas, weights, your data, sources).
  - Life OS tiles (focus, planning, finance, productivity), stat cards, 7-day prediction, overall trend, insights, area cards.
  - Monthly report (heatmap, totals) and yearly report (mosaic).
- **Data:** report/progression from `DataProvider`; `analyticsSnapshots` for the daily trend; insights computed on demand (`auraInsights.ts`).
- **Future:** export reports as PDF; correlations (mood vs focus, spending vs mood).

## Pomodoro — `/pomodoro`

- **Purpose:** deliberate focus; the **only** input to the Focus radar area.
- **Implementation:** `pages/shared/pomodoro.tsx`, `hooks/usePomodoroTimer.ts`.
  - Modes: Focus 25/5, Deep Work 50/10, Custom (focus 5–180, break 1–60), Task (locked to a task's estimate).
  - Timer state persisted in `localStorage['aura-pomodoro-timer']` (timestamps, survives reloads/navigation); pause/resume, stop (saves an incomplete session), distraction counter, skip break.
  - Categories Study, Coding, Reading, Work, Exercise, Personal, Custom; notes.
  - Completion: chime, browser notification, session saved, +10 XP (≥ 15 min, max 4/day), linked task marked done and its `focusMinutes` credited.
  - Stats (sessions, today/week/month minutes, streaks, focus score), last-7-days bars, category breakdown, history with filter/edit/delete (legacy Todo focus sessions included).
- **Data:** `pomodoro` (+ read-only legacy `focusSessions`).
- **Future:** ambient sounds, focus goals per day, cross-device live timer.

## Expenses — `/expenses`

- **Purpose:** money awareness; drives the Financial Wellness area.
- **Implementation:** `pages/shared/expenses.tsx`.
  - Tabs: Overview (income, spent, saved, savings rate, daily average, budget usage, alerts), Transactions (filter by type/category), Analytics (6-month trend, category doughnut, savings trend), Budgets & goals.
  - Expense: amount, category (Food, Shopping, Travel, Bills, Entertainment, Medical, Education, Investments, Subscriptions, Other), description, date, payment method (cash/card/UPI/bank/wallet/other). Income: amount, source, date.
  - Settings: currency (default ₹), monthly budget, per-category limits, up to 12 saving goals.
  - Alerts: budget exceeded / near, category limit exceeded, high-spending category, low savings rate.
- **Data:** `expenses`, `income`, `settings/finance`.
- **Future:** recurring transactions, CSV import, multi-currency.

## Daily Schedule — `/schedule`

- **Purpose:** time-block the day; drives the planning score and part of productivity.
- **Implementation:** `pages/shared/schedule.tsx`.
  - Day / Week time grid (06:00–24:00, 15-min snapping, drag to move across days, overlapping blocks laid out in lanes, now-line), Month grid, Agenda, "Tasks to schedule".
  - Block: title, description, start/end, category (Work, Study, Health, Meetings, Personal, Family, Finance, Other — colour coded), priority, recurrence (none/daily/weekdays/weekly), reminder, linked task/goal.
  - Moving or deleting one occurrence of a recurring block splits it from the series (`skippedDates`).
  - Ticking a block completes that date; a linked task is marked done. "🍅 Focus now" opens Pomodoro.
  - Stats: planned, completed, completion rate, planning score.
  - Reminders via `ScheduleReminderRunner` (toast + browser notification).
- **Data:** `schedule`.
- **Future:** calendar import (ICS/Google), auto-scheduling of tasks into free slots.

## Health Hub — `/health`

- **Purpose:** wellbeing in one place; drives Wellness.
- **Implementation:** `pages/shared/health.tsx` — tabs Overview, Mood, Period & cycle (female users), History.
  - Mood check-in, mood distribution, health-habit completion, wellness score and tips.
  - Period tracker (`periodtracker.tsx`, `components/shared/period/*`): calendar, daily log (flow, pain, moods, energy, stress, symptoms, notes), cycle stats, predictions with fertile window, charts (cycle length, mood trend, phase mood, symptom frequency, correlation), reminders.
- **Data:** `moodLogs`, `habitLogs`, `periodLogs`, `settings/periodReminders`.
- **Future:** wearable/sleep imports.

## Trackers — `/trackers`

- **Purpose:** per-domain history.
- **Implementation:** tabs Habits, Goals, Journal, Mood, All activity (filterable feed of the last 100 events).
- **Data:** all collections + `activityHistory`.

## Profile — `/profile`

- **Purpose:** identity and progression.
- **Implementation:** avatar (initial-letter fallback; upload resized to 256 px), display name (read-only until **Edit**), level & rank, XP and score history, streaks, productivity, progression panel, achievement stickers with collector score and filters (All / Legendary / Unlocked / Locked), member-since.
- **Data:** `users/{uid}`, `achievements`, progression.

## Settings — `/settings`

- **Purpose:** preferences and data control.
- **Implementation:** theme (dark/light), gender, browser notifications (permission request), habit & journal reminder times, export all data (JSON), delete all data (confirmation).
- **Data:** `settings/preferences`, `users/{uid}`.

## Cross-cutting

| Feature                            | Where                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Achievements + real-time pop-up    | `achievements/engine.ts`, `AchievementUnlocked.tsx`, `lib/achievementEvents.ts`                      |
| Score history for every scoreboard | `ScoreHistoryProvider`                                                                               |
| Reminders                          | `AppReminderRunner` (habits 1/min, journal), `ScheduleReminderRunner` (30 s), `PeriodReminderRunner` |
| Offline                            | Firestore persistent cache; `OfflineBanner`; local mode without Firebase                             |
| Theme                              | `settings/preferences.theme` → `<html data-theme>` + `localStorage['aura-theme']`                    |
