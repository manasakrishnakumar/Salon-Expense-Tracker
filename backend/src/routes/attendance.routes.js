import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { attendanceCheckInSchema } from '../schemas.js';
import { listAttendance, getTodayStatus, checkIn, checkOut } from '../controllers/attendance.controller.js';

export const attendanceRouter = Router();

// Both owners and workers can view; workers see only their own (enforced in controller)
attendanceRouter.get('/', requireAuth, asyncHandler(listAttendance));
attendanceRouter.get('/today', requireAuth, asyncHandler(getTodayStatus));
// Owner marks attendance for anyone; worker can check themselves in
attendanceRouter.post('/checkin', requireAuth, validate(attendanceCheckInSchema), asyncHandler(checkIn));
attendanceRouter.put('/:id/checkout', requireAuth, asyncHandler(checkOut));
