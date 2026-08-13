import { env } from '../config/env.js';
import { listMine } from '../repo.js';
import { dailyReport, monthlyReport, mostUsedProducts } from '../logic/reportService.js';
import { computeStockStatus } from '../logic/stockService.js';
import { forecastNextMonthTotal, computeDailyConsumptionRates, estimateStockRunout } from '../logic/forecast.js';

async function loadRecordsAndExpenses(userId) {
  const [serviceRecords, expenses] = await Promise.all([
    listMine(env.collections.serviceRecords, userId, [], 1000),
    listMine(env.collections.expenses, userId, [], 1000),
  ]);
  return { serviceRecords, expenses };
}

export async function daily(req, res) {
  const { serviceRecords, expenses } = await loadRecordsAndExpenses(req.user.ownerId);
  res.json(dailyReport(serviceRecords, expenses, req.query.date));
}

export async function monthly(req, res) {
  const { serviceRecords, expenses } = await loadRecordsAndExpenses(req.user.ownerId);
  res.json(monthlyReport(serviceRecords, expenses, req.query.month, req.query.year));
}

export async function mostUsed(req, res) {
  const { serviceRecords } = await loadRecordsAndExpenses(req.user.ownerId);
  res.json({ products: mostUsedProducts(serviceRecords) });
}

/**
 * Forward-looking view: where expenses are trending, and which products
 * are on track to run out soonest given how they've actually been used
 * lately (not just what's left on the shelf right now).
 */
export async function forecast(req, res) {
  const [expenses, restockDocs, serviceRecords] = await Promise.all([
    listMine(env.collections.expenses, req.user.ownerId, [], 1000),
    listMine(env.collections.restock, req.user.ownerId, [], 500),
    listMine(env.collections.serviceRecords, req.user.ownerId, [], 1000),
  ]);

  const expenseForecast = forecastNextMonthTotal(expenses, 'date', 'amount');
  const serviceCostForecast = forecastNextMonthTotal(serviceRecords, 'Date', 'totalCost');

  const stockMap = computeStockStatus(restockDocs, serviceRecords);
  const dailyRates = computeDailyConsumptionRates(serviceRecords, 30);
  const stockRunout = estimateStockRunout(stockMap, dailyRates);

  res.json({
    expenseForecast,
    serviceCostForecast,
    stockRunout: stockRunout.slice(0, 10), // soonest-to-empty first
  });
}
