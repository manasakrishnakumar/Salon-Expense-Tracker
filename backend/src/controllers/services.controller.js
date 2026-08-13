import { ALL_SERVICES, getServicesByCategory } from '../data/servicesCatalog.js';
import { databases, Query, ID } from '../config/appwrite.js';
import { env } from '../config/env.js';
import { mergeCatalogWithPrices, sanitizeServiceForRole } from '../logic/pricing.js';
import { HttpError } from '../middleware/errorHandler.js';

async function loadOwnerPrices(ownerId) {
  const result = await databases.listDocuments(env.appwrite.databaseId, env.collections.servicePrices, [
    Query.equal('ownerId', ownerId),
    Query.limit(500),
  ]);
  return result.documents;
}

export async function listServices(req, res) {
  const { category } = req.query;
  const base = category ? getServicesByCategory(category) : ALL_SERVICES;

  const priceDocs = await loadOwnerPrices(req.user.ownerId);
  const priced = mergeCatalogWithPrices(base, priceDocs);
  const services = priced.map((s) => sanitizeServiceForRole(s, req.user.role));

  res.json({ services, count: services.length });
}

export async function getServiceHandler(req, res) {
  const service = ALL_SERVICES.find((s) => s.id === req.params.id);
  if (!service) throw new HttpError(404, 'Service not found');

  const priceDocs = await loadOwnerPrices(req.user.ownerId);
  const [priced] = mergeCatalogWithPrices([service], priceDocs);
  res.json({ service: sanitizeServiceForRole(priced, req.user.role) });
}

// Owner-only at the route level.
export async function setPrice(req, res) {
  const { id } = req.params;
  const { price } = req.body;

  if (!ALL_SERVICES.some((s) => s.id === id)) {
    throw new HttpError(404, 'Service not found in catalog');
  }

  const updated = await upsertPrice(req.user.ownerId, id, price);
  res.json({ price: updated });
}

export async function setPricesBulk(req, res) {
  const { prices } = req.body;
  const validIds = new Set(ALL_SERVICES.map((s) => s.id));
  const unknown = prices.find((p) => !validIds.has(p.serviceId));
  if (unknown) throw new HttpError(404, `Service not found in catalog: ${unknown.serviceId}`);

  const results = [];
  for (const { serviceId, price } of prices) {
    results.push(await upsertPrice(req.user.ownerId, serviceId, price));
  }
  res.json({ prices: results, count: results.length });
}

async function upsertPrice(ownerId, serviceId, price) {
  const existing = await databases.listDocuments(env.appwrite.databaseId, env.collections.servicePrices, [
    Query.equal('ownerId', ownerId),
    Query.equal('serviceId', serviceId),
    Query.limit(1),
  ]);

  if (existing.documents.length > 0) {
    return databases.updateDocument(
      env.appwrite.databaseId,
      env.collections.servicePrices,
      existing.documents[0].$id,
      { price }
    );
  }
  return databases.createDocument(env.appwrite.databaseId, env.collections.servicePrices, ID.unique(), {
    ownerId,
    serviceId,
    price,
  });
}
