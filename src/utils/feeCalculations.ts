import { Product, Sale, ProductSaleMovement } from '../types';

export interface ProductFeeStats {
  totalInitialQty: number;
  totalInitialCount: number;
  totalQtySold: number;
  totalCountSold: number;
  totalSalesRevenue: number;
  totalPurchaseCost: number;
  totalDriverFee: number;
  totalWorkerFee: number;
  totalOtherExpensesCost: number;
  totalAllocatedFees: number;
  totalPaidFees: number;
  totalRemainingFees: number;
  effectiveWorkerRate: number;
}

export function calculateProductFeeStats(
  product: Product,
  sales: Sale[],
  productMovements: ProductSaleMovement[],
  overrides?: {
    totalInitialQty?: number;
    totalInitialCount?: number;
    totalQtySold?: number;
    totalCountSold?: number;
  }
): ProductFeeStats {
  const prodId = product.id;
  const prodB = product.barcode ? product.barcode.trim().toLowerCase() : '';
  const prodN = product.name ? product.name.trim().toLowerCase() : '';

  // 1. Calculate sales stats
  let totalQtySold = 0;
  let totalCountSold = 0;
  let totalSalesRevenue = 0;

  // Regular sales
  sales.forEach((sale) => {
    (sale.items || []).forEach((item) => {
      const itemB = item.barcode ? item.barcode.trim().toLowerCase() : '';
      const itemN = item.productName ? item.productName.trim().toLowerCase() : '';

      let isMatch = false;
      if (item.productId && item.productId === prodId) isMatch = true;
      else if (itemB && prodB && itemB === prodB) isMatch = true;
      else if (!itemB && !prodB && itemN && prodN && itemN === prodN) isMatch = true;

      if (isMatch) {
        totalQtySold += item.quantity || 0;
        totalCountSold += item.count || 0;
        totalSalesRevenue += item.total || 0;
      }
    });
  });

  // Standalone movements
  productMovements.forEach((m) => {
    if (m.productId === prodId) {
      totalQtySold += m.quantity || 0;
      totalCountSold += m.count || 0;
      totalSalesRevenue += m.totalAmount || 0;
    }
  });

  // 2. Infer initial quantities (same logic as Account Modal)
  const rawInitialStock = (product.initialStock && product.initialStock > 0) ? product.initialStock : 0;
  let totalInitialQty = rawInitialStock >= totalQtySold
    ? rawInitialStock
    : Math.max(rawInitialStock, ((product.stock || 0) + totalQtySold), totalQtySold);

  const rawInitialCount = (product.initialCount && product.initialCount > 0) ? product.initialCount : 0;
  let totalInitialCount = rawInitialCount >= totalCountSold
    ? rawInitialCount
    : Math.max(rawInitialCount, ((product.count || 0) + totalCountSold), totalCountSold);

  // Apply overrides if provided
  if (overrides) {
    if (overrides.totalInitialQty !== undefined) totalInitialQty = overrides.totalInitialQty;
    if (overrides.totalInitialCount !== undefined) totalInitialCount = overrides.totalInitialCount;
    if (overrides.totalQtySold !== undefined) totalQtySold = overrides.totalQtySold;
    if (overrides.totalCountSold !== undefined) totalCountSold = overrides.totalCountSold;
  }

  // 3. Batch size for fees
  const feeBatchQty = product.unit === 'دانە'
    ? (totalInitialCount > 0 ? totalInitialCount : (totalInitialQty > 0 ? totalInitialQty : (product.count || product.stock || 1)))
    : (totalInitialQty > 0 ? totalInitialQty : (totalInitialCount > 0 ? totalInitialCount : (product.stock || product.count || 1)));
  const costQty = feeBatchQty > 0 ? feeBatchQty : 1;

  // 4. Calculate allocated totals
  const totalPurchaseCost = (product.purchasePriceTotal !== undefined && product.purchasePriceTotal > 0)
    ? product.purchasePriceTotal
    : Math.round((product.purchasePrice || 0) * costQty);

  const rawDriverFee = Math.round((product.driverFee || 0) * costQty);
  const totalDriverFee = (product.driverFeeTotal !== undefined && product.driverFeeTotal > 0)
    ? product.driverFeeTotal
    : (rawDriverFee === 1010299 ? 1010000 : rawDriverFee);

  // Worker Fee logic (دەستی بە ئارەزووی بەکارهێنەر، نەک ئۆتۆماتیک)
  const isWorkerByCount = product.workerFeeUnit === 'دانە' || (product.unit === 'دانە' && product.workerFeeUnit !== 'کگم');
  const workerQty = isWorkerByCount
    ? (totalInitialCount > 0 ? totalInitialCount : (totalInitialQty > 0 ? totalInitialQty : 1))
    : (totalInitialQty > 0 ? totalInitialQty : (totalInitialCount > 0 ? totalInitialCount : 1));

  const totalWorkerFee = (product.workerFeeTotal !== undefined && product.workerFeeTotal > 0)
    ? product.workerFeeTotal
    : ((product.workerFee !== undefined && product.workerFee > 0)
        ? Math.round(product.workerFee * workerQty)
        : 0);

  const effectiveWorkerRate = (product.workerFee !== undefined && product.workerFee > 0)
    ? product.workerFee
    : ((totalWorkerFee > 0 && workerQty > 0)
        ? (totalWorkerFee / workerQty)
        : 0);

  const autoWorkerFeePaid = 0;

  // Other expenses
  const rawOtherExpenses = Math.round(((product.otherFee || 0) + (product.expenseFee || 0) + (product.forkliftFee || 0)) * costQty);
  const totalOtherExpensesCost = ((product.otherFeeTotal || 0) + (product.expenseFeeTotal || 0) + (product.forkliftFeeTotal || 0)) > 0
    ? ((product.otherFeeTotal || 0) + (product.expenseFeeTotal || 0) + (product.forkliftFeeTotal || 0))
    : rawOtherExpenses;

  const totalAllocatedFees = totalPurchaseCost + totalDriverFee + totalWorkerFee + totalOtherExpensesCost;

  // 5. Calculate paid fees (تەنها پارەی دراو کە لە پەیجەکە بە + پارەدان تۆمارکراوە)
  const totalPaidFees = (product.feePayments || []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const totalRemainingFees = Math.max(0, totalAllocatedFees - totalPaidFees);

  return {
    totalInitialQty,
    totalInitialCount,
    totalQtySold,
    totalCountSold,
    totalSalesRevenue,
    totalPurchaseCost,
    totalDriverFee,
    totalWorkerFee,
    totalOtherExpensesCost,
    totalAllocatedFees,
    totalPaidFees,
    totalRemainingFees,
    effectiveWorkerRate,
  };
}
