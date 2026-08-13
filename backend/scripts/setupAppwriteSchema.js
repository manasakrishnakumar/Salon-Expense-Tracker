/**
 * Idempotent Appwrite schema setup — Phase 5 (customers, attendance, stock adjustments, tips).
 *
 * Run with: npm run setup:appwrite
 *
 * Safe to run repeatedly — every step checks whether the collection/attribute
 * already exists before creating it.
 *
 * New in this version:
 *  - `customers` collection (C1, C2, C4)
 *  - `attendance` collection (W1)
 *  - `stock_adjustments` collection (I4)
 *  - `tip` attribute on `service_record` (P5)
 *  - `customerId` / `customerName` attributes on `service_record` (C1, C2)
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
    await databases.createFloatAttribute(dbId, collectionId, key, required, undefined, undefined, required ? undefined : xdefault);
    console.log(`  + created attribute '${collectionId}.${key}'`);
  }
}

async function ensureIntegerAttribute(collectionId, key, required = false, xdefault) {
  try {
    await databases.getAttribute(dbId, collectionId, key);
    console.log(`  = attribute '${collectionId}.${key}' already exists`);
  } catch (err) {
    if (err.code !== 404) throw err;
    await databases.createIntegerAttribute(dbId, collectionId, key, required, undefined, undefined, required ? undefined : xdefault);
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

  // ─── Previously existing schema (Phase 2-4) ──────────────────────────────

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
  // Phase 5 additions
  await ensureFloatAttribute(env.collections.serviceRecords, 'tip', false, 0);
  await ensureStringAttribute(env.collections.serviceRecords, 'customerId', 64, false);
  await ensureStringAttribute(env.collections.serviceRecords, 'customerName', 120, false);

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

  // ─── Phase 5: New collections ─────────────────────────────────────────────

  console.log(`\n[${env.collections.customers}]`);
  await ensureCollection(env.collections.customers, 'Customers');
  await ensureStringAttribute(env.collections.customers, 'userID', 64, true);
  await ensureStringAttribute(env.collections.customers, 'name', 120, true);
  await ensureStringAttribute(env.collections.customers, 'phone', 20, false);
  await ensureStringAttribute(env.collections.customers, 'email', 200, false);
  await ensureFloatAttribute(env.collections.customers, 'loyaltyPoints', false, 0);
  await ensureFloatAttribute(env.collections.customers, 'totalSpend', false, 0);
  await ensureIntegerAttribute(env.collections.customers, 'visitCount', false, 0);
  await ensureStringAttribute(env.collections.customers, 'notes', 500, false);
  await ensureStringAttribute(env.collections.customers, 'createdAt', 32, false);

  console.log(`\n[${env.collections.attendance}]`);
  await ensureCollection(env.collections.attendance, 'Attendance');
  await ensureStringAttribute(env.collections.attendance, 'userID', 64, true);
  await ensureStringAttribute(env.collections.attendance, 'workerName', 120, true);
  await ensureStringAttribute(env.collections.attendance, 'workerId', 64, false);
  await ensureStringAttribute(env.collections.attendance, 'date', 16, true);
  await ensureStringAttribute(env.collections.attendance, 'checkIn', 32, false);
  await ensureStringAttribute(env.collections.attendance, 'checkOut', 32, false);
  await ensureIntegerAttribute(env.collections.attendance, 'durationMinutes', false, 0);

  console.log(`\n[${env.collections.stockAdjustments}]`);
  await ensureCollection(env.collections.stockAdjustments, 'Stock Adjustments');
  await ensureStringAttribute(env.collections.stockAdjustments, 'userID', 64, true);
  await ensureStringAttribute(env.collections.stockAdjustments, 'productName', 120, true);
  await ensureFloatAttribute(env.collections.stockAdjustments, 'quantityRemoved', true);
  await ensureStringAttribute(env.collections.stockAdjustments, 'reason', 32, true); // wastage|theft|expiry|other
  await ensureStringAttribute(env.collections.stockAdjustments, 'notes', 500, false);
  await ensureStringAttribute(env.collections.stockAdjustments, 'date', 16, false);

  console.log('\nSchema setup complete.');
}

main().catch((err) => {
  console.error('\nSchema setup failed:', err.message);
  process.exit(1);
});
