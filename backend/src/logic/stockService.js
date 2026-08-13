import { ALL_SERVICES } from '../data/servicesCatalog.js';
import { findService, parseQuantityAmount } from './costCalculator.js';

const DEFAULT_LOW_STOCK_THRESHOLD = 100;

/**
 * Stock isn't stored as a mutable counter anywhere — it's derived, on
 * demand, from the full history of restocks minus the full history of
 * service records (ported from the original client-side StockContext
 * useMemo, now server-side and unit-testable in isolation).
 *
 * Phase 5: Also subtracts stock_adjustments (wastage/theft/expiry).
 */

export function buildProductMaster(catalog = ALL_SERVICES) {
  const map = new Map();
  catalog.forEach((service) => {
    (service.products || []).forEach((p) => {
      const key = p.name.toUpperCase().trim();
      if (!map.has(key)) {
        const unit = /ml/i.test(p.quantity) ? 'ml' : /g\b/i.test(p.quantity) ? 'g' : 'pcs';
        map.set(key, { name: key, unit, lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD });
      }
    });
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * @param {Array} restockDocs
 * @param {Array} serviceRecordDocs
 * @param {Array} [catalog]
 * @param {Array} [adjustmentDocs] - Phase 5: stock write-offs / wastage
 * @returns {Record<string, object>} keyed by product name
 */
export function computeStockStatus(
  restockDocs = [],
  serviceRecordDocs = [],
  catalog = ALL_SERVICES,
  adjustmentDocs = []
) {
  const productsMaster = buildProductMaster(catalog);

  const restocked = {};
  restockDocs.forEach((r) => {
    const key = String(r.productName || '').toUpperCase().trim();
    restocked[key] = (restocked[key] || 0) + (Number(r.quantityAdded) || 0);
  });

  const used = {};
  serviceRecordDocs.forEach((record) => {
    const service = findService(record.serviceID) || catalog.find((s) => s.id === record.serviceID);
    if (!service) return;
    const qty = Number(record.quantity) || 1;
    (service.products || []).forEach((p) => {
      const key = p.name.toUpperCase().trim();
      const perService = parseQuantityAmount(p.quantity);
      used[key] = (used[key] || 0) + perService * qty;
    });
  });

  // Phase 5: Subtract stock adjustments (wastage, theft, expiry, etc.)
  const adjusted = {};
  adjustmentDocs.forEach((a) => {
    const key = String(a.productName || '').toUpperCase().trim();
    adjusted[key] = (adjusted[key] || 0) + (Number(a.quantityRemoved) || 0);
  });

  const result = {};
  productsMaster.forEach((product) => {
    const key = product.name;
    const totalRestocked = restocked[key] || 0;
    const totalUsed = used[key] || 0;
    const totalAdjusted = adjusted[key] || 0;
    const remaining = Math.max(0, totalRestocked - totalUsed - totalAdjusted);
    result[key] = {
      ...product,
      totalRestocked,
      totalUsed,
      totalAdjusted,
      remaining,
      isLowStock: totalRestocked > 0 && remaining < product.lowStockThreshold,
      neverRestocked: totalRestocked === 0,
      usedPercent: totalRestocked > 0 ? Math.min(100, Math.round(((totalUsed + totalAdjusted) / totalRestocked) * 100)) : 0,
    };
  });
  return result;
}

export function getLowStockProducts(stockMap) {
  return Object.values(stockMap).filter((p) => p.isLowStock);
}

export function getNeverRestockedProducts(stockMap) {
  return Object.values(stockMap).filter((p) => p.neverRestocked);
}

export function getTotalInventoryValue(restockDocs = []) {
  return restockDocs.reduce((sum, r) => sum + (Number(r.purchasePrice) || 0), 0);
}

/**
 * Phase 5 — I5: Reorder suggestions.
 * Computes average daily usage over the last N days, then recommends
 * a 30-day reorder quantity for each product that is in use.
 *
 * @param {object} stockMap - output of computeStockStatus
 * @param {Array}  restockDocs - to determine when first restock happened
 * @param {number} lookbackDays - how far back to compute the rate (default 60)
 * @returns {Array} sorted by urgency (days until empty)
 */
export function computeReorderSuggestions(stockMap, restockDocs = [], lookbackDays = 60) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  // Find first restock date per product
  const firstRestock = {};
  restockDocs.forEach((r) => {
    const key = String(r.productName || '').toUpperCase().trim();
    const d = r.date ? new Date(r.date) : null;
    if (!d) return;
    if (!firstRestock[key] || d < firstRestock[key]) firstRestock[key] = d;
  });

  const suggestions = [];

  Object.values(stockMap).forEach((product) => {
    if (product.neverRestocked || product.totalUsed === 0) return;

    const start = firstRestock[product.name] || cutoff;
    const daysSinceStart = Math.max(1, Math.round((Date.now() - start.getTime()) / 86400000));
    const effectiveDays = Math.min(daysSinceStart, lookbackDays);
    const dailyUsage = (product.totalUsed + product.totalAdjusted) / effectiveDays;

    if (dailyUsage <= 0) return;

    const daysUntilEmpty = product.remaining > 0 ? Math.floor(product.remaining / dailyUsage) : 0;
    const suggestedReorderQty = Math.ceil(dailyUsage * 30); // 30-day supply

    let urgency = 'ok';
    if (daysUntilEmpty <= 3) urgency = 'critical';
    else if (daysUntilEmpty <= 7) urgency = 'high';
    else if (daysUntilEmpty <= 14) urgency = 'medium';

    suggestions.push({
      name: product.name,
      unit: product.unit,
      remaining: product.remaining,
      dailyUsage: Math.round(dailyUsage * 10) / 10,
      daysUntilEmpty,
      suggestedReorderQty,
      urgency,
    });
  });

  // Sort: critical first, then by fewest days until empty
  return suggestions.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, ok: 3 };
    return (order[a.urgency] - order[b.urgency]) || (a.daysUntilEmpty - b.daysUntilEmpty);
  });
}
