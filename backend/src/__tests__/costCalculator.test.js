import { describe, it, expect } from '@jest/globals';
import { findService, calculateServiceCost, getProductsConsumed } from '../logic/costCalculator.js';

describe('findService', () => {
  it('finds a known service by id', () => {
    const service = findService('diamond_facial');
    expect(service).not.toBeNull();
    expect(service.name).toBe('DIAMOND FACIAL');
  });

  it('returns null for an unknown id', () => {
    expect(findService('does_not_exist')).toBeNull();
  });
});

describe('calculateServiceCost', () => {
  it('multiplies unit cost by quantity', () => {
    const service = findService('diamond_facial'); // cost: 139.7
    expect(calculateServiceCost(service, 1)).toEqual({ unitCost: 139.7, totalCost: 139.7 });
    expect(calculateServiceCost(service, 3)).toEqual({ unitCost: 139.7, totalCost: 419.1 });
  });

  it('defaults quantity to 1 when missing/invalid', () => {
    const service = findService('diamond_facial');
    expect(calculateServiceCost(service, undefined).totalCost).toBe(139.7);
    expect(calculateServiceCost(service, 'not-a-number').totalCost).toBe(139.7);
  });

  it('treats a service with no cost data (cost: null) as zero cost, not a crash', () => {
    // All 83 catalog entries are costed today, but the shape is still
    // supported defensively — e.g. a newly added service before its
    // product-usage data has been entered.
    const uncostedService = { id: 'placeholder', cost: null, products: [] };
    expect(calculateServiceCost(uncostedService, 2)).toEqual({ unitCost: 0, totalCost: 0 });
  });
});

describe('getProductsConsumed', () => {
  it('scales each product quantity by the number of services performed', () => {
    const service = findService('diamond_facial');
    const consumed = getProductsConsumed(service, 2);
    const cleanser = consumed.find((p) => p.name === 'CLEANSER');
    expect(cleanser).toMatchObject({ perServiceQty: 10, totalQty: 20, unit: 'g' });
  });
});
