# Salon Pro — Salon Expense, Stock & Service Analyser

A salon management system that tracks the real product-usage cost of
each service, separates that from what's actually charged to a customer,
computes stock from restock/consumption history instead of a counter
that can drift, and enforces owner/staff permissions server-side.

Started as a static prototype with no real backend; the `backend/`
Express API, RBAC, pricing model, forecasting, and everything else
described below were built out as a structured internship project — see
[`docs/PROJECT_REPORT.md`](docs/PROJECT_REPORT.md) for the full writeup.

## Features

- 🧴 **83 salon services**, each with product-usage cost data
- 💵 **Owner-configurable pricing** — separate from internal cost, so
  profit margin is a real number, not cost mislabeled as revenue
- 📦 **Computed stock** — derived from restock + consumption history,
  never a mutable counter that can go stale
- 👥 **Real RBAC** — an Owner sees/controls everything for their salon;
  an invited Worker can only record services and see their own history
- 🧾 **PDF receipts**, server-generated
- 📈 **Forecasting** — next-month expense projection and stock-runout
  prediction from actual usage trends
- 📝 **Audit log** for restocks, expense deletions, and worker changes
- 🔐 Rate limiting, zod validation on every write, optional Sentry
  error monitoring

## Project structure

```
backend/    Express REST API — owns all business logic + RBAC (see below)
web/        React (Vite) web app — the primary client
mobile/     Expo/React Native app (not yet migrated to the backend — see docs)
docs/       SRS, architecture, ER + sequence diagrams, user manual, full report
legacy/     The original static prototype, kept for history only
data_salon/ Source CSVs the service catalog was originally built from
```

## Quick start (local development)

```bash
# 1. Backend
cd backend
cp .env.example .env   # fill in real Appwrite credentials
npm install
npm run setup:appwrite # idempotent — provisions any missing collections/attributes
npm run dev             # http://localhost:4000, docs at /api-docs

# 2. Web app (separate terminal)
cd web
cp .env.example .env   # VITE_API_URL defaults to http://localhost:4000
npm install
npm run dev              # http://localhost:5173
```

Required backend env vars (see [`backend/.env.example`](backend/.env.example)
for the full list and required Appwrite API key scopes): `APPWRITE_ENDPOINT`,
`APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID`.

## Testing

```bash
cd backend && npm test        # 78 tests — no live credentials needed
cd web && npm run test:e2e    # 4 Playwright browser tests
```

## Documentation

| Doc | Contents |
|---|---|
| [`docs/PROJECT_REPORT.md`](docs/PROJECT_REPORT.md) | Full internship report — problem, design decisions, defects found & fixed, testing, results |
| [`docs/SRS.md`](docs/SRS.md) | Software Requirements Specification |
| [`docs/architecture.md`](docs/architecture.md) | System architecture, tenancy model, testing architecture (with diagrams) |
| [`docs/er-diagram.md`](docs/er-diagram.md) | Data model |
| [`docs/sequence-diagrams.md`](docs/sequence-diagrams.md) | Login, service recording, worker invite, RBAC rejection flows |
| [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md) | How to use the app, for Owners and Workers |
| [`backend/openapi.yaml`](backend/openapi.yaml) | Full API contract — also served live at `/api-docs` |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | How to actually deploy (Render/Vercel/EAS/Sentry) |
| [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md) | Original planning doc, with status corrections |

## Tech stack

React 19 · Vite · Recharts · Expo — Node.js · Express · Zod · pdfkit —
Appwrite (Cloud) — Jest · Supertest · Playwright — Docker · GitHub Actions

## License

Unlicensed / academic project.
