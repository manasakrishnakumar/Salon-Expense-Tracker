# Software Requirements Specification
## Salon Pro — Salon Expense, Stock & Service Analyser

**Version:** 2.0 (Phase 4 feature-complete)
**Date:** August 2026

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements of
**Salon Pro**, a salon management system that tracks product-usage cost
per service, customer pricing, stock consumption, staff performance, and
expenses, and produces forecasts and reports for the salon owner. It is
intended for anyone evaluating, extending, or maintaining the system.

### 1.2 Scope
The system consists of three deployable pieces:
- **backend/** — an Express REST API that owns all business logic and
  role-based access control, backed by Appwrite (BaaS) for
  authentication and document storage.
- **web/** — a React (Vite) single-page app for salon owners and
  invited workers.
- **mobile/** — an Expo/React Native app (currently talks to Appwrite
  directly rather than through the backend — see [§2.5 Constraints](#25-constraints)).

Out of scope for this version: online customer booking, payment gateway
integration, SMS/WhatsApp notifications, multi-branch consolidation.

### 1.3 Definitions, Acronyms, Abbreviations
| Term | Meaning |
|---|---|
| **Owner** | The Appwrite account that a salon's data is scoped under (the tenant). Full access. |
| **Worker** | An account invited by an Owner; can record services and view only their own history. |
| **Tenant / `ownerId`** | The salon's identity for data-scoping purposes — every document belongs to one `ownerId`, regardless of whether the Owner or one of their Workers created it. |
| **Cost** | What a service costs the salon in product usage (internal, never shown to a customer). |
| **Price** | What the salon charges a customer for a service (owner-configurable, separate from cost). |
| **BaaS** | Backend-as-a-Service (Appwrite). |
| **RBAC** | Role-Based Access Control. |

### 1.4 References
- [`README.md`](../README.md) — project overview and setup
- [`docs/architecture.md`](architecture.md) — system architecture
- [`backend/openapi.yaml`](../backend/openapi.yaml) — full API contract
- [`IMPLEMENTATION_GUIDE.md`](../IMPLEMENTATION_GUIDE.md) — original planning doc + status notes

---

## 2. Overall Description

### 2.1 Product Perspective
Salon Pro replaces an original single-file, `localStorage`-authenticated
static prototype (preserved at [`legacy/`](../legacy) for history) with a
three-tier system: presentation (web/mobile), application/business-logic
(the Express backend), and data (Appwrite). Appwrite is used as a managed
database and identity provider, not as the application's brain — every
business rule (cost calculation, stock deduction, RBAC, pricing,
forecasting) executes in the backend, never trusted to the client.

### 2.2 Product Functions (summary)
1. Authenticate via Appwrite; bootstrap a new signup as the owner of their
   own salon, or resolve an invited account's role/tenant from server-set
   prefs.
2. Browse a fixed catalog of 83 salon services, each with a product-usage
   **cost** (fixed, shared) and an owner-configurable **price**.
3. Record a service performed, with cost/price computed server-side;
   generate a PDF receipt.
4. Track stock as a computed value (total restocked − total consumed),
   not a mutable counter.
5. Track cash expenses by category.
6. Manage staff: plain attribution names (no login) or real invited
   logins with the `worker` role.
7. View reports: daily/monthly summaries, most-used products, worker
   performance, and forward-looking forecasts (expense trend, stock
   runout).
8. Enforce RBAC: an Owner sees/controls everything for their salon; a
   Worker can only record services and see their own history.

### 2.3 User Classes and Characteristics
| Class | Description | Typical actions |
|---|---|---|
| **Owner** | Salon proprietor/manager; the account a signup becomes by default. | Everything: pricing, stock, expenses, worker management, reports. |
| **Worker** | Staff member given a login by an Owner. | Record their own services; view their own history; download receipts. |

### 2.4 Operating Environment
- Backend: Node.js 18+ (ES modules), stateless (safe to run multiple
  instances behind a load balancer — no in-process session state).
- Web: any evergreen browser.
- Mobile: iOS/Android via Expo.
- Data: Appwrite Cloud (or self-hosted Appwrite, unverified).

### 2.5 Constraints
- **Mobile has not been migrated to the backend API.** It still calls
  Appwrite directly (as the original app did), so it does not benefit
  from server-side cost/price computation, RBAC, or the pricing model.
  This is a known, explicitly-tracked gap — see
  [§11 Future Scope](PROJECT_REPORT.md#11-future-scope) in the project report.
- No payment gateway; a "price" is informational (what to charge), not a
  processed transaction.
- No email delivery — an invited worker's temporary password is returned
  once in the API response for the owner to relay manually.

### 2.6 Assumptions and Dependencies
- One Appwrite project per deployment; all data for all salons using that
  deployment lives in the same database, isolated purely by application-
  level `ownerId` scoping (Appwrite document permissions are not relied
  upon — every read/write goes through the backend's server API key).
- The catalog's **cost** figures assume the product-usage quantities
  recorded in [`backend/src/data/servicesCatalog.js`](../backend/src/data/servicesCatalog.js)
  are accurate for a given salon; they are shared across all tenants, not
  per-owner (only **price** is per-owner).

---

## 3. Specific Requirements

### 3.1 Functional Requirements

#### FR-1 Authentication & Session
- FR-1.1: A client authenticates against Appwrite directly (email/password),
  then presents a short-lived Appwrite JWT to the backend on every request.
- FR-1.2: The backend MUST verify the JWT with Appwrite on every request
  (no client-asserted identity is trusted).
- FR-1.3: A JWT-verified identity with no `role`/`ownerId` prefs set MUST
  be bootstrapped as `role: owner, ownerId: self` exactly once.

#### FR-2 Services & Pricing
- FR-2.1: The system SHALL expose a read-only catalog of services, each
  with a fixed `cost` and a per-owner `price` (nullable until set).
- FR-2.2: Only an Owner MAY set or bulk-set prices.
- FR-2.3: A Worker's catalog response MUST NOT include `cost` (service-level
  or per-product) — price only.

#### FR-3 Service Recording
- FR-3.1: Both roles MAY record a service performed (`serviceId`,
  `quantity`, optional `workerName`).
- FR-3.2: `unitCost`/`totalCost` and `unitPrice`/`totalPrice` MUST be
  computed server-side from the catalog and the owner's current price —
  never accepted from the client.
- FR-3.3: An Owner MAY view/delete any record belonging to their salon; a
  Worker MAY view only records they personally recorded, and MAY NOT
  delete any record.
- FR-3.4: The system SHALL generate a PDF receipt for a given record,
  viewable by the Owner or by the Worker who recorded it.

#### FR-4 Stock
- FR-4.1: Stock status (per product: restocked, used, remaining, low-stock
  flag) SHALL be computed on demand from the full restock and
  service-record history — not stored as a mutable counter.
- FR-4.2: Only an Owner MAY restock a product or view stock status.

#### FR-5 Expenses
- FR-5.1: Only an Owner MAY create, list, or delete expenses.

#### FR-6 Workers & RBAC
- FR-6.1: An Owner MAY add a plain attribution name (no login) for
  service-record labeling.
- FR-6.2: An Owner MAY invite a real login for a staff member, which sets
  that account's `role: worker, ownerId: <owner>` before the invitee ever
  logs in.
- FR-6.3: Every owner-only route MUST reject a `worker`-role caller with
  HTTP 403.

#### FR-7 Reports & Forecasting
- FR-7.1: The system SHALL provide daily and monthly aggregate reports,
  a most-used-products report, and a forecast report (next month's
  expense/cost projection, a stock-runout prediction) — all owner-only.

#### FR-8 Audit
- FR-8.1: Restock, expense deletion, and worker invite/deactivation SHALL
  be recorded in an audit log (actor, action, target, timestamp),
  best-effort (a logging failure must not block the underlying action).

### 3.2 Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Security** | All state-changing endpoints require a verified Appwrite identity; all cost/price/stock calculations happen server-side; secrets (Appwrite API key) never reach a client bundle; rate limiting on all API routes, tighter on account-creating routes. |
| **Data integrity** | Stock and cost/price figures are derived, not client-supplied, eliminating an entire class of "the app disagrees with itself" bugs. |
| **Testability** | Business logic is implemented as pure functions independent of Express/Appwrite, unit-testable in isolation; the full HTTP layer is integration-testable against an in-memory fake of the Appwrite SDK, without live credentials. |
| **Availability** | Backend is stateless — horizontally scalable, no sticky sessions. |
| **Usability** | A Worker's UI surface is reduced to only what they can do (Sidebar hides inaccessible pages) — this is UX politeness only; the real enforcement is server-side. |
| **Observability** | Optional Sentry error monitoring (off by default, one env var to enable). |

### 3.3 External Interface Requirements
- **API:** REST over HTTPS, JSON bodies, `Authorization: Bearer <jwt>`.
  Full contract: [`backend/openapi.yaml`](../backend/openapi.yaml).
- **Web UI:** React SPA, no server-rendered pages.
- **External system:** Appwrite Cloud — Account, Databases, and Users
  services (server SDK on the backend; client SDK for login only on the
  frontends).

---

## 4. Appendix: Traceability

Each functional requirement above maps to committed, tested code:

| Requirement | Implementation |
|---|---|
| FR-1 | [`backend/src/middleware/auth.js`](../backend/src/middleware/auth.js) |
| FR-2 | [`backend/src/logic/pricing.js`](../backend/src/logic/pricing.js), [`services.controller.js`](../backend/src/controllers/services.controller.js) |
| FR-3 | [`backend/src/logic/costCalculator.js`](../backend/src/logic/costCalculator.js), [`serviceRecords.controller.js`](../backend/src/controllers/serviceRecords.controller.js), [`invoice.js`](../backend/src/logic/invoice.js) |
| FR-4 | [`backend/src/logic/stockService.js`](../backend/src/logic/stockService.js) |
| FR-6 | [`backend/src/middleware/requireRole.js`](../backend/src/middleware/requireRole.js), [`workers.controller.js`](../backend/src/controllers/workers.controller.js) |
| FR-7 | [`backend/src/logic/reportService.js`](../backend/src/logic/reportService.js), [`forecast.js`](../backend/src/logic/forecast.js) |
| FR-8 | [`backend/src/audit.js`](../backend/src/audit.js) |

Test evidence: 78 backend tests (33 unit + 45 API integration) +
4 Playwright tests — see [`docs/PROJECT_REPORT.md`](PROJECT_REPORT.md#8-testing).
