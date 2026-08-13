/**
 * Idempotent Appwrite schema setup (Phase 2 RBAC + Phase 4 pricing).
 *
 * Run with: npm run setup:appwrite
 *
 * Safe to run repeatedly — every step checks whether the collection/attribute
 * already exists before creating it. This is here instead of asking you to
 * click things together by hand in the Appwrite console, and it's the kind
 * of thing worth pointing at in a report as "infrastructure as code."
 *
 * What it provisions:
 *  - a new `audit_log` collection (who did what, for accountability once
 *    workers have their own logins)
 *  - two new attributes on the existing `service_record` collection
 *    (recordedByUserId / recordedByName) so a worker's own service records
 *    can be told apart from the rest of their salon's
 *  - the `restock_history` and `workers` collections themselves, which
 *    turned out not to exist in Appwrite at all yet (discovered when this
 *    script first ran against the real project) — the original app's
 *    StockContext/WorkersContext were silently failing every request
 *    against them and falling back to an empty list, which reads as "no
 *    data yet" rather than an obvious error
 *  - a new `service_prices` collection (ownerId, serviceId, price) — what
 *    a salon actually charges for a service, per owner, kept separate from
 *    the shared code catalog's `cost` (product usage cost)
 *  - `unitPrice` / `totalPrice` attributes on `service_record`, alongside
 *    the existing unitCost/totalCost
 *
 * Note: Appwrite attribute creation is asynchronous — a freshly created
 * attribute briefly reports status "processing" before "available". If a
 * write against a brand-new attribute fails immediately after running this,
 * wait a few seconds and retry.
 */
import { databases } from '../src/config/appwrite.js';
import { env } from '../src/config/env.js';

const dbId = env.appwrite.databaseId;

async function ensureCollection(collectionId, name) {
  try {
    await databases.getCollection(dbId, collectionId);
    console.log(`  = collection '${collectionId}' already exists`);
  } catch (err) {
    if (err.code !== 404) throw err;
    await databases.createCollection(dbId, collectionId, name, [], false);
    console.log(`  + created collection '${collectionId}'`);
  }
}

async function ensureStringAttribute(collectionId, key, size, required = false) {
  try {
    await databases.getAttribute(dbId, collectionId, key);
    console.log(`  = attribute '${collectionId}.${key}' already exists`);
  } catch (err) {
    if (err.code !== 404) throw err;
    await databases.createStringAttribute(dbId, collectionId, key, size, required);
    console.log(`  + created attribute '${collectionId}.${key}'`);
  }
}

async function ensureFloatAttribute(collectionId, key, required = false, xdefault) {
  try {
    await databases.getAttribute(dbId, collectionId, key);
    console.log(`  = attribute '${collectionId}.${key}' already exists`);
  } catch (err) {
    if (err.code !== 404) throw err;
    // Appwrite rejects a default value on a required attribute.
    await databases.createFloatAttribute(dbId, collectionId, key, required, undefined, undefined, required ? undefined : xdefault);
    console.log(`  + created attribute '${collectionId}.${key}'`);
  }
}

async function ensureBooleanAttribute(collectionId, key, required = false, xdefault) {
  try {
    await databases.getAttribute(dbId, collectionId, key);
    console.log(`  = attribute '${collectionId}.${key}' already exists`);
  } catch (err) {
    if (err.code !== 404) throw err;
    await databases.createBooleanAttribute(dbId, collectionId, key, required, required ? undefined : xdefault);
    console.log(`  + created attribute '${collectionId}.${key}'`);
  }
}

async function main() {
  console.log(`Setting up Appwrite schema in database '${dbId}'...\n`);

  console.log(`[audit_log]`);
  await ensureCollection(env.collections.auditLog, 'Audit Log');
  await ensureStringAttribute(env.collections.auditLog, 'ownerId', 64, true);
  await ensureStringAttribute(env.collections.auditLog, 'actorId', 64, true);
  await ensureStringAttribute(env.collections.auditLog, 'actorName', 128, false);
  await ensureStringAttribute(env.collections.auditLog, 'action', 64, true);
  await ensureStringAttribute(env.collections.auditLog, 'targetCollection', 64, false);
  await ensureStringAttribute(env.collections.auditLog, 'targetId', 64, false);
  await ensureStringAttribute(env.collections.auditLog, 'message', 500, false);

  console.log(`\n[${env.collections.serviceRecords}]`);
  await ensureStringAttribute(env.collections.serviceRecords, 'recordedByUserId', 64, false);
  await ensureStringAttribute(env.collections.serviceRecords, 'recordedByName', 128, false);
  await ensureFloatAttribute(env.collections.serviceRecords, 'unitPrice', false, 0);
  await ensureFloatAttribute(env.collections.serviceRecords, 'totalPrice', false, 0);

  console.log(`\n[${env.collections.restock}]`);
  await ensureCollection(env.collections.restock, 'Restock History');
  await ensureStringAttribute(env.collections.restock, 'userID', 64, true);
  await ensureStringAttribute(env.collections.restock, 'productName', 120, true);
  await ensureFloatAttribute(env.collections.restock, 'quantityAdded', true);
  await ensureStringAttribute(env.collections.restock, 'unit', 16, false);
  await ensureFloatAttribute(env.collections.restock, 'purchasePrice', false, 0);
  await ensureStringAttribute(env.collections.restock, 'supplier', 200, false);
  await ensureStringAttribute(env.collections.restock, 'date', 32, false);

  console.log(`\n[${env.collections.workers}]`);
  await ensureCollection(env.collections.workers, 'Workers');
  await ensureStringAttribute(env.collections.workers, 'userID', 64, true);
  await ensureStringAttribute(env.collections.workers, 'name', 120, true);
  await ensureBooleanAttribute(env.collections.workers, 'isActive', true);

  console.log(`\n[${env.collections.servicePrices}]`);
  await ensureCollection(env.collections.servicePrices, 'Service Prices');
  await ensureStringAttribute(env.collections.servicePrices, 'ownerId', 64, true);
  await ensureStringAttribute(env.collections.servicePrices, 'serviceId', 64, true);
  await ensureFloatAttribute(env.collections.servicePrices, 'price', true);

  console.log('\nSchema setup complete.');
}

main().catch((err) => {
  console.error('\nSchema setup failed:', err.message);
  process.exit(1);
});
