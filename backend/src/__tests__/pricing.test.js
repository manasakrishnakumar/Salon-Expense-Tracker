import { describe, it, expect } from '@jest/globals';
import { mergeCatalogWithPrices, calculateServicePrice, sanitizeServiceForRole } from '../logic/pricing.js';

const catalog = [
  { id: 'diamond_facial', name: 'DIAMOND FACIAL', cost: 139.7, products: [{ name: 'CLEANSER', quantity: '10g', cost: 15 }] },
  { id: 'hair_cut', name: 'HAIR CUT', cost: 6.5, products: [] },
];

describe('mergeCatalogWithPrices', () => {
  it('attaches null price for a service the owner has never priced', () => {
    const merged = mergeCatalogWithPrices(catalog, []);
    expect(merged.find((s) => s.id === 'diamond_facial').price).toBeNull();
  });

  it('attaches the owner-specific price when one exists', () => {
    const priceDocs = [{ serviceId: 'diamond_facial', price: 400 }];
    const merged = mergeCatalogWithPrices(catalog, priceDocs);
    expect(merged.find((s) => s.id === 'diamond_facial').price).toBe(400);
    expect(merged.find((s) => s.id === 'hair_cut').price).toBeNull();
  });
});

describe('calculateServicePrice', () => {
  it('multiplies price by quantity', () => {
    expect(calculateServicePrice(400, 2)).toEqual({ unitPrice: 400, totalPrice: 800 });
  });

  it('treats an unset (null) price as zero rather than crashing', () => {
    expect(calculateServicePrice(null, 3)).toEqual({ unitPrice: 0, totalPrice: 0 });
  });
});

describe('sanitizeServiceForRole', () => {
  it('leaves the service untouched for an owner', () => {
    const service = catalog[0];
    expect(sanitizeServiceForRole(service, 'owner')).toBe(service);
  });

  it('strips cost (service-level and per-product) for a worker', () => {
    const sanitized = sanitizeServiceForRole(catalog[0], 'worker');
    expect(sanitized.cost).toBeUndefined();
    expect(sanitized.products[0]).toEqual({ name: 'CLEANSER', quantity: '10g' });
    expect(sanitized.products[0].cost).toBeUndefined();
    // Everything else (name, id) is preserved.
    expect(sanitized.name).toBe('DIAMOND FACIAL');
  });
});
