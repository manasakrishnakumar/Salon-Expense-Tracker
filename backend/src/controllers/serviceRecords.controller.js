import { env } from '../config/env.js';
import { Query } from '../config/appwrite.js';
import { listMine, createMine, deleteMine, getDoc } from '../repo.js';
import { findService, calculateServiceCost } from '../logic/costCalculator.js';
import { calculateServicePrice } from '../logic/pricing.js';
import { getPriceForService } from '../pricingRepo.js';
import { streamReceipt } from '../logic/invoice.js';
import { HttpError } from '../middleware/errorHandler.js';

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
 * The whole point of moving this server-side: a client sends only
 * {serviceId, quantity, workerName} — it can never dictate unitCost or
 * totalCost. Those come exclusively from the canonical catalog, computed
 * here, so a tampered/buggy client can't misreport what a service cost or
 * silently skip the stock impact.
 *
 * Both owners and workers can create records; the record always belongs to
 * the salon (userID = ownerId), while recordedByUserId/recordedByName say
 * who actually did it — an owner recording on a walk-in's behalf can still
 * pick any staff name (workerName), but a worker's own name is used
 * automatically for accountability if they don't override it.
 */
export async function createServiceRecord(req, res) {
  const { serviceId, quantity, workerName } = req.body;

  const service = findService(serviceId);
  if (!service) throw new HttpError(404, 'Service not found in catalog');

  const { unitCost, totalCost } = calculateServiceCost(service, quantity);
  const price = await getPriceForService(req.user.ownerId, serviceId);
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
    WorkerName: effectiveWorkerName || '',
    Date: new Date().toISOString(),
    recordedByUserId: req.user.id,
    recordedByName: req.user.name || '',
  });

  res.status(201).json({ record });
}

// Owner-only at the route level (a worker deleting evidence of their own
// underperformance is exactly the scenario RBAC should prevent).
export async function removeServiceRecord(req, res) {
  await deleteMine(env.collections.serviceRecords, req.params.id, req.user.ownerId);
  res.status(204).send();
}

/**
 * A receipt is reasonable for either role to pull up (a worker handing a
 * customer their receipt at checkout is normal), but only for a record
 * that actually belongs to this salon — and a worker only for one they
 * personally recorded, same visibility rule as the list endpoint.
 */
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
