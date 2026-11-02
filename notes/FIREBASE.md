# Firebase

Project alias: `aura-maxxing-cd7be` (`.firebaserc`). Services used: **Authentication**, **Cloud Firestore**, **Cloud Storage**, **Analytics** (production builds only). Config: `src/backend/firebase/config.ts` and `firebase.ts`.

If the `VITE_FIREBASE_*` variables are missing (or `MODE === 'test'`), `isFirebaseConfigured` is `false` and the app runs in **local mode**: the same `Database` interface backed by `localStorage`, with local salted-hash accounts (demo `demo@aura.app` / `AuraDemo1`). Every feature works offline in that mode; nothing syncs.

## Initialisation

| Piece     | Setting                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth      | `browserLocalPersistence` (session survives restarts); `GoogleAuthProvider` with `prompt: 'select_account'`                                          |
| Firestore | `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })` — offline-first, shared across tabs |
| Storage   | Only if `storageBucket` is set                                                                                                                       |
| Analytics | Only when `import.meta.env.PROD`, `measurementId` is set and `isSupported()` — avoids gtag errors on localhost                                       |

## Collections

Everything a user owns lives under their user document. Paths are defined once in `src/backend/db/index.ts` (`paths`).

```
users/{uid}                              profile document
users/{uid}/habits/{habitId}
users/{uid}/habitLogs/{habitId}_{periodKey}
users/{uid}/goals/{goalId}
users/{uid}/goalProgress/{eventId}        append-only
users/{uid}/journalEntries/{entryId}
users/{uid}/moodLogs/{moodId}
users/{uid}/activityHistory/{activityId}
users/{uid}/analyticsSnapshots/{yyyy-mm-dd}
users/{uid}/achievements/{achievementId}
users/{uid}/settings/{preferences|periodReminders|finance}
users/{uid}/periodLogs/{yyyy-mm-dd}
users/{uid}/tasks/{taskId}
users/{uid}/taskActivity/{eventId}        append-only
users/{uid}/taskNotifications/{id}
users/{uid}/taskStats/{yyyy-mm-dd}
users/{uid}/focusSessions/{id}            legacy (Todo focus), append-only, read for history
users/{uid}/pomodoro/{sessionId}
users/{uid}/expenses/{expenseId}
users/{uid}/income/{incomeId}
users/{uid}/schedule/{itemId}
users/{uid}/journals, users/{uid}/moods   schema v1 legacy — read/delete only (migration)
phoneIndex/{10-digit mobile}              { uid, email } — lets users log in with their mobile number
```

Field-level detail: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

### Example documents

```jsonc
// users/abc123
{ "uid": "abc123", "username": "Om", "email": "om@example.com", "photoURL": null,
  "gender": "male", "createdAt": "2026-10-30T09:12:00.000Z", "schemaVersion": 2 }

// users/abc123/habitLogs/h_42_2026-11-01
{ "habitId": "h_42", "date": "2026-11-01", "createdAt": "2026-11-01T07:30:00.000Z" }

// users/abc123/pomodoro/7f1c…
{ "mode": "task", "category": "work", "customCategory": "", "notes": "",
  "focusMinutes": 25, "actualMinutes": 25, "breakMinutes": 5, "completed": true, "distractions": 0,
  "taskId": "4a58…", "taskTitle": "Write report",
  "startedAt": "2026-11-01T09:00:00.000Z", "endedAt": "2026-11-01T09:25:00.000Z",
  "date": "2026-11-01", "createdAt": "2026-11-01T09:25:01.000Z" }

// users/abc123/settings/finance
{ "currency": "₹", "monthlyBudget": 30000, "categoryLimits": { "food": 8000 },
  "savingGoals": [{ "id": "g1", "name": "Laptop", "target": 90000, "saved": 20000, "deadline": null }],
  "updatedAt": "2026-11-01T10:00:00.000Z" }
```

## Security rules (`firestore.rules`)

Helpers: `signedIn()`, `isOwner(userId)` (`request.auth.uid == userId`), `isString(v, max)`, `isIsoDate(v)` (`^\d{4}-\d{2}-\d{2}$`).

| Path                         | Read                        | Write                                                                  | Validated on create/update                                                                                                                                                             |
| ---------------------------- | --------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users/{uid}`                | owner                       | create/update by owner; `uid` and `createdAt` immutable; **no delete** | `uid` matches auth                                                                                                                                                                     |
| `habits`                     | owner                       | owner                                                                  | `label` ≤ 60, `category` ∈ 5 categories, `priority` ∈ low/medium/high, `frequency` ∈ daily/weekly, `emoji` ≤ 16                                                                        |
| `habitLogs`                  | owner                       | owner                                                                  | `habitId` string, `date` ISO                                                                                                                                                           |
| `goals`                      | owner                       | owner                                                                  | `title` ≤ 80, `milestones` int 1–50, `milestonesComplete` ≤ milestones, `milestoneNames` length = milestones                                                                           |
| `goalProgress`               | owner                       | create/delete only                                                     | `goalId` string                                                                                                                                                                        |
| `journalEntries`             | owner                       | owner                                                                  | `text` ≤ 10,000                                                                                                                                                                        |
| `moodLogs`                   | owner                       | owner                                                                  | `mood` ∈ 6 moods, `score` int 1–10, `date` ISO                                                                                                                                         |
| `activityHistory`            | owner                       | owner                                                                  | `message` ≤ 300                                                                                                                                                                        |
| `analyticsSnapshots`         | owner                       | owner                                                                  | doc id is an ISO date                                                                                                                                                                  |
| `achievements`               | owner                       | owner                                                                  | —                                                                                                                                                                                      |
| `settings/{id}`              | owner                       | owner                                                                  | id ∈ `preferences`, `periodReminders`, `finance`                                                                                                                                       |
| `periodLogs`                 | owner                       | owner                                                                  | `date` ISO and equal to doc id                                                                                                                                                         |
| `tasks`                      | owner                       | owner                                                                  | `title` ≤ 120, status/priority/recurrence enums, `dueDate` ISO or null, subtasks ≤ 50, attachments ≤ 10, tags ≤ 8                                                                      |
| `taskActivity`               | owner                       | create/delete only                                                     | `message` ≤ 300                                                                                                                                                                        |
| `focusSessions`              | owner                       | create/delete only                                                     | `minutes` int 1–1440, `date` ISO                                                                                                                                                       |
| `taskNotifications`          | owner                       | owner                                                                  | `kind` ∈ due-1d/due-1h/overdue/focus, `body` ≤ 300                                                                                                                                     |
| `taskStats`                  | owner                       | owner                                                                  | doc id ISO date                                                                                                                                                                        |
| `pomodoro`                   | owner                       | owner                                                                  | `mode` ∈ focus/deep/custom/task, `category` ∈ 7, `focusMinutes` 1–180, `actualMinutes` 0–180, `completed` bool, `notes` ≤ 500, `date` ISO                                              |
| `expenses`                   | owner                       | owner                                                                  | `amount` 0 < x ≤ 100,000,000, `category` ∈ 10, `paymentMethod` ∈ 6, `description` ≤ 120, `date` ISO                                                                                    |
| `income`                     | owner                       | owner                                                                  | `amount` as above, `source` ≤ 60, `date` ISO                                                                                                                                           |
| `schedule`                   | owner                       | owner                                                                  | `title` ≤ 80, `description` ≤ 500, `date` ISO, `start`/`end` `HH:MM`, `category` ∈ 8, `priority` ∈ 3, `recurrence` ∈ none/daily/weekdays/weekly, `completedDates`/`skippedDates` lists |
| `journals`, `moods` (legacy) | owner                       | delete only                                                            | —                                                                                                                                                                                      |
| `phoneIndex/{mobile}`        | `get` by anyone (no `list`) | create by the signed-in owner; no update; delete by owner              | id `^[0-9]{10}$`, keys only `uid`,`email`, `uid == auth.uid`, `email == auth.token.email`                                                                                              |

Client-side validators (`validators/`, feature `model.ts`) apply the same limits first so users get inline errors; the rules are the server-side guarantee.

## Storage (`storage.rules`)

| Path                                    | Rule                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `users/{uid}/avatar.jpg`                | owner read/delete; write only `avatar.jpg`, < 5 MB, `image/*` (client resizes to 256×256 JPEG) |
| `users/{uid}/tasks/{taskId}/{fileName}` | owner read/delete; write < 10 MB                                                               |

In local mode avatars are stored as 128 px data URLs and attachments as data URLs.

## Real-time features

- `DataProvider` and `TodoProvider` open one `onSnapshot` listener per collection (ordered/limited per collection — e.g. activity last 300, snapshots last 120, pomodoro last 1000). Every change re-derives all scores.
- Writes are applied to the local cache immediately (latency compensation), then synced. `firestoreDatabase.commit` waits at most 4 s for the server ack so buttons never stay stuck on "Saving…" when the network or Firestore API is unavailable; writes stay queued and sync later.
- Multi-tab: persistent cache with the multiple-tab manager; local mode uses the `storage` event.
- Offline banner (`OfflineBanner`) when `navigator.onLine` is false.

## Operations

- `exportUserData(uid)` — JSON of the profile and every collection in `USER_COLLECTIONS`.
- `deleteAllUserData(uid)` — deletes every document in those collections (the profile doc and Auth account remain).
- Schema migration v1 → v2 runs automatically for older profiles (`migrationService.ts`).

Deployment of rules and hosting: [DEPLOYMENT.md](DEPLOYMENT.md).
