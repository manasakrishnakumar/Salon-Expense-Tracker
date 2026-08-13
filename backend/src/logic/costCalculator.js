import { ALL_SERVICES } from '../data/servicesCatalog.js';

/**
 * All cost math lives here, server-side, against the canonical catalog —
 * never trust a unitCost/totalCost sent by a client. A client can ask to
 * record "DIAMOND FACIAL x2"; it cannot tell us what that costs.
 */

export function findService(serviceId) {
  return ALL_SERVICES.find((s) => s.id === serviceId) || null;
}

/**
 * @param {object} service - a catalog entry (from findService)
 * @param {number} quantity - how many times the service was performed
 * @returns {{ unitCost: number, totalCost: number }}
 */
export function calculateServiceCost(service, quantity) {
  const qty = Number(quantity) || 1;
  const unitCost = typeof service.cost === 'number' ? service.cost : 0;
  const totalCost = Math.round(unitCost * qty * 100) / 100;
  return { unitCost, totalCost };
}

/**
 * Parses a quantity string like "10g" / "5ml" into a plain number, the same
 * way the original client-side StockContext did.
 */
export function parseQuantityAmount(qtyStr) {
  const num = parseFloat(qtyStr);
  return Number.isNaN(num) ? 1 : num;
}

/**
 * How much of each product a given number of this service consumes.
 * @returns {Array<{ name: string, perServiceQty: number, totalQty: number, unit: string }>}
 */
export function getProductsConsumed(service, quantity) {
  const qty = Number(quantity) || 1;
  return (service.products || []).map((p) => {
    const perServiceQty = parseQuantityAmount(p.quantity);
    const unit = /ml/i.test(p.quantity) ? 'ml' : /g\b/i.test(p.quantity) ? 'g' : 'pcs';
    return {
      name: p.name.toUpperCase().trim(),
      perServiceQty,
      totalQty: Math.round(perServiceQty * qty * 1000) / 1000,
      unit,
    };
  });
}
