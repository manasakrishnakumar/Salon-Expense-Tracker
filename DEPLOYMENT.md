# Deployment

Everything in this doc that needs a new account (Render, Vercel, Expo,
Sentry) has to be done by you directly in that provider's own dashboard —
account creation isn't something that should happen on your behalf. What's
already done: the config files each platform needs are committed and
ready, and CI ([.github/workflows/ci.yml](.github/workflows/ci.yml))
validates the backend Docker image builds on every push.

## Backend → Render

1. Push this repo to GitHub (already has a remote: `origin`).
2. At [render.com](https://render.com), **New → Blueprint**, connect the
   repo. Render reads [`render.yaml`](render.yaml) automatically and
   proposes a `salon-pro-backend` web service using `backend/`.
3. Render will prompt for the vars marked `sync: false` in `render.yaml`
   — fill these in from your Appwrite console (Settings → API Keys for
   `APPWRITE_API_KEY`; the project overview for the rest):
   - `APPWRITE_ENDPOINT` (e.g. `https://fra.cloud.appwrite.io/v1`)
   - `APPWRITE_PROJECT_ID`
   - `APPWRITE_API_KEY` — a server key with `databases.*`, `documents.*`,
     `users.*` scopes (see `backend/.env.example` for the exact list)
   - `APPWRITE_DATABASE_ID`
   - `CORS_ORIGIN` — set this **after** step 2 of the web deploy below,
     once you know the deployed web app's real URL
   - `SENTRY_DSN` — optional, see the Sentry section below; leave blank to skip
4. Deploy. Render builds from `backend/Dockerfile`-equivalent (it uses
   `buildCommand`/`startCommand` from the blueprint, not the Dockerfile
   directly — the Dockerfile is for local/Docker-based hosts instead, see
   below).
5. Once live, run the one-time schema setup **locally**, pointed at
   production, or via Render's shell: `npm run setup:appwrite` from
   `backend/` with production env vars loaded. It's idempotent — safe even
   if some collections already exist.

### Alternative: any Docker host (Railway, Fly.io, a VPS, ...)

```bash
cd backend
docker build -t salon-pro-backend .
docker run -p 4000:4000 --env-file .env salon-pro-backend
```

`.env` needs the same variables as `.env.example` — copy it and fill in
real values (never commit the filled-in copy).

## Web → Vercel

1. At [vercel.com](https://vercel.com), **Add New → Project**, import this
   repo, set **Root Directory** to `web`. Vercel auto-detects Vite; the
   committed [`web/vercel.json`](web/vercel.json) confirms the build
   command/output dir and adds an SPA rewrite rule.
2. Add one environment variable: `VITE_API_URL` = your deployed backend's
   URL from the Render step above (e.g. `https://salon-pro-backend.onrender.com`).
3. Deploy. Copy the resulting URL back into the backend's `CORS_ORIGIN`
   env var on Render (step 3 above) and redeploy the backend so it accepts
   requests from the real web origin.
4. **Appwrite also needs to know about this origin independently of
   CORS_ORIGIN**: Appwrite console → your project → **Settings →
   Platforms → Add Platform → Web App**, and add the Vercel URL's
   hostname. Without this, `account.createEmailPasswordSession(...)` and
   every other client-side Appwrite call will be rejected even though your
   own backend's CORS is configured correctly — it's a separate allowlist.

## Mobile → EAS Build

No Expo account exists for this project yet, so this needs to be run
interactively by you:

```bash
cd mobile
npm install -g eas-cli   # if not already installed
eas login                 # your own Expo account
eas build:configure       # links this project to your Expo account, writes a projectId into app.json
eas build --profile preview --platform android   # or --platform ios
```

[`mobile/eas.json`](mobile/eas.json) already defines `development` /
`preview` / `production` build profiles — `build:configure` won't
overwrite it, just adds the `extra.eas.projectId` field to `app.json`.

## Sentry (optional, either app)

1. Free account at [sentry.io](https://sentry.io), create a Node project
   for the backend (and/or a React project for web).
2. Backend: set `SENTRY_DSN` in `backend/.env` (or the Render dashboard).
   [`backend/src/config/sentry.js`](backend/src/config/sentry.js) is a
   no-op until this is set — nothing else to change.
3. Web: not wired up yet (only the backend has the integration code) —
   a fast follow if you want it, using `@sentry/react`.

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push /
PR: backend tests (no live credentials needed — see Phase 5's fake
Appwrite), a Docker build of the backend (build-only, not pushed
anywhere — this is what actually validates `backend/Dockerfile` since
this project doesn't have Docker available in every dev environment),
and the web build/lint/Playwright smoke test. None of it needs secrets
configured in GitHub — it's designed to pass on a fresh clone.
