import { env } from '../config/env.js';
import { listMine, createMine, deleteMine } from '../repo.js';
import { recordAudit } from '../audit.js';

// Owner-only at the route level.
export async function listExpenses(req, res) {
  const expenses = await listMine(env.collections.expenses, req.user.ownerId, [], 200);
  res.json({ expenses, count: expenses.length });
}

export async function createExpense(req, res) {
  const { name, amount, category, date } = req.body;

  const expense = await createMine(env.collections.expenses, {
    userID: req.user.ownerId,
    userName: req.user.name || 'Unknown',
    userEmail: req.user.email,
    name,
    amount,
    category,
    date,
  });

  res.status(201).json({ expense });
}

export async function removeExpense(req, res) {
  await deleteMine(env.collections.expenses, req.params.id, req.user.ownerId);
  await recordAudit(req.user, 'expense.delete', {
    targetCollection: env.collections.expenses,
    targetId: req.params.id,
  });
  res.status(204).send();
}
