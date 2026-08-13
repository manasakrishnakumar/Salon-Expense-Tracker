import { z } from 'zod';

// Every write endpoint validates against one of these before anything
// touches Appwrite. Fields the client should never control (cost, userID,
// timestamps) are deliberately absent — the server fills those in itself.

export const serviceRecordCreateSchema = z.object({
  serviceId: z.string().min(1),
  quantity: z.number().int().positive().max(1000).default(1),
  workerName: z.string().max(120).optional().default(''),
});

export const restockCreateSchema = z.object({
  productName: z.string().min(1).max(120),
  quantityAdded: z.number().positive(),
  unit: z.enum(['g', 'ml', 'pcs']).default('g'),
  purchasePrice: z.number().nonnegative().default(0),
  supplier: z.string().max(200).optional().default(''),
  date: z.string().optional(), // 'YYYY-MM-DD'; defaults to today server-side if omitted
});

export const expenseCreateSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().positive(),
  category: z.string().min(1).max(100),
  date: z.string().min(1), // 'YYYY-MM-DD'
});

export const workerCreateSchema = z.object({
  name: z.string().min(1).max(120),
});

export const workerInviteSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(256),
});

export const setPriceSchema = z.object({
  price: z.number().nonnegative(),
});

export const setPricesBulkSchema = z.object({
  prices: z
    .array(z.object({ serviceId: z.string().min(1), price: z.number().nonnegative() }))
    .min(1)
    .max(200),
});

export const dailyReportQuerySchema = z.object({
  date: z.string().min(1), // 'YYYY-MM-DD'
});

export const monthlyReportQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});
