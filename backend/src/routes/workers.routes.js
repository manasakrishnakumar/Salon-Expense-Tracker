import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { workerCreateSchema, workerInviteSchema } from '../schemas.js';
import {
  listWorkers,
  createWorker,
  deactivateWorker,
  inviteWorker,
} from '../controllers/workers.controller.js';

export const workersRouter = Router();

// Creating logins is more sensitive than everything else here — cap it
// separately and tightly regardless of the general API rate limit.
const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

workersRouter.get('/', requireAuth, requireRole('owner'), asyncHandler(listWorkers));
workersRouter.post(
  '/',
  requireAuth,
  requireRole('owner'),
  validate(workerCreateSchema),
  asyncHandler(createWorker)
);
workersRouter.delete('/:id', requireAuth, requireRole('owner'), asyncHandler(deactivateWorker));

workersRouter.post(
  '/invite',
  requireAuth,
  requireRole('owner'),
  inviteLimiter,
  validate(workerInviteSchema),
  asyncHandler(inviteWorker)
);
