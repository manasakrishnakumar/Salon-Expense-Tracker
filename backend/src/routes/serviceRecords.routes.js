import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { serviceRecordCreateSchema } from '../schemas.js';
import {
  listServiceRecords,
  createServiceRecord,
  removeServiceRecord,
  getInvoice,
} from '../controllers/serviceRecords.controller.js';

export const serviceRecordsRouter = Router();

// Owners and workers can both list/create (scoping differs inside the
// controller); only owners can delete a record.
serviceRecordsRouter.get('/', requireAuth, asyncHandler(listServiceRecords));
serviceRecordsRouter.post(
  '/',
  requireAuth,
  validate(serviceRecordCreateSchema),
  asyncHandler(createServiceRecord)
);
serviceRecordsRouter.get('/:id/invoice', requireAuth, asyncHandler(getInvoice));
serviceRecordsRouter.delete('/:id', requireAuth, requireRole('owner'), asyncHandler(removeServiceRecord));
