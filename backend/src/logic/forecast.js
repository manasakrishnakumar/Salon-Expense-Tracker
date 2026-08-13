import { findService, getProductsConsumed } from './costCalculator.js';

/**
 * Ordinary least-squares fit over {x, y} points. x is just a period index
 * (0, 1, 2, ...) — we're trending "this month vs last" not calendar time.
 */
export function linearRegression(points) {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y };

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n }; // all same x — flat average

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function predictAt(regression, x) {
  return regression.slope * x + regression.intercept;
}

/** Sums `valueField` per calendar month ('YYYY-MM') from `dateField`. */
export function bucketByMonth(records, dateField, valueField) {
  const buckets = {};
  records.forEach((r) => {
    const raw = r[dateField];
    if (!raw) return;
    const key = String(raw).slice(0, 7);
    buckets[key] = (buckets[key] || 0) + (Number(r[valueField]) || 0);
  });
  return buckets;
}

/**
 * Projects next month's total from monthly history. With fewer than 3
 * months of data a trend line isn't meaningful yet, so it falls back to
 * "same as last month" rather than pretending to extrapolate a trend from
 * noise.
 */
export function forecastNextMonthTotal(records, dateField, valueField) {
  const buckets = bucketByMonth(records, dateField, valueField);
  const keys = Object.keys(buckets).sort();
  const history = keys.map((k) => ({ month: k, total: Math.round(buckets[k] * 100) / 100 }));

  if (keys.length === 0) {
    return { history, predictedNextMonth: 0, method: 'insufficient-data' };
  }
  if (keys.length < 3) {
    const last = buckets[keys[keys.length - 1]];
    return { history, predictedNextMonth: Math.round(last * 100) / 100, method: 'naive-last-month' };
  }

  const points = keys.map((k, i) => ({ x: i, y: buckets[k] }));
  const regression = linearRegression(points);
  const predicted = Math.max(0, predictAt(regression, keys.length));
  return { history, predictedNextMonth: Math.round(predicted * 100) / 100, method: 'linear-regression' };
}

/**
 * Average daily usage per product over the last `lookbackDays`, from
 * service records (not from restock history — this is about consumption
 * rate, independent of how much happens to be on the shelf right now).
 */
export function computeDailyConsumptionRates(serviceRecords, lookbackDays = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  const totals = {};
  serviceRecords.forEach((record) => {
    const recordDate = new Date(record.Date);
    if (Number.isNaN(recordDate.getTime()) || recordDate < cutoff) return;
    const service = findService(record.serviceID);
    if (!service) return;
    getProductsConsumed(service, record.quantity).forEach((p) => {
      totals[p.name] = (totals[p.name] || 0) + p.totalQty;
    });
  });

  const rates = {};
  Object.entries(totals).forEach(([name, total]) => {
    rates[name] = total / lookbackDays;
  });
  return rates;
}

/**
 * Given the current stock map (logic/stockService.js) and consumption
 * rates, estimates days until each product runs out — soonest first.
 * Products with no measurable recent usage are excluded (an infinite
 * runway isn't an alert).
 */
export function estimateStockRunout(stockStatusMap, dailyRates) {
  return Object.values(stockStatusMap)
    .map((product) => {
      const rate = dailyRates[product.name] || 0;
      const daysUntilEmpty = rate > 0 ? product.remaining / rate : null;
      return {
        name: product.name,
        remaining: product.remaining,
        unit: product.unit,
        dailyConsumptionRate: Math.round(rate * 1000) / 1000,
        daysUntilEmpty: daysUntilEmpty === null ? null : Math.round(daysUntilEmpty),
      };
    })
    .filter((p) => p.daysUntilEmpty !== null)
    .sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);
}
