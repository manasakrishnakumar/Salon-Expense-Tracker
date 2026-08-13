import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { stockAdjustmentSchema } from '../schemas.js';
import { listAdjustments, createAdjustment } from '../controllers/stockAdjustments.controller.js';

export const stockAdjustmentsRouter = Router();

stockAdjustmentsRouter.get('/', requireAuth, requireRole('owner'), asyncHandler(listAdjustments));
stockAdjustmentsRouter.post('/', requireAuth, requireRole('owner'), validate(stockAdjustmentSchema), asyncHandler(createAdjustment));
