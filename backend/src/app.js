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
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  const sentryEnabled = initSentry();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

  // Generous general limit — this is an internal business app, not a public
  // API — with a much stricter limit on the account-creating invite route
  // (see routes/workers.routes.js) since that one's more sensitive.
  app.use(
    '/api',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false })
  );

  // Public, unauthenticated — a contract doc, not privileged data. Full
  // spec lives at backend/openapi.yaml (see docs/ for the narrative docs).
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

  app.use(notFound);
  // Sentry needs to see the error before our own handler formats/hides it.
  if (sentryEnabled) Sentry.setupExpressErrorHandler(app);
  app.use(errorHandler);

  return app;
}
