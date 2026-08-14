import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { initSentry, Sentry } from './config/sentry.js';
import { loadOpenApiSpec } from './config/swagger.js';
import { healthRouter } from './routes/health.routes.js';
import { servicesRouter } from './routes/services.routes.js';
import { serviceRecordsRouter } from './routes/serviceRecords.routes.js';
import { stockRouter } from './routes/stock.routes.js';
import { restockRouter } from './routes/restock.routes.js';
import { expensesRouter } from './routes/expenses.routes.js';
import { workersRouter } from './routes/workers.routes.js';
import { reportsRouter } from './routes/reports.routes.js';
import { customersRouter } from './routes/customers.routes.js';
import { attendanceRouter } from './routes/attendance.routes.js';
import { stockAdjustmentsRouter } from './routes/stockAdjustments.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  const sentryEnabled = initSentry();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

  app.use(
    '/api',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false })
  );

  const openApiSpec = loadOpenApiSpec();
  if (openApiSpec) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  }

  app.use('/api/health', healthRouter);
  app.use('/api/services', servicesRouter);
  app.use('/api/service-records', serviceRecordsRouter);
  app.use('/api/products', stockRouter);
  app.use('/api/restock', restockRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/workers', workersRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/stock-adjustments', stockAdjustmentsRouter);
  app.use('/api/auth', authRouter);

  app.use(notFound);
  if (sentryEnabled) Sentry.setupExpressErrorHandler(app);
  app.use(errorHandler);

  return app;
}
