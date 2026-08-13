import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'salon-pro-backend', time: new Date().toISOString() });
});
