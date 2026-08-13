import { Client, Account, Databases, ID, Query } from 'appwrite';

// Appwrite Configuration
const client = new Client();

client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('695f65ac002951c845ea');

// Export services
export const account = new Account(client);
export const databases = new Databases(client);

// Database Configuration
export const DATABASE_ID = '695f66ba003081a9a85d';
export const EXPENSES_COLLECTION_ID = 'expenses';
export const SERVICE_RECORDS_COLLECTION_ID = 'service_record';

// Helper exports
export { ID, Query };

