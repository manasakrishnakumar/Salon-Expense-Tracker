import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { chatbotQuerySchema } from '../schemas.js';
import { query } from '../controllers/chatbot.controller.js';

export const chatbotRouter = Router();

// Owner-only — the answers draw on revenue/expense data a worker
// shouldn't see, same boundary as /api/reports.
chatbotRouter.post('/query', requireAuth, requireRole('owner'), validate(chatbotQuerySchema), asyncHandler(query));
