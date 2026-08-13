import * as Sentry from '@sentry/node';
import { env } from './env.js';

/**
 * Entirely optional — a no-op unless SENTRY_DSN is set. No account exists
 * for this project yet; wiring is here so turning it on later is a matter
 * of setting one env var, not writing more code. Get a DSN from
 * https://sentry.io (free tier is enough for a project this size) and set
 * SENTRY_DSN in backend/.env.
 */
export function initSentry() {
  if (!process.env.SENTRY_DSN) return false;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: env.nodeEnv,
    tracesSampleRate: env.nodeEnv === 'production' ? 0.1 : 0,
  });
  return true;
}

export { Sentry };
