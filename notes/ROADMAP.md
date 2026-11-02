# Roadmap

## Implemented

| Area         | Delivered                                                                                                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Platform     | Firebase auth (email/mobile + password, Google, reset) and offline local mode; real-time Firestore sync with persistent cache; security rules for every collection; schema v1 → v2 migration; export / delete data                                           |
| Layout       | Responsive split: `MobileShell` (radial nav wheel) and lazy `WebShell` (sidebar, top bar, quick actions, motion); light/dark theme                                                                                                                           |
| Core         | Habits (categories, priorities, weekly habits, emoji picker), Goals (named milestones, history), Journal (mood, tags, search, stats), Todo (list/board/calendar/timeline/analytics/achievements, recurrence, subtasks, attachments, dependencies, reminders) |
| Productivity | Pomodoro (presets, custom, task-linked auto-completion, stats, history), Daily Schedule (day/week/month, drag & drop, recurrence, reminders, task/goal links)                                                                                                |
| Money        | Expenses & income, budgets, category limits, saving goals, alerts, charts                                                                                                                                                                                    |
| Wellness     | Health Hub, mood tracking, period & cycle tracker with predictions and reminders                                                                                                                                                                             |
| Progression  | Centralised progression engine (anti-farming XP, level curve, streak shield, productivity score), 6-area Aura Radar with experience curve, Financial Wellness area, 20 achievements with real-time pop-up, score history for every scoreboard                |
| Insight      | Aura Radar redesign: large animated radar, benchmarks (last month / best month), breakdown with reasons, ranked suggestions, health summary, weekly/monthly/yearly trends, calculation transparency                                                          |
| Docs         | `notes/` documentation set                                                                                                                                                                                                                                   |

## In progress

- Committing the current work (only the prototype is in git) and tagging `0.1.0`.
- Deploying the latest `firestore.rules` to `aura-maxxing-cd7be`.

## Planned (next)

1. CI pipeline (lint, typecheck, tests, build) and preview deploys.
2. Bundle splitting for Firebase and chart.js (target: no chunk > 500 kB).
3. Push reminders via service worker + FCM (habits, schedule blocks, period).
4. Cross-device Pomodoro (active session in Firestore).
5. Merge Todo subscriptions into `DataProvider`.
6. Full account deletion (Auth, Storage, `phoneIndex`).
7. Component/E2E tests for Todo → Pomodoro, schedule drag, expenses CRUD.

## Future ideas

- Calendar sync (Google/ICS) and auto-scheduling tasks into free slots.
- Recurring transactions and CSV import for Expenses.
- Social accountability (share Aura card, friends' streaks) — would need a public profile model.
- AI weekly review summarising the Aura insights.
- Wearable/sleep data for Wellness.
- PWA install + offline-first shell.

## Priority matrix

|                 | Low effort                                             | High effort                                                        |
| --------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| **High impact** | Deploy rules · CI pipeline · bundle splitting · README | Push reminders (SW + FCM) · server-side aggregates · calendar sync |
| **Low impact**  | Remove unused Tailwind deps · archive `extrass/`       | Social features · AI review · wearables                            |

Scoring/formula changes must also update [AURA_SYSTEM.md](AURA_SYSTEM.md).
