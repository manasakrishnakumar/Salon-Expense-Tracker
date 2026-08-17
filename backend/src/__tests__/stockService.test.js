import { describe, it, expect } from '@jest/globals';
import { computeStockStatus, getLowStockProducts, getTotalInventoryValue, computeReorderSuggestions } from '../logic/stockService.js';

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

describe('computeReorderSuggestions', () => {
  const daysAgoISO = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  it('skips products that were never restocked or never used', () => {
    const stockMap = {
      NEVER: { name: 'NEVER', unit: 'g', remaining: 0, totalUsed: 0, totalAdjusted: 0, neverRestocked: true },
      UNUSED: { name: 'UNUSED', unit: 'g', remaining: 500, totalUsed: 0, totalAdjusted: 0, neverRestocked: false },
    };
    expect(computeReorderSuggestions(stockMap, [], [])).toEqual([]);
  });

  it('uses the weighted daily rate (not a flat average) when service-record history is available', () => {
    // diamond_facial -> CLEANSER 10g/service, all of it "today" — the
    // weighted rate should sit well above a flat 60-day average of the
    // same total (200g / 60 days).
    const serviceRecordDocs = [
      { serviceID: 'diamond_facial', quantity: 20, Date: daysAgoISO(0) },
    ];
    const stockMap = {
      CLEANSER: { name: 'CLEANSER', unit: 'g', remaining: 500, totalUsed: 200, totalAdjusted: 0, neverRestocked: false },
    };
    const [suggestion] = computeReorderSuggestions(stockMap, [], serviceRecordDocs, 60);
    expect(suggestion.name).toBe('CLEANSER');
    expect(suggestion.dailyUsage).toBeGreaterThan(200 / 60);
    expect(suggestion.trendPercent).toBe(100); // nothing in the prior week to compare against
  });

  it('falls back to the flat totalUsed/days average when there is no day-level service-record data', () => {
    const stockMap = {
      CLEANSER: { name: 'CLEANSER', unit: 'g', remaining: 500, totalUsed: 300, totalAdjusted: 0, neverRestocked: false },
    };
    const restockDocs = [{ productName: 'CLEANSER', date: daysAgoISO(30) }];
    // No serviceRecordDocs -> the weighted model has nothing to build a rate from.
    const [suggestion] = computeReorderSuggestions(stockMap, restockDocs, [], 60);
    expect(suggestion.dailyUsage).toBeCloseTo(300 / 30, 1);
  });

  it('assigns urgency tiers from projected days until empty', () => {
    // Usage spread one-per-weekday so the seasonality multiplier stays
    // roughly flat across every day (avoids a single-weekday usage spike
    // making the projection depend on which day the test happens to run).
    const serviceRecordDocs = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
      serviceID: 'diamond_facial', quantity: 50, Date: daysAgoISO(d),
    }));
    const stockMap = {
      CLEANSER: { name: 'CLEANSER', unit: 'g', remaining: 5, totalUsed: 3500, totalAdjusted: 0, neverRestocked: false },
    };
    const [suggestion] = computeReorderSuggestions(stockMap, [], serviceRecordDocs, 60);
    expect(suggestion.urgency).toBe('critical');
  });
});
