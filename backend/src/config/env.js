import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  appwrite: {
    endpoint: required('APPWRITE_ENDPOINT'),
    projectId: required('APPWRITE_PROJECT_ID'),
    apiKey: required('APPWRITE_API_KEY'),
    databaseId: required('APPWRITE_DATABASE_ID'),
  },

  collections: {
    expenses: process.env.COLLECTION_EXPENSES || 'expenses',
    serviceRecords: process.env.COLLECTION_SERVICE_RECORDS || 'service_record',
    restock: process.env.COLLECTION_RESTOCK || 'restock_history',
    workers: process.env.COLLECTION_WORKERS || 'workers',
    products: process.env.COLLECTION_PRODUCTS || 'products',
    auditLog: process.env.COLLECTION_AUDIT_LOG || 'audit_log',
    servicePrices: process.env.COLLECTION_SERVICE_PRICES || 'service_prices',
    customers: process.env.COLLECTION_CUSTOMERS || 'customers',
    attendance: process.env.COLLECTION_ATTENDANCE || 'attendance',
    stockAdjustments: process.env.COLLECTION_STOCK_ADJUSTMENTS || 'stock_adjustments',
  },

  // SMTP for sending worker invite emails (optional — if unset, email is skipped)
  smtp: {
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
    from: process.env.SMTP_FROM || process.env.SMTP_USER || null,
  },
};
