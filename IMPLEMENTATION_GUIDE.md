# 🚀 Salon Expense Analyzer - Complete Implementation Guide

> **Status note (Phase 4):** this was the original planning document and
> several sections below are now out of date — kept for historical
> context, not as a description of the current system. In particular:
> **all 83 services now have complete product-cost data** (the "23
> services without details" section further down is obsolete — see
> [`legacy/SERVICES_WITHOUT_DETAILS.md`](legacy/SERVICES_WITHOUT_DETAILS.md)),
> and a real customer-facing **price** now exists separately from internal
> **cost** (see "Pricing model" below). The API Endpoints section has been
> updated to match what's actually implemented in
> [`backend/src/routes/`](backend/src/routes). A proper architecture
> writeup/SRS is planned for a later documentation pass.

## 📊 System Overview

This system automatically calculates service costs based on product usage and tracks inventory in real-time.

---

## ✅ Services WITH Complete Product Details (83 Services — 100%)

### FACIALS (40 types)
1. **DIAMOND FACIAL** - ₹139.7
   - Products: CLEANSER (10g), SCRUB (10g), SERUM (5ml), TONER (5ml), MASSAGE (15g), PACK (15g)

2. **PEARL FACIAL** - ₹91.7
   - Products: CLEANSER (10g), SCRUB (10g), TONER (5ml), MASSAGE (15g), PACK (15g), POLISH (5g)

3. **NATUR'S PAPPAYA** - ₹105
4. **WHITENING CLEANUP** - ₹147.4
5. **BASIC CLEANUP** - ₹17
6. **HYDRAVITA CLEANUP** - ₹169.5
7. **PURAVITA CLEANUP** - ₹158
8. **GOLDSHEEN FACIAL** - ₹434
9. **INSTAFAIR FACIAL** - ₹380
10. **DIPIGMENTONE** - ₹285.5
11. **GLOWDERMI** - ₹284.5
12. **ACNEX** - ₹295
13. **PAPPAYA FACIAL** - ₹480
14. **BEAR BERRY FACIAL** - ₹493
15. **VINO GRAPES FACIAL** - ₹480
16. **PINE APPLE FACIAL** - ₹480
17. **KIWI FACIAL** - ₹493
18. **ULTIMA PEARL FACIAL** - ₹753
19. **RETAMIN YOUTH BRIGHTENING FACIAL** - ₹451
20. **RETAMIN SKIN BRIGHTENING FACIAL** - ₹406
21. **BRIDELGLOW SKIN WHITENING FACIAL** - ₹243
22. **BRIDELGLOW SKIN BRIGHTENING FACIAL** - ₹256
23. **PROMEN FACIAL** - ₹276
24. **RAAGA GOLD FACIAL** - ₹356
25. **RAAGA PLATINUM FACIAL** - ₹408
26. **RAAGA BRIDEL FACIAL** - ₹562
27. **SEASOUL HYDRA FACIAL** - ₹147
28. **KOREAN GLASS FACIAL** - ₹254
29. **DEAD SEA DEEP HYDRATE FACIAL** - ₹228
30. **DEAD SEA ARGAN CLARIFYING OILY FACIAL** - ₹228
31. **DEAD SEA ARG CLARIFYING ACNE FACIAL** - ₹228
32. **DEAD SEA ANTI AGING FACIAL** - ₹228
33. **GOLD MOROCCAN ANTI AGING FACIAL** - ₹233
34. **GOLD MOROCCAN ARGAN DRY SKIN FACIAL** - ₹233
35. **GOLD MOROCCAN ARGAN OILY SKIN FACIAL** - ₹233
36. **CRYO-RED CARPET DEPIGMENTATION FACIAL** - ₹382
37. **CRYO-RED CARPET DNA ANTI AGING FACIAL** - ₹382
38. **CRYO-RED CARPET DNA PORE MINIMISING FACIAL** - ₹382
39. **DERMA ICE-BRIGHTENING ANTI ACNE FACIAL** - ₹295
40. **DERMA ICE-FACIAL INSTANTGLOW FACIAL** - ₹295
41. **DERMA ICE-FACIAL TIGHTENING FACIAL** - ₹295
42. **SEASOUL PURE MOIST FACIAL** - ₹122
43. **SEASOUL PURE PORE FACIAL** - ₹122
44. **DEAD SEA CHOCOMINT FACIAL** - ₹167

### CLEANUPS (7 types)
45. **SEASOUL BASIC ORGANIC CLEANUP DRY SKIN** - ₹92
46. **SEASOUL BASIC ORGANIC CLEANUP OILY SKIN** - ₹92
47. **SEASOUL BASIC ORGANIC ACNE CLEANUP** - ₹92
48. **SEASOUL BASIC ORGANIC BRAZILIAN** - ₹92

### PEDICURE/MANICURE (7 types)
49. **LOTUS PEDICURE** - ₹246
50. **RAAGA PEDICURE** - ₹165
51. **DEAD SEA ANTI TAN PEDICURE** - ₹133
52. **CANDELSPA PEDI MANI** - ₹203
53. **BOMBSHELL PEDI MANI** - ₹203
54. **BASIC MANI PEDI** - ₹38
55. **CHOCOLATE MINT PEDICURE** - ₹102

### OTHER SERVICES (5 types)
56. **RAAGA D TAN** - ₹38
57. **RAAGA WAX** - ₹181 (Full leg, full arms, under arms)
58. **HAIR SPA** - ₹265 (For shoulder level)
59. **MAJIREL MEN COLOUR** - ₹270 (90g)
60. **INOVA MEN COLOUR** - ₹340 (70g)

---

## ✅ Product Details — Formerly Missing 23 Services

All 23 services that once lacked product-usage data (haircuts, beard,
blowdry, eyebrow, hair wash, etc.) have since been fully costed in
[`backend/src/data/servicesCatalog.js`](backend/src/data/servicesCatalog.js).
See [`legacy/SERVICES_WITHOUT_DETAILS.md`](legacy/SERVICES_WITHOUT_DETAILS.md)
for the original request, kept for history only.

---

## 💵 Pricing Model (Phase 4)

`cost` (above) is what a service costs the salon in product usage — an
internal number, never shown to a customer. Starting Phase 4, there's a
separate **`price`**: what the salon actually charges. Unlike cost, price
is **not** part of the shared catalog — it's owner-specific data (the
`service_prices` collection), since two salons running this same app would
charge different amounts for an identical DIAMOND FACIAL. An owner sets
prices from the Services → Pricing tab; a service with no price set yet
shows `price: null` and contributes 0 to revenue until priced.

Every service record now stores both pairs — `unitCost`/`totalCost` and
`unitPrice`/`totalPrice` — computed server-side, never trusted from the
client. `totalPrice − totalCost` is the real gross margin on that service.

---

## 🏗️ Database Structure

### Products Collection
```javascript
{
  productName: "CLEANSER",
  category: "cleanser",
  purchasePrice: 750,
  totalQuantity: 500,
  unit: "grams",
  pricePerUnit: 1.5,
  currentStock: 2000,
  usedStock: 350,
  remainingStock: 1650,
  lowStockAlert: 200
}
```

### Services Collection
```javascript
{
  serviceName: "DIAMOND FACIAL",
  category: "facial",
  productsUsed: [
    {productId, productName, quantityUsed, unit, cost}
  ],
  totalCostPerService: 139.7
}
```

### Service Records Collection
```javascript
{
  serviceId: "SRV_001",
  serviceName: "DIAMOND FACIAL",
  date: "2026-01-08",
  quantity: 1,
  totalCost: 139.7,
  workerName: "Ravi",
  productsConsumed: [...]
}
```

---

## 🔧 API Endpoints (as actually implemented — `backend/src/routes/`)

All endpoints require `Authorization: Bearer <appwrite-jwt>`. Endpoints
marked **owner-only** 403 for a `worker`-role account.

### Services & Pricing
- `GET /api/services[?category=]` — catalog (worker responses have
  cost/margin stripped; price stays visible)
- `GET /api/services/:id`
- `PUT /api/services/:id/price` **(owner-only)** — `{ "price": 500 }`
- `PUT /api/services/prices` **(owner-only)** — bulk: `{ "prices": [{ "serviceId", "price" }, ...] }`

### Service Records
- `GET /api/service-records` — owner sees the whole salon's; worker sees only their own
- `POST /api/service-records` — `{ "serviceId", "quantity", "workerName" }`; cost/price computed server-side
- `GET /api/service-records/:id/invoice` — streams a PDF receipt
- `DELETE /api/service-records/:id` **(owner-only)**

### Stock **(owner-only)**
- `GET /api/products/status` — derived from restock history minus consumption, not a stored counter
- `GET /api/products/low-stock`

### Restock **(owner-only)**
- `GET /api/restock`
- `POST /api/restock` — `{ "productName", "quantityAdded", "unit", "purchasePrice", "supplier", "date" }`

### Expenses **(owner-only)**
- `GET /api/expenses`
- `POST /api/expenses` — `{ "name", "amount", "category", "date" }`
- `DELETE /api/expenses/:id`

### Workers **(owner-only)**
- `GET /api/workers` — plain attribution names (no login)
- `POST /api/workers` — `{ "name" }`
- `DELETE /api/workers/:id` — soft-delete (isActive: false)
- `POST /api/workers/invite` — creates a real login: `{ "name", "email", "password" }`

### Reports **(owner-only)**
- `GET /api/reports/daily?date=YYYY-MM-DD`
- `GET /api/reports/monthly?month=&year=`
- `GET /api/reports/most-used-products`
- `GET /api/reports/forecast` — next-month expense/cost projection + stock runout prediction

---

## 📱 User Workflows

### Worker - Record Service
1. Open app
2. Select service category (facial, cleanup, wax, etc.)
3. Click on service (e.g., "DIAMOND FACIAL")
4. **Cost automatically shows**: ₹139.7
5. Enter worker name
6. Enter customer name (optional)
7. Set quantity (default: 1)
8. Submit
9. ✅ Stock automatically deducted

### Owner - Check Stock
1. Go to "Stock Status" tab
2. See all products with:
   - Total stock
   - Used amount
   - Remaining amount
   - Usage percentage
   - Status (OK / LOW STOCK)

### Owner - Restock Products
1. Go to "Restock" section
2. Select product
3. Enter quantity added (e.g., 2000ml)
4. Enter purchase price (e.g., ₹1500)
5. Enter supplier name (optional)
6. Submit
7. ✅ Stock updated

### Owner - View Reports
1. Go to "Reports" tab
2. Select date range
3. View:
   - Daily/monthly expenses
   - Most used products
   - Service-wise breakdown
   - Cost trends

---

## 🎯 Next Steps

### Done
1. ✅ Import CSV files to database
2. ✅ Set up Appwrite collections (including two, `restock_history` and
   `workers`, that turned out to have never actually been created — see
   `backend/scripts/setupAppwriteSchema.js`)
3. ✅ Add product details for all 83 services
4. ✅ Add customer billing prices (separate from cost) + PDF receipts
5. ✅ Add worker performance tracking (Analysis → Workers tab)
6. ✅ Add profit margin calculations (real gross margin: price − cost)
7. ✅ Real backend (Express API) with RBAC (owner/worker), audit log,
   forecasting

### Still Open
1. ❌ Deploy web/mobile app to production hosting
2. ❌ Train workers on app usage
3. ❌ Automated purchase orders
4. ❌ Automated tests beyond the backend logic layer (frontend e2e, etc.)

---

## 📞 Support

For adding product details for remaining services, provide the information in this format:

```csv
ServiceName,ProductName,MRP,TotalQuantity,Unit,QuantityUsedPerService
HAIR CUT,Hair Gel,200,500,ml,5
HAIR CUT,Hair Spray,300,200,ml,3
BEARD,Beard Oil,150,100,ml,2
```

---

**System Built For:** Salon Expense Analysis & Stock Management  
**Date:** January 2026 (originally) — Phase 4 update: August 2026  
**Status:** 83/83 services costed (100%); real backend (Express + Appwrite),
RBAC, pricing, forecasting, and PDF receipts implemented. See root
[`README.md`](README.md) and the phase commit history on
`feature/backend-and-cleanup` for the full build log.
