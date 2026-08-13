import { describe, it, expect } from '@jest/globals';
import { computeStockStatus, getLowStockProducts, getTotalInventoryValue } from '../logic/stockService.js';

const catalog = [
  {
    id: 'svc_a',
    name: 'SERVICE A',
    cost: 100,
    products: [{ name: 'CLEANSER', quantity: '10g', cost: 10 }],
  },
];

describe('computeStockStatus', () => {
  it('treats a product with no restock history as never restocked, not low stock', () => {
    const status = computeStockStatus([], [], catalog);
    expect(status.CLEANSER.neverRestocked).toBe(true);
    expect(status.CLEANSER.isLowStock).toBe(false); // can't be "low" if it was never stocked at all
  });

  it('deducts consumption from restocked quantity', () => {
    const restock = [{ productName: 'cleanser', quantityAdded: 500 }];
    const records = [{ serviceID: 'svc_a', quantity: 3 }]; // uses 10g x3 = 30g
    const status = computeStockStatus(restock, records, catalog);
    expect(status.CLEANSER.totalRestocked).toBe(500);
    expect(status.CLEANSER.totalUsed).toBe(30);
    expect(status.CLEANSER.remaining).toBe(470);
  });

  it('flags low stock once remaining drops under the threshold', () => {
    const restock = [{ productName: 'CLEANSER', quantityAdded: 100 }];
    const records = [{ serviceID: 'svc_a', quantity: 5 }]; // uses 10g x5 = 50g, remaining 50 < threshold 100
    const status = computeStockStatus(restock, records, catalog);
    expect(status.CLEANSER.remaining).toBe(50);
    expect(status.CLEANSER.isLowStock).toBe(true);
    expect(getLowStockProducts(status)).toHaveLength(1);
  });

  it('never lets remaining stock go negative even if usage outpaces restock', () => {
    const restock = [{ productName: 'CLEANSER', quantityAdded: 10 }];
    const records = [{ serviceID: 'svc_a', quantity: 5 }]; // would-be usage 50g > 10g restocked
    const status = computeStockStatus(restock, records, catalog);
    expect(status.CLEANSER.remaining).toBe(0);
  });

  it('ignores service records referencing an unknown serviceID instead of crashing', () => {
    const records = [{ serviceID: 'does_not_exist', quantity: 5 }];
    expect(() => computeStockStatus([], records, catalog)).not.toThrow();
  });
});

describe('getTotalInventoryValue', () => {
  it('sums purchase price across restock history', () => {
    const restock = [{ purchasePrice: 100 }, { purchasePrice: 250.5 }, {}];
    expect(getTotalInventoryValue(restock)).toBe(350.5);
  });
});
