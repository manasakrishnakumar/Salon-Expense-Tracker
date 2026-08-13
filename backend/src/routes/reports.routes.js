import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { dailyReportQuerySchema, monthlyReportQuerySchema } from '../schemas.js';
import { daily, monthly, mostUsed, forecast } from '../controllers/reports.controller.js';

export const reportsRouter = Router();

reportsRouter.get(
  '/daily',
  requireAuth,
  requireRole('owner'),
  validateQuery(dailyReportQuerySchema),
  asyncHandler(daily)
);
reportsRouter.get(
  '/monthly',
  requireAuth,
  requireRole('owner'),
  validateQuery(monthlyReportQuerySchema),
  asyncHandler(monthly)
);
reportsRouter.get('/most-used-products', requireAuth, requireRole('owner'), asyncHandler(mostUsed));
reportsRouter.get('/forecast', requireAuth, requireRole('owner'), asyncHandler(forecast));
