import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { customerCreateSchema, customerUpdateSchema } from '../schemas.js';
import { listCustomers, createCustomer, getCustomer, updateCustomer, deleteCustomer } from '../controllers/customers.controller.js';

export const customersRouter = Router();

customersRouter.get('/', requireAuth, requireRole('owner'), asyncHandler(listCustomers));
customersRouter.post('/', requireAuth, requireRole('owner'), validate(customerCreateSchema), asyncHandler(createCustomer));
customersRouter.get('/:id', requireAuth, requireRole('owner'), asyncHandler(getCustomer));
customersRouter.put('/:id', requireAuth, requireRole('owner'), validate(customerUpdateSchema), asyncHandler(updateCustomer));
customersRouter.delete('/:id', requireAuth, requireRole('owner'), asyncHandler(deleteCustomer));
