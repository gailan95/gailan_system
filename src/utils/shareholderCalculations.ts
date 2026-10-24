import { Product, ProductMovement, Sale, ShareholderTransaction, ClosedProductArchive } from '../types';
import { normalizeKurdishText } from './textNormalization';

export interface ShareProductDetail {
  id: string;
  name: string;
  shareAmount: number;
  percentage: number;
  date: string;
  status: 'active' | 'closed';
}

export interface ShareholderLiveStats {
  name: string;
  normalizedName: string;
  totalLiveShare: number;
  activeProductsCount: number;
  closedProductsCount: number;
  productBreakdown: ShareProductDetail[];
}

/**
 * Calculates live shares for all shareholders based on current products and archives.
 * A share is calculated as: (Revenue - Total Goods Cost) * Percentage / 100
 */
export function calculateAllShareholderLiveShares(
  products: Product[],
  closedProductArchives: ClosedProductArchive[],
  productMovements: ProductMovement[],
  sales: Sale[]
): Map<string, ShareholderLiveStats> {
  const statsMap = new Map<string, ShareholderLiveStats>();

  const getStats = (name: string) => {
    const norm = normalizeKurdishText(name);
    if (!norm) return null;
    if (!statsMap.has(norm)) {
      statsMap.set(norm, {
        name: name.trim(),
        normalizedName: norm,
        totalLiveShare: 0,
        activeProductsCount: 0,
        closedProductsCount: 0,
        productBreakdown: [],
      });
    }
    return statsMap.get(norm)!;
  };

  // 1. Process Active Products
  products.forEach(product => {
    if (!product.shareholderName || !product.shareholderPercentage) return;
    const stats = getStats(product.shareholderName);
    if (!stats) return;

    const prodB = product.barcode ? product.barcode.trim().toLowerCase() : '';
    const prodN = product.name ? product.name.trim().toLowerCase() : '';

    let salesRevenue = 0;
    let totalQtySold = 0;

    // Calculate revenue and qty sold
    productMovements.forEach((movement) => {
      const itemB = movement.barcode ? movement.barcode.trim().toLowerCase() : '';
      const itemN = movement.productName ? movement.productName.trim().toLowerCase() : '';
      if (itemB && prodB && itemB !== prodB) return;

      let isMatch = false;
      if (itemB && prodB && itemB === prodB) isMatch = true;
      else if (movement.productId && movement.productId === product.id) isMatch = true;
      else if (!itemB && !prodB && itemN && prodN && itemN === prodN) isMatch = true;

      if (isMatch) {
        salesRevenue += Number(movement.totalAmount) || 0;
        totalQtySold += Number(movement.quantity) || 0;
      }
    });

    const totalUnitCost = (product.purchasePrice || 0) + 
                         (product.driverFee || 0) + 
                         (product.workerFee || 0) + 
                         (product.forkliftFee || 0) + 
                         (product.otherFee || 0) + 
                         (product.expenseFee || 0);

    const rawInitialStock = product.initialStock || 0;
    const totalInitialQty = rawInitialStock >= totalQtySold
      ? rawInitialStock
      : Math.max(rawInitialStock, ((product.stock || 0) + totalQtySold), totalQtySold);

    const totalGoodsCost = totalInitialQty * totalUnitCost;
    const netProfit = salesRevenue - totalGoodsCost;
    
    if (netProfit > 0) {
      const shareAmount = (netProfit * product.shareholderPercentage / 100);
      stats.totalLiveShare += shareAmount;
      stats.activeProductsCount++;
      stats.productBreakdown.push({
        id: product.id,
        name: product.name,
        shareAmount: shareAmount,
        percentage: product.shareholderPercentage,
        date: product.createdAt || '',
        status: 'active'
      });
    }
  });

  // 2. Process Closed/Deleted Product Archives
  closedProductArchives.forEach(archive => {
    if (!archive.shareholderName || !archive.shareholderPercentage) return;
    const stats = getStats(archive.shareholderName);
    if (!stats) return;

    // For archives, we use the stored totalRev and totalCost
    const netProfit = archive.totalRev - archive.totalCost;
    if (netProfit > 0) {
      const shareAmount = (netProfit * archive.shareholderPercentage / 100);
      stats.totalLiveShare += shareAmount;
      stats.closedProductsCount++;
      stats.productBreakdown.push({
        id: archive.productId,
        name: archive.name,
        shareAmount: shareAmount,
        percentage: archive.shareholderPercentage,
        date: archive.createdAt || archive.closedAt || '',
        status: 'closed'
      });
    }
  });

  // 3. Filter out phantom/empty shareholders (0 live shares and no products) or deleted shareholders
  const deletedShareholders: string[] = (() => {
    try {
      return JSON.parse(localStorage.getItem('deleted_shareholders') || '[]');
    } catch {
      return [];
    }
  })();

  for (const [key, stats] of Array.from(statsMap.entries())) {
    if (
      (stats.totalLiveShare === 0 && stats.productBreakdown.length === 0) ||
      deletedShareholders.includes(key) ||
      key === normalizeKurdishText('محمد دیالا')
    ) {
      statsMap.delete(key);
    }
  }

  return statsMap;
}
