# Deployment

The app is a static SPA: `npm run build` produces `dist/`, which can be served by **Firebase Hosting** (`firebase.json`) or **Vercel** (`vercel.json`). Firestore/Storage rules are deployed with the Firebase CLI.

## Environment variables

Copy `.env.example` to `.env` (git-ignored) and fill in the values from Firebase console → Project settings → Your apps → Web app config.

| Variable                            | Required    | Used for                                                  |
| ----------------------------------- | ----------- | --------------------------------------------------------- |
| `VITE_FIREBASE_API_KEY`             | yes\*       | Firebase app                                              |
| `VITE_FIREBASE_AUTH_DOMAIN`         | yes         | Auth (Google popup/redirect)                              |
| `VITE_FIREBASE_PROJECT_ID`          | yes\*       | Firestore                                                 |
| `VITE_FIREBASE_STORAGE_BUCKET`      | for uploads | Avatars, task attachments (Storage is skipped when empty) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | yes         | Firebase app                                              |
| `VITE_FIREBASE_APP_ID`              | yes         | Firebase app                                              |
| `VITE_FIREBASE_MEASUREMENT_ID`      | optional    | Analytics (production builds only)                        |

\* If `API_KEY` or `PROJECT_ID` is missing the app silently runs in **local mode** (data in the browser only). Vite inlines `VITE_*` values at build time, so set them in the hosting provider's build environment, not at runtime. These keys identify the project; access control comes from the security rules.

Force local mode for testing even with a `.env`: `VITE_FIREBASE_API_KEY= npx vite --port 5180`.

## Build process

```bash
npm ci
npx tsc -p tsconfig.app.json --noEmit   # type check (the build also runs tsc -b)
npx eslint src                          # lint
npx vitest run                          # 100 unit tests
npm run build                           # tsc -b && vite build → dist/
npm run preview                         # serve dist/ locally
```

Output (2026-11-01): 31 JS + 15 CSS files; lazy route chunks (todo 62 kB, health 44 kB, analytics 42 kB, expenses 16 kB, schedule 15 kB, pomodoro 15 kB); the Firebase chunk (754 kB) triggers Vite's > 500 kB warning — see [KNOWN_ISSUES.md](KNOWN_ISSUES.md) P1.

## Firebase setup (one time)

1. Create/select the project (`aura-maxxing-cd7be` is the default alias in `.firebaserc`).
2. **Authentication** → enable _Email/Password_ and _Google_; add every hosting domain under _Authorized domains_.
3. **Firestore Database** → create the database (production mode). Without it all cloud writes fail.
4. **Storage** → create the default bucket (avatars, attachments).
5. Install the CLI and log in: `npm i -g firebase-tools && firebase login`.

## Deploy rules

```bash
firebase deploy --only firestore:rules,storage
```

Redeploy whenever `firestore.rules` changes — new collections (e.g. `pomodoro`, `expenses`, `income`, `schedule`, `settings/finance`) are denied until their rules are live.

## Hosting

### Firebase Hosting

`firebase.json` serves `dist/` and rewrites every path to `/index.html` (client-side routing).

```bash
npm run build
firebase deploy --only hosting
# or everything:
firebase deploy
```

### Vercel

`vercel.json`: build command `npm run build`, output `dist`, SPA rewrite `/(.*) → /index.html`. Add the `VITE_FIREBASE_*` variables in Project → Settings → Environment Variables, then push to the connected branch or run `vercel --prod`. Add the Vercel domain to Firebase _Authorized domains_.

## CI/CD

There is no pipeline in the repo yet. Recommended GitHub Actions workflow (`.github/workflows/ci.yml`):

```yaml
name: CI
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx tsc -p tsconfig.app.json --noEmit
      - run: npx eslint src
      - run: npx vitest run
      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
          VITE_FIREBASE_MEASUREMENT_ID: ${{ secrets.VITE_FIREBASE_MEASUREMENT_ID }}
```

For automatic Firebase deploys, add `FirebaseExtended/action-hosting-deploy` with a service-account secret (preview channels on PRs, `live` on `main`), and a `firebase deploy --only firestore:rules,storage` step on `main`.

## Release checklist

- [ ] Tests, lint, typecheck, build green.
- [ ] Rules deployed if `firestore.rules` / `storage.rules` changed.
- [ ] New settings doc ids added to the `settings/{id}` allow-list in `firestore.rules`.
- [ ] New collections added to `paths`, `USER_COLLECTIONS` (export/delete) and the rules.
- [ ] `CHANGELOG.md` updated; version bumped in `package.json`.
