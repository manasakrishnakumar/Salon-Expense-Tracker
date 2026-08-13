import { env } from '../config/env.js';
import { listMine, createMine } from '../repo.js';

export async function listAdjustments(req, res) {
  const adjustments = await listMine(env.collections.stockAdjustments, req.user.ownerId, [], 500);
  res.json({ adjustments, count: adjustments.length });
}

export async function createAdjustment(req, res) {
  const { productName, quantityRemoved, reason, notes = '', date } = req.body;
  const adjustment = await createMine(env.collections.stockAdjustments, {
    userID: req.user.ownerId,
    productName: String(productName).trim().toUpperCase(),
    quantityRemoved: Number(quantityRemoved),
    reason,
    notes: notes.trim(),
    date: date || new Date().toISOString().split('T')[0],
  });
  res.status(201).json({ adjustment });
}
