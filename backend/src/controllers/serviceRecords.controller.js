import { env } from '../config/env.js';
import { Query } from '../config/appwrite.js';
import { listMine, createMine, deleteMine, getDoc, updateDoc } from '../repo.js';
import { findService, calculateServiceCost } from '../logic/costCalculator.js';
import { calculateServicePrice } from '../logic/pricing.js';
import { getPriceForService } from '../pricingRepo.js';
import { streamReceipt } from '../logic/invoice.js';
import { HttpError } from '../middleware/errorHandler.js';
import { computeStockStatus, getLowStockProducts } from '../logic/stockService.js';
import { sendLowStockAlert } from '../config/email.js';
import { users } from '../config/appwrite.js';

/**
 * Owners see every service record for their salon; a worker only sees the
 * ones they personally recorded (recordedByUserId) — not their coworkers'.
 */
export async function listServiceRecords(req, res) {
  const extraQueries = req.user.role === 'worker'
    ? [Query.equal('recordedByUserId', req.user.id)]
    : [];
  const records = await listMine(env.collections.serviceRecords, req.user.ownerId, extraQueries, 500);
  res.json({ records, count: records.length });
}

/**
 * Creates a service record and:
 * - Computes costs + prices server-side
 * - Accepts optional tip, customerId, customerName
 * - Updates customer stats (totalSpend, visitCount, loyaltyPoints) if a customer is linked
 * - Checks for low stock after recording and emails owner if any products cross threshold
 */
export async function createServiceRecord(req, res) {
  const { serviceId, quantity, workerName, tip = 0, customerId = '', customerName = '' } = req.body;

  const service = findService(serviceId);
  if (!service) throw new HttpError(404, 'Service not found in catalog');

  const { unitCost, totalCost } = calculateServiceCost(service, quantity);
  // Owner's explicit price always wins; otherwise fall back to the
  // catalog's researched defaultPrice so a fresh salon doesn't charge ₹0
  // for every service until someone manually prices all of them.
  const ownerPrice = await getPriceForService(req.user.ownerId, serviceId);
  const price = ownerPrice ?? service.defaultPrice ?? null;
  const { unitPrice, totalPrice } = calculateServicePrice(price, quantity);
  const effectiveWorkerName = req.user.role === 'worker' ? (req.user.name || workerName) : workerName;

  const record = await createMine(env.collections.serviceRecords, {
    userID: req.user.ownerId,
    userName: req.user.name || 'Unknown',
    serviceID: service.id,
    serviceName: service.name,
    category: service.category,
    unitCost,
    quantity,
    totalCost,
    unitPrice,
    totalPrice,
    tip: Number(tip) || 0,
    customerId: customerId || '',
    customerName: customerName || '',
    WorkerName: effectiveWorkerName || '',
    Date: new Date().toISOString(),
    recordedByUserId: req.user.id,
    recordedByName: req.user.name || '',
  });

  // Update customer stats if linked (fire-and-forget — don't block the response)
  if (customerId) {
    updateCustomerStats(customerId, totalPrice, tip).catch(err =>
      console.error('[serviceRecords] customer stats update failed:', err.message)
    );
  }

  // Check low stock after every service and alert owner (fire-and-forget)
  checkAndAlertLowStock(req.user.ownerId).catch(err =>
    console.error('[serviceRecords] low stock check failed:', err.message)
  );

  res.status(201).json({ record });
}

async function updateCustomerStats(customerId, totalPrice, tip) {
  try {
    const customer = await getDoc(env.collections.customers, customerId);
    const newSpend = (customer.totalSpend || 0) + (totalPrice || 0);
    const newVisits = (customer.visitCount || 0) + 1;
    // 1 loyalty point per ₹100 spent
    const newPoints = (customer.loyaltyPoints || 0) + Math.floor((totalPrice || 0) / 100);
    await updateDoc(env.collections.customers, customerId, {
      totalSpend: newSpend,
      visitCount: newVisits,
      loyaltyPoints: newPoints,
    });
  } catch (err) {
    console.error('[serviceRecords] updateCustomerStats error:', err.message);
  }
}

// Throttle: store last alert time per owner in memory (resets on server restart — acceptable)
const lastAlertSent = {};

async function checkAndAlertLowStock(ownerId) {
  const now = Date.now();
  // Max one alert per salon per hour
  if (lastAlertSent[ownerId] && now - lastAlertSent[ownerId] < 60 * 60 * 1000) return;

  const [restockDocs, serviceRecordDocs] = await Promise.all([
    listMine(env.collections.restock, ownerId, [], 500),
    listMine(env.collections.serviceRecords, ownerId, [], 500),
  ]);

  let adjustmentDocs = [];
  try {
    adjustmentDocs = await listMine(env.collections.stockAdjustments, ownerId, [], 200);
  } catch (_) { /* collection may not exist yet */ }

  const stock = computeStockStatus(restockDocs, serviceRecordDocs, undefined, adjustmentDocs);
  const low = getLowStockProducts(stock);
  if (low.length === 0) return;

  // Get the owner's email from Appwrite
  try {
    const ownerUser = await users.get(ownerId);
    await sendLowStockAlert({ toEmail: ownerUser.email, lowProducts: low });
    lastAlertSent[ownerId] = now;
  } catch (err) {
    console.error('[serviceRecords] low stock alert email failed:', err.message);
  }
}

// Owner-only at the route level (a worker deleting evidence of their own
// underperformance is exactly the scenario RBAC should prevent).
export async function removeServiceRecord(req, res) {
  await deleteMine(env.collections.serviceRecords, req.params.id, req.user.ownerId);
  res.status(204).send();
}

export async function getInvoice(req, res) {
  const record = await getDoc(env.collections.serviceRecords, req.params.id);

  if (record.userID !== req.user.ownerId) {
    throw new HttpError(403, 'You do not have permission to view this record');
  }
  if (req.user.role === 'worker' && record.recordedByUserId !== req.user.id) {
    throw new HttpError(403, 'You do not have permission to view this record');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="receipt-${record.$id}.pdf"`);
  streamReceipt(record, res);
}
