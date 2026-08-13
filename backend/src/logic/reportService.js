import { findService } from './costCalculator.js';

function toDateKey(isoOrDateStr) {
  if (!isoOrDateStr) return null;
  return String(isoOrDateStr).split('T')[0];
}

/**
 * @param {Array} serviceRecords
 * @param {Array} expenses
 * @param {string} date - 'YYYY-MM-DD'
 */
export function dailyReport(serviceRecords, expenses, date) {
  const dayRecords = serviceRecords.filter((r) => toDateKey(r.Date) === date);
  const dayExpenses = expenses.filter((e) => toDateKey(e.date) === date);

  const serviceCost = dayRecords.reduce((sum, r) => sum + (Number(r.totalCost) || 0), 0);
  const expenseTotal = dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const byCategory = {};
  dayRecords.forEach((r) => {
    byCategory[r.category] = (byCategory[r.category] || 0) + (Number(r.totalCost) || 0);
  });

  return {
    date,
    serviceCount: dayRecords.length,
    serviceCost,
    expenseCount: dayExpenses.length,
    expenseTotal,
    totalOutflow: serviceCost + expenseTotal,
    byCategory,
  };
}

/**
 * @param {Array} serviceRecords
 * @param {Array} expenses
 * @param {number} month - 1-12
 * @param {number} year
 */
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

/**
 * Ranks products by total quantity consumed across a set of service records,
 * using the catalog to know what each service uses.
 */
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
