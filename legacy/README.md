# Legacy static prototype

This is the original v0 prototype: a single static `index.html` page with
`localStorage`-based fake login (see `login.js` — it just checks a hardcoded
username/password and sets `isLoggedIn` in `localStorage`, no real backend or
auth provider involved).

It's kept here for history/reference only. It has been fully superseded by:
- [`../web`](../web) — the real web app (Vite + React), authenticated via Appwrite.
- [`../mobile`](../mobile) — the Expo/React Native app, same backend.

Do not build on top of this folder.
