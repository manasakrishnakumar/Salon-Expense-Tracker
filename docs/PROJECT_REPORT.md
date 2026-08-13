# Internship Project Report

## Salon Pro — Salon Expense, Stock & Service Management System

**Student Name:** _____________________
**Roll No / Reg No:** _____________________
**College:** _____________________
**Department:** _____________________
**Internship Duration:** _____________________ (16 weeks)
**Internal Guide:** _____________________
**Submitted:** _____________________

---

## Abstract

Salon Pro is a full-stack salon management system built to replace a
manual, spreadsheet-and-notebook approach to tracking what a salon
spends on products, what it charges customers, how much stock remains,
and how staff perform. The project began as a static, client-side
prototype with no real backend and evolved, over the course of this
internship, into a three-tier system: a React web application, an Expo
mobile application, an Express REST API that owns all business logic,
and Appwrite as the managed identity/database layer. The internship's
core contribution is that backend layer — moving cost calculation, stock
computation, role-based access control, pricing, and forecasting out of
client-side code (where a browser could be tricked or simply be wrong)
into server-enforced logic, backed by 78 automated backend tests and a
further 4 browser-level tests. Along the way, the work surfaced and fixed
a genuine defect in the pre-existing system — two database collections
the stock and staff features depended on had never actually been
created — and identified and corrected a conflation between "what a
service costs" and "what it's sold for" that had been silently producing
an incorrect Revenue figure throughout the application.

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Existing System & Its Limitations](#2-existing-system--its-limitations)
3. [Proposed System](#3-proposed-system)
4. [System Requirements](#4-system-requirements)
5. [System Design](#5-system-design)
6. [Technology Stack](#6-technology-stack)
7. [Implementation](#7-implementation)
8. [Testing](#8-testing)
9. [Results and Discussion](#9-results-and-discussion)
10. [Conclusion](#10-conclusion)
11. [Future Scope](#11-future-scope)
12. [References](#12-references)

---

## 1. Introduction

### 1.1 Problem Statement
Salons typically know their revenue but not their true cost per service
— what a haircut or a facial actually consumes in product terms is
rarely tracked, which makes profit margin, stock reordering, and pricing
decisions guesswork. A prior attempt at solving this for one salon
existed as a client-only web app (a single HTML page with a hardcoded
`localStorage` login) and a partially-built React/Appwrite version with
no server of its own — every business rule, including money
calculations, ran inside the browser.

### 1.2 Objectives
1. Track exact product-usage cost for as many of the salon's ~83
   distinct services as possible.
2. Separate that internal cost from what's actually charged to a
   customer, enabling a real profit-margin figure.
3. Move business logic and access control server-side so it can't be
   bypassed or miscalculated by a client.
4. Support more than one person using the system per salon, with
   different permissions (owner vs. staff).
5. Provide forward-looking insight (expense trend, stock runout) instead
   of only historical reporting.
6. Build this to a standard defensible in a technical review: automated
   tests, CI, containerization, and documentation, not just a working
   demo.

### 1.3 Scope
Covered: web app (primary), backend API, RBAC, pricing, PDF receipts,
forecasting, testing, CI/CD readiness, and this documentation set.
Explicitly not covered in this iteration: migrating the mobile app to
the new backend, online payments, customer-facing booking, and actual
production deployment (prepared, not executed — see §11).

---

## 2. Existing System & Its Limitations

The codebase at the start of this internship consisted of:
- `legacy/index.html` + `script.js` + `login.js` — a static prototype
  whose "authentication" was a hardcoded credential check writing a flag
  to `localStorage`. No real backend, no real users.
- `web/` (Vite + React) and `mobile/` (Expo) apps that had since been
  built directly against **Appwrite's client SDK** — every screen called
  `databases.createDocument()` / `listDocuments()` straight from the
  browser or app, with Appwrite acting as the entire backend.
- `IMPLEMENTATION_GUIDE.md` and `SERVICES_WITHOUT_DETAILS.md`, planning
  documents claiming 60 of 83 services had cost data and 23 did not.

**Limitations identified:**
1. **No trusted authority over the numbers.** Cost totals were computed
   in the browser and written directly to the database; a modified
   client, or simply a bug, could write any value.
2. **No access control beyond "logged in."** Any authenticated user could
   read/write any data reachable by the Appwrite collection permissions —
   there was no concept of an owner vs. staff distinction.
3. **Stock and staff features were silently broken.** Investigation
   during this internship (§7.3) found the `restock_history` and
   `workers` Appwrite collections the app depended on had never been
   created — every request against them failed and was caught by a
   `try/catch` that fell back to an empty list, which looks identical to
   "no data yet" in the UI. This had apparently gone unnoticed.
4. **No separate concept of price vs. cost.** The Analysis dashboard's
   "Revenue" and "Net Profit" figures were computed from the internal
   product-usage cost field, because no price-charged field existed —
   the numbers shown were not revenue at all.
5. **Duplicated domain data.** The ~800-line service catalog (cost,
   products consumed) was maintained as a separate copy in both `web/`
   and `mobile/`.
6. **No automated tests, no CI, no deployment tooling.**

---

## 3. Proposed System

A layered redesign keeping Appwrite (avoiding a costly rebuild of
authentication/storage) but inserting an Express API between every
client and Appwrite, so that:
- Appwrite is used only via a **server-side** API key, from backend
  code only — a browser never gets a privileged connection.
- All business logic — cost, price, stock, RBAC, forecasting — lives in
  one place, is unit-testable independent of the framework, and is the
  only thing allowed to write those numbers.
- A real multi-user model (Owner / Worker) replaces "anyone logged in
  can do anything."

---

## 4. System Requirements

Full detail in [`docs/SRS.md`](SRS.md). Summary of the major functional
areas: authentication & RBAC, service catalog & pricing, service
recording & receipts, stock computation, expense tracking, staff
management (plain names and real invited logins), reporting &
forecasting, and audit logging.

---

## 5. System Design

Full diagrams in [`docs/architecture.md`](architecture.md) (component
architecture, tenancy model, testing architecture),
[`docs/er-diagram.md`](er-diagram.md) (data model), and
[`docs/sequence-diagrams.md`](sequence-diagrams.md) (login, service
recording, worker invite, RBAC rejection).

**Design decisions worth calling out explicitly, with rationale:**

- **Why keep Appwrite instead of a fully custom database?** Rebuilding
  authentication and a document store from scratch would have consumed
  most of the internship without adding to what the project needed to
  demonstrate. Appwrite's *client* SDK usage (the actual problem) was
  replaced; Appwrite itself, accessed only via a privileged server key,
  was kept.
- **Why is stock computed, not stored?** A `currentStock` counter that
  gets decremented on every service and incremented on every restock is
  one missed update away from being wrong forever, with no way to tell
  it's wrong. Deriving it from the full history on every read means it's
  always consistent with the data that actually exists, at the cost of
  recomputing it each time (acceptable at this data scale).
- **Why does `ownerId` scope data, not the caller's own id?** Making this
  distinction — added in Phase 2 — is what allows an Owner and their
  invited Workers to share one salon's data instead of each getting an
  empty dataset scoped to themselves. It required systematically
  reviewing every controller.
- **Why is `price` a separate per-owner collection instead of a field on
  the shared catalog?** Two different salons running this same codebase
  would charge different amounts for an identical service; `cost`
  (product usage) is a recipe fact, shared, while `price` is a business
  decision, per-tenant.
- **Why strip `cost` from a Worker's API response instead of just hiding
  it in the UI?** Hiding a field in the UI while still sending it in the
  JSON response means anyone who opens browser devtools can see it
  anyway. Removing it server-side (`sanitizeServiceForRole`) means it is
  never in the response body a Worker's client receives.

---

## 6. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Web frontend | React 19, Vite, Recharts | SPA, no server-side rendering |
| Mobile frontend | Expo / React Native | Not yet migrated to the backend (see §11) |
| Backend | Node.js, Express 4 | ES modules throughout |
| Validation | Zod | Every write endpoint validates its input |
| Data / Identity | Appwrite (Cloud) | Accessed via server SDK (backend) and client SDK (frontends, login only) |
| PDF generation | pdfkit | Server-streamed receipts |
| Testing | Jest, Supertest, Playwright | See §8 |
| CI | GitHub Actions | Backend tests, Docker build, web build/lint/e2e |
| Containerization | Docker | `backend/Dockerfile` |
| Error monitoring | Sentry (optional) | Off by default; one env var to enable |
| API documentation | OpenAPI 3.0 + Swagger UI | Served live at `/api-docs` |

---

## 7. Implementation

### 7.1 Backend layering
```
routes/       → wires middleware + validation schema + controller
controllers/  → HTTP-only concerns (status codes, req/res)
logic/        → pure functions: costCalculator, pricing, stockService,
                reportService, forecast, invoice — no Express or
                Appwrite imports, fully unit-testable in isolation
repo.js       → the only module that calls Appwrite's Databases service
middleware/   → auth (JWT verification + role/tenant resolution),
                requireRole (RBAC guard), validate (zod), rate limiting,
                centralized error handling
```

### 7.2 Authentication & multi-tenancy
Clients authenticate against Appwrite directly (unchanged — no reason to
rebuild this), then send a short-lived Appwrite JWT to the backend.
`middleware/auth.js` verifies that JWT with Appwrite on every request and
resolves `role`/`ownerId` from that account's Appwrite **prefs** — writable
only by the backend's own server key. A brand-new account with no prefs
yet is bootstrapped as the owner of its own new salon on first sight; an
invited Worker's prefs are set by the inviting Owner's call *before* the
Worker ever logs in, so the bootstrap path never misfires for them.

### 7.3 A defect found and fixed mid-internship
While verifying Phase 2's RBAC work against the real Appwrite project
(once API credentials with sufficient scope were available), a schema
inspection showed the database contained only three collections —
`expenses`, `service_record`, and the newly-added `audit_log`.
`restock_history` and `workers` did not exist. The original client code's
calls against them had been failing since day one, silently, because the
failure path caught the error and rendered an empty list — indistinguishable
in the UI from "no data has been entered yet." A schema-provisioning
script ([`backend/scripts/setupAppwriteSchema.js`](../backend/scripts/setupAppwriteSchema.js))
was written to create both collections (idempotently, safe to rerun),
and this was verified against the live project.

### 7.4 Pricing model (fixing the cost/revenue conflation)
Before Phase 4, "Revenue" and "Net Profit" throughout the Analysis and
Dashboard pages were computed from `totalCost` — the internal product
cost — because no price-charged field existed anywhere. Phase 4
introduced a genuine `price` per service, stored per-owner (not in the
shared code catalog, since two salons would charge differently for the
same service), computed into `unitPrice`/`totalPrice` on every service
record alongside the existing `unitCost`/`totalCost`. Every place in the
frontend that had been summing cost as if it were revenue was identified
and corrected (`ServicesContext`, `DashboardPage`, `AnalysisPage`,
`WorkersPage`) — Net Profit is now `revenue − product cost − expenses`,
a real gross-margin figure.

### 7.5 Role-based access control
`requireRole('owner')` gates every endpoint that shouldn't be reachable
by staff: expenses, stock, restock, reports, and worker management.
Service records stay reachable by both roles, but list visibility
differs — an Owner sees the whole salon's records; a Worker sees only
the ones they personally recorded (`recordedByUserId`), a distinct field
from `userID` (which always means the salon/tenant).

### 7.6 Forecasting
`logic/forecast.js` implements ordinary least-squares linear regression
over monthly-bucketed history to project next month's expense/cost
total, falling back to a naive last-month carry-forward under three
months of history (a trend line from one or two points is noise, not a
signal). A parallel function estimates days-until-stockout per product
from actual recent consumption rate, not just current remaining stock.

### 7.7 Notable code statistics
- Backend: 48 source files, ~3,350 lines (excluding tests/config).
- Web frontend: 22 source files under `web/src`.
- Service catalog: 83 services, all with complete product-usage cost
  data (the originally-documented "23 missing" were, on inspection,
  already filled in — only the planning doc had not been updated to say
  so; corrected in this internship).

---

## 8. Testing

### 8.1 Strategy
Three layers, deliberately not requiring live Appwrite credentials to
run (so the suite passes on a fresh clone with zero secrets configured):

1. **Unit tests (33)** — the pure `logic/` functions, in isolation.
   Covers edge cases such as: an unknown service id, usage outpacing
   restocked quantity (must clamp at zero, not go negative), the
   distinction between "never restocked" and "low stock," a linear
   regression fit on a single data point, and role-based catalog
   sanitization.
2. **API integration tests (45)** — Supertest against the real Express
   app, with a purpose-built in-memory fake standing in for the
   `node-appwrite` SDK ([`backend/src/testUtils/fakeAppwrite.js`](../backend/src/testUtils/fakeAppwrite.js)),
   swapped in via `jest.unstable_mockModule`. This exercises real
   routing, real middleware (`requireAuth`, `requireRole`, `validate`),
   and real controllers — including minting a working JWT for a
   just-invited "worker" account and confirming its role/tenant resolve
   correctly, end to end.
3. **Browser tests (4)** — Playwright, verifying the SPA shell boots and
   its login form's client-side validation works. Deliberately does not
   attempt an authenticated flow: there is no separate staging Appwrite
   project for this app, so that would require either committing a real
   password or wiring live secrets into CI.

In addition, at the end of Phases 1 through 4, disposable end-to-end
verification scripts were run directly against the **live** Appwrite
project (creating temporary test accounts, exercising the real API, then
deleting everything created) to confirm behavior beyond what the fakes
could prove — for example, that a real Appwrite server API key with the
correct scopes could actually create the `service_prices` collection.

### 8.2 Results
| Layer | Count | Result |
|---|---|---|
| Backend unit tests | 33 | ✅ Pass |
| Backend API integration tests | 45 | ✅ Pass |
| Playwright browser tests | 4 | ✅ Pass |
| **Total automated** | **82** | ✅ |
| Manual live e2e verification runs | 4 (Phases 1–4) | ✅ Pass, cleaned up after each |

### 8.3 Representative test cases
- *"computes cost server-side from the catalog, ignoring anything a
  client might send"* — a POST body containing forged `unitCost`/
  `totalPrice` fields has zero effect on the stored record.
- *"worker sees only the record they personally recorded"* — visibility
  scoping verified at the HTTP layer, not just unit-tested in isolation.
- *"never lets remaining stock go negative even if usage outpaces
  restock"*.
- *"streams a real PDF for a record the owner can see"* — asserts actual
  byte length and `Content-Type`, not just a 200 status.

---

## 9. Results and Discussion

The system, as delivered:
- Computes and enforces cost, price, and stock entirely server-side.
- Supports two roles sharing one salon's data with meaningfully
  different permissions.
- Generates PDF receipts and forward-looking forecasts.
- Passes 82 automated tests and has been verified against live data.
- Is packaged for deployment (Docker, CI, hosting configs) though not
  yet actually deployed to a public URL — see §11.

> **Screenshots:** insert here once you have logged into your own
> deployment — recommended: (1) the Dashboard, (2) the Services →
> Pricing tab, (3) recording a service as a Worker vs. as an Owner
> (showing the cost/margin visibility difference), (4) the Analysis →
> Forecast tab, (5) a downloaded PDF receipt, (6) the Swagger UI at
> `/api-docs`.

---

## 10. Conclusion

This internship took an application whose entire business logic ran
untrusted in the browser and moved it behind a real API that enforces
cost calculation, pricing, stock accounting, and access control
server-side — while diagnosing and fixing two genuine pre-existing
defects along the way (missing database collections; a cost figure
mislabeled as revenue). The result is backed by an 82-test automated
suite, CI, containerization, and the documentation set this report is
part of, rather than being a demo that only works when clicked through
in the expected order.

## 11. Future Scope

1. **Migrate the mobile app** to call the backend API instead of
   Appwrite directly — it's the one client still bypassing the RBAC/
   pricing model built in Phases 1–4.
2. **Unify the two "worker" concepts** — a plain attribution name and an
   invited login are currently unconnected; an owner inviting "Ravi" a
   login and separately having a "Ravi" attribution entry doesn't link
   them.
3. **Actual deployment** — Render/Vercel/EAS configs are committed and
   documented ([`DEPLOYMENT.md`](../DEPLOYMENT.md)) but not yet executed.
4. **Email delivery** for worker invites, instead of a manually-relayed
   temporary password.
5. **Customer-facing booking and payment collection.**
6. **Multi-branch consolidation** for a salon chain rather than one
   tenant per Appwrite account.

## 12. References

- Appwrite documentation — <https://appwrite.io/docs>
- Express.js documentation — <https://expressjs.com>
- OWASP REST Security Cheat Sheet (informed the auth/RBAC/rate-limiting design)
- Zod documentation — <https://zod.dev>
- Playwright documentation — <https://playwright.dev>
- Project repository commit history — phase-by-phase build log, `git log --oneline`
