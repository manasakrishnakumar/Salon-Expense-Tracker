import { env } from '../config/env.js';
import { listMine, createMine } from '../repo.js';
import { recordAudit } from '../audit.js';

// Owner-only at the route level.
export async function listRestock(req, res) {
  const restockHistory = await listMine(env.collections.restock, req.user.ownerId, [], 500);
  res.json({ restockHistory, count: restockHistory.length });
}

export async function createRestock(req, res) {
  const { productName, quantityAdded, unit, purchasePrice, supplier, date } = req.body;

  const restock = await createMine(env.collections.restock, {
    userID: req.user.ownerId,
    productName: productName.toUpperCase().trim(),
    quantityAdded,
    unit,
    purchasePrice,
    supplier,
    date: date || new Date().toISOString().split('T')[0],
  });

  await recordAudit(req.user, 'restock.create', {
    targetCollection: env.collections.restock,
    targetId: restock.$id,
    message: `Restocked ${restock.productName} +${quantityAdded}${unit}`,
  });

  res.status(201).json({ restock });
}
