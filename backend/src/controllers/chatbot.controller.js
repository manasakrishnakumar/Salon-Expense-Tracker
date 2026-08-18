import { env } from '../config/env.js';
import { listMine } from '../repo.js';
import { answerQuery } from '../logic/chatbot.js';

// Owner-only at the route level — pulls the same data the dashboards
// already use and hands it to the pure answerQuery() function in
// logic/chatbot.js. No data leaves the server; nothing is answered that
// isn't already computable from this owner's own records.
export async function query(req, res) {
  const { message } = req.body;
  const ownerId = req.user.ownerId;

  const [serviceRecords, expenses, customers, workers, restockDocs, adjustmentDocs] = await Promise.all([
    listMine(env.collections.serviceRecords, ownerId, [], 1000),
    listMine(env.collections.expenses, ownerId, [], 1000),
    listMine(env.collections.customers, ownerId, [], 500),
    listMine(env.collections.workers, ownerId, [], 200),
    listMine(env.collections.restock, ownerId, [], 500),
    listMine(env.collections.stockAdjustments, ownerId, [], 200).catch(() => []),
  ]);

  const result = answerQuery(message, { serviceRecords, expenses, customers, workers, restockDocs, adjustmentDocs });
  res.json(result);
}
