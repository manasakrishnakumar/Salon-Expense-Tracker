import { ALL_SERVICES } from '../data/servicesCatalog.js';
import { findService, parseQuantityAmount } from './costCalculator.js';

const DEFAULT_LOW_STOCK_THRESHOLD = 100;

/**
 * Stock isn't stored as a mutable counter anywhere — it's derived, on
 * demand, from the full history of restocks minus the full history of
 * service records (ported from the original client-side StockContext
 * useMemo, now server-side and unit-testable in isolation).
 *
 * Building it here rather than trusting a client-computed number means a
 * buggy/tampered client can no longer misreport what's left on the shelf.
 */

/**
 * Every distinct product referenced anywhere in the service catalog,
 * with a guessed unit (ml/g/pcs) and a default low-stock threshold.
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
 * @param {Array} restockDocs - restock_history documents ({ productName, quantityAdded, purchasePrice, ... })
 * @param {Array} serviceRecordDocs - service_record documents ({ serviceID, quantity, ... })
 * @param {Array} catalog - service catalog (defaults to the canonical one)
 * @returns {Record<string, object>} keyed by product name
 */
export function computeStockStatus(restockDocs = [], serviceRecordDocs = [], catalog = ALL_SERVICES) {
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

  const result = {};
  productsMaster.forEach((product) => {
    const key = product.name;
    const totalRestocked = restocked[key] || 0;
    const totalUsed = used[key] || 0;
    const remaining = Math.max(0, totalRestocked - totalUsed);
    result[key] = {
      ...product,
      totalRestocked,
      totalUsed,
      remaining,
      isLowStock: totalRestocked > 0 && remaining < product.lowStockThreshold,
      neverRestocked: totalRestocked === 0,
      usedPercent: totalRestocked > 0 ? Math.min(100, Math.round((totalUsed / totalRestocked) * 100)) : 0,
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
