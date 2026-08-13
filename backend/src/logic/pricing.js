/**
 * `cost` (from the catalog) is what a service costs the salon in product
 * usage — never shown to a customer. `price` is what the salon charges a
 * customer for it, and is deliberately NOT part of the shared catalog:
 * two salons running this same codebase would charge different prices for
 * an identical DIAMOND FACIAL, so price is per-owner data (the
 * service_prices collection), not a code constant like cost is.
 *
 * Before this, the app had no price concept at all — "Revenue" on the
 * Analysis page was actually just summing `cost`, which is a materially
 * different number than what a customer was charged.
 */

/** Merges each catalog entry with this owner's price for it, if they've set one. */
export function mergeCatalogWithPrices(catalog, priceDocs) {
  const priceByServiceId = {};
  priceDocs.forEach((p) => {
    priceByServiceId[p.serviceId] = p.price;
  });
  return catalog.map((service) => ({
    ...service,
    price: priceByServiceId[service.id] ?? null,
  }));
}

/**
 * @param {number|null} price - this owner's price for the service, or null if unset
 * @param {number} quantity
 */
export function calculateServicePrice(price, quantity) {
  const qty = Number(quantity) || 1;
  const unitPrice = typeof price === 'number' ? price : 0;
  const totalPrice = Math.round(unitPrice * qty * 100) / 100;
  return { unitPrice, totalPrice };
}

/**
 * Strips cost/margin data from a service before it reaches a worker — a
 * worker needs to know what to charge (price) and what's used (product
 * names/quantities), not what it costs the salon or the margin on it.
 * Applied at the API boundary (services.controller.js), not just hidden in
 * the UI, so the numbers are never in the response body a worker receives.
 */
export function sanitizeServiceForRole(service, role) {
  if (role !== 'worker') return service;
  const { cost, ...rest } = service;
  return {
    ...rest,
    products: (service.products || []).map((p) => ({ name: p.name, quantity: p.quantity })),
  };
}
