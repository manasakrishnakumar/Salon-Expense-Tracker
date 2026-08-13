import { findService } from './costCalculator.js';

function toDateKey(isoOrDateStr) {
  if (!isoOrDateStr) return null;
  return String(isoOrDateStr).split('T')[0];
}

export function dailyReport(serviceRecords, expenses, date) {
  const dayRecords = serviceRecords.filter((r) => toDateKey(r.Date) === date);
  const dayExpenses = expenses.filter((e) => toDateKey(e.date) === date);

  const serviceCost = dayRecords.reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0);
  const expenseTotal = dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const revenue = dayRecords.reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0);
  const tips = dayRecords.reduce((sum, r) => sum + (Number(r.tip) || 0), 0);

  const byCategory = {};
  dayRecords.forEach((r) => {
    byCategory[r.category] = (byCategory[r.category] || 0) + (Number(r.totalCost) || 0);
  });

  // Top worker by service count
  const workerCounts = {};
  dayRecords.forEach((r) => {
    if (r.WorkerName) workerCounts[r.WorkerName] = (workerCounts[r.WorkerName] || 0) + 1;
  });
  const topWorker = Object.entries(workerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    date,
    serviceCount: dayRecords.length,
    serviceCost,
    revenue,
    tips,
    expenseCount: dayExpenses.length,
    expenseTotal,
    netProfit: revenue + tips - serviceCost - expenseTotal,
    topWorker,
    totalOutflow: serviceCost + expenseTotal,
    byCategory,
  };
}

export function monthlyReport(serviceRecords, expenses, month, year) {
  const inMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() + 1 === Number(month) && d.getFullYear() === Number(year);
  };

  const monthRecords = serviceRecords.filter((r) => inMonth(r.Date));
  const monthExpenses = expenses.filter((e) => inMonth(e.date));

  const serviceCost = monthRecords.reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0);
  const expenseTotal = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const byDay = {};
  monthRecords.forEach((r) => {
    const key = toDateKey(r.Date);
    byDay[key] = (byDay[key] || 0) + (Number(r.totalCost) || 0);
  });
  monthExpenses.forEach((e) => {
    const key = toDateKey(e.date);
    byDay[key] = (byDay[key] || 0) + (Number(e.amount) || 0);
  });

  return {
    month: Number(month),
    year: Number(year),
    serviceCount: monthRecords.length,
    serviceCost,
    expenseCount: monthExpenses.length,
    expenseTotal,
    totalOutflow: serviceCost + expenseTotal,
    byDay,
  };
}

export function mostUsedProducts(serviceRecords, limit = 10) {
  const totals = {};
  serviceRecords.forEach((record) => {
    const service = findService(record.serviceID);
    if (!service) return;
    const qty = Number(record.quantity) || 1;
    (service.products || []).forEach((p) => {
      const key = p.name.toUpperCase().trim();
      const perService = parseFloat(p.quantity) || 1;
      totals[key] = (totals[key] || 0) + perService * qty;
    });
  });

  return Object.entries(totals)
    .map(([name, totalQuantityUsed]) => ({ name, totalQuantityUsed }))
    .sort((a, b) => b.totalQuantityUsed - a.totalQuantityUsed)
    .slice(0, limit);
}

/**
 * A4 — Profit & Loss Report
 * Revenue = totalPrice (what customer paid)
 * Gross Profit = Revenue - Stock Cost (totalCost)
 * Net Profit = Gross Profit - Other Expenses
 */
export function profitLossReport(serviceRecords, expenses, from, to) {
  const inRange = (dateStr) => {
    if (!dateStr) return false;
    const d = toDateKey(dateStr);
    return d >= from && d <= to;
  };

  const rangeRecords = serviceRecords.filter((r) => inRange(r.Date));
  const rangeExpenses = expenses.filter((e) => inRange(e.date));

  const revenue = rangeRecords.reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0);
  const stockCost = rangeRecords.reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0);
  const tips = rangeRecords.reduce((sum, r) => sum + (Number(r.tip) || 0), 0);
  const otherExpenses = rangeExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const grossProfit = revenue - stockCost;
  const netProfit = grossProfit - otherExpenses + tips;

  // Build month-by-month breakdown
  const months = {};
  rangeRecords.forEach((r) => {
    const d = new Date(r.Date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months[key]) months[key] = { revenue: 0, stockCost: 0, expenses: 0, tips: 0 };
    months[key].revenue += Number(r.totalPrice) || 0;
    months[key].stockCost += Number(r.totalCost) || 0;
    months[key].tips += Number(r.tip) || 0;
  });
  rangeExpenses.forEach((e) => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months[key]) months[key] = { revenue: 0, stockCost: 0, expenses: 0, tips: 0 };
    months[key].expenses += Number(e.amount) || 0;
  });

  const monthlyBreakdown = Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      revenue: v.revenue,
      stockCost: v.stockCost,
      otherExpenses: v.expenses,
      tips: v.tips,
      netProfit: v.revenue - v.stockCost - v.expenses + v.tips,
    }));

  // Worker performance
  const workerStats = {};
  rangeRecords.forEach((r) => {
    const name = r.WorkerName || 'Unknown';
    if (!workerStats[name]) workerStats[name] = { revenue: 0, services: 0, tips: 0 };
    workerStats[name].revenue += Number(r.totalPrice) || 0;
    workerStats[name].services += 1;
    workerStats[name].tips += Number(r.tip) || 0;
  });

  return {
    from,
    to,
    revenue,
    stockCost,
    tips,
    otherExpenses,
    grossProfit,
    netProfit,
    serviceCount: rangeRecords.length,
    monthlyBreakdown,
    workerPerformance: Object.entries(workerStats)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}

/**
 * A1 — Generate CSV string from records + expenses
 */
export function generateCsvExport(serviceRecords, expenses, from, to) {
  const inRange = (dateStr) => {
    if (!dateStr) return false;
    const d = toDateKey(dateStr);
    return d >= from && d <= to;
  };

  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const rows = [];

  // Header
  rows.push([
    'Type', 'Date', 'Name', 'Category', 'Worker', 'Customer',
    'Qty', 'Revenue (₹)', 'Cost (₹)', 'Tip (₹)', 'Expense Amount (₹)',
  ].map(escape).join(','));

  serviceRecords.filter((r) => inRange(r.Date)).forEach((r) => {
    rows.push([
      'Service',
      toDateKey(r.Date),
      r.serviceName,
      r.category,
      r.WorkerName || '',
      r.customerName || '',
      r.quantity,
      Number(r.totalPrice || 0).toFixed(2),
      Number(r.totalCost || 0).toFixed(2),
      Number(r.tip || 0).toFixed(2),
      '',
    ].map(escape).join(','));
  });

  expenses.filter((e) => inRange(e.date)).forEach((e) => {
    rows.push([
      'Expense',
      e.date,
      e.name,
      e.category,
      '', '', '', '', '', '',
      Number(e.amount || 0).toFixed(2),
    ].map(escape).join(','));
  });

  return rows.join('\n');
}
