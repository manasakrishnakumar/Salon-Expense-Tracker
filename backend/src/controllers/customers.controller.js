import { env } from '../config/env.js';
import { Query } from '../config/appwrite.js';
import { listMine, createMine, getDoc, updateDoc, deleteMine } from '../repo.js';
import { HttpError } from '../middleware/errorHandler.js';

export async function listCustomers(req, res) {
  const customers = await listMine(env.collections.customers, req.user.ownerId, [], 500);
  res.json({ customers, count: customers.length });
}

export async function createCustomer(req, res) {
  const { name, phone = '', email = '', notes = '' } = req.body;
  const customer = await createMine(env.collections.customers, {
    userID: req.user.ownerId,
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    notes: notes.trim(),
    loyaltyPoints: 0,
    totalSpend: 0,
    visitCount: 0,
    createdAt: new Date().toISOString().split('T')[0],
  });
  res.status(201).json({ customer });
}

export async function getCustomer(req, res) {
  const customer = await getDoc(env.collections.customers, req.params.id);
  if (customer.userID !== req.user.ownerId) {
    throw new HttpError(403, 'Access denied');
  }
  // Fetch their service history
  const { databases } = await import('../config/appwrite.js');
  const { env: e } = await import('../config/env.js');
  const recordsResult = await databases.listDocuments(e.appwrite.databaseId, e.collections.serviceRecords, [
    Query.equal('userID', req.user.ownerId),
    Query.equal('customerId', req.params.id),
    Query.orderDesc('$createdAt'),
    Query.limit(200),
  ]);
  res.json({ customer, serviceHistory: recordsResult.documents });
}

export async function updateCustomer(req, res) {
  const customer = await getDoc(env.collections.customers, req.params.id);
  if (customer.userID !== req.user.ownerId) throw new HttpError(403, 'Access denied');

  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name.trim();
  if (req.body.phone !== undefined) updates.phone = req.body.phone.trim();
  if (req.body.email !== undefined) updates.email = req.body.email.trim();
  if (req.body.notes !== undefined) updates.notes = req.body.notes.trim();
  if (req.body.loyaltyPoints !== undefined) updates.loyaltyPoints = Number(req.body.loyaltyPoints);

  const updated = await updateDoc(env.collections.customers, req.params.id, updates);
  res.json({ customer: updated });
}

export async function deleteCustomer(req, res) {
  await deleteMine(env.collections.customers, req.params.id, req.user.ownerId);
  res.status(204).send();
}
