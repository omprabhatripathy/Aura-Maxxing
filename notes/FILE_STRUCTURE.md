# File Structure

```
Aura-Maxxing/
├── notes/                    Project documentation (you are here)
├── extrass/                  Early planning notes (Plan.txt, commands.md, structure.md) — historical, not used by the app
├── public/                   Static files copied as-is into dist/ (favicon.svg, icons.svg)
├── src/
│   ├── main.tsx              Entry: providers + theme bootstrap
│   ├── app.tsx               Route table
│   ├── vite-env.d.ts         Vite/env typings
│   ├── assets/               Images bundled by Vite (hero.png, logos)
│   ├── backend/              Business logic, data access, scoring (no React)
│   └── frontend/             React UI
├── firestore.rules           Firestore security rules
├── storage.rules             Cloud Storage security rules
├── firebase.json             Firebase CLI config (rules, hosting → dist/, SPA rewrite)
├── .firebaserc               Default Firebase project alias (aura-maxxing-cd7be)
├── vercel.json               Vercel build + SPA rewrite
├── .env.example              Required VITE_FIREBASE_* variables
├── index.html                Vite HTML entry
├── vite.config.ts            Vite config (React plugin)
├── tsconfig*.json            TypeScript project configs (app = src, node = config files)
├── eslint.config.js          ESLint flat config (TS, react-hooks v7, react-refresh)
├── postcss.config.js         PostCSS (@tailwindcss/postcss)
└── package.json              Scripts and dependencies
```

---

## src/backend/

**Purpose:** everything that is not presentation — data access, validation, workflows, analytics and scoring. Pure TypeScript, no React imports, unit-tested with Vitest.

### backend/core/

| File        | Purpose                                                                                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dates.ts`  | Local-time ISO date helpers: `toIso`, `fromIso`, `todayIso`, `addDays`, `diffDays`, `dateRange`, `weekStart` (Monday), `formatDate`, `isoFromTimestamp`, `formatDateTime`. |
| `errors.ts` | `ValidationError`, `toUserMessage` (maps Firebase codes to friendly text), `isTransientError`, `withRetry`.                                                                |
| `ids.ts`    | `newId()` (UUID) and `nowIso()`.                                                                                                                                           |

### backend/db/

| File                   | Purpose                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`             | `Database` interface (`subscribe`, `subscribeDoc`, `getDoc`, `list`, `commit`), `WriteOp`, `QueryOptions`, `StoredDoc`, `clean()` (strips `undefined`). |
| `index.ts`             | `paths` (every collection path) and the `database` singleton (Firestore if configured, else local).                                                     |
| `firestoreDatabase.ts` | Firestore adapter: queries, `onSnapshot`, batched commits (450/batch), 4 s server-ack race, Timestamp → ISO normalisation.                              |
| `localDatabase.ts`     | localStorage adapter (`aura-db:<path>` keys), emulated live subscriptions, cross-tab `storage` events.                                                  |

### backend/firebase/

| File          | Purpose                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| `config.ts`   | Reads `VITE_FIREBASE_*`; `isFirebaseConfigured`; `initAnalytics` (production only).                          |
| `firebase.ts` | Initialises app, Auth (local persistence), Google provider, Firestore (persistent multi-tab cache), Storage. |

### backend/auth/

| File             | Purpose                                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authService.ts` | `register`, `login` (email or mobile), `loginWithGoogle` (popup → redirect fallback), `resetPassword`, `logout`, `onAuthChange`, local-mode accounts, error mapping. |

### backend/models/

| File       | Purpose                                                                                                                                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts` | Domain types and constants: Habit, HabitLog, Goal, GoalProgress, JournalEntry, MoodLog, Activity/ActivityType, Achievement, AnalyticsSnapshot, UserProfile, Preferences, RadarScores, mood scores, priority weights. |

### backend/validators/

| File       | Purpose                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `index.ts` | Validation for habits, goals, journal, mood, username, email, mobile, password; throws `ValidationError`. |

### backend/repositories/

| File         | Purpose                                                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mappers.ts` | `toHabit`, `toGoal`, `toJournalEntry`, `toMoodLog`, `toActivity`, `toAchievement`, `toSnapshot`, `toPreferences`, `toUserProfile` — sanitise stored docs with defaults. |

### backend/services/

| File                    | Purpose                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ops.ts`                | `setOp`, `deleteOp`, `activityOp`, `commit` (with retry).                                                                                            |
| `habitService.ts`       | Create/update/archive/delete habits; toggle completion (deterministic log ids).                                                                      |
| `goalService.ts`        | Create/update/delete goals; milestone toggles; progress history events.                                                                              |
| `journalService.ts`     | Journal entries and mood check-ins (entry mood also writes a mood log).                                                                              |
| `profileService.ts`     | User doc creation (`SCHEMA_VERSION = 2`), username, gender, preferences, settings docs, avatar upload/resize.                                        |
| `systemService.ts`      | `USER_COLLECTIONS`, achievement unlocks, daily analytics snapshot, JSON export, delete-all-data.                                                     |
| `migrationService.ts`   | Schema v1 → v2 migration (habit `completedDates` → logs, legacy journals/moods split).                                                               |
| `progressionService.ts` | **All scoring**: XP ledger, levels, streaks, Aura Radar, productivity score, overall Aura. See [AURA_SYSTEM.md](AURA_SYSTEM.md).                     |
| `*.test.ts`             | `progression.test.ts` (scoring rules), `features.test.ts` (pomodoro/finance/schedule), `workflows.test.ts` (service workflows on the local adapter). |

### backend/analytics/

| File              | Purpose                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `factors.ts`      | `RadarFactor` type, `weightedFactors`, `clamp01`.                                                                           |
| `habits.ts`       | Habit maths: `groupLogs`, `periodKey`, `isDone`, `completionRate`, `habitStreak`, `dailyCompletionSeries`, …                |
| `metrics.ts`      | Mood series/distribution, journal stats, goal stats.                                                                        |
| `radar.ts`        | `buildReport` (current vs 30 days ago, strongest/weakest, insights), `AREA_LABELS`, `AREA_HOW_TO`, `RADAR_RULE`.            |
| `auraInsights.ts` | Area breakdown, explanations, recommendations, health summary, weekly/monthly/yearly trends, best month, period comparison. |
| `*.test.ts`       | Analytics and insights tests.                                                                                               |

### backend/achievements/

| File        | Purpose                                                                    |
| ----------- | -------------------------------------------------------------------------- |
| `engine.ts` | 20 achievement definitions, `LEGENDARY_BADGES`, `BADGE_XP`, `newlyEarned`. |

### Feature modules (same shape: `types` → `model` → `analytics` → `service`)

| Folder              | Files                                                                                                                                                                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/todo/`     | `types.ts` (Task, Subtask, Attachment, TaskActivity, FocusSession, TaskNotification, TaskDayStats), `model.ts` (mappers/validation), `analytics.ts` (progress, overdue, streaks, productivity score, reminders), `taskService.ts` (CRUD, status, recurrence, subtasks, attachments upload), `todo.test.ts`. |
| `backend/pomodoro/` | `types.ts` (PomodoroSession, presets, categories, limits), `model.ts` (mapper, `fromLegacyFocus`, validation), `analytics.ts` (`countsAsFocus`, `focusFactors`, `focusQuality`, `pomodoroStats`), `pomodoroService.ts` (log/update/delete; completes the linked task).                                      |
| `backend/finance/`  | `types.ts` (Expense, Income, SavingGoal, FinanceSettings), `model.ts`, `analytics.ts` (month summary, trends, alerts, `financeFactors`), `financeService.ts`.                                                                                                                                               |
| `backend/schedule/` | `types.ts` (ScheduleItem, recurrence, categories), `model.ts`, `analytics.ts` (occurrences, planning stats/score, lane layout), `scheduleService.ts` (create/move/complete/delete occurrence or series).                                                                                                    |
| `backend/period/`   | `types.ts`, `store.ts` (period log subscriptions/writes), `cycle.ts` (periods, cycles, predictions), `analytics.ts` (mood/symptom insights), `periodForm.ts`, `reminders.ts`, tests.                                                                                                                        |

### backend/api/ and backend/index.ts

Facade re-exporting services, `buildReport`, area constants, model types and error helpers.

---

## src/frontend/

**Purpose:** presentation and interaction. Reads state from context hooks, calls backend services through `useAction`.

### frontend/context/

| File                                 | Purpose                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `AuthContext.tsx` / `useAuth.ts`     | Auth state + actions; triggers schema migration.                                                            |
| `DataContext.tsx` / `useUserData.ts` | Subscribes to all user collections; derives report/progression; reactions (achievements, snapshots, theme). |
| `TodoContext.tsx` / `useTodo.ts`     | Todo-specific subscriptions, Todo XP and notifications.                                                     |
| `useScoreHistory.ts`                 | Hook to open score-history modals (`ScoreKind`).                                                            |
| `useHeaderSlot.ts`                   | Portal target for page actions in the top bar.                                                              |

### frontend/layouts/

| File                 | Purpose                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `AppLayout.tsx`      | Providers for signed-in pages, device switch, app-wide extras.                                                   |
| `MobileShell.tsx`    | Phone chrome + navigation wheel.                                                                                 |
| `WebShell.tsx/.css`  | Desktop/tablet chrome (lazy chunk).                                                                              |
| `ResponsivePage.tsx` | Renders a mobile or web variant of a page.                                                                       |
| `ProtectedRoute.tsx` | Redirects to `/login` when signed out.                                                                           |
| `PageOutlet.tsx`     | Page body for both shells: offline banner, error boundary (reset per route) around `<Outlet/>`, local-mode note. |

### frontend/pages/

| Folder/File                                                                                                                                                                        | Purpose                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `mobile/MobileDashboard`                                                                                                                                                           | Phone home screen.                              |
| `web/DesktopDashboard`, `web/DesktopAnalytics`                                                                                                                                     | Desktop home and analytics.                     |
| `shared/habits`, `goals`, `journal`, `todo`, `pomodoro`, `expenses`, `schedule`, `analytics` (+ `monthly`, `yearly`), `health`, `trackers`, `periodtracker`, `profile`, `settings` | Feature pages (same component on every device). |
| `shared/auth/login`, `register`                                                                                                                                                    | Public auth pages.                              |

### frontend/components/

| Folder                                                                | Contains                                                                                                                                                                                  | Responsibility                                                  |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `shared/ui/`                                                          | Card wrappers, StatCard, Modal, SegmentedControl, Field inputs, ProgressBar, Timeline, Toolbar, IconButton, MoodPicker, Status (Empty/Error states)                                       | Generic, presentation-only building blocks (barrel `index.ts`). |
| `shared/` (root)                                                      | Button, Card, AuraRadar, Avatar, AchievementBadge/Unlocked, HabitCard, GoalCard, JournalEntryCard, MoodCheckIn, ProgressRing, NeonFlame, WeeklyBarChart, GenderPrompt, UserProfile, icons | Reusable domain widgets.                                        |
| `shared/analytics/`                                                   | AnalyticsOverview, **AuraRadarPanel**, AreaCards.css                                                                                                                                      | Analytics page content.                                         |
| `shared/charts/`                                                      | TrendLine, TrendBars                                                                                                                                                                      | chart.js wrappers.                                              |
| `shared/habits/`, `goals/`, `journal/`, `todo/`, `period/`, `health/` | Feature-specific forms, editors, histories, boards                                                                                                                                        | Feature UI.                                                     |
| `shared/scores/`                                                      | ScoreHistoryProvider                                                                                                                                                                      | History modal for every score.                                  |
| `shared/reminders/`                                                   | AppReminderRunner, ScheduleReminderRunner, `notify.ts`                                                                                                                                    | Background reminders while the app is open.                     |
| `shared/feedback/`                                                    | Toast, ErrorBoundary, Feedback (skeletons, error state)                                                                                                                                   | User feedback.                                                  |
| `mobile/NavMenu`                                                      | Radial navigation wheel                                                                                                                                                                   | Phone navigation.                                               |
| `web/`                                                                | DesktopSidebar, DesktopTopbar, QuickActionsFab, WidgetCard, AnalyticsPatterns                                                                                                             | Desktop chrome and widgets.                                     |

### frontend/hooks/

`useAction` (service calls + toasts), `useDevice`/`useResponsiveLayout`, `usePomodoroTimer`, `useTaskActions`, `useDashboardData`, `usePeriodData`, `useLogout`, `useOnline`.

### frontend/lib/

`nav-items.ts` (wheel rings, sidebar sections, colours), `routes.ts` (route labels), `designTokens.ts` (breakpoints), `achievementStickers.ts`, `achievementEvents.ts` (pop-up emitter), `habitEmoji.ts` (emoji groups from emojilib), `options.ts` (select options), `auraMeta.ts` (radar colours, data sources, score bands).

### frontend/animations/

`Reveal.tsx`, `useAutoReveal.ts` (scroll reveal that survives StrictMode), `variants.ts` (framer-motion presets).

### frontend/icons/

`icons.tsx` (SVG icon set), `moodicon.tsx` + `moodMeta.ts` (mood icons via react-icons/wi), `CycleMoodIcon.tsx`.

### frontend/styles/

`tokens.css` (design tokens, light/dark), `global.css` (base styles, imports), `index.css` (`@import "tailwindcss"`), `app.css` (app-level layout), `web.css` (desktop-only, scoped to `.web-shell`).

---

## Conventions

- Components in `PascalCase.tsx`; pages in `lowercase.tsx`; CSS file next to its component.
- Component files export **only components**; hooks, contexts and constants live in `.ts` files.
- `import type` for type-only imports (`verbatimModuleSyntax`).
- Every write: validate → build `WriteOp[]` → `commit` (with an `activityOp`).
