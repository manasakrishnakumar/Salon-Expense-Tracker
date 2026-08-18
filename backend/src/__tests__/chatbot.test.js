import { describe, it, expect } from '@jest/globals';
import { detectIntent, answerQuery } from '../logic/chatbot.js';

const today = new Date().toISOString();
const thisMonthDate = new Date().toISOString().split('T')[0];

describe('detectIntent', () => {
  it('recognizes today-revenue questions', () => {
    expect(detectIntent("how much did I make today?")).toBe('today_revenue');
    expect(detectIntent("today's sales")).toBe('today_revenue');
  });

  it('recognizes month-revenue questions', () => {
    expect(detectIntent("what's my revenue this month")).toBe('month_revenue');
    expect(detectIntent("monthly income")).toBe('month_revenue');
  });

  it('recognizes profit questions', () => {
    expect(detectIntent("am I making a profit?")).toBe('profit');
    expect(detectIntent("show me the P&L")).toBe('profit');
  });

  it('recognizes low-stock questions', () => {
    expect(detectIntent("what's running low")).toBe('low_stock');
    expect(detectIntent("do I need to reorder anything")).toBe('low_stock');
  });

  it('recognizes top-customer questions', () => {
    expect(detectIntent("who is my best customer")).toBe('top_customer');
  });

  it('recognizes top-worker questions', () => {
    expect(detectIntent("who is my top performer")).toBe('top_worker');
  });

  it('recognizes expense questions', () => {
    expect(detectIntent("how much have I spent this month")).toBe('expenses');
  });

  it('recognizes popular-service questions', () => {
    expect(detectIntent("what's my most popular service")).toBe('popular_service');
  });

  it('recognizes count questions', () => {
    expect(detectIntent("how many customers do I have")).toBe('customer_count');
    expect(detectIntent("how many workers do I have")).toBe('worker_count');
  });

  it('recognizes a help request', () => {
    expect(detectIntent("help")).toBe('help');
    expect(detectIntent("what can you do")).toBe('help');
  });

  it('falls back to unknown for unrelated text', () => {
    expect(detectIntent("what's the weather like")).toBe('unknown');
  });

  it('treats an empty message as its own case rather than matching a pattern', () => {
    expect(detectIntent('')).toBe('empty');
    expect(detectIntent('   ')).toBe('empty');
  });
});

describe('answerQuery', () => {
  it('reports zero services gracefully instead of a broken sentence', () => {
    const result = answerQuery('revenue today', { serviceRecords: [], expenses: [] });
    expect(result.intent).toBe('today_revenue');
    expect(result.answer).toMatch(/no services recorded today/i);
  });

  it('answers today\'s revenue from real service records', () => {
    const serviceRecords = [
      { serviceID: 'diamond_facial', quantity: 1, totalPrice: 699, tip: 50, Date: today },
      { serviceID: 'pearl_facial', quantity: 1, totalPrice: 499, tip: 0, Date: today },
    ];
    const result = answerQuery('how much did I make today', { serviceRecords, expenses: [] });
    expect(result.intent).toBe('today_revenue');
    expect(result.data.serviceCount).toBe(2);
    expect(result.answer).toContain('1,198'); // 699 + 499, en-IN grouping
    expect(result.answer).toMatch(/tips/i);
  });

  it('answers a profit/loss question with revenue, cost, and expenses factored in', () => {
    const serviceRecords = [
      { serviceID: 'diamond_facial', quantity: 1, totalCost: 139.7, totalPrice: 699, tip: 0, Date: today },
    ];
    const expenses = [{ amount: 100, date: thisMonthDate }];
    const result = answerQuery('am I profitable this month', { serviceRecords, expenses });
    expect(result.intent).toBe('profit');
    expect(result.data.netProfit).toBeCloseTo(699 - 139.7 - 100, 1);
    expect(result.answer).toMatch(/profit|loss/i);
  });

  it('lists low-stock products by name', () => {
    const restockDocs = [{ productName: 'CLEANSER', quantityAdded: 50, date: thisMonthDate }];
    const serviceRecords = [{ serviceID: 'diamond_facial', quantity: 1, Date: today }]; // uses 10g CLEANSER, remaining 40 < threshold 100
    const result = answerQuery('what is low on stock', { serviceRecords, expenses: [], restockDocs, adjustmentDocs: [] });
    expect(result.intent).toBe('low_stock');
    expect(result.answer).toContain('CLEANSER');
    expect(result.data.length).toBeGreaterThan(0);
  });

  it('says nothing is low when nothing is', () => {
    const result = answerQuery('any low stock?', { serviceRecords: [], expenses: [], restockDocs: [], adjustmentDocs: [] });
    expect(result.answer).toMatch(/nothing is low/i);
    expect(result.data).toEqual([]);
  });

  it('finds the top customer by total spend', () => {
    const customers = [
      { $id: 'c1', name: 'Alice', totalSpend: 500, visitCount: 2 },
      { $id: 'c2', name: 'Bob', totalSpend: 2000, visitCount: 5 },
    ];
    const result = answerQuery('who is my top customer', { serviceRecords: [], expenses: [], customers });
    expect(result.intent).toBe('top_customer');
    expect(result.answer).toContain('Bob');
    expect(result.data[0].name).toBe('Bob');
  });

  it('handles no customers at all', () => {
    const result = answerQuery('best customer?', { serviceRecords: [], expenses: [], customers: [] });
    expect(result.answer).toMatch(/don't have any customers/i);
  });

  it('finds the top worker by revenue across service records', () => {
    const serviceRecords = [
      { WorkerName: 'Priya', totalPrice: 1000, Date: today },
      { WorkerName: 'Priya', totalPrice: 500, Date: today },
      { WorkerName: 'Ananya', totalPrice: 300, Date: today },
      { WorkerName: '', totalPrice: 9999, Date: today }, // no worker attached, shouldn't count
    ];
    const result = answerQuery('who is my best worker', { serviceRecords, expenses: [] });
    expect(result.intent).toBe('top_worker');
    expect(result.answer).toContain('Priya');
    expect(result.data[0].revenue).toBe(1500);
  });

  it('sums this month\'s expenses only', () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString().split('T')[0];
    const expenses = [{ amount: 500, date: thisMonth }, { amount: 9999, date: lastMonth }];
    const result = answerQuery('how much have I spent this month', { serviceRecords: [], expenses });
    expect(result.intent).toBe('expenses');
    expect(result.answer).toContain('500');
    expect(result.answer).not.toContain('9,999');
  });

  it('reports the most-used product', () => {
    const serviceRecords = [
      { serviceID: 'diamond_facial', quantity: 3, Date: today }, // consumes several products at once
    ];
    const result = answerQuery('most popular product', { serviceRecords, expenses: [] });
    expect(result.intent).toBe('popular_service');
    expect(result.data.length).toBeGreaterThan(0);
    // Whichever product actually comes out on top, the answer should name it.
    expect(result.answer).toContain(result.data[0].name);
  });

  it('answers customer and worker counts directly', () => {
    const customers = [{ name: 'A' }, { name: 'B' }];
    const workers = [{ name: 'W1' }];
    expect(answerQuery('how many customers do I have', { customers, workers: [] }).answer).toContain('2');
    expect(answerQuery('how many workers do I have', { customers: [], workers }).answer).toContain('1');
  });

  it('gives a helpful fallback for unrecognized questions', () => {
    const result = answerQuery('what is the meaning of life', { serviceRecords: [], expenses: [] });
    expect(result.intent).toBe('unknown');
    expect(result.answer).toMatch(/not sure/i);
  });

  it('prompts for input on an empty message instead of guessing', () => {
    const result = answerQuery('', { serviceRecords: [], expenses: [] });
    expect(result.intent).toBe('empty');
  });
});
