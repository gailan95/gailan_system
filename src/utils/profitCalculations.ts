import { Product, ClosedProductArchive, ProductSaleMovement, Sale, Expense } from '../types';

export interface PerformanceItem {
  id: string;
  productId: string;
  name: string;
  barcode: string;
  category: string;
  unit: string;
  status: 'active' | 'closed' | 'deleted';
  statusLabel: string;
  baseCost: number;
  totalQty: number;
  totalRev: number;
  totalCost: number;
  totalCommission: number;
  netProfit: number;
  closedAt?: string;
  productRef: Product;
}

export function calculateProductPerformanceList(
  products: Product[] = [],
  closedProductArchives: ClosedProductArchive[] = [],
  productMovements: ProductSaleMovement[] = [],
  sales: Sale[] = [],
  timeFilter: 'all' | 'today' | 'month' = 'all'
): PerformanceItem[] {
  const list: PerformanceItem[] = [];
  const processedProductIds = new Set<string>();
  const processedBarcodes = new Set<string>();

  const movByBarcode = new Map<string, ProductSaleMovement[]>();
  const movByProductId = new Map<string, ProductSaleMovement[]>();
  const movByName = new Map<string, ProductSaleMovement[]>();

  (productMovements || []).forEach((m) => {
    if (m.barcode) {
      const b = m.barcode.trim().toLowerCase();
      if (!movByBarcode.has(b)) movByBarcode.set(b, []);
      movByBarcode.get(b)!.push(m);
    }
    if (m.productId) {
      if (!movByProductId.has(m.productId)) movByProductId.set(m.productId, []);
      movByProductId.get(m.productId)!.push(m);
    }
    if (m.productName) {
      const n = m.productName.trim().toLowerCase();
      if (!movByName.has(n)) movByName.set(n, []);
      movByName.get(n)!.push(m);
    }
  });

  const now = new Date();
  const filteredSales = sales.filter((s) => {
    if (timeFilter === 'all') return true;
    const saleDate = new Date(s.date);
    if (timeFilter === 'today') {
      return saleDate.toDateString() === now.toDateString();
    }
    if (timeFilter === 'month') {
      return (
        saleDate.getMonth() === now.getMonth() &&
        saleDate.getFullYear() === now.getFullYear()
      );
    }
    return true;
  });

  // 1. Process current products
  products.forEach((product) => {
    const baseCost =
      (product.purchasePrice || 0) +
      (product.driverFee || 0) +
      (product.workerFee || 0) +
      (product.forkliftFee || 0) +
      (product.otherFee || 0) +
      (product.expenseFee || 0);

    const prodBarcode = product.barcode ? product.barcode.trim().toLowerCase() : '';
    const prodName = product.name ? product.name.trim().toLowerCase() : '';

    let matchingMovements: ProductSaleMovement[] = [];
    if (prodBarcode && movByBarcode.has(prodBarcode)) {
      matchingMovements = movByBarcode.get(prodBarcode)!;
    } else if (movByProductId.has(product.id)) {
      matchingMovements = movByProductId.get(product.id)!;
    } else if (prodName && movByName.has(prodName)) {
      matchingMovements = movByName.get(prodName)!;
    }

    let totalQty = 0;
    let totalRev = 0;

    if (matchingMovements.length > 0) {
      const timeFiltered = matchingMovements.filter((m) => {
        if (timeFilter === 'all') return true;
        const moveDate = new Date(m.date);
        if (timeFilter === 'today') {
          return moveDate.toDateString() === now.toDateString();
        }
        if (timeFilter === 'month') {
          return (
            moveDate.getMonth() === now.getMonth() &&
            moveDate.getFullYear() === now.getFullYear()
          );
        }
        return true;
      });
      totalQty = timeFiltered.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
      totalRev = timeFiltered.reduce((acc, m) => acc + (Number(m.totalAmount) || 0), 0);
    } else {
      filteredSales.forEach((sale) => {
        (sale.items || []).forEach((item) => {
          const itemB = item.barcode ? item.barcode.trim().toLowerCase() : '';
          const prodB = product.barcode ? product.barcode.trim().toLowerCase() : '';
          const itemN = item.productName ? item.productName.trim().toLowerCase() : '';
          const prodN = product.name ? product.name.trim().toLowerCase() : '';

          let isMatch = false;
          if (item.productId && item.productId === product.id) {
            isMatch = true;
          } else if (itemB && prodB && itemB === prodB) {
            isMatch = true;
          } else if (itemN && prodN && itemN === prodN) {
            isMatch = true;
          }

          if (isMatch) {
            totalQty += Number(item.quantity) || 0;
            totalRev += Number(item.total) || 0;
          }
        });
      });
    }

    const totalInitialQty = (product.initialStock && product.initialStock > 0)
      ? product.initialStock
      : ((product.stock || 0) + totalQty);

    const costQty = totalInitialQty > 0 ? totalInitialQty : 1;
    const purchaseCost = (product.purchasePriceTotal !== undefined && product.purchasePriceTotal > 0)
      ? product.purchasePriceTotal
      : Math.round((product.purchasePrice || 0) * costQty);
    const driverCost = (product.driverFeeTotal !== undefined && product.driverFeeTotal > 0)
      ? product.driverFeeTotal
      : Math.round((product.driverFee || 0) * costQty);
    const forkliftCost = (product.forkliftFeeTotal !== undefined && product.forkliftFeeTotal > 0)
      ? product.forkliftFeeTotal
      : Math.round((product.forkliftFee || 0) * costQty);
    const workerCost = (product.workerFeeTotal !== undefined && product.workerFeeTotal > 0)
      ? product.workerFeeTotal
      : Math.round((product.workerFee || 0) * costQty);
    const expenseCost = (product.expenseFeeTotal !== undefined && product.expenseFeeTotal > 0)
      ? product.expenseFeeTotal
      : Math.round((product.expenseFee || 0) * costQty);
    const otherCost = (product.otherFeeTotal !== undefined && product.otherFeeTotal > 0)
      ? product.otherFeeTotal
      : Math.round((product.otherFee || 0) * costQty);

    const totalBatchCosts = purchaseCost + driverCost + forkliftCost + workerCost + expenseCost + otherCost;

    const isProductClosed = Boolean(product.isClosed);
    const totalCost = isProductClosed
      ? (totalBatchCosts > 0 ? totalBatchCosts : totalQty * baseCost)
      : (totalQty * baseCost);
    const totalCommission = Number(product.commissionAmount) || 0;
    
    // هاوکێشە: فرۆش - تێچووی کڕین - کرێی گواستنەوە - کرێی رافعە - کرێی کرێکار - مەسروف/خەرجی تر - پشکی هاوبەش
    const grossProfit = isProductClosed ? (totalRev + totalCommission - totalCost) : (totalRev - totalCost);
    const shareholderPercent = Number(product.shareholderPercentage) || 0;
    const shareholderShare = (product.shareholderName && shareholderPercent > 0 && grossProfit > 0)
      ? Math.round((grossProfit * shareholderPercent) / 100)
      : 0;
    const netProfit = grossProfit - shareholderShare;

    const status: 'active' | 'closed' = isProductClosed ? 'closed' : 'active';
    const statusLabel = isProductClosed ? 'تەواوبوو / داخراو' : 'چالاک';

    processedProductIds.add(product.id);
    if (prodBarcode) processedBarcodes.add(prodBarcode);

    list.push({
      id: product.id,
      productId: product.id,
      name: product.name,
      barcode: product.barcode || '',
      category: product.category || 'گشتی',
      unit: product.unit || 'دانە',
      status,
      statusLabel,
      baseCost,
      totalQty,
      totalRev,
      totalCost,
      totalCommission,
      netProfit,
      closedAt: product.closedAt,
      productRef: product,
    });
  });

  // 2. Process closedProductArchives
  closedProductArchives.forEach((archive) => {
    const archBarcode = archive.barcode ? archive.barcode.trim().toLowerCase() : '';
    const archName = archive.name ? archive.name.trim().toLowerCase() : '';

    if (processedProductIds.has(archive.productId) || (archBarcode && processedBarcodes.has(archBarcode))) {
      return;
    }

    processedProductIds.add(archive.productId);
    if (archBarcode) processedBarcodes.add(archBarcode);

    const baseCost =
      (archive.purchasePrice || 0) +
      (archive.driverFee || 0) +
      (archive.workerFee || 0) +
      (archive.forkliftFee || 0) +
      (archive.otherFee || 0) +
      (archive.expenseFee || 0) || archive.baseCost;

    let matchingMovements: ProductSaleMovement[] = [];
    if (archBarcode && movByBarcode.has(archBarcode)) {
      matchingMovements = movByBarcode.get(archBarcode)!;
    } else if (movByProductId.has(archive.productId)) {
      matchingMovements = movByProductId.get(archive.productId)!;
    } else if (archName && movByName.has(archName)) {
      matchingMovements = movByName.get(archName)!;
    }

    let totalQty = 0;
    let totalRev = 0;

    if (matchingMovements.length > 0) {
      const timeFiltered = matchingMovements.filter((m) => {
        if (timeFilter === 'all') return true;
        const moveDate = new Date(m.date);
        if (timeFilter === 'today') {
          return moveDate.toDateString() === now.toDateString();
        }
        if (timeFilter === 'month') {
          return (
            moveDate.getMonth() === now.getMonth() &&
            moveDate.getFullYear() === now.getFullYear()
          );
        }
        return true;
      });
      totalQty = timeFiltered.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
      totalRev = timeFiltered.reduce((acc, m) => acc + (Number(m.totalAmount) || 0), 0);
    } else {
      let matchedAny = false;
      filteredSales.forEach((sale) => {
        (sale.items || []).forEach((item) => {
          const itemB = item.barcode ? item.barcode.trim().toLowerCase() : '';
          const itemN = item.productName ? item.productName.trim().toLowerCase() : '';

          let isMatch = false;
          if (item.productId && item.productId === archive.productId) {
            isMatch = true;
          } else if (itemB && archBarcode && itemB === archBarcode) {
            isMatch = true;
          } else if (itemN && archName && itemN === archName) {
            isMatch = true;
          }

          if (isMatch) {
            matchedAny = true;
            totalQty += Number(item.quantity) || 0;
            totalRev += Number(item.total) || 0;
          }
        });
      });

      if (!matchedAny && timeFilter === 'all') {
        totalQty = archive.totalSoldQty || 0;
        totalRev = archive.totalRevenue || 0;
      }
    }

    const totalInitialQty = (archive.initialStock && archive.initialStock > 0)
      ? archive.initialStock
      : ((archive.stockAtClose || 0) + totalQty);

    const totalGoodsCost = archive.totalCost || (totalInitialQty * baseCost);
    const isArchClosed = archive.isClosed !== false;
    const totalCost = isArchClosed
      ? (totalGoodsCost > 0 ? totalGoodsCost : totalQty * baseCost)
      : (totalQty * baseCost);
    const totalCommission = Number(archive.commissionAmount) || 0;
    
    // فۆرمۆلا: قازانجی کاڵای داخراو = فرۆشی کاڵا تەواو بووەکان + کۆی عموولە - تێچوو
    const netProfit = isArchClosed ? (totalRev + totalCommission - totalCost) : (totalRev - totalCost);

    const productRef: Product = {
      id: archive.productId,
      barcode: archive.barcode,
      name: archive.name,
      category: archive.category,
      purchasePrice: archive.purchasePrice,
      sellingPrice: archive.totalSoldQty > 0 ? (archive.totalRevenue / archive.totalSoldQty) : 0,
      stock: archive.stockAtClose,
      initialStock: archive.initialStock || totalInitialQty,
      minStockAlert: 0,
      unit: archive.unit,
      driverFee: archive.driverFee,
      workerFee: archive.workerFee,
      forkliftFee: archive.forkliftFee,
      otherFee: archive.otherFee,
      expenseFee: archive.expenseFee,
      commissionAmount: archive.commissionAmount,
      commissionPercent: archive.commissionPercent,
      isClosed: true,
      closedAt: archive.closedAt,
      notes: archive.notes,
      createdAt: archive.closedAt,
      updatedAt: archive.closedAt,
    };

    list.push({
      id: archive.id,
      productId: archive.productId,
      name: archive.name,
      barcode: archive.barcode || '',
      category: archive.category || 'گشتی',
      unit: archive.unit || 'دانە',
      status: isArchClosed ? 'closed' : 'deleted',
      statusLabel: isArchClosed ? 'تەواوبوو / داخراو' : 'سڕاوە لە کۆگا (قازانج و زەرەر پارێزراوە)',
      baseCost,
      totalQty,
      totalRev,
      totalCost,
      totalCommission,
      netProfit,
      closedAt: archive.closedAt,
      productRef,
    });
  });

  // 3. Fallback for orphaned sales
  const orphanMap = new Map<string, {
    name: string;
    barcode: string;
    unit: string;
    totalQty: number;
    totalRev: number;
    totalCost: number;
    productId: string;
  }>();

  filteredSales.forEach((sale) => {
    (sale.items || []).forEach((item) => {
      const itemB = item.barcode ? item.barcode.trim().toLowerCase() : '';
      const itemPid = item.productId || '';
      if (itemPid && processedProductIds.has(itemPid)) return;
      if (itemB && processedBarcodes.has(itemB)) return;

      const key = itemB || itemPid || item.productName.trim().toLowerCase();
      const existing = orphanMap.get(key) || {
        name: item.productName,
        barcode: item.barcode || '',
        unit: item.unit || 'دانە',
        totalQty: 0,
        totalRev: 0,
        totalCost: 0,
        productId: item.productId || `orphan-${Date.now()}-${Math.random()}`,
      };

      existing.totalQty += Number(item.quantity) || 0;
      existing.totalRev += Number(item.total) || 0;
      existing.totalCost += (Number(item.purchasePrice) || 0) * (Number(item.quantity) || 0);
      orphanMap.set(key, existing);
    });
  });

  orphanMap.forEach((orphan, key) => {
    const netProfit = orphan.totalRev - orphan.totalCost;
    const baseCost = orphan.totalQty > 0 ? orphan.totalCost / orphan.totalQty : 0;
    const productRef: Product = {
      id: orphan.productId,
      barcode: orphan.barcode,
      name: orphan.name,
      category: 'سڕاوە لە کۆگا',
      purchasePrice: baseCost,
      sellingPrice: orphan.totalQty > 0 ? orphan.totalRev / orphan.totalQty : 0,
      stock: 0,
      minStockAlert: 0,
      unit: orphan.unit,
      isClosed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.push({
      id: `orphan-${key}`,
      productId: orphan.productId,
      name: orphan.name,
      barcode: orphan.barcode,
      category: 'سڕاوە لە کۆگا',
      unit: orphan.unit,
      status: 'deleted',
      statusLabel: 'سڕاوە لە کۆگا (قازانج و زەرەر پارێزراوە)',
      baseCost,
      totalQty: orphan.totalQty,
      totalRev: orphan.totalRev,
      totalCost: orphan.totalCost,
      totalCommission: 0,
      netProfit,
      productRef,
    });
  });

  return list;
}

export function calculateNetProfitOfClosedProducts(
  products: Product[] = [],
  closedProductArchives: ClosedProductArchive[] = [],
  productMovements: ProductSaleMovement[] = [],
  sales: Sale[] = [],
  expenses: Expense[] = [],
  timeFilter: 'all' | 'today' | 'month' = 'all'
): {
  closedProductsProfit: number;
  totalCommission?: number;
  totalExpenses: number;
  netProfit: number;
  closedCount: number;
} {
  const performanceList = calculateProductPerformanceList(
    products,
    closedProductArchives,
    productMovements,
    sales,
    timeFilter
  );

  const closedList = performanceList.filter(
    (p) => p.status === 'closed'
  );

  const regularClosedList = closedList.filter((p) => {
    const ref = p.productRef as any;
    const isComm = Boolean(ref?.isCommissionSettled) || Number(ref?.commissionAmount) > 0;
    return !isComm;
  });

  const commissionClosedList = closedList.filter((p) => {
    const ref = p.productRef as any;
    const isComm = Boolean(ref?.isCommissionSettled) || Number(ref?.commissionAmount) > 0;
    return isComm;
  });

  const closedRev = regularClosedList.reduce((sum, item) => sum + (Number(item.totalRev) || 0), 0);
  const closedCost = regularClosedList.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
  // فۆرمۆلا: قازانجی کاڵای داخراو = فرۆشی کاڵا تەواو بووەکان - تێچووی کاڵای تەواوبوو
  const closedProductsProfit = regularClosedList.length === 0 ? 0 : (closedRev - closedCost);

  const totalCommission = commissionClosedList.reduce(
    (sum, item) => sum + (Number((item.productRef as any)?.commissionAmount) || 0),
    0
  );

  const now = new Date();
  const filteredExpenses = expenses.filter((e) => {
    if (e.category === 'عمولە') return false;
    if (timeFilter === 'all') return true;
    const expDate = new Date(e.date);
    if (timeFilter === 'today') {
      return expDate.toDateString() === now.toDateString();
    }
    if (timeFilter === 'month') {
      return (
        expDate.getMonth() === now.getMonth() &&
        expDate.getFullYear() === now.getFullYear()
      );
    }
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  // فۆرمۆلای قازانجی پوخت: قازانجی کاڵای داخراو + کۆی قازانجی عمولە - کۆی خەرجییەکان
  const netProfit = closedProductsProfit + totalCommission - totalExpenses;

  return {
    closedProductsProfit,
    totalCommission,
    totalExpenses,
    netProfit,
    closedCount: closedList.length,
  };
}
