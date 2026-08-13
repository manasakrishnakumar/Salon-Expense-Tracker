import { env } from '../config/env.js';
import { listMine } from '../repo.js';
import { users } from '../config/appwrite.js';
import {
  dailyReport, monthlyReport, mostUsedProducts,
  profitLossReport, generateCsvExport,
} from '../logic/reportService.js';
import { computeStockStatus, getLowStockProducts } from '../logic/stockService.js';
import { forecastNextMonthTotal, computeDailyConsumptionRates, estimateStockRunout } from '../logic/forecast.js';
import { sendDailySummaryEmail } from '../config/email.js';

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

export async function forecast(req, res) {
  const [expenses, restockDocs, serviceRecords] = await Promise.all([
    listMine(env.collections.expenses, req.user.ownerId, [], 1000),
    listMine(env.collections.restock, req.user.ownerId, [], 500),
    listMine(env.collections.serviceRecords, req.user.ownerId, [], 1000),
  ]);

  const expenseForecast = forecastNextMonthTotal(expenses, 'date', 'amount');
  const serviceCostForecast = forecastNextMonthTotal(serviceRecords, 'Date', 'totalCost');

  const adjustmentDocs = await listMine(env.collections.stockAdjustments, req.user.ownerId, [], 200).catch(() => []);
  const stockMap = computeStockStatus(restockDocs, serviceRecords, undefined, adjustmentDocs);
  const dailyRates = computeDailyConsumptionRates(serviceRecords, 30);
  const stockRunout = estimateStockRunout(stockMap, dailyRates);

  res.json({
    expenseForecast,
    serviceCostForecast,
    stockRunout: stockRunout.slice(0, 10),
  });
}

// A4 — Profit & Loss Report
export async function profitLoss(req, res) {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to query params are required (YYYY-MM-DD)' });
  }
  const { serviceRecords, expenses } = await loadRecordsAndExpenses(req.user.ownerId);
  res.json(profitLossReport(serviceRecords, expenses, from, to));
}

// A1 — CSV Export
export async function exportCsv(req, res) {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to query params are required (YYYY-MM-DD)' });
  }
  const { serviceRecords, expenses } = await loadRecordsAndExpenses(req.user.ownerId);
  const csv = generateCsvExport(serviceRecords, expenses, from, to);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="salon-report-${from}-to-${to}.csv"`);
  res.send(csv);
}

// A2 — Send Daily Summary Email
export async function sendDailySummary(req, res) {
  const today = new Date().toISOString().split('T')[0];
  const { serviceRecords, expenses } = await loadRecordsAndExpenses(req.user.ownerId);

  const [restockDocs, adjustmentDocs] = await Promise.all([
    listMine(env.collections.restock, req.user.ownerId, [], 500),
    listMine(env.collections.stockAdjustments, req.user.ownerId, [], 200).catch(() => []),
  ]);

  const report = dailyReport(serviceRecords, expenses, today);
  const stockMap = computeStockStatus(restockDocs, serviceRecords, undefined, adjustmentDocs);
  const lowStockCount = getLowStockProducts(stockMap).length;

  const ownerUser = await users.get(req.user.ownerId);

  const sent = await sendDailySummaryEmail({
    toEmail: ownerUser.email,
    date: today,
    stats: { ...report, lowStockCount },
  });

  res.json({ sent, sentTo: ownerUser.email, date: today, stats: report });
}
