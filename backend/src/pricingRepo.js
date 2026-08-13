import { databases, Query } from './config/appwrite.js';
import { env } from './config/env.js';

/** This owner's price for one service, or null if they've never set one. */
export async function getPriceForService(ownerId, serviceId) {
  const result = await databases.listDocuments(env.appwrite.databaseId, env.collections.servicePrices, [
    Query.equal('ownerId', ownerId),
    Query.equal('serviceId', serviceId),
    Query.limit(1),
  ]);
  return result.documents.length > 0 ? result.documents[0].price : null;
}
