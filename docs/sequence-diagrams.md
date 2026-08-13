# Key Flows (Sequence Diagrams)

## 1. Login and an authenticated API call

```mermaid
sequenceDiagram
    actor U as User
    participant W as Web App
    participant A as Appwrite (Account service)
    participant B as Backend API
    participant D as Appwrite (Databases/Users)

    U->>W: enters email + password
    W->>A: createEmailPasswordSession()
    A-->>W: session cookie
    W->>A: account.get()
    A-->>W: identity {id, email, name}
    W->>A: account.getPrefs()
    A-->>W: {} (or {role, ownerId} if returning)

    Note over W: user navigates the app;<br/>every backend call needs a JWT

    W->>A: account.createJWT()  (cached ~10 min)
    A-->>W: short-lived JWT
    W->>B: GET /api/services<br/>Authorization: Bearer &lt;jwt&gt;
    B->>A: account.get()  [verify JWT is real]
    A-->>B: identity confirmed
    B->>D: users.getPrefs(identity.id)
    alt no prefs yet
        D-->>B: 404
        B->>D: users.updatePrefs({role: owner, ownerId: self})
        Note over B: bootstrap: a fresh signup becomes<br/>owner of their own new salon
    else prefs exist
        D-->>B: {role, ownerId}
    end
    B-->>W: 200 {services: [...]}
```

## 2. Recording a service (cost/price computed server-side)

```mermaid
sequenceDiagram
    actor Owner
    participant W as Web App
    participant B as Backend API
    participant L as logic/costCalculator.js<br/>+ logic/pricing.js
    participant D as Appwrite Databases

    Owner->>W: picks "DIAMOND FACIAL", qty=2, worker="Ravi"
    W->>B: POST /api/service-records<br/>{serviceId, quantity, workerName}
    Note over B: client never sends cost/price —<br/>server computes them
    B->>L: findService("diamond_facial")
    L-->>B: {cost: 139.7, products: [...]}
    B->>D: get this owner's price for the service
    D-->>B: price (or null if never set)
    B->>L: calculateServiceCost(service, 2)<br/>calculateServicePrice(price, 2)
    L-->>B: {unitCost, totalCost, unitPrice, totalPrice}
    B->>D: createDocument(service_record, {..., recordedByUserId, recordedByName})
    D-->>B: saved document
    B-->>W: 201 {record}
    Note over W: Services → Stock tab will now show<br/>less remaining CLEANSER etc. on next fetch —<br/>computed from this + restock history, not decremented here
```

## 3. Owner invites a worker

```mermaid
sequenceDiagram
    actor Owner
    participant W as Web App
    participant B as Backend API
    participant U as Appwrite Users service
    actor Worker

    Owner->>W: Workers → Invite (name, email, temp password)
    W->>B: POST /api/workers/invite
    B->>B: requireRole('owner') — Worker role would 403 here
    B->>U: users.create(id, email, password, name)
    U-->>B: new account created
    B->>U: users.updatePrefs(newId, {role: worker, ownerId: <owner's id>})
    Note over B,U: prefs are set BEFORE the worker ever logs in —<br/>so the owner-of-self bootstrap never mistakes them for a new owner
    B-->>W: 201 {worker: {id, name, email}, tempPassword}
    W-->>Owner: shows email + temp password to relay manually

    Note over Worker: later, separately
    Worker->>W: logs in with the relayed credentials
    W->>B: any request, Bearer <worker's JWT>
    B->>U: users.getPrefs(worker.id)
    U-->>B: {role: worker, ownerId: <owner's id>}
    Note over B: this worker's requests now scope to<br/>the OWNER's salon data, not their own
```

## 4. RBAC rejection (a Worker hits an owner-only route)

```mermaid
sequenceDiagram
    actor Worker
    participant W as Web App
    participant B as Backend API

    Worker->>W: navigates to a URL a worker shouldn't reach<br/>(Sidebar already hides the nav item)
    W->>B: GET /api/expenses, Bearer <worker's JWT>
    B->>B: requireAuth — JWT valid, role=worker resolved
    B->>B: requireRole('owner') — 'worker' not in allow-list
    B-->>W: 403 {error: "Role 'worker' is not permitted..."}
    Note over W: UI shows nothing for this page —<br/>worker never sees it in the first place,<br/>but the 403 is the actual enforcement
```
