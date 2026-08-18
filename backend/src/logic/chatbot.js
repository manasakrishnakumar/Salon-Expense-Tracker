/**
 * Owner-facing data assistant — "chatbot" in the sense that matters here:
 * natural-language questions about the salon's own real data, answered
 * from the same report/stock logic the dashboards already use. No
 * external LLM call, no hallucination risk — every answer is computed
 * straight from this owner's actual records, same as any other report
 * endpoint. Intent detection is plain keyword/regex matching; that's
 * legitimate NLP scope for the question set a salon owner actually asks
 * ("how much did I make today", "what's low on stock"), and it keeps the
 * feature fully self-contained (no API key, no network dependency, no
 * per-query cost).
 */
import { dailyReport, profitLossReport, mostUsedProducts } from './reportService.js';
import { computeStockStatus, getLowStockProducts } from './stockService.js';

function fmtINR(n) {
  return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
}

function monthBounds(now = new Date()) {
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const to = now.toISOString().split('T')[0];
  return { from, to };
}

// Order matters where patterns could overlap (e.g. "profit" vs "revenue") —
// more specific intents are listed first.
const INTENTS = [
  { name: 'help', patterns: [/\b(help|what can you do|what do you know|commands)\b/i] },
  { name: 'profit', patterns: [/\b(profit|loss|p\s*&?\s*l|am i (making|losing) money|profitable)\b/i] },
  { name: 'low_stock', patterns: [/\blow\b.{0,12}\bstock\b/i, /running (out|low)/i, /need(s)? (a )?restock/i, /reorder/i, /out of stock/i] },
  { name: 'top_customer', patterns: [/\b(top|best|biggest|regular) customer/i, /who.*(spends? the most|my best customer)/i] },
  { name: 'top_worker', patterns: [/\b(top|best) (worker|staff|employee|performer)/i] },
  { name: 'expenses', patterns: [/\b(expense|spending|spent|overhead)s?\b/i] },
  { name: 'popular_service', patterns: [/\b(popular|most used|top|best.selling) (service|product|item)/i] },
  { name: 'customer_count', patterns: [/how many customers/i] },
  { name: 'worker_count', patterns: [/how many (workers|staff|employees)/i] },
  { name: 'today_revenue', patterns: [/today/i] }, // catches "today's revenue", "how much today", "sales today"
  { name: 'month_revenue', patterns: [/\b(this month|monthly)\b/i, /\b(revenue|sales|income|earn(ings)?)\b/i] },
];

export function detectIntent(message) {
  const text = String(message || '').trim();
  if (!text) return 'empty';
  for (const intent of INTENTS) {
    if (intent.patterns.some((p) => p.test(text))) return intent.name;
  }
  return 'unknown';
}

const HELP_TEXT =
  "I can tell you about: today's revenue, this month's revenue, profit/loss, low stock, your top customer, top worker, this month's expenses, your most popular service, and how many customers/workers you have. Just ask in plain English.";

/**
 * @param {string} message
 * @param {object} ctx - { serviceRecords, expenses, customers, workers, restockDocs, adjustmentDocs }
 * @returns {{ intent: string, answer: string, data: any }}
 */
export function answerQuery(message, ctx) {
  const { serviceRecords = [], expenses = [], customers = [], workers = [], restockDocs = [], adjustmentDocs = [] } = ctx || {};
  const intent = detectIntent(message);
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (intent) {
    case 'empty':
      return { intent, answer: 'Ask me something — try "how much did I make today?"', data: null };

    case 'help':
      return { intent, answer: HELP_TEXT, data: null };

    case 'today_revenue': {
      const report = dailyReport(serviceRecords, expenses, today);
      const tipsPart = report.tips > 0 ? `, plus ${fmtINR(report.tips)} in tips` : '';
      const answer = report.serviceCount === 0
        ? "No services recorded today yet."
        : `Today: ${fmtINR(report.revenue)} in revenue from ${report.serviceCount} service${report.serviceCount === 1 ? '' : 's'}${tipsPart}.`;
      return { intent, answer, data: report };
    }

    case 'month_revenue': {
      const { from, to } = monthBounds(now);
      const report = profitLossReport(serviceRecords, expenses, from, to);
      const answer = report.serviceCount === 0
        ? "No services recorded yet this month."
        : `So far this month: ${fmtINR(report.revenue)} in revenue across ${report.serviceCount} service${report.serviceCount === 1 ? '' : 's'}.`;
      return { intent, answer, data: report };
    }

    case 'profit': {
      const { from, to } = monthBounds(now);
      const report = profitLossReport(serviceRecords, expenses, from, to);
      const word = report.netProfit >= 0 ? 'profit' : 'loss';
      const answer = `This month you're at a net ${word} of ${fmtINR(Math.abs(report.netProfit))} `
        + `(revenue ${fmtINR(report.revenue)} minus product cost ${fmtINR(report.stockCost)} `
        + `and other expenses ${fmtINR(report.otherExpenses)}, plus ${fmtINR(report.tips)} in tips).`;
      return { intent, answer, data: report };
    }

    case 'low_stock': {
      const stockMap = computeStockStatus(restockDocs, serviceRecords, undefined, adjustmentDocs);
      const low = getLowStockProducts(stockMap);
      if (low.length === 0) {
        return { intent, answer: "Nothing is low on stock right now.", data: [] };
      }
      const names = low.slice(0, 5).map((p) => `${p.name} (${Math.round(p.remaining)}${p.unit} left)`).join(', ');
      const more = low.length > 5 ? `, and ${low.length - 5} more` : '';
      return { intent, answer: `${low.length} product${low.length === 1 ? ' is' : 's are'} low on stock: ${names}${more}.`, data: low };
    }

    case 'top_customer': {
      if (customers.length === 0) {
        return { intent, answer: "You don't have any customers on file yet.", data: [] };
      }
      const sorted = [...customers].sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0));
      const top = sorted.slice(0, 3);
      const runnersUp = top.length > 1 ? ` Runners-up: ${top.slice(1).map((c) => c.name).join(', ')}.` : '';
      const answer = (top[0].totalSpend || 0) > 0
        ? `Your top customer is ${top[0].name} — ${fmtINR(top[0].totalSpend)} spent across ${top[0].visitCount || 0} visit(s).${runnersUp}`
        : "None of your customers have any recorded spend yet.";
      return { intent, answer, data: top };
    }

    case 'top_worker': {
      const stats = {};
      serviceRecords.forEach((r) => {
        if (!r.WorkerName) return;
        stats[r.WorkerName] = stats[r.WorkerName] || { name: r.WorkerName, revenue: 0, services: 0 };
        stats[r.WorkerName].revenue += Number(r.totalPrice) || 0;
        stats[r.WorkerName].services += 1;
      });
      const sorted = Object.values(stats).sort((a, b) => b.revenue - a.revenue);
      if (sorted.length === 0) {
        return { intent, answer: "No service records with a worker attached yet.", data: [] };
      }
      const top = sorted[0];
      return {
        intent,
        answer: `${top.name} is your top performer — ${fmtINR(top.revenue)} in revenue across ${top.services} service${top.services === 1 ? '' : 's'}.`,
        data: sorted.slice(0, 3),
      };
    }

    case 'expenses': {
      const { from, to } = monthBounds(now);
      const monthExpenses = expenses.filter((e) => e.date >= from && e.date <= to);
      const total = monthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const answer = monthExpenses.length === 0
        ? "No expenses logged this month."
        : `You've spent ${fmtINR(total)} on expenses this month across ${monthExpenses.length} entr${monthExpenses.length === 1 ? 'y' : 'ies'}.`;
      return { intent, answer, data: monthExpenses };
    }

    case 'popular_service': {
      const used = mostUsedProducts(serviceRecords, 3);
      if (used.length === 0) {
        return { intent, answer: "No usage data yet — record a few services first.", data: [] };
      }
      return {
        intent,
        answer: `Your most-used product is ${used[0].name} — about ${Math.round(used[0].totalQuantityUsed)} units consumed so far.`,
        data: used,
      };
    }

    case 'customer_count':
      return { intent, answer: `You have ${customers.length} customer${customers.length === 1 ? '' : 's'} on file.`, data: customers.length };

    case 'worker_count':
      return { intent, answer: `You have ${workers.length} worker${workers.length === 1 ? '' : 's'} on your team.`, data: workers.length };

    default:
      return {
        intent: 'unknown',
        answer: `I'm not sure about that one. ${HELP_TEXT}`,
        data: null,
      };
  }
}
