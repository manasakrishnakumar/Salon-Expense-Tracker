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

/**
 * ── Weighted demand forecasting ──────────────────────────────────────────
 *
 * computeDailyConsumptionRates() above treats every day in the lookback
 * window as equally informative — a flat average. Two ways that's naive
 * for a real salon:
 *
 *  1. A product's usage pattern *changes* (a service got popular, a
 *     product got swapped) — a day from three weeks ago shouldn't count as
 *     much as yesterday. We fix this with exponential decay: each day's
 *     usage is weighted by `decay^daysAgo`, so recent days dominate the
 *     rate without discarding older data outright.
 *
 *  2. Usage isn't flat across the week — a salon's Saturday is not its
 *     Tuesday. We fix this by computing a per-weekday multiplier (that
 *     weekday's average usage ÷ the overall average) and using it to
 *     project each *future* day individually instead of assuming every
 *     day between now and empty looks like an average day.
 *
 * Both pieces are plain weighted averages — no external ML library or
 * service needed — but together they're materially more accurate than a
 * flat mean, and they surface a "usage rising/falling X% this week" signal
 * a flat average can't produce at all.
 */

/**
 * @param {Array} serviceRecordDocs
 * @param {number} lookbackDays - how far back to build the model from
 * @param {number} decay - per-day decay factor (0-1); 1 = flat average, lower = more recency-biased
 * @returns {Record<string, { rate: number, trendPercent: number, weekdayMultipliers: number[] }>}
 *          weekdayMultipliers is indexed 0=Sunday..6=Saturday
 */
export function computeWeightedDailyRates(serviceRecordDocs, lookbackDays = 60, decay = 0.9) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  // Bucket usage by exact calendar day per product, instead of one grand total.
  const dailyUsageByProduct = {};
  serviceRecordDocs.forEach((record) => {
    const recordDate = new Date(record.Date);
    if (Number.isNaN(recordDate.getTime()) || recordDate < cutoff) return;
    const service = findService(record.serviceID);
    if (!service) return;
    const dateKey = recordDate.toISOString().split('T')[0];
    getProductsConsumed(service, record.quantity).forEach((p) => {
      if (!dailyUsageByProduct[p.name]) dailyUsageByProduct[p.name] = {};
      dailyUsageByProduct[p.name][dateKey] = (dailyUsageByProduct[p.name][dateKey] || 0) + p.totalQty;
    });
  });

  const result = {};
  for (const [productName, dayMap] of Object.entries(dailyUsageByProduct)) {
    let weightedSum = 0;
    let weightTotal = 0;
    let overallTotal = 0;
    const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
    let recentWeek = 0;
    let priorWeek = 0;

    for (let d = 0; d < lookbackDays; d++) {
      const day = new Date(now);
      day.setDate(day.getDate() - d);
      const key = day.toISOString().split('T')[0];
      const qty = dayMap[key] || 0;
      const weight = decay ** d;

      weightedSum += qty * weight;
      weightTotal += weight;
      overallTotal += qty;

      const wd = day.getDay();
      weekdayTotals[wd] += qty;
      weekdayCounts[wd] += 1;

      if (d < 7) recentWeek += qty;
      else if (d < 14) priorWeek += qty;
    }

    const weightedRate = weightTotal > 0 ? weightedSum / weightTotal : 0;
    const overallDailyAvg = overallTotal / lookbackDays;
    const weekdayMultipliers = weekdayTotals.map((total, i) => {
      if (overallDailyAvg <= 0 || weekdayCounts[i] === 0) return 1;
      const avgForThisWeekday = total / weekdayCounts[i];
      return avgForThisWeekday / overallDailyAvg;
    });

    // Week-over-week trend, as a signed percentage. With no usage in the
    // prior week we can't express a ratio — treat any usage this week as
    // "new" (100%) rather than dividing by zero.
    const trendPercent = priorWeek > 0
      ? Math.round(((recentWeek - priorWeek) / priorWeek) * 100)
      : (recentWeek > 0 ? 100 : 0);

    result[productName] = { rate: weightedRate, trendPercent, weekdayMultipliers };
  }
  return result;
}

/**
 * Projects forward day by day — applying that weekday's seasonality
 * multiplier to each future day — until remaining stock is used up, rather
 * than the flat-average `remaining / rate` division. Two products with the
 * identical average rate but different weekly shapes (steady vs
 * weekend-heavy) can legitimately run out on different days; this is what
 * makes that visible.
 *
 * @param {number} remaining
 * @param {{ rate: number, weekdayMultipliers: number[] }} rateInfo
 * @param {number} maxDays - safety cap so a near-zero rate can't loop forever
 * @returns {number|null} days from today, or null if there's no measurable usage
 */
export function projectDaysUntilEmpty(remaining, rateInfo, maxDays = 365) {
  if (!rateInfo || rateInfo.rate <= 0) return null;
  if (remaining <= 0) return 0;

  let stock = remaining;
  const now = new Date();
  for (let d = 1; d <= maxDays; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const multiplier = rateInfo.weekdayMultipliers[day.getDay()] ?? 1;
    stock -= rateInfo.rate * multiplier;
    if (stock <= 0) return d;
  }
  return maxDays;
}

/**
 * Weighted counterpart to estimateStockRunout() — same shape of output,
 * plus `trendPercent`, computed from computeWeightedDailyRates() instead
 * of a flat per-day average.
 */
export function estimateStockRunoutWeighted(stockStatusMap, weightedRates) {
  return Object.values(stockStatusMap)
    .map((product) => {
      const rateInfo = weightedRates[product.name];
      const daysUntilEmpty = rateInfo ? projectDaysUntilEmpty(product.remaining, rateInfo) : null;
      return {
        name: product.name,
        remaining: product.remaining,
        unit: product.unit,
        dailyConsumptionRate: rateInfo ? Math.round(rateInfo.rate * 1000) / 1000 : 0,
        trendPercent: rateInfo ? rateInfo.trendPercent : 0,
        daysUntilEmpty,
      };
    })
    .filter((p) => p.daysUntilEmpty !== null)
    .sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);
}
