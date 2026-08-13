import { describe, it, expect } from '@jest/globals';
import {
  linearRegression,
  predictAt,
  forecastNextMonthTotal,
  computeDailyConsumptionRates,
  estimateStockRunout,
} from '../logic/forecast.js';

describe('linearRegression', () => {
  it('fits a perfect line exactly', () => {
    // y = 2x + 1
    const points = [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }];
    const { slope, intercept } = linearRegression(points);
    expect(slope).toBeCloseTo(2);
    expect(intercept).toBeCloseTo(1);
    expect(predictAt({ slope, intercept }, 4)).toBeCloseTo(9);
  });

  it('falls back to the flat average when there is only one point', () => {
    const { slope, intercept } = linearRegression([{ x: 5, y: 42 }]);
    expect(slope).toBe(0);
    expect(intercept).toBe(42);
  });

  it('does not divide by zero when every x is identical', () => {
    const points = [{ x: 1, y: 10 }, { x: 1, y: 20 }, { x: 1, y: 30 }];
    const { slope, intercept } = linearRegression(points);
    expect(slope).toBe(0);
    expect(intercept).toBe(20); // average of 10, 20, 30
  });
});

describe('forecastNextMonthTotal', () => {
  it('reports insufficient-data with no history at all', () => {
    const result = forecastNextMonthTotal([], 'date', 'amount');
    expect(result).toEqual({ history: [], predictedNextMonth: 0, method: 'insufficient-data' });
  });

  it('uses a naive last-month carry-forward with under 3 months of history', () => {
    const records = [
      { date: '2026-06-15', amount: 1000 },
      { date: '2026-07-10', amount: 1500 },
    ];
    const result = forecastNextMonthTotal(records, 'date', 'amount');
    expect(result.method).toBe('naive-last-month');
    expect(result.predictedNextMonth).toBe(1500);
  });

  it('fits a trend line once there are at least 3 months of history', () => {
    // Clear upward trend: 1000 -> 2000 -> 3000, expect ~4000 next
    const records = [
      { date: '2026-05-01', amount: 1000 },
      { date: '2026-06-01', amount: 2000 },
      { date: '2026-07-01', amount: 3000 },
    ];
    const result = forecastNextMonthTotal(records, 'date', 'amount');
    expect(result.method).toBe('linear-regression');
    expect(result.predictedNextMonth).toBeCloseTo(4000, 0);
  });

  it('never predicts a negative total even on a sharp downward trend', () => {
    const records = [
      { date: '2026-05-01', amount: 100 },
      { date: '2026-06-01', amount: 50 },
      { date: '2026-07-01', amount: 0 },
    ];
    const result = forecastNextMonthTotal(records, 'date', 'amount');
    expect(result.predictedNextMonth).toBeGreaterThanOrEqual(0);
  });
});

describe('computeDailyConsumptionRates', () => {
  it('ignores records outside the lookback window', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);
    const records = [{ serviceID: 'diamond_facial', quantity: 1, Date: oldDate.toISOString() }];
    const rates = computeDailyConsumptionRates(records, 30);
    expect(rates).toEqual({});
  });

  it('averages recent usage over the lookback window', () => {
    const today = new Date().toISOString();
    // diamond_facial uses CLEANSER 10g — 3 records within window = 30g over 30 days = 1g/day
    const records = [
      { serviceID: 'diamond_facial', quantity: 1, Date: today },
      { serviceID: 'diamond_facial', quantity: 1, Date: today },
      { serviceID: 'diamond_facial', quantity: 1, Date: today },
    ];
    const rates = computeDailyConsumptionRates(records, 30);
    expect(rates.CLEANSER).toBeCloseTo(1, 5);
  });
});

describe('estimateStockRunout', () => {
  it('excludes products with no measurable consumption rate', () => {
    const stockMap = { CLEANSER: { name: 'CLEANSER', remaining: 100, unit: 'g' } };
    expect(estimateStockRunout(stockMap, {})).toEqual([]);
  });

  it('sorts soonest-to-run-out first', () => {
    const stockMap = {
      SLOW: { name: 'SLOW', remaining: 1000, unit: 'g' },
      FAST: { name: 'FAST', remaining: 10, unit: 'g' },
    };
    const rates = { SLOW: 1, FAST: 5 }; // SLOW: 1000 days out, FAST: 2 days out
    const result = estimateStockRunout(stockMap, rates);
    expect(result.map((r) => r.name)).toEqual(['FAST', 'SLOW']);
    expect(result[0].daysUntilEmpty).toBe(2);
  });
});
