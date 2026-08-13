# Data Model (ER Diagram)

Appwrite is a document database, not relational — there are no foreign
keys or joins enforced by the database itself. The relationships below
are enforced entirely in application code (`backend/src/repo.js` and the
controllers), by convention on the `userID` (tenant/owner) and
`recordedByUserId` (actor) fields. This diagram documents that
*application-level* schema, which is the real contract even though
Appwrite itself won't enforce it.

```mermaid
erDiagram
    APPWRITE_USER ||--o{ SERVICE_RECORD : "recordedByUserId (actor)"
    APPWRITE_USER ||--|| USER_PREFS : "has"

    OWNER ||--o{ EXPENSE : "userID (owns)"
    OWNER ||--o{ RESTOCK_HISTORY : "userID (owns)"
    OWNER ||--o{ WORKER : "userID (owns)"
    OWNER ||--o{ SERVICE_PRICE : "ownerId (owns)"
    OWNER ||--o{ SERVICE_RECORD : "userID (owns, = tenant)"
    OWNER ||--o{ AUDIT_LOG : "ownerId (owns)"

    SERVICE_CATALOG ||--o{ SERVICE_RECORD : "serviceID (referenced, not FK-enforced)"
    SERVICE_CATALOG ||--o{ SERVICE_PRICE : "serviceId"

    APPWRITE_USER {
        string id PK
        string email
        string name
    }
    USER_PREFS {
        string role "owner | worker"
        string ownerId "self, if owner"
    }
    SERVICE_CATALOG {
        string id PK "code constant, not a DB collection"
        string name
        string category
        float cost "shared across all tenants"
        array products "name, quantity, cost"
    }
    EXPENSE {
        string id PK
        string userID FK "tenant"
        string userName
        string userEmail
        string name
        float amount
        string category
        string date
    }
    SERVICE_RECORD {
        string id PK
        string userID FK "tenant"
        string userName
        string serviceID FK
        string serviceName
        string category
        float unitCost
        float totalCost
        float unitPrice
        float totalPrice
        int quantity
        string WorkerName "free-text attribution"
        string Date
        string recordedByUserId FK "actor"
        string recordedByName
    }
    RESTOCK_HISTORY {
        string id PK
        string userID FK "tenant"
        string productName
        float quantityAdded
        string unit
        float purchasePrice
        string supplier
        string date
    }
    WORKER {
        string id PK
        string userID FK "tenant"
        string name "plain attribution label"
        bool isActive "soft-delete"
    }
    SERVICE_PRICE {
        string id PK
        string ownerId FK "tenant"
        string serviceId FK
        float price
    }
    AUDIT_LOG {
        string id PK
        string ownerId FK "tenant"
        string actorId FK
        string actorName
        string action
        string targetCollection
        string targetId
        string message
    }
```

## Notes

- **`SERVICE_CATALOG` is not an Appwrite collection.** It's a code
  constant ([`backend/src/data/servicesCatalog.js`](../backend/src/data/servicesCatalog.js))
  — 83 entries, shared by every tenant, changed only by a code deploy.
  This is intentional: product-usage cost is a recipe, not
  salon-specific data.
- **`WORKER` (plain attribution name) and an invited login are two
  different things that happen to share the word "worker".** A `WORKER`
  document has no connection to an Appwrite account — it's just a label
  a service record's `WorkerName` field can reference. An invited login
  is an actual `APPWRITE_USER` with `role: worker` in its prefs. Nothing
  currently links the two (an owner could invite a login for "Ravi" and
  separately have a `WORKER` attribution entry also named "Ravi" — see
  [`docs/PROJECT_REPORT.md`](PROJECT_REPORT.md#11-future-scope) Future Scope for the case
  to unify them).
- **Six real Appwrite collections** as of Phase 4:
  `expenses`, `service_record`, `restock_history`, `workers`,
  `service_prices`, `audit_log`. Two of these (`restock_history`,
  `workers`) did not actually exist in the live project until Phase 2's
  schema-setup script discovered and created them — see the project
  report for that finding.
