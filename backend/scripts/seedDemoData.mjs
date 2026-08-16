/**
 * Seeds a month of realistic, randomized demo data — customers, workers,
 * attendance, service records (with repeat customers taking different
 * services on different dates), expenses, and restock history — so the
 * Analysis / Customers / Workers / Stock charts have something real to show.
 *
 * This talks to your LIVE Appwrite database using the server API key from
 * backend/.env (the same credentials app.js itself uses) — it does not run
 * inside the app, it's a one-off maintenance script, same pattern as
 * setupAppwriteSchema.js / fix-admin-prefs.mjs / cleanup-workers.mjs.
 *
 * It is purely ADDITIVE — it never deletes or overwrites anything. Workers
 * and customers are de-duplicated by name against what's already there;
 * service records, attendance, expenses, and restock entries are new rows
 * each run, so re-running adds more data rather than replacing it.
 *
 * Usage:
 *   node scripts/seedDemoData.mjs --owner-email=you@example.com [--days=30] [--dry-run]
 *
 *   --owner-email   Required. The Appwrite login email of the salon OWNER
 *                   account (not a worker) — everything gets scoped to
 *                   their ownerId, exactly like data created through the
 *                   real app would be.
 *   --days          How many days back from today to generate. Default 30.
 *   --dry-run       Compute and log everything, but don't write anything.
 */
import { databases, users, ID, Query } from '../src/config/appwrite.js';
import { env } from '../src/config/env.js';
import { ALL_SERVICES } from '../src/data/servicesCatalog.js';
import { calculateServiceCost, getProductsConsumed } from '../src/logic/costCalculator.js';
import { getPriceForService } from '../src/pricingRepo.js';

// ─── CLI args ────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  })
);

const OWNER_EMAIL = args['owner-email'];
const DAYS = Number(args.days) || 30;
const DRY_RUN = !!args['dry-run'];

if (!OWNER_EMAIL || typeof OWNER_EMAIL !== 'string') {
  console.error('Usage: node scripts/seedDemoData.mjs --owner-email=you@example.com [--days=30] [--dry-run]');
  process.exit(1);
}

// ─── Random helpers ──────────────────────────────────────────────────────

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const chance = (p) => Math.random() < p;
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function isoDate(d) {
  return d.toISOString().split('T')[0];
}
function timeOnDay(dateStr, hour, minute) {
  return new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
}

// ─── Name pools ──────────────────────────────────────────────────────────

const WORKER_NAMES = [
  'Priya Sharma', 'Ananya Reddy', 'Divya Nair', 'Kavya Iyer',
  'Sneha Pillai', 'Meera Krishnan', 'Rahul Menon', 'Arjun Pillai',
];

const CUSTOMER_NAMES = [
  'Aishwarya Rao', 'Lakshmi Menon', 'Deepa Nair', 'Swathi Kumar', 'Nithya Raman',
  'Pooja Varma', 'Kiran Kumar', 'Sanjana Iyer', 'Ramya Krishnan', 'Divya Suresh',
  'Anitha Pillai', 'Vidya Shankar', 'Radha Menon', 'Geetha Nair', 'Shreya Pillai',
  'Manju Warrier', 'Rekha Nambiar', 'Sunitha Rao', 'Preethi Menon', 'Latha Kumar',
  'Vinitha Nair', 'Anjali Suresh', 'Bhavya Krishnan', 'Divya Pillai', 'Nisha Varma',
];

const SUPPLIERS = ['ABC Distributors', 'Beauty Basics Wholesale', 'Glow Supply Co.', 'Salon Essentials'];

const randomPhone = () => '9' + Array.from({ length: 9 }, () => randInt(0, 9)).join('');
const randomEmailFor = (name) =>
  chance(0.6) ? `${name.toLowerCase().replace(/\s+/g, '.')}@gmail.com` : '';

// ─── Simple concurrency-limited batch runner (be gentle on Appwrite's rate limits) ───

async function runBatched(items, worker, concurrency = 5) {
  const results = new Array(items.length);
  let i = 0;
  async function lane() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, lane));
  return results;
}

async function create(collectionId, data) {
  if (DRY_RUN) return { $id: `dry-${Math.random().toString(36).slice(2)}`, ...data };
  return databases.createDocument(env.appwrite.databaseId, collectionId, ID.unique(), data);
}

async function update(collectionId, id, data) {
  if (DRY_RUN) return { $id: id, ...data };
  return databases.updateDocument(env.appwrite.databaseId, collectionId, id, data);
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSalon Pro demo data seeder${DRY_RUN ? ' (DRY RUN — nothing will be written)' : ''}`);
  console.log(`Owner: ${OWNER_EMAIL} | Days: ${DAYS}\n`);

  // 1. Resolve the owner account -------------------------------------------------
  const userList = await users.list([Query.equal('email', OWNER_EMAIL)]);
  if (userList.total === 0) {
    console.error(`No Appwrite user found with email "${OWNER_EMAIL}". Check the email and try again.`);
    process.exit(1);
  }
  const ownerUser = userList.users[0];
  const ownerId = ownerUser.$id;
  console.log(`Found owner: ${ownerUser.name || '(no name)'} <${ownerUser.email}> — id ${ownerId}\n`);

  // 2. Workers (plain attribution entries, no login) ------------------------------
  // Note: dry-run only skips WRITES (via the create()/update() helpers below) —
  // it still reads real state here so the preview counts are accurate.
  const existingWorkers = (await databases.listDocuments(env.appwrite.databaseId, env.collections.workers, [
    Query.equal('userID', ownerId),
    Query.limit(200),
  ])).documents;
  const existingWorkerNames = new Set(existingWorkers.map((w) => w.name.toLowerCase()));
  const workerNamesToCreate = WORKER_NAMES.filter((n) => !existingWorkerNames.has(n.toLowerCase()));

  console.log(`Workers: ${existingWorkers.length} already exist, creating ${workerNamesToCreate.length} more...`);
  const newWorkers = await runBatched(workerNamesToCreate, (name) =>
    create(env.collections.workers, { userID: ownerId, name, isActive: true })
  );
  const workers = [...existingWorkers, ...newWorkers];
  if (workers.length === 0) {
    console.error('No workers available to assign service records to — aborting.');
    process.exit(1);
  }

  // 3. Customers --------------------------------------------------------------------
  const existingCustomers = (await databases.listDocuments(env.appwrite.databaseId, env.collections.customers, [
    Query.equal('userID', ownerId),
    Query.limit(500),
  ])).documents;
  const existingCustomerNames = new Set(existingCustomers.map((c) => c.name.toLowerCase()));
  const customerNamesToCreate = CUSTOMER_NAMES.filter((n) => !existingCustomerNames.has(n.toLowerCase()));

  console.log(`Customers: ${existingCustomers.length} already exist, creating ${customerNamesToCreate.length} more...`);
  const newCustomers = await runBatched(customerNamesToCreate, (name) =>
    create(env.collections.customers, {
      userID: ownerId,
      name,
      phone: randomPhone(),
      email: randomEmailFor(name),
      notes: chance(0.25) ? pick(['Prefers organic products', 'Allergic to strong fragrances', 'Regular — likes the usual', 'Sensitive skin']) : '',
      loyaltyPoints: 0,
      totalSpend: 0,
      visitCount: 0,
      createdAt: isoDate(new Date()),
    })
  );
  const customers = [...existingCustomers, ...newCustomers];
  // A subset of customers get weighted extra visits, so repeat-customer
  // behavior (same person, different service, different date) shows up
  // clearly in the Customers page / loyalty tiers.
  const regulars = shuffle(customers).slice(0, Math.min(6, customers.length));

  // 4. Service catalog + price resolution --------------------------------------------
  const catalog = ALL_SERVICES.filter((s) => typeof s.cost === 'number');
  const priceCache = new Map();
  async function priceFor(service) {
    if (priceCache.has(service.id)) return priceCache.get(service.id);
    const ownerPrice = await getPriceForService(ownerId, service.id);
    const price = ownerPrice ?? service.defaultPrice ?? 0;
    priceCache.set(service.id, price);
    return price;
  }

  // 5. Walk the date range, generating attendance + service records per day ---------
  const today = new Date();
  const pendingServiceRecords = [];
  const pendingAttendance = [];
  const customerDeltas = new Map(); // customerId -> { totalSpend, visitCount, loyaltyPoints }
  const productUsage = new Map(); // productName -> { totalQty, unit }

  function bumpCustomer(customerId, totalPrice) {
    const cur = customerDeltas.get(customerId) || { totalSpend: 0, visitCount: 0, loyaltyPoints: 0 };
    cur.totalSpend += totalPrice;
    cur.visitCount += 1;
    cur.loyaltyPoints += Math.floor(totalPrice / 100);
    customerDeltas.set(customerId, cur);
  }

  console.log(`\nGenerating ${DAYS} days of activity...`);
  for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
    const day = new Date(today);
    day.setDate(day.getDate() - dayOffset);
    const dateStr = isoDate(day);
    const isToday = dayOffset === 0;

    // ~1 in 7 days the salon is simply closed (weekly off) — keeps the
    // trend charts looking like a real business instead of a flat grid.
    if (!isToday && chance(1 / 7)) continue;

    // Which workers showed up today.
    const presentWorkers = shuffle(workers).slice(0, randInt(2, Math.min(5, workers.length)));
    for (const w of presentWorkers) {
      const checkInHour = randInt(9, 11);
      const checkInMin = randInt(0, 59);
      const checkIn = timeOnDay(dateStr, checkInHour, checkInMin);
      const stillIn = isToday && chance(0.4); // today only: some workers haven't clocked out yet
      let checkOut = '';
      let durationMinutes = 0;
      if (!stillIn) {
        const checkOutHour = randInt(17, 20);
        const checkOutMin = randInt(0, 59);
        const checkOutDate = timeOnDay(dateStr, checkOutHour, checkOutMin);
        checkOut = checkOutDate.toISOString();
        durationMinutes = Math.round((checkOutDate - checkIn) / 60000);
      }
      pendingAttendance.push({
        userID: ownerId,
        workerName: w.name,
        workerId: w.$id,
        date: dateStr,
        checkIn: checkIn.toISOString(),
        checkOut,
        durationMinutes,
      });
    }

    // Today's service records.
    const recordCount = randInt(3, 9);
    for (let i = 0; i < recordCount; i++) {
      const worker = pick(presentWorkers);
      const service = pick(catalog);
      const quantity = chance(0.9) ? 1 : 2;

      // 45% of visits are linked to a known customer (biased toward the
      // "regulars" pool so the same people show up again on other dates
      // for different services) — the rest are walk-ins.
      let customer = null;
      if (chance(0.45)) {
        customer = chance(0.6) ? pick(regulars) : pick(customers);
      }

      const tip = chance(0.35) ? randInt(2, 15) * 10 : 0;
      const { unitCost, totalCost } = calculateServiceCost(service, quantity);
      const unitPrice = await priceFor(service);
      const totalPrice = Math.round(unitPrice * quantity * 100) / 100;

      const recordTime = timeOnDay(dateStr, randInt(10, 19), randInt(0, 59));

      pendingServiceRecords.push({
        userID: ownerId,
        userName: ownerUser.name || 'Owner',
        serviceID: service.id,
        serviceName: service.name,
        category: service.category,
        unitCost,
        quantity,
        totalCost,
        unitPrice,
        totalPrice,
        tip,
        customerId: customer ? customer.$id : '',
        customerName: customer ? customer.name : '',
        WorkerName: worker.name,
        Date: recordTime.toISOString(),
        recordedByUserId: ownerId,
        recordedByName: ownerUser.name || 'Owner',
      });

      if (customer) bumpCustomer(customer.$id, totalPrice);

      for (const p of getProductsConsumed(service, quantity)) {
        const cur = productUsage.get(p.name) || { totalQty: 0, unit: p.unit };
        cur.totalQty += p.totalQty;
        productUsage.set(p.name, cur);
      }
    }
  }

  console.log(`  ${pendingServiceRecords.length} service records, ${pendingAttendance.length} attendance rows queued.`);
  console.log('Writing service records...');
  await runBatched(pendingServiceRecords, (r) => create(env.collections.serviceRecords, r), 6);
  console.log('Writing attendance...');
  await runBatched(pendingAttendance, (r) => create(env.collections.attendance, r), 6);

  // 6. Apply accumulated stats back onto the customers that were visited ------------
  console.log(`Updating stats for ${customerDeltas.size} visited customers...`);
  await runBatched(
    [...customerDeltas.entries()],
    async ([customerId, delta]) => {
      const customer = customers.find((c) => c.$id === customerId);
      if (!customer) return;
      return update(env.collections.customers, customerId, {
        totalSpend: Math.round(((customer.totalSpend || 0) + delta.totalSpend) * 100) / 100,
        visitCount: (customer.visitCount || 0) + delta.visitCount,
        loyaltyPoints: (customer.loyaltyPoints || 0) + delta.loyaltyPoints,
      });
    },
    5
  );

  // 7. Restock enough of each consumed product to keep stock levels sane ------------
  console.log(`Restocking ${productUsage.size} products used by the generated records...`);
  const restockRows = [];
  const rangeStartStr = isoDate(new Date(new Date().setDate(today.getDate() - DAYS)));
  for (const [productName, usage] of productUsage) {
    // 1.4x-1.9x what was actually consumed, split into 1-3 restock trips
    // across the period so it's not a single suspicious mega-purchase, and
    // occasionally left a bit tight (closer to 1.1x) so some products show
    // up as genuinely low-stock for the low-stock-alert / reorder demo.
    const multiplier = chance(0.2) ? randFloat(1.05, 1.2) : randFloat(1.4, 1.9);
    const totalToRestock = Math.max(1, Math.round(usage.totalQty * multiplier));
    const trips = randInt(1, 3);
    let remaining = totalToRestock;
    for (let t = 0; t < trips; t++) {
      const qty = t === trips - 1 ? remaining : Math.round(remaining / (trips - t));
      remaining -= qty;
      if (qty <= 0) continue;
      restockRows.push({
        userID: ownerId,
        productName,
        quantityAdded: qty,
        unit: usage.unit,
        purchasePrice: Math.round(qty * randFloat(0.4, 0.9) * 100) / 100,
        supplier: pick(SUPPLIERS),
        date: chance(0.5) ? rangeStartStr : isoDate(new Date(new Date().setDate(today.getDate() - randInt(0, DAYS)))),
      });
    }
  }
  await runBatched(restockRows, (r) => create(env.collections.restock, r), 6);

  // 8. A month's worth of expenses ---------------------------------------------------
  console.log('Writing expenses...');
  const expenseRows = [];
  expenseRows.push({ name: 'Shop Rent', amount: randInt(15000, 25000), category: 'rent', date: rangeStartStr });
  expenseRows.push({ name: 'Staff Salaries', amount: randInt(20000, 40000), category: 'salaries', date: isoDate(new Date(new Date().setDate(today.getDate() - Math.round(DAYS / 2)))) });
  for (let i = 0; i < randInt(3, 6); i++) {
    expenseRows.push({
      name: pick(['Cleaning Supplies', 'Salon Towels', 'Coffee & Refreshments', 'Disposables (gloves, cotton, tissues)']),
      amount: randInt(500, 3000),
      category: 'products',
      date: isoDate(new Date(new Date().setDate(today.getDate() - randInt(0, DAYS)))),
    });
  }
  for (let i = 0; i < randInt(2, 4); i++) {
    expenseRows.push({
      name: pick(['Electricity Bill', 'Water Bill', 'WiFi / Internet']),
      amount: randInt(800, 3000),
      category: 'utilities',
      date: isoDate(new Date(new Date().setDate(today.getDate() - randInt(0, DAYS)))),
    });
  }
  for (let i = 0; i < randInt(1, 2); i++) {
    expenseRows.push({
      name: pick(['Instagram Ads', 'Flyers & Posters']),
      amount: randInt(500, 2000),
      category: 'marketing',
      date: isoDate(new Date(new Date().setDate(today.getDate() - randInt(0, DAYS)))),
    });
  }
  for (let i = 0; i < randInt(1, 2); i++) {
    expenseRows.push({
      name: pick(['Hair Dryer Repair', 'New Trolley', 'Chair Upholstery']),
      amount: randInt(1000, 5000),
      category: 'equipment',
      date: isoDate(new Date(new Date().setDate(today.getDate() - randInt(0, DAYS)))),
    });
  }
  await runBatched(
    expenseRows,
    (e) => create(env.collections.expenses, { userID: ownerId, userName: ownerUser.name || 'Owner', userEmail: ownerUser.email, ...e }),
    5
  );

  // 9. Summary -------------------------------------------------------------------------
  console.log(`\n${DRY_RUN ? 'Would create' : 'Created'}:`);
  console.log(`  Workers:          ${workerNamesToCreate.length} new (${workers.length} total)`);
  console.log(`  Customers:        ${customerNamesToCreate.length} new (${customers.length} total)`);
  console.log(`  Service records:  ${pendingServiceRecords.length}`);
  console.log(`  Attendance rows:  ${pendingAttendance.length}`);
  console.log(`  Restock entries:  ${restockRows.length}`);
  console.log(`  Expenses:         ${expenseRows.length}`);
  console.log(`  Customers with repeat visits (2+): ${[...customerDeltas.values()].filter((d) => d.visitCount >= 2).length}`);
  console.log(DRY_RUN ? '\nDry run only — nothing was written. Re-run without --dry-run to actually seed it.' : '\nDone. Open the app and check the Analysis / Customers / Workers / Stock tabs.');
}

main().catch((err) => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});
