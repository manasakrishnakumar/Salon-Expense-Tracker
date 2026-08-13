import { env } from '../config/env.js';
import { listMine } from '../repo.js';
import {
  computeStockStatus,
  getLowStockProducts,
  getNeverRestockedProducts,
  getTotalInventoryValue,
  buildProductMaster,
} from '../logic/stockService.js';

async function loadStockInputs(ownerId) {
  const [restockDocs, serviceRecordDocs] = await Promise.all([
    listMine(env.collections.restock, ownerId, [], 500),
    listMine(env.collections.serviceRecords, ownerId, [], 500),
  ]);
  return { restockDocs, serviceRecordDocs };
}

// Owner-only at the route level.
export async function stockStatus(req, res) {
  const { restockDocs, serviceRecordDocs } = await loadStockInputs(req.user.ownerId);
  const stock = computeStockStatus(restockDocs, serviceRecordDocs);
  res.json({
    products: buildProductMaster(),
    stock,
    totalInventoryValue: getTotalInventoryValue(restockDocs),
  });
}

export async function lowStock(req, res) {
  const { restockDocs, serviceRecordDocs } = await loadStockInputs(req.user.ownerId);
  const stock = computeStockStatus(restockDocs, serviceRecordDocs);
  res.json({
    lowStock: getLowStockProducts(stock),
    neverRestocked: getNeverRestockedProducts(stock),
  });
}
