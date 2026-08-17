import { describe, it, expect } from '@jest/globals';
import {
  linearRegression,
  predictAt,
  forecastNextMonthTotal,
  computeDailyConsumptionRates,
  estimateStockRunout,
  computeWeightedDailyRates,
  projectDaysUntilEmpty,
  estimateStockRunoutWeighted,
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

describe('computeWeightedDailyRates', () => {
  const daysAgoISO = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  it('ignores records outside the lookback window', () => {
    const records = [{ serviceID: 'diamond_facial', quantity: 1, Date: daysAgoISO(100) }];
    expect(computeWeightedDailyRates(records, 60)).toEqual({});
  });

  it('weights recent usage more heavily than old usage of the same total size', () => {
    // diamond_facial uses CLEANSER 10g/service. 100g today + 100g 40 days
    // ago = 200g total either way, but a flat 60-day average (3.33g/day)
    // should undercount how much today's 100g actually matters.
    const records = [
      { serviceID: 'diamond_facial', quantity: 10, Date: daysAgoISO(0) },
      { serviceID: 'diamond_facial', quantity: 10, Date: daysAgoISO(40) },
    ];
    const rates = computeWeightedDailyRates(records, 60, 0.9);
    const flatAverage = 200 / 60;
    expect(rates.CLEANSER.rate).toBeGreaterThan(flatAverage);
  });

  it('reports a positive trend when this week\'s usage exceeds last week\'s', () => {
    const records = [
      { serviceID: 'diamond_facial', quantity: 5, Date: daysAgoISO(1) },  // this week: 50g
      { serviceID: 'diamond_facial', quantity: 1, Date: daysAgoISO(10) }, // prior week: 10g
    ];
    expect(computeWeightedDailyRates(records, 60).CLEANSER.trendPercent).toBeGreaterThan(0);
  });

  it('reports a negative trend when this week\'s usage is below last week\'s', () => {
    const records = [
      { serviceID: 'diamond_facial', quantity: 1, Date: daysAgoISO(1) },  // this week: 10g
      { serviceID: 'diamond_facial', quantity: 5, Date: daysAgoISO(10) }, // prior week: 50g
    ];
    expect(computeWeightedDailyRates(records, 60).CLEANSER.trendPercent).toBeLessThan(0);
  });

  it('treats fresh usage with no prior-week baseline as a 100% rise, not a divide-by-zero', () => {
    const records = [{ serviceID: 'diamond_facial', quantity: 1, Date: daysAgoISO(1) }];
    expect(computeWeightedDailyRates(records, 60).CLEANSER.trendPercent).toBe(100);
  });

  it('gives the weekday usage is concentrated on a multiplier above every other day', () => {
    const todayWeekday = new Date().getDay();
    // Every 7-day-back offset lands on the same weekday as today.
    const records = [];
    for (let d = 0; d <= 56; d += 7) {
      records.push({ serviceID: 'diamond_facial', quantity: 10, Date: daysAgoISO(d) });
    }
    const { weekdayMultipliers } = computeWeightedDailyRates(records, 60).CLEANSER;
    expect(weekdayMultipliers[todayWeekday]).toBeGreaterThan(1);
    weekdayMultipliers.forEach((m, wd) => {
      if (wd !== todayWeekday) expect(m).toBeLessThan(1);
    });
  });
});

describe('projectDaysUntilEmpty', () => {
  it('returns null when there is no measurable usage rate', () => {
    expect(projectDaysUntilEmpty(100, { rate: 0, weekdayMultipliers: Array(7).fill(1) })).toBeNull();
    expect(projectDaysUntilEmpty(100, null)).toBeNull();
  });

  it('returns 0 when already out of stock', () => {
    expect(projectDaysUntilEmpty(0, { rate: 5, weekdayMultipliers: Array(7).fill(1) })).toBe(0);
  });

  it('matches simple division when every day carries the same multiplier', () => {
    const rateInfo = { rate: 10, weekdayMultipliers: Array(7).fill(1) };
    expect(projectDaysUntilEmpty(100, rateInfo)).toBe(10);
  });

  it('depletes proportionally faster when the multiplier scales usage up', () => {
    const rateInfo = { rate: 10, weekdayMultipliers: Array(7).fill(2) };
    expect(projectDaysUntilEmpty(100, rateInfo)).toBe(5); // double daily usage -> half the days
  });
});

describe('estimateStockRunoutWeighted', () => {
  it('excludes products with no rate info', () => {
    const stockMap = { CLEANSER: { name: 'CLEANSER', remaining: 100, unit: 'g' } };
    expect(estimateStockRunoutWeighted(stockMap, {})).toEqual([]);
  });

  it('sorts soonest-to-run-out first and carries trendPercent through', () => {
    const stockMap = {
      SLOW: { name: 'SLOW', remaining: 1000, unit: 'g' },
      FAST: { name: 'FAST', remaining: 10, unit: 'g' },
    };
    const flat = Array(7).fill(1);
    const rates = {
      SLOW: { rate: 1, trendPercent: 5, weekdayMultipliers: flat },
      FAST: { rate: 5, trendPercent: -10, weekdayMultipliers: flat },
    };
    const result = estimateStockRunoutWeighted(stockMap, rates);
    expect(result.map((r) => r.name)).toEqual(['FAST', 'SLOW']);
    expect(result[0].daysUntilEmpty).toBe(2);
    expect(result[0].trendPercent).toBe(-10);
  });
});
