import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { restockCreateSchema } from '../schemas.js';
import { listRestock, createRestock } from '../controllers/restock.controller.js';

export const restockRouter = Router();

restockRouter.get('/', requireAuth, requireRole('owner'), asyncHandler(listRestock));
restockRouter.post(
  '/',
  requireAuth,
  requireRole('owner'),
  validate(restockCreateSchema),
  asyncHandler(createRestock)
);
