import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { expenseCreateSchema } from '../schemas.js';
import { listExpenses, createExpense, removeExpense } from '../controllers/expenses.controller.js';

export const expensesRouter = Router();

expensesRouter.get('/', requireAuth, requireRole('owner'), asyncHandler(listExpenses));
expensesRouter.post(
  '/',
  requireAuth,
  requireRole('owner'),
  validate(expenseCreateSchema),
  asyncHandler(createExpense)
);
expensesRouter.delete('/:id', requireAuth, requireRole('owner'), asyncHandler(removeExpense));
