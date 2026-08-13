import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { setPriceSchema, setPricesBulkSchema } from '../schemas.js';
import {
  listServices,
  getServiceHandler,
  setPrice,
  setPricesBulk,
} from '../controllers/services.controller.js';

export const servicesRouter = Router();

// Both roles can browse the catalog — a worker's response has cost/margin
// stripped out server-side (see logic/pricing.js sanitizeServiceForRole),
// price stays visible since a worker may need to know what to charge.
servicesRouter.get('/', requireAuth, asyncHandler(listServices));

// Bulk price-setting first so it doesn't get swallowed by the /:id route.
servicesRouter.put(
  '/prices',
  requireAuth,
  requireRole('owner'),
  validate(setPricesBulkSchema),
  asyncHandler(setPricesBulk)
);

servicesRouter.get('/:id', requireAuth, asyncHandler(getServiceHandler));
servicesRouter.put(
  '/:id/price',
  requireAuth,
  requireRole('owner'),
  validate(setPriceSchema),
  asyncHandler(setPrice)
);
