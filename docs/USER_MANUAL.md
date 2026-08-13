# User Manual — Salon Pro

This covers the web app. Two roles use it: **Owner** (the salon
proprietor) and **Worker** (staff a owner has invited). If you're a
Worker, skip to [§2](#2-for-workers) — most of this manual is Owner
functionality you won't see.

---

## 1. For Owners

### 1.1 First login
Register with your email and a password (8+ characters). The first
account you create automatically becomes the **Owner** of a new,
empty salon — there's nothing else to set up first.

### 1.2 Setting prices (do this before recording services)
Every service has an internal **cost** (what the products used cost you)
built into the app already, but no **price** (what you charge) until you
set one.
1. Sidebar → **Services** → **💵 Pricing** tab.
2. Type a price next to each service, or use **Save All** after filling
   in several.
3. Until a service is priced, recording it will show ₹0 revenue for that
   visit — the cost tracking still works, just not the revenue side.

### 1.3 Recording a service
Sidebar → **Services** → **✂️ Browse**, click a service, choose the
worker who performed it (or add a new one on the spot), set quantity,
confirm. The price shown is what to charge the customer; if you're an
Owner you'll also see the internal cost and margin — that part is hidden
from Workers.

### 1.4 Downloading a receipt
Sidebar → **Services** → **📋 History**, click the 🧾 icon on any record
to download a PDF receipt.

### 1.5 Managing stock
Sidebar → **Inventory**. Stock levels aren't something you edit directly
— they're calculated from every restock you've logged minus what
recorded services have used. To add stock: **+ Restock**, pick the
product, enter how much you added and what you paid.

### 1.6 Tracking expenses
Sidebar → **Dashboard** → **+ Add Expense** for rent, utilities,
salaries, marketing, etc. — anything that isn't product cost (which is
tracked automatically through service recording instead).

### 1.7 Adding staff
Sidebar → **Workers**. Two different things live on this page:
- **+ Add Worker**: just a name, for picking who performed a service.
  No login, no access to the app.
- **🔑 Invite Worker**: creates an actual login for someone. Give them
  the email + temporary password shown after inviting — they should
  change the password after their first login. Once logged in, they can
  record their own services and see their own performance, and nothing
  else (no pricing, stock, expenses, reports, or other staff).

### 1.8 Reports & forecasts
Sidebar → **Analysis**. Tabs: Overview, Revenue, Expenses, Workers,
Services, Monthly, and **Forecast** — the last one projects next month's
expenses and flags which products are on track to run out soonest based
on actual recent usage, not just what's currently on the shelf.

---

## 2. For Workers

You'll only ever see one page: **Services**. That's not a bug — an
Owner's Sidebar has more tabs because they can see the whole salon's
finances; a Worker's view is deliberately limited to their own work.

### 2.1 Recording a service you performed
Browse tab → pick the service → confirm quantity → submit. Your name is
filled in automatically as the worker.

### 2.2 Your history
History tab shows only services **you** recorded — not your coworkers'.
Each has a 🧾 button to download a receipt for the customer.

### 2.3 What you won't see, and why
No Dashboard, Inventory, Workers, or Analysis tabs, and the Services page
itself won't show internal product cost or profit margin — only the
price to charge. This isn't a glitch; the Owner controls that visibility
by design, so ask them if you think you need access to something you
don't have.

---

## 3. Troubleshooting

| Problem | Likely cause |
|---|---|
| "Role 'worker' is not permitted to perform this action" | You're logged in as a Worker and tried an Owner-only action (usually via a direct link/bookmark) — this is expected, not an error to report. |
| A service shows "Price not set" | The Owner hasn't set a price for it yet — see §1.2. |
| A newly invited worker can't log in | Double-check the email/password were copied exactly; passwords are case-sensitive. |
| Stock numbers look off | Remember stock is *computed* from restock + usage history, not a number anyone edits directly — check the Restock History for what's actually been logged. |
