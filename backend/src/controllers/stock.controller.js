import { env } from '../config/env.js';
import { listMine } from '../repo.js';
import {
  computeStockStatus,
  getLowStockProducts,
  getNeverRestockedProducts,
  getTotalInventoryValue,
  buildProductMaster,
  computeReorderSuggestions,
} from '../logic/stockService.js';

async function loadStockInputs(ownerId) {
  const [restockDocs, serviceRecordDocs, adjustmentDocs] = await Promise.all([
    listMine(env.collections.restock, ownerId, [], 500),
    listMine(env.collections.serviceRecords, ownerId, [], 500),
    listMine(env.collections.stockAdjustments, ownerId, [], 200).catch(() => []),
  ]);
  return { restockDocs, serviceRecordDocs, adjustmentDocs };
}

// Owner-only at the route level.
export async function stockStatus(req, res) {
  const { restockDocs, serviceRecordDocs, adjustmentDocs } = await loadStockInputs(req.user.ownerId);
  const stock = computeStockStatus(restockDocs, serviceRecordDocs, undefined, adjustmentDocs);
  const reorderSuggestions = computeReorderSuggestions(stock, restockDocs, serviceRecordDocs);

  res.json({
    products: buildProductMaster(),
    stock,
    adjustments: adjustmentDocs,
    totalInventoryValue: getTotalInventoryValue(restockDocs),
    reorderSuggestions,
  });
}

export async function lowStock(req, res) {
  const { restockDocs, serviceRecordDocs, adjustmentDocs } = await loadStockInputs(req.user.ownerId);
  const stock = computeStockStatus(restockDocs, serviceRecordDocs, undefined, adjustmentDocs);
  res.json({
    lowStock: getLowStockProducts(stock),
    neverRestocked: getNeverRestockedProducts(stock),
  });
}
