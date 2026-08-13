import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { stockStatus, lowStock } from '../controllers/stock.controller.js';

export const stockRouter = Router();

stockRouter.get('/status', requireAuth, requireRole('owner'), asyncHandler(stockStatus));
stockRouter.get('/low-stock', requireAuth, requireRole('owner'), asyncHandler(lowStock));
