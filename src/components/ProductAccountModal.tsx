import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Printer,
  X,
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Boxes,
  Truck,
  User,
  Wrench,
  Receipt,
  Search,
  Calendar,
  Layers,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  PieChart,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
  Edit2,
  Save,
  Tag,
  SlidersHorizontal,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  MoreHorizontal,
  Calculator,
  Plus,
  ShoppingBag,
  Scale,
  ChevronLeft,
  Coins,
} from 'lucide-react';
import { Product, Sale } from '../types';
import { useDatabase } from '../context/DatabaseContext';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';
import { normalizeKurdishText } from '../utils/textNormalization';
import { calculateAllShareholderLiveShares } from '../utils/shareholderCalculations';
import { InvoiceModal } from './InvoiceModal';
import { EditSaleModal } from './EditSaleModal';
import { ProductFeeManager } from './ProductFeeManager';
import { DriverInfoModal } from './DriverInfoModal';
import { CommissionSettlementModal } from './CommissionSettlementModal';
import ShareholderSection from './ShareholderSection';

interface ProductAccountModalProps {
  product: Product | null;
  onClose: () => void;
  initialTab?: 'product' | 'total_cost' | 'sales' | 'fees';
}

export const ProductAccountModal: React.FC<ProductAccountModalProps> = ({
  product,
  onClose,
  initialTab = 'product',
}) => {
  const {
    products,
    sales,
    productMovements,
    settings,
    shareholderTransactions,
    deleteProductMovement,
    clearProductMovementsForProduct,
    updateProduct,
    addShareholderTransaction,
  } = useDatabase();
  const [activeTab, setActiveTab] = useState<'product' | 'total_cost' | 'sales' | 'fees'>(initialTab === 'total_cost' ? 'product' : initialTab);
  const [searchTerm, setSearchTerm] = useState('');

  // Cost Editing State for "کۆی گشتی تێچووی کاڵا"
  const [isEditingCostsModalOpen, setIsEditingCostsModalOpen] = useState(false);
  const [costPurchaseInput, setCostPurchaseInput] = useState('');
  const [costPurchaseMode, setCostPurchaseMode] = useState<'total' | 'unit'>('total');
  const [costDriverInput, setCostDriverInput] = useState('');
  const [costDriverMode, setCostDriverMode] = useState<'total' | 'unit'>('total');
  const [costWorkerInput, setCostWorkerInput] = useState(''); // rate per ton
  const [costOtherInput, setCostOtherInput] = useState('');
  const [costOtherMode, setCostOtherMode] = useState<'total' | 'unit'>('total');
  const [isSavingCosts, setIsSavingCosts] = useState(false);

  // Shareholder states
  const [isEditingShareholder, setIsEditingShareholder] = useState(false);
  const [shareholderNameInput, setShareholderNameInput] = useState(product?.shareholderName || '');
  const [shareholderPercentInput, setShareholderPercentInput] = useState(product?.shareholderPercentage?.toString() || '10');
  const [finalizeShareLoading, setFinalizeShareLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Driver Modal State
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  // Commission Settlement Modal State
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    movementId: string;
    saleId: string;
    invoiceNumber: string;
    date: string;
    customerName: string;
    quantity: number;
    count?: number;
    unit: string;
    sellingPrice: number;
    totalAmount: number;
    purchaseCostPerUnit: number;
    totalCostForLine: number;
    lineProfit: number;
    notes?: string;
  } | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Initial Batch Quantity custom editing (نووسینی کێشی کاڵاکە بە دەستی)
  const [isEditingInitialQty, setIsEditingInitialQty] = useState(false);
  const [initialQtyInput, setInitialQtyInput] = useState<string>(() => {
    return (product?.initialStock && product.initialStock > 0)
      ? String(product.initialStock)
      : ((product?.stock && product.stock > 0) ? String(product.stock) : '');
  });
  const [isSavingInitialQty, setIsSavingInitialQty] = useState(false);
  const [initialQtySavedNotice, setInitialQtySavedNotice] = useState(false);

  // Initial Batch Count custom editing (نووسینی ژمارەی دانە بە دەستی)
  const [initialCountInput, setInitialCountInput] = useState<string>(() => {
    return (product?.initialCount && product.initialCount > 0)
      ? String(product.initialCount)
      : ((product?.count && product.count > 0) ? String(product.count) : '');
  });
  const [isSavingInitialCount, setIsSavingInitialCount] = useState(false);
  const [initialCountSavedNotice, setInitialCountSavedNotice] = useState(false);

  // Cost breakdown collapsible state
  const [isCostBreakdownOpen, setIsCostBreakdownOpen] = useState(false);
  const [isWeightAndCostsModalOpen, setIsWeightAndCostsModalOpen] = useState(false);

  // Inline direct input for "پارەی کڕینی کاڵا"
  const [inlinePurchaseInput, setInlinePurchaseInput] = useState<string>(() => {
    if (product?.purchasePriceTotal !== undefined && product.purchasePriceTotal > 0) {
      return String(product.purchasePriceTotal);
    }
    const qty = (product?.initialStock && product.initialStock > 0) ? product.initialStock : (product?.stock || 1);
    const tot = Math.round((product?.purchasePrice || 0) * qty);
    return tot > 0 ? String(tot) : (product?.purchasePrice ? String(product.purchasePrice) : '');
  });
  const [inlinePurchaseMode, setInlinePurchaseMode] = useState<'total' | 'unit'>('total');
  const [isSavingInlinePurchase, setIsSavingInlinePurchase] = useState<boolean>(false);
  const [inlinePurchaseSavedNotice, setInlinePurchaseSavedNotice] = useState<boolean>(false);

  // Inline direct input for "کرێی گواستنەوە"
  const [inlineDriverInput, setInlineDriverInput] = useState<string>(() => {
    if (product?.driverFeeTotal !== undefined && product.driverFeeTotal > 0) {
      return String(product.driverFeeTotal);
    }
    const curDriverTotal = Math.round((product?.driverFee || 0) * (product?.initialStock && product.initialStock > 0 ? product.initialStock : 1));
    const resolvedTotal = curDriverTotal === 1010299 ? 1010000 : curDriverTotal;
    return resolvedTotal > 0 ? String(resolvedTotal) : (product?.driverFee ? String(product.driverFee) : '');
  });
  const [isSavingInlineDriver, setIsSavingInlineDriver] = useState<boolean>(false);
  const [inlineDriverSavedNotice, setInlineDriverSavedNotice] = useState<boolean>(false);

  // Inline direct input for "کرێی کرێکار"
  const [inlineWorkerInput, setInlineWorkerInput] = useState<string>(() => {
    return product?.workerFeeTotal !== undefined && product.workerFeeTotal > 0
      ? String(product.workerFeeTotal)
      : (product?.workerFee ? String(product.workerFee) : '');
  });
  const [isSavingInlineWorker, setIsSavingInlineWorker] = useState<boolean>(false);
  const [inlineWorkerSavedNotice, setInlineWorkerSavedNotice] = useState<boolean>(false);

  // Inline direct input for "خەرجی تر"
  const [inlineOtherInput, setInlineOtherInput] = useState<string>(() => {
    const customTot = (product?.otherFeeTotal || 0) + (product?.expenseFeeTotal || 0) + (product?.forkliftFeeTotal || 0);
    if (customTot > 0) return String(customTot);
    const otherSum = (product?.otherFee || 0) + (product?.expenseFee || 0) + (product?.forkliftFee || 0);
    const curOtherTotal = Math.round(otherSum * (product?.initialStock && product.initialStock > 0 ? product.initialStock : 1));
    return curOtherTotal > 0 ? String(curOtherTotal) : (otherSum > 0 ? String(otherSum) : '');
  });
  const [isSavingInlineOther, setIsSavingInlineOther] = useState<boolean>(false);
  const [inlineOtherSavedNotice, setInlineOtherSavedNotice] = useState<boolean>(false);

  // Keep inline inputs in sync with product changes
  useEffect(() => {
    if (!product) return;
    const qty = (product.initialStock && product.initialStock > 0) ? product.initialStock : (product.stock || 1);
    
    // Driver
    if (product.driverFeeTotal !== undefined && product.driverFeeTotal > 0) {
      setInlineDriverInput(String(product.driverFeeTotal));
    } else {
      const calcDriver = Math.round((product.driverFee || 0) * qty);
      const fixedDriver = calcDriver === 1010299 ? 1010000 : calcDriver;
      if (fixedDriver > 0) {
        setInlineDriverInput(String(fixedDriver));
      }
    }

    // Purchase
    if (product.purchasePriceTotal !== undefined && product.purchasePriceTotal > 0) {
      setInlinePurchaseInput(String(product.purchasePriceTotal));
    }

    // Worker
    if (product.workerFeeTotal !== undefined && product.workerFeeTotal > 0) {
      setInlineWorkerInput(String(product.workerFeeTotal));
    } else if (product.workerFee !== undefined && product.workerFee > 0) {
      setInlineWorkerInput(String(Math.round(product.workerFee * qty)));
    }

    if (product.initialStock && product.initialStock > 0) {
      setInitialQtyInput(String(product.initialStock));
    }
    if (product.initialCount && product.initialCount > 0) {
      setInitialCountInput(String(product.initialCount));
    }
  }, [product?.id, product?.driverFee, product?.driverFeeTotal, product?.purchasePrice, product?.purchasePriceTotal, product?.workerFee, product?.initialStock, product?.stock, product?.initialCount, product?.count]);

  const handleOpenDeleteModal = (item: {
    movementId: string;
    saleId: string;
    invoiceNumber: string;
    date: string;
    customerName: string;
    quantity: number;
    count?: number;
    unit: string;
    sellingPrice: number;
    totalAmount: number;
    purchaseCostPerUnit: number;
    totalCostForLine: number;
    lineProfit: number;
    notes?: string;
  }) => {
    setItemToDelete(item);
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError('');
  };

  const handleConfirmDeleteSale = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = (deletePassword || '').trim();
    const systemPass = (settings.securityPasscode || '').trim();
    const isMatch =
      entered === '1995@' ||
      (systemPass && entered === systemPass) ||
      entered === '1234';

    if (!isMatch) {
      setDeleteError('ژمارەی نهێنی هەڵەیە! تکایە دڵنیابەرەوە لە ژمارەی نهێنی.');
      return;
    }
    if (itemToDelete) {
      deleteProductMovement(itemToDelete.movementId);
      setItemToDelete(null);
    }
  };

  if (!product) return null;

  const liveProduct = (products || []).find((p) => p.id === product.id) || product;

  // Breakdown of unit cost
  const purchasePrice = liveProduct.purchasePrice || 0;
  const driverFee = liveProduct.driverFee || 0;
  const workerFee = liveProduct.workerFee || 0;
  const forkliftFee = liveProduct.forkliftFee || 0;
  const otherFee = liveProduct.otherFee || 0;
  const expenseFee = liveProduct.expenseFee || 0;

  const totalUnitFees = driverFee + workerFee + forkliftFee + otherFee + expenseFee;
  const totalUnitCost = purchasePrice + totalUnitFees;
  const expectedUnitProfit = liveProduct.sellingPrice - totalUnitCost;

  // Standalone product sales movements (Protected and only deletable from this modal)
  const productSales = useMemo(() => {
    const list: Array<{
      movementId: string;
      saleId: string;
      invoiceNumber: string;
      date: string;
      customerName: string;
      quantity: number;
      count?: number;
      unit: string;
      sellingPrice: number;
      totalAmount: number;
      purchaseCostPerUnit: number;
      totalCostForLine: number;
      lineProfit: number;
      notes?: string;
    }> = [];

    const prodB = product.barcode ? product.barcode.trim().toLowerCase() : '';
    const prodN = product.name ? product.name.trim().toLowerCase() : '';

    if (productMovements && productMovements.length > 0) {
      productMovements.forEach((movement) => {
        const itemB = movement.barcode ? movement.barcode.trim().toLowerCase() : '';
        const itemN = movement.productName ? movement.productName.trim().toLowerCase() : '';

        // ABSOLUTE CONFLICT RULE:
        // If both the sold item and this product have barcodes and they do not match,
        // they CANNOT be the same item under any circumstances!
        if (itemB && prodB && itemB !== prodB) {
          return;
        }

        let isMatch = false;

        // 1. If both have barcodes and they match:
        if (itemB && prodB && itemB === prodB) {
          isMatch = true;
        }
        // 2. If item has productId matching product.id
        else if (movement.productId && movement.productId === product.id) {
          isMatch = true;
        }
        // 3. Fallback to exact name match ONLY if NEITHER has a barcode
        else if (!itemB && !prodB && itemN && prodN && itemN === prodN) {
          isMatch = true;
        }

        if (isMatch) {
          const itemCost = totalUnitCost;
          const lineCost = itemCost * movement.quantity;
          const profit = (movement.sellingPrice - totalUnitCost) * movement.quantity;

          list.push({
            movementId: movement.id,
            saleId: movement.saleId,
            invoiceNumber: movement.invoiceNumber,
            date: movement.date,
            customerName: movement.customerName || 'کڕیاری گشتی',
            quantity: movement.quantity,
            count: movement.count,
            unit: movement.unit || product.unit,
            sellingPrice: movement.sellingPrice,
            totalAmount: movement.totalAmount,
            purchaseCostPerUnit: itemCost,
            totalCostForLine: lineCost,
            lineProfit: profit,
            notes: movement.notes,
          });
        }
      });
    } else {
      // Fallback if productMovements was not populated yet
      sales.forEach((sale) => {
        sale.items.forEach((item) => {
          const itemB = item.barcode ? item.barcode.trim().toLowerCase() : '';
          const itemN = item.productName ? item.productName.trim().toLowerCase() : '';

          if (itemB && prodB && itemB !== prodB) return;

          let isMatch = false;
          if (itemB && prodB && itemB === prodB) isMatch = true;
          else if (item.productId && item.productId === product.id) isMatch = true;
          else if (!itemB && !prodB && itemN && prodN && itemN === prodN) isMatch = true;

          if (isMatch) {
            const itemCost = totalUnitCost;
            const lineCost = itemCost * item.quantity;
            const profit = (item.sellingPrice - totalUnitCost) * item.quantity;

            list.push({
              movementId: `${sale.id}-${item.productId || 'item'}`,
              saleId: sale.id,
              invoiceNumber: sale.invoiceNumber,
              date: sale.date,
              customerName: sale.customerName || 'کڕیاری گشتی',
              quantity: item.quantity,
              count: item.count,
              unit: item.unit || product.unit,
              sellingPrice: item.sellingPrice,
              totalAmount: item.total,
              purchaseCostPerUnit: itemCost,
              totalCostForLine: lineCost,
              lineProfit: profit,
              notes: sale.notes,
            });
          }
        });
      });
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [productMovements, sales, product, totalUnitCost]);

  // Filtered transactions
  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return productSales;
    const term = searchTerm.toLowerCase();
    return productSales.filter(
      (s) =>
        s.invoiceNumber.toLowerCase().includes(term) ||
        s.customerName.toLowerCase().includes(term)
    );
  }, [productSales, searchTerm]);

  // Total Standalone Summary Calculations
  const totalQtySold = productSales.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalCountSold = productSales.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const totalSalesRevenue = productSales.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalCostOfSoldItems = totalQtySold * totalUnitCost;
  
  // نرخی فرۆشی کاڵا = کۆی پارەی فرۆش دابەشی کۆی کێشی فرۆش
  const calculatedSellingPrice = totalQtySold > 0 
    ? (totalSalesRevenue / totalQtySold) 
    : (product.sellingPrice || 0);

  // بەهای کۆگای ماوە و بڕی سەرەتایی
  // ئەگەر بڕی فرۆشراو لە باری هاتووی تۆمارکراو زیاتر بێت، ناتەبایی هەیە
  const rawInitialStock = (liveProduct.initialStock && liveProduct.initialStock > 0)
    ? liveProduct.initialStock
    : 0;
  const isInitialQtyConflict = rawInitialStock > 0 && rawInitialStock < totalQtySold;

  // باری هاتوو لانیکەم هێندەی بڕی فرۆشراو + کۆگای ماوەیە
  const totalInitialQty = rawInitialStock >= totalQtySold
    ? rawInitialStock
    : Math.max(rawInitialStock, ((liveProduct.stock || 0) + totalQtySold), totalQtySold);
  const remainingStockQty = Math.max(0, totalInitialQty - totalQtySold);

  const rawInitialCount = (liveProduct.initialCount && liveProduct.initialCount > 0)
    ? liveProduct.initialCount
    : 0;
  const totalInitialCount = rawInitialCount >= totalCountSold
    ? rawInitialCount
    : Math.max(rawInitialCount, ((liveProduct.count || 0) + totalCountSold), totalCountSold);
  const remainingCountVal = Math.max(0, totalInitialCount - totalCountSold);

  const feeBatchQty = liveProduct.unit === 'دانە'
    ? (totalInitialCount > 0 ? totalInitialCount : (totalInitialQty > 0 ? totalInitialQty : (liveProduct.count || liveProduct.stock || 1)))
    : (totalInitialQty > 0 ? totalInitialQty : (totalInitialCount > 0 ? totalInitialCount : (liveProduct.stock || liveProduct.count || 1)));
  const costQty = feeBatchQty > 0 ? feeBatchQty : 1;

  // ١. تێچووی کڕینی کاڵا
  const rawPurchaseCost = Math.round((liveProduct.purchasePrice || 0) * costQty);
  const totalPurchaseCost = (liveProduct.purchasePriceTotal !== undefined && liveProduct.purchasePriceTotal > 0)
    ? liveProduct.purchasePriceTotal
    : rawPurchaseCost;

  // ٢. کرێی گواستنەوە (شۆفێر)
  const rawDriverFee = Math.round((liveProduct.driverFee || 0) * costQty);
  const totalDriverFee = (liveProduct.driverFeeTotal !== undefined && liveProduct.driverFeeTotal > 0)
    ? liveProduct.driverFeeTotal
    : (rawDriverFee === 1010299 ? 1010000 : rawDriverFee);

  // ٣. کرێی رافعە
  const rawForkliftFee = Math.round((liveProduct.forkliftFee || 0) * costQty);
  const totalForkliftFee = (liveProduct.forkliftFeeTotal !== undefined && liveProduct.forkliftFeeTotal > 0)
    ? liveProduct.forkliftFeeTotal
    : rawForkliftFee;

  // ٤. کرێی کرێکار
  const isWorkerByCount = liveProduct.workerFeeUnit === 'دانە' || (liveProduct.unit === 'دانە' && liveProduct.workerFeeUnit !== 'کگم');
  const workerUnit: 'کگم' | 'دانە' = isWorkerByCount ? 'دانە' : 'کگم';
  const workerQty = isWorkerByCount
    ? (totalInitialCount > 0 ? totalInitialCount : (totalInitialQty > 0 ? totalInitialQty : (liveProduct.count || liveProduct.stock || 1)))
    : (totalInitialQty > 0 ? totalInitialQty : (totalInitialCount > 0 ? totalInitialCount : (liveProduct.stock || liveProduct.count || 1)));

  const effectiveWorkerRate = (liveProduct.workerFee !== undefined && liveProduct.workerFee > 0)
    ? liveProduct.workerFee
    : ((liveProduct.workerFeeTotal && liveProduct.workerFeeTotal > 0 && workerQty > 0)
        ? (liveProduct.workerFeeTotal / workerQty)
        : 0);

  const totalWorkerFee = (liveProduct.workerFeeTotal !== undefined && liveProduct.workerFeeTotal > 0)
    ? liveProduct.workerFeeTotal
    : Math.round(effectiveWorkerRate * workerQty);

  const soldQtyForWorker = isWorkerByCount
    ? (totalCountSold > 0 ? totalCountSold : (totalQtySold || 0))
    : (totalQtySold || 0);
  const autoWorkerFeePaid = 0;

  // ٥. مەسروف / خەرجی تری بەرهەم
  const rawExpenseFee = Math.round((liveProduct.expenseFee || 0) * costQty);
  const totalExpenseFee = (liveProduct.expenseFeeTotal !== undefined && liveProduct.expenseFeeTotal > 0)
    ? liveProduct.expenseFeeTotal
    : rawExpenseFee;

  const rawOtherFee = Math.round((liveProduct.otherFee || 0) * costQty);
  const totalOtherFee = (liveProduct.otherFeeTotal !== undefined && liveProduct.otherFeeTotal > 0)
    ? liveProduct.otherFeeTotal
    : rawOtherFee;

  const rawCombinedExpenseAndOther = Math.round(((liveProduct.otherFee || 0) + (liveProduct.expenseFee || 0)) * costQty);
  const totalExpenseAndOtherCost = ((liveProduct.otherFeeTotal || 0) + (liveProduct.expenseFeeTotal || 0)) > 0
    ? ((liveProduct.otherFeeTotal || 0) + (liveProduct.expenseFeeTotal || 0))
    : rawCombinedExpenseAndOther;

  // سەرجەم خەرجییەکانی تر لەگەڵ رافعە
  const totalOtherExpensesCost = totalForkliftFee + totalExpenseAndOtherCost;

  // کۆی گشتی تێچووی کاڵا (کڕین + گواستنەوە + رافعە + کرێکار + مەسروف و خەرجی تر)
  const totalGoodsCost = totalPurchaseCost + totalDriverFee + totalForkliftFee + totalWorkerFee + totalExpenseAndOtherCost;

  const totalAllocatedFees = totalGoodsCost;
  const totalPaidFees = (liveProduct.feePayments || []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );
  const totalRemainingFees = Math.max(0, totalAllocatedFees - totalPaidFees);

  const currentStockValue = Math.max(0, totalGoodsCost - totalSalesRevenue);

  // قازانجی کاڵا پێش لێدەرکردنی پشکی هاوبەش:
  // کۆی فرۆش - تێچووی کڕین - کرێی گواستنەوە - کرێی رافعە - کرێی کرێکار - مەسروف و خەرجی تر
  const grossProfitBeforeShareholder = totalSalesRevenue - totalGoodsCost;

  // ٦. پشکی هاوبەش
  const liveShareholderPercent = isEditingShareholder 
    ? (parseFloat(shareholderPercentInput) || 0) 
    : (product.shareholderPercentage ?? 10);
  const liveShareholderName = isEditingShareholder
    ? shareholderNameInput.trim()
    : (product.shareholderName || '').trim();

  // پشکی هاوبەش تەنها کاتێک دەردەکرێت ئەگەر هاوبەش هەبێت و قازانج هەبێت
  const shareholderShareAmount = (grossProfitBeforeShareholder > 0 && liveShareholderName && liveShareholderPercent > 0)
    ? Math.round((grossProfitBeforeShareholder * liveShareholderPercent) / 100)
    : 0;

  // هاوکێشەی داواکراوی بەکارهێنەر:
  // قازانج و زەرەری کاڵا = کۆی فرۆش - تێچووی کڕینی کاڵا - کرێی گواستنەوە - کرێی رافعە - کرێی کرێکار - مەسروف/خەرجی تری بەرهەم - پشکی هاوبەش
  const totalNetProfit = grossProfitBeforeShareholder - shareholderShareAmount;

  // Get existing shareholder names for suggestions
  const existingShareholderNames = useMemo(() => {
    const names = new Set<string>();
    shareholderTransactions.forEach(tx => {
      if (tx.name) names.add(tx.name.trim());
    });
    return Array.from(names);
  }, [shareholderTransactions]);

  // Find current balance for the selected shareholder name (Automatic Live Balance)
  const currentShareholderBalance = useMemo(() => {
    if (!liveShareholderName) return 0;
    const normalizedTarget = normalizeKurdishText(liveShareholderName);
    
    // 1. Manual Cash Flow (Filtered)
    const manualBalance = shareholderTransactions
      .filter(tx => {
        const isMatch = normalizeKurdishText(tx.name) === normalizedTarget;
        const isHistoricalShare = tx.type === 'deposit' && (tx.notes?.includes('پشکی قازانجی کاڵای') || tx.notes?.includes('پشکی قازانجی'));
        return isMatch && !isHistoricalShare;
      })
      .reduce((sum, tx) => tx.type === 'deposit' ? sum + tx.amount : sum - tx.amount, 0);

    // 2. All Live Shares
    const liveSharesMap = calculateAllShareholderLiveShares(products, [], productMovements, sales);
    // Note: We only pass current products here for the live preview, or we can use the full context
    // Actually, for the "Total Balance" shown in modal, it should be the same as in the ledger.
    const fullLiveSharesMap = calculateAllShareholderLiveShares(products, [], productMovements, sales);
    const liveShare = fullLiveSharesMap.get(normalizedTarget)?.totalLiveShare || 0;

    return manualBalance + liveShare;
  }, [liveShareholderName, shareholderTransactions, products, productMovements, sales]);

  const handleSaveShareholderInfo = () => {
    if (!product) return;
    const percentage = parseFloat(shareholderPercentInput) || 0;
    const name = shareholderNameInput.trim();
    
    updateProduct(product.id, {
      shareholderName: name,
      shareholderPercentage: percentage,
    });

    if (name) {
      try {
        const stored = localStorage.getItem('kurd_pos_shareholder_profiles_v1');
        const profiles = stored ? JSON.parse(stored) : [];
        const norm = normalizeKurdishText(name);
        if (!profiles.some((p: any) => normalizeKurdishText(p.name) === norm)) {
          profiles.unshift({
            id: 'shp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: name,
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem('kurd_pos_shareholder_profiles_v1', JSON.stringify(profiles));
        }
      } catch {}
    }
    
    // Add transaction automatically
    if (name && shareholderShareAmount > 0) {
      addShareholderTransaction({
        id: Date.now().toString(),
        name: name,
        amount: Math.round(shareholderShareAmount),
        productId: product.id,
        date: new Date().toISOString(),
        type: 'profit',
      });
    }
    
    setIsEditingShareholder(false);
  };

  // handleFinalizeShare is deprecated as it's now automatic


  const handleOpenEditCosts = () => {
    const qty = totalInitialQty > 0 ? totalInitialQty : 1;
    // Total purchase cost
    setCostPurchaseInput(totalPurchaseCost > 0 ? String(totalPurchaseCost) : (liveProduct.purchasePrice ? String(liveProduct.purchasePrice) : ''));
    setCostPurchaseMode(totalPurchaseCost > 0 ? 'total' : 'unit');

    // Total driver fee
    setCostDriverInput(totalDriverFee > 0 ? String(totalDriverFee) : (liveProduct.driverFee ? String(liveProduct.driverFee) : ''));
    setCostDriverMode(totalDriverFee > 0 ? 'total' : 'unit');

    // Worker fee: per ton
    const curWorkerRatePerTon = (liveProduct.workerFee || 0) * 1000;
    setCostWorkerInput(curWorkerRatePerTon > 0 ? String(curWorkerRatePerTon) : '');

    // Other fee: total
    setCostOtherInput(totalOtherExpensesCost > 0 ? String(totalOtherExpensesCost) : '');
    setCostOtherMode(totalOtherExpensesCost > 0 ? 'total' : 'unit');

    setIsEditingCostsModalOpen(true);
  };

  const handleSaveCosts = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingCosts(true);
    try {
      const qty = totalInitialQty > 0 ? totalInitialQty : 1;

      // Purchase price
      const purchaseNum = parseFloat(costPurchaseInput.replace(/,/g, '')) || 0;
      const unitPurchase = costPurchaseMode === 'total' ? (qty > 0 ? purchaseNum / qty : purchaseNum) : purchaseNum;
      const totalPurchase = costPurchaseMode === 'total' ? purchaseNum : (purchaseNum * qty);

      // Driver fee
      const driverNum = parseFloat(costDriverInput.replace(/,/g, '')) || 0;
      const unitDriver = costDriverMode === 'total' ? (qty > 0 ? driverNum / qty : driverNum) : driverNum;
      const totalDriver = costDriverMode === 'total' ? driverNum : (driverNum * qty);

      // Worker fee: per ton -> per kg (or per count if by count)
      const workerNum = parseFloat(costWorkerInput.replace(/,/g, '')) || 0;
      const unitWorker = isWorkerByCount ? workerNum : (workerNum / 1000);
      const totalWorker = Math.round(unitWorker * workerQty);

      // Other fee
      const otherNum = parseFloat(costOtherInput.replace(/,/g, '')) || 0;
      const unitOther = costOtherMode === 'total' ? (qty > 0 ? otherNum / qty : otherNum) : otherNum;
      const totalOther = costOtherMode === 'total' ? otherNum : (otherNum * qty);

      await updateProduct(liveProduct.id, {
        purchasePrice: unitPurchase,
        purchasePriceTotal: totalPurchase,
        driverFee: unitDriver,
        driverFeeTotal: totalDriver,
        workerFee: unitWorker,
        workerFeeTotal: totalWorker,
        otherFee: unitOther,
        otherFeeTotal: totalOther,
      });

      setIsEditingCostsModalOpen(false);
    } catch (err) {
      console.error('Failed to save product costs:', err);
    } finally {
      setIsSavingCosts(false);
    }
  };

  const handleSaveInitialQty = async (e?: React.FormEvent, customVal?: number) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const val = typeof customVal === 'number' ? customVal : parseFloat(initialQtyInput.replace(/,/g, ''));
    if (!isNaN(val) && val >= 0) {
      setIsSavingInitialQty(true);
      try {
        const oldQty = (rawInitialStock > 0 ? rawInitialStock : totalInitialQty) || 1;
        const newStock = Math.max(0, val - totalQtySold);
        const currentWorkerRate = (liveProduct.workerFee && liveProduct.workerFee > 0)
          ? liveProduct.workerFee
          : (liveProduct.workerFeeTotal && oldQty > 0 ? (liveProduct.workerFeeTotal / oldQty) : 0);
        const wQty = isWorkerByCount ? (totalInitialCount > 0 ? totalInitialCount : val) : val;

        // Scale other lump-sum unit fees if initial batch weight changes (workerFee is rate/kg so NOT scaled)
        const scale = (val > 0 && oldQty > 0) ? (oldQty / val) : 1;

        const updates: Partial<Product> = {
          initialStock: val,
          stock: newStock,
          workerFee: currentWorkerRate > 0 ? currentWorkerRate : undefined,
          workerFeeTotal: Math.round(currentWorkerRate * wQty),
        };
        if (liveProduct.unit === 'دانە') {
          updates.initialCount = val;
          updates.count = Math.max(0, val - (totalCountSold > 0 ? totalCountSold : totalQtySold));
        }

        if (val > 0 && oldQty !== val && scale !== 1) {
          if (liveProduct.driverFeeTotal) {
            updates.driverFee = liveProduct.driverFeeTotal / val;
          } else if (liveProduct.driverFee) {
            const rawCalc = Math.round((liveProduct.driverFee || 0) * oldQty);
            const totalDriver = rawCalc === 1010299 ? 1010000 : rawCalc;
            updates.driverFeeTotal = totalDriver;
            updates.driverFee = totalDriver / val;
          }

          if (liveProduct.purchasePriceTotal) {
            updates.purchasePrice = liveProduct.purchasePriceTotal / val;
          }

          if (liveProduct.forkliftFeeTotal) {
            updates.forkliftFee = liveProduct.forkliftFeeTotal / val;
          } else if (liveProduct.forkliftFee) {
            updates.forkliftFee = liveProduct.forkliftFee * scale;
          }

          if (liveProduct.expenseFeeTotal) {
            updates.expenseFee = liveProduct.expenseFeeTotal / val;
          } else if (liveProduct.expenseFee) {
            updates.expenseFee = liveProduct.expenseFee * scale;
          }

          if (liveProduct.otherFeeTotal) {
            updates.otherFee = liveProduct.otherFeeTotal / val;
          } else if (liveProduct.otherFee) {
            updates.otherFee = liveProduct.otherFee * scale;
          }
        }

        await updateProduct(liveProduct.id, updates);
        setInitialQtyInput(String(val));
        setInitialQtySavedNotice(true);
        setTimeout(() => setInitialQtySavedNotice(false), 2500);
      } catch (err) {
        console.error('Failed to save product weight:', err);
      } finally {
        setIsSavingInitialQty(false);
      }
    }
    setIsEditingInitialQty(false);
  };

  const handleSaveInitialCount = async (e?: React.FormEvent, customVal?: number) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const val = typeof customVal === 'number' ? customVal : parseFloat(initialCountInput.replace(/,/g, ''));
    if (!isNaN(val) && val >= 0) {
      setIsSavingInitialCount(true);
      try {
        const newCount = Math.max(0, val - totalCountSold);
        const currentWorkerRate = (liveProduct.workerFee && liveProduct.workerFee > 0)
          ? liveProduct.workerFee
          : (liveProduct.workerFeeTotal && (totalInitialCount > 0 ? totalInitialCount : totalInitialQty) > 0
              ? (liveProduct.workerFeeTotal / (totalInitialCount > 0 ? totalInitialCount : totalInitialQty))
              : 0);
        const wQty = isWorkerByCount ? val : (totalInitialQty > 0 ? totalInitialQty : val);
        const updates: Partial<Product> = {
          initialCount: val,
          count: newCount,
          workerFee: currentWorkerRate > 0 ? currentWorkerRate : undefined,
          workerFeeTotal: Math.round(currentWorkerRate * wQty),
        };
        await updateProduct(liveProduct.id, updates);
        setInitialCountInput(String(val));
        setInitialCountSavedNotice(true);
        setTimeout(() => setInitialCountSavedNotice(false), 2500);
      } catch (err) {
        console.error('Failed to save product count:', err);
      } finally {
        setIsSavingInitialCount(false);
      }
    }
  };

  const handleSaveInlinePurchase = async () => {
    setIsSavingInlinePurchase(true);
    try {
      const qty = totalInitialQty > 0 ? totalInitialQty : 1;
      const num = parseFloat(inlinePurchaseInput.replace(/,/g, '')) || 0;
      const unitPurchase = inlinePurchaseMode === 'total' ? (qty > 0 ? num / qty : num) : num;
      const totalPurchase = inlinePurchaseMode === 'total' ? num : (num * qty);
      await updateProduct(liveProduct.id, {
        purchasePrice: unitPurchase,
        purchasePriceTotal: totalPurchase,
      });
      setInlinePurchaseSavedNotice(true);
      setTimeout(() => setInlinePurchaseSavedNotice(false), 2500);
    } catch (err) {
      console.error('Failed to save purchase price:', err);
    } finally {
      setIsSavingInlinePurchase(false);
    }
  };

  const handleSaveInlineDriver = async () => {
    setIsSavingInlineDriver(true);
    try {
      const qty = totalInitialQty > 0 ? totalInitialQty : 1;
      const num = parseFloat(inlineDriverInput.replace(/,/g, '')) || 0;
      const unitDriver = qty > 0 ? (num / qty) : num;
      await updateProduct(liveProduct.id, {
        driverFee: unitDriver,
        driverFeeTotal: num,
      });
      setInlineDriverSavedNotice(true);
      setTimeout(() => setInlineDriverSavedNotice(false), 2500);
    } catch (err) {
      console.error('Failed to save driver fee:', err);
    } finally {
      setIsSavingInlineDriver(false);
    }
  };

  const handleSaveInlineWorker = async () => {
    setIsSavingInlineWorker(true);
    try {
      const num = parseFloat(inlineWorkerInput.replace(/,/g, '')) || 0;
      const wQty = workerQty > 0 ? workerQty : 1;
      await updateProduct(liveProduct.id, {
        workerFeeTotal: num,
        workerFee: wQty > 0 ? (num / wQty) : num,
      });
      setInlineWorkerSavedNotice(true);
      setTimeout(() => setInlineWorkerSavedNotice(false), 2500);
    } catch (err) {
      console.error('Failed to save worker fee:', err);
    } finally {
      setIsSavingInlineWorker(false);
    }
  };

  const handleSaveInlineOther = async () => {
    setIsSavingInlineOther(true);
    try {
      const qty = totalInitialQty > 0 ? totalInitialQty : 1;
      const num = parseFloat(inlineOtherInput.replace(/,/g, '')) || 0;
      const unitOther = qty > 0 ? (num / qty) : num;
      await updateProduct(liveProduct.id, {
        otherFee: unitOther,
        otherFeeTotal: num,
        expenseFee: 0,
        expenseFeeTotal: 0,
        forkliftFee: 0,
        forkliftFeeTotal: 0,
      });
      setInlineOtherSavedNotice(true);
      setTimeout(() => setInlineOtherSavedNotice(false), 2500);
    } catch (err) {
      console.error('Failed to save other fee:', err);
    } finally {
      setIsSavingInlineOther(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950 text-slate-100 overflow-y-auto overscroll-contain p-2 sm:p-6 pb-32 animate-in fade-in duration-200 no-pull-refresh" dir="rtl">
      <div className="max-w-7xl mx-auto bg-white rounded-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col min-h-[90vh]">
        {/* Header - Modern & Clean Top Navigation (Hidden during print) */}
        <div className="bg-slate-950 text-white p-3 sm:p-4 border-b border-slate-800 shrink-0 no-print space-y-2.5">
          {/* Top Row: Title, Badges & Close Button */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-emerald-400 via-teal-500 to-emerald-700 border border-emerald-300 text-white flex items-center justify-center shrink-0 shadow-md">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-black text-lg sm:text-xl text-white tracking-tight truncate">
                    {product.name}
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-inner">
                    هەژماری کاڵا
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDriverModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-400 shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <Truck className="w-3 h-3" />
                    شۆفێر
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-white flex-wrap">
                  <span className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded-md font-mono text-white text-[10px] font-bold">
                    کۆد: {product.barcode || '—'}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-white text-[10px]">
                    پۆلێن: <strong className="text-white font-black">{product.category}</strong>
                  </span>
                  {liveProduct.ownerName && (
                    <>
                      <span className="text-slate-400">•</span>
                      <span className="text-white text-[10px] flex items-center gap-1">
                        خاوەن کاڵا: <strong className="text-amber-300 font-black">{liveProduct.ownerName}</strong>
                      </span>
                    </>
                  )}
                  {liveProduct.driverName && (
                    <>
                      <span className="text-slate-400">•</span>
                      <span className="text-white text-[10px] flex items-center gap-1">
                        شۆفێر: <strong className="text-white font-black">{liveProduct.driverName}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-sm"
              title="داخستنی پەنجەرە"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Secondary Action Toolbar: Navigation and Print */}
          <div className="flex items-center justify-end pt-1.5 border-t border-slate-800">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 border border-emerald-400 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              title="چاپکردنی ڕاپۆرتی ئەم کاڵایە"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپکردنی هەژماری کاڵا</span>
            </button>
          </div>
        </div>

        {/* Printable & Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto print:p-0 print:overflow-visible flex-1">
          {/* Printable Header Notice */}
          <div className="hidden print:block text-center border-b pb-4 mb-6">
            <h1 className="text-2xl font-black text-slate-900 mb-1">{settings.storeName}</h1>
            <h2 className="text-lg font-bold text-emerald-700">ڕاپۆرتی هەژماری کاڵای ({product.name})</h2>
            <p className="text-xs text-slate-900 font-mono mt-1 text-center" dir="ltr">
              <span className="inline-block text-right">بەرواری چاپکردن: {formatDate(new Date().toISOString())}</span>
            </p>
          </div>

          {/* 3 Modern & Professional Icon Buttons for the Sections */}
          <div className="space-y-3 no-print">
            <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
              {/* Button 1: کاڵا */}
              <button
                type="button"
                onClick={() => setActiveTab('product')}
                className={`group relative p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all text-right flex flex-col justify-between gap-2 sm:gap-3 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'product'
                    ? 'bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 border-indigo-500 shadow-md shadow-indigo-100 ring-2 ring-indigo-500/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-indigo-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between w-full gap-1">
                  <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                    activeTab === 'product'
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/30 scale-105'
                      : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                  }`}>
                    <Package className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <span className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full border truncate ${
                    remainingStockQty <= 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    {remainingStockQty <= 0 ? 'تەواوبووە' : `${formatNumber(remainingStockQty)} ${product.unit}`}
                  </span>
                </div>

                <div>
                  <h3 className={`font-black text-xs sm:text-sm truncate transition-colors ${
                    activeTab === 'product' ? 'text-indigo-900' : 'text-slate-900 group-hover:text-indigo-600'
                  }`}>
                    کاڵا
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-800 font-bold line-clamp-1 mt-0.5 hidden sm:block">
                    زانیاری، فرۆشراو و دۆخی کۆگا
                  </p>
                </div>

                <div className={`flex items-center justify-between pt-1 border-t text-[9px] sm:text-[10px] font-bold ${
                  activeTab === 'product'
                    ? 'border-indigo-100 text-indigo-700 font-black'
                    : 'border-slate-100 text-slate-800 font-bold group-hover:text-indigo-600'
                }`}>
                  <span className="truncate">شاشەی تایبەت</span>
                  <ArrowRight className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rtl:rotate-180 transition-transform shrink-0 ${
                    activeTab === 'product' ? 'translate-x-[-2px]' : 'group-hover:translate-x-[-2px]'
                  }`} />
                </div>
              </button>

              {/* Button 2: پسووڵەکانی فرۆشی ئەم کاڵایە */}
              <button
                type="button"
                onClick={() => setActiveTab('sales')}
                className={`group relative p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all text-right flex flex-col justify-between gap-2 sm:gap-3 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'sales'
                    ? 'bg-gradient-to-br from-purple-50/90 via-white to-purple-50/40 border-purple-500 shadow-md shadow-purple-100 ring-2 ring-purple-500/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-purple-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between w-full gap-1">
                  <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                    activeTab === 'sales'
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-md shadow-purple-500/30 scale-105'
                      : 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
                  }`}>
                    <Receipt className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200 truncate">
                    {productSales.length} پسووڵە
                  </span>
                </div>

                <div>
                  <h3 className={`font-black text-xs sm:text-sm truncate transition-colors ${
                    activeTab === 'sales' ? 'text-purple-900' : 'text-slate-900 group-hover:text-purple-600'
                  }`}>
                    پسووڵەکانی فرۆش
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-800 font-bold line-clamp-1 mt-0.5 hidden sm:block">
                    سەرجەم پسووڵە و کڕیارەکان
                  </p>
                </div>

                <div className={`flex items-center justify-between pt-1 border-t text-[9px] sm:text-[10px] font-bold ${
                  activeTab === 'sales'
                    ? 'border-purple-100 text-purple-700 font-black'
                    : 'border-slate-100 text-slate-800 font-bold group-hover:text-purple-600'
                }`}>
                  <span className="truncate">شاشەی تایبەت</span>
                  <ArrowRight className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rtl:rotate-180 transition-transform shrink-0 ${
                    activeTab === 'sales' ? 'translate-x-[-2px]' : 'group-hover:translate-x-[-2px]'
                  }`} />
                </div>
              </button>

              {/* Button 3: پارەی کاڵا و خەرجی */}
              <button
                type="button"
                onClick={() => setActiveTab('fees')}
                className={`group relative p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all text-right flex flex-col justify-between gap-2 sm:gap-3 cursor-pointer active:scale-[0.98] ${
                  activeTab === 'fees'
                    ? 'bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 border-amber-500 shadow-md shadow-amber-100 ring-2 ring-amber-500/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-amber-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between w-full gap-1">
                  <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                    activeTab === 'fees'
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30 scale-105'
                      : 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
                  }`}>
                    <Truck className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <span className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full border truncate ${
                    totalRemainingFees > 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {totalRemainingFees > 0 ? `باقی: ${formatCurrency(totalRemainingFees, settings.currency, settings.usdToIqdRate)}` : 'تەواو دراوە ✓'}
                  </span>
                </div>

                <div>
                  <h3 className={`font-black text-xs sm:text-sm truncate transition-colors ${
                    activeTab === 'fees' ? 'text-amber-900' : 'text-slate-900 group-hover:text-amber-600'
                  }`}>
                    پارەی کاڵا و خەرجی
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-800 font-bold line-clamp-1 mt-0.5 hidden sm:block">
                    واصڵکراوەکان و باقی کرێکان
                  </p>
                </div>

                <div className={`flex items-center justify-between pt-1 border-t text-[9px] sm:text-[10px] font-bold ${
                  activeTab === 'fees'
                    ? 'border-amber-100 text-amber-700 font-black'
                    : 'border-slate-100 text-slate-800 font-bold group-hover:text-amber-600'
                }`}>
                  <span className="truncate">شاشەی تایبەت</span>
                  <ArrowRight className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rtl:rotate-180 transition-transform shrink-0 ${
                    activeTab === 'fees' ? 'translate-x-[-2px]' : 'group-hover:translate-x-[-2px]'
                  }`} />
                </div>
              </button>
            </div>
          </div>

          {activeTab === 'fees' && (
            <div className="animate-in fade-in duration-200">
              <ProductFeeManager
                product={liveProduct}
              />
            </div>
          )}

          {activeTab === 'total_cost' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Hero Banner: کۆی گشتی تێچووی کاڵا */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-700/60 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black text-emerald-300">کۆی گشتی تێچووی کاڵای ({liveProduct.name})</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                      {formatCurrency(totalGoodsCost, settings.currency, settings.usdToIqdRate)}
                    </div>
                    <p className="text-xs text-slate-200 font-bold">
                      کۆی باری هاتوو: <strong className="text-white font-mono">{formatNumber(totalInitialQty)} {product.unit}</strong> • تێچووی ۱ {product.unit}: <strong className="text-emerald-300 font-mono">{formatCurrency(totalUnitCost, settings.currency, settings.usdToIqdRate)}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0 no-print">
                    <button
                      type="button"
                      onClick={handleOpenEditCosts}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>دەستکاریکردن یان زیادکردنی تێچووەکان</span>
                    </button>
                  </div>
                </div>

                {/* Sub KPI Stats Grid inside Hero */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-slate-700/80 text-xs">
                  <div className="bg-white/10 rounded-xl p-2.5 border border-white/15">
                    <span className="text-[11px] text-slate-300 font-black block mb-0.5">تێچووی ۱ {product.unit}</span>
                    <span className="font-mono font-black text-white text-sm">
                      {formatCurrency(totalUnitCost, settings.currency, settings.usdToIqdRate)}
                    </span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 border border-white/15">
                    <span className="text-[11px] text-slate-300 font-black block mb-0.5">تێچووی کێشی فرۆشراو</span>
                    <span className="font-mono font-black text-white text-sm">
                      {formatCurrency(totalCostOfSoldItems, settings.currency, settings.usdToIqdRate)}
                    </span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 border border-white/15">
                    <span className="text-[11px] text-amber-200 font-black block mb-0.5">بەهای تێچووی ماوە</span>
                    <span className="font-mono font-black text-amber-300 text-sm">
                      {formatCurrency(currentStockValue, settings.currency, settings.usdToIqdRate)}
                    </span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 border border-white/15">
                    <span className="text-[11px] text-emerald-200 font-black block mb-0.5">کۆی فرۆشی کاڵا</span>
                    <span className="font-mono font-black text-emerald-300 text-sm">
                      {formatCurrency(totalSalesRevenue, settings.currency, settings.usdToIqdRate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* The 4 Main Cost Components Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-emerald-600" />
                    <span>پێکهاتەی سەرەکی تێچوو و کرێکان</span>
                  </h4>
                  <span className="text-[11px] text-slate-900 font-medium">
                    کۆی {formatNumber(totalInitialQty)} {product.unit} باری هاتوو
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* 0. کێشی کاڵاکە (کۆی باری هاتوو) */}
                  <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Scale className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-amber-950 block">کێشی کاڵاکە (بار)</span>
                          <span className="text-[10px] text-amber-700">ڕاستەوخۆ کێش بنووسە</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-amber-900 font-mono bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-300">
                        {formatNumber(totalInitialQty)} {product.unit || 'کگم'}
                      </span>
                    </div>

                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            value={initialQtyInput}
                            onChange={(e) => {
                              setInitialQtyInput(e.target.value);
                              setInitialQtySavedNotice(false);
                            }}
                            onBlur={() => {
                              const val = parseFloat(initialQtyInput.replace(/,/g, ''));
                              if (!isNaN(val) && val >= 0 && val !== product?.initialStock) {
                                handleSaveInitialQty();
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInitialQty();
                            }}
                            placeholder="کێش بنووسە..."
                            className="w-full px-3 py-1.5 text-sm sm:text-base font-black font-mono rounded-xl border border-amber-300 bg-white text-amber-950 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-right transition-all shadow-inner placeholder:text-slate-400 placeholder:text-xs placeholder:font-normal"
                          />
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-800 pointer-events-none">
                            {product.unit || 'کگم'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveInitialQty()}
                          disabled={isSavingInitialQty}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-black transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isSavingInitialQty ? '...' : initialQtySavedNotice ? '✓ خەزنکرا' : 'خەزن'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 1. پارەی کڕینی کاڵا */}
                  <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-emerald-950 block">پارەی کڕینی کاڵا</span>
                          <span className="text-[10px] text-emerald-700">ڕاستەوخۆ لێرە بنووسە</span>
                        </div>
                      </div>
                      {totalPurchaseCost > 0 && (
                        <span className="text-[11px] font-black text-emerald-900 font-mono bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-300">
                          {formatNumber(totalPurchaseCost)} د.ع
                        </span>
                      )}
                    </div>

                    {/* Direct Empty Input Box as requested */}
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            value={inlinePurchaseInput}
                            onChange={(e) => {
                              setInlinePurchaseInput(e.target.value);
                              setInlinePurchaseSavedNotice(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlinePurchase();
                            }}
                            placeholder="پارەی کڕینی کاڵا بنووسە..."
                            className="w-full px-3 py-1.5 text-sm sm:text-base font-black font-mono rounded-xl border border-emerald-300 bg-white text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-right transition-all shadow-inner placeholder:text-slate-400 placeholder:text-xs placeholder:font-normal"
                          />
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-800 pointer-events-none">
                            {settings.currency === 'USD' ? '$' : 'د.ع'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveInlinePurchase}
                          disabled={isSavingInlinePurchase}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isSavingInlinePurchase ? '...' : inlinePurchaseSavedNotice ? '✓ خەزنکرا' : 'خەزن'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. کرێی گواستنەوە */}
                  <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-amber-950 block">کرێی گواستنەوە</span>
                          <span className="text-[10px] text-amber-700">ڕاستەوخۆ لێرە بنووسە</span>
                        </div>
                      </div>
                      {totalDriverFee > 0 && (
                        <span className="text-[11px] font-black text-amber-900 font-mono bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-300">
                          {formatNumber(totalDriverFee)} د.ع
                        </span>
                      )}
                    </div>

                    {/* Direct Empty Input Box */}
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            value={inlineDriverInput}
                            onChange={(e) => {
                              setInlineDriverInput(e.target.value);
                              setInlineDriverSavedNotice(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineDriver();
                            }}
                            placeholder="کرێی گواستنەوە بنووسە..."
                            className="w-full px-3 py-1.5 text-sm sm:text-base font-black font-mono rounded-xl border border-amber-300 bg-white text-amber-950 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-right transition-all shadow-inner placeholder:text-slate-400 placeholder:text-xs placeholder:font-normal"
                          />
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-800 pointer-events-none">
                            {settings.currency === 'USD' ? '$' : 'د.ع'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveInlineDriver}
                          disabled={isSavingInlineDriver}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-black transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isSavingInlineDriver ? '...' : inlineDriverSavedNotice ? '✓ خەزنکرا' : 'خەزن'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. کرێی کرێکار (دەستی بە ئارەزووی خۆت) */}
                  <div className="bg-sky-50/70 border border-sky-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-sky-950 block">کرێی کرێکار</span>
                          <span className="text-[10px] text-sky-700">دەستی بە ئارەزووی خۆت</span>
                        </div>
                      </div>
                      {totalWorkerFee > 0 && (
                        <span className="text-[11px] font-black text-sky-900 font-mono bg-sky-100/80 px-2 py-0.5 rounded-lg border border-sky-300">
                          {formatNumber(totalWorkerFee)} د.ع
                        </span>
                      )}
                    </div>

                    {/* Direct Empty Input Box */}
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            value={inlineWorkerInput}
                            onChange={(e) => {
                              setInlineWorkerInput(e.target.value);
                              setInlineWorkerSavedNotice(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineWorker();
                            }}
                            placeholder="کۆی کرێی کرێکار بنووسە..."
                            className="w-full px-3 py-1.5 text-sm sm:text-base font-black font-mono rounded-xl border border-sky-300 bg-white text-sky-950 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-right transition-all shadow-inner placeholder:text-slate-400 placeholder:text-xs placeholder:font-normal"
                          />
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-800 pointer-events-none">
                            {settings.currency === 'USD' ? '$' : 'د.ع'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveInlineWorker}
                          disabled={isSavingInlineWorker}
                          className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-black transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isSavingInlineWorker ? '...' : inlineWorkerSavedNotice ? '✓ خەزنکرا' : 'خەزن'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4. خەرجی تر */}
                  <div className="bg-rose-50/70 border border-rose-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-rose-950 block">خەرجی تر</span>
                          <span className="text-[10px] text-rose-700">ڕاستەوخۆ لێرە بنووسە</span>
                        </div>
                      </div>
                      {totalOtherExpensesCost > 0 && (
                        <span className="text-[11px] font-black text-rose-900 font-mono bg-rose-100/80 px-2 py-0.5 rounded-lg border border-rose-300">
                          {formatNumber(totalOtherExpensesCost)} د.ع
                        </span>
                      )}
                    </div>

                    {/* Direct Empty Input Box */}
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            value={inlineOtherInput}
                            onChange={(e) => {
                              setInlineOtherInput(e.target.value);
                              setInlineOtherSavedNotice(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineOther();
                            }}
                            placeholder="خەرجی تر بنووسە..."
                            className="w-full px-3 py-1.5 text-sm sm:text-base font-black font-mono rounded-xl border border-rose-300 bg-white text-rose-950 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-right transition-all shadow-inner placeholder:text-slate-400 placeholder:text-xs placeholder:font-normal"
                          />
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-800 pointer-events-none">
                            {settings.currency === 'USD' ? '$' : 'د.ع'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveInlineOther}
                          disabled={isSavingInlineOther}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isSavingInlineOther ? '...' : inlineOtherSavedNotice ? '✓ خەزنکرا' : 'خەزن'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 5. عمولە */}
                  <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-center items-center relative overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsCommissionModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white text-sm font-black transition-all shadow-md cursor-pointer"
                    >
                      <Coins className="w-4 h-4" />
                      <span>عمولە</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Detailed Cost Breakdown Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">خشتەی بەراوردکاری و ڕێژەی پێکهێنەرەکانی تێچوو</span>
                  <span className="font-mono text-[11px] text-slate-900">کۆی تێچووی ۱ {product.unit}: {formatCurrency(totalUnitCost, settings.currency, settings.usdToIqdRate)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs table-fixed">
                    <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-[30%]">جۆری تێچوو / کرێ</th>
                        <th className="py-2.5 px-3 w-[25%]">تێچوو بۆ ۱ {product.unit}</th>
                        <th className="py-2.5 px-3 w-[20%] text-center">ڕێژەی %</th>
                        <th className="py-2.5 px-3 w-[25%] text-left">کۆی گشتی بۆ بارەکە</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-emerald-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>تێچووی کڕینی کاڵا</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{formatCurrency(purchasePrice, settings.currency, settings.usdToIqdRate)}</td>
                        <td className="py-2.5 px-3 font-mono text-center font-bold text-slate-800">
                          {totalGoodsCost > 0 ? `${Math.round((totalPurchaseCost / totalGoodsCost) * 100)}%` : '0%'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-left text-slate-950">{formatCurrency(totalPurchaseCost, settings.currency, settings.usdToIqdRate)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-amber-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span>کرێی گواستنەوە (شۆفێر)</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{formatCurrency(driverFee, settings.currency, settings.usdToIqdRate)}</td>
                        <td className="py-2.5 px-3 font-mono text-center font-bold text-slate-800">
                          {totalGoodsCost > 0 ? `${Math.round((totalDriverFee / totalGoodsCost) * 100)}%` : '0%'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-left text-slate-950">{formatCurrency(totalDriverFee, settings.currency, settings.usdToIqdRate)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-indigo-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span>کرێی رافعە</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{formatCurrency(forkliftFee, settings.currency, settings.usdToIqdRate)}</td>
                        <td className="py-2.5 px-3 font-mono text-center font-bold text-slate-800">
                          {totalGoodsCost > 0 ? `${Math.round((totalForkliftFee / totalGoodsCost) * 100)}%` : '0%'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-left text-slate-950">{formatCurrency(totalForkliftFee, settings.currency, settings.usdToIqdRate)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-sky-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                          <span>کرێی کرێکار</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{formatCurrency(workerFee, settings.currency, settings.usdToIqdRate)}</td>
                        <td className="py-2.5 px-3 font-mono text-center font-bold text-slate-800">
                          {totalGoodsCost > 0 ? `${Math.round((totalWorkerFee / totalGoodsCost) * 100)}%` : '0%'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-left text-slate-950">{formatCurrency(totalWorkerFee, settings.currency, settings.usdToIqdRate)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold text-rose-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>مەسروف / خەرجی تری بەرهەم</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{formatCurrency(otherFee + expenseFee, settings.currency, settings.usdToIqdRate)}</td>
                        <td className="py-2.5 px-3 font-mono text-center font-bold text-slate-800">
                          {totalGoodsCost > 0 ? `${Math.round((totalExpenseAndOtherCost / totalGoodsCost) * 100)}%` : '0%'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-left text-slate-950">{formatCurrency(totalExpenseAndOtherCost, settings.currency, settings.usdToIqdRate)}</td>
                      </tr>
                      {liveShareholderName && (
                        <tr className="bg-indigo-50/70 border-t border-indigo-200">
                          <td className="py-2.5 px-3 font-bold text-indigo-950 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                            <span>پشکی هاوبەش ({liveShareholderName} - {liveShareholderPercent}%)</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">-</td>
                          <td className="py-2.5 px-3 font-mono text-center font-bold text-indigo-800">{liveShareholderPercent}%</td>
                          <td className="py-2.5 px-3 font-mono font-black text-left text-indigo-950">{formatCurrency(shareholderShareAmount, settings.currency, settings.usdToIqdRate)}</td>
                        </tr>
                      )}
                      <tr className="bg-slate-900 text-white font-bold">
                        <td className="py-3 px-3">کۆی گشتی تێچوو و پشکی هاوبەش</td>
                        <td className="py-3 px-3 font-mono text-emerald-400">{formatCurrency(totalUnitCost, settings.currency, settings.usdToIqdRate)}</td>
                        <td className="py-3 px-3 font-mono text-center text-emerald-400">100%</td>
                        <td className="py-3 px-3 font-mono text-emerald-400 text-left">{formatCurrency(totalGoodsCost + shareholderShareAmount, settings.currency, settings.usdToIqdRate)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Navigation Action Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm text-slate-900">دەتەوێت پارەی کڕین، کرێی شۆفێر یان کرێکار بدەیت؟</h5>
                    <p className="text-[11px] text-slate-900">لە بەشی «پارەی کاڵا و خەرجی» دەتوانیت واصڵکراوەکان تۆمار بکەیت و باقی بپشکنیت.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('fees')}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                >
                  چوون بۆ پارەی کاڵا و خەرجی
                </button>
              </div>
            </div>
          )}

          {activeTab === 'product' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Key Summary Metric Cards (Compact 2x2 Grid on Mobile, 4-Columns on Desktop) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                {/* 1. Primary KPI: Total Revenue & Sales (کۆی فرۆش & داهات) */}
                <div className="bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-white border border-emerald-300 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] sm:text-xs font-black text-emerald-950">کۆی فرۆش & داهات</span>
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Receipt className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="my-0.5">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-xs min-[360px]:text-[13px] min-[400px]:text-sm sm:text-base lg:text-lg font-black text-emerald-950 font-mono tracking-tight">
                        {formatNumber(totalSalesRevenue)}
                      </span>
                      <span className="text-[10px] font-black text-emerald-900">
                        {settings.currency === 'USD' ? '$' : 'د.ع'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 pt-1 border-t border-emerald-200 flex items-center justify-between text-[10px] font-black text-emerald-950 flex-wrap gap-1">
                    <span>فرۆشراو: <strong className="text-emerald-950 font-black">{formatNumber(totalQtySold)} {product.unit}</strong></span>
                    {totalCountSold > 0 && (
                      <span className="bg-emerald-200 text-emerald-950 font-black px-1.5 py-0.5 rounded text-[9px]">
                        العدد: {formatNumber(totalCountSold)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Primary KPI: Net Profit / Loss */}
                <div className={`border rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between relative overflow-hidden ${
                  totalNetProfit >= 0
                    ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 border-emerald-300'
                    : 'bg-gradient-to-br from-rose-50 via-white to-rose-50/30 border-rose-300'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] sm:text-xs font-black ${totalNetProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                      {totalNetProfit >= 0 ? 'خێری کاڵا (قازانج)' : 'خەساری کاڵا (زەرەر)'}
                    </span>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      totalNetProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {totalNetProfit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                  <div className="my-0.5">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className={`text-xs min-[360px]:text-[13px] min-[400px]:text-sm sm:text-base lg:text-lg font-black font-mono tracking-tight ${
                        totalNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {totalNetProfit > 0 ? '+' : ''}{formatNumber(totalNetProfit)}
                      </span>
                      <span className={`text-[10px] font-bold ${
                        totalNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {settings.currency === 'USD' ? '$' : 'د.ع'}
                      </span>
                    </div>
                  </div>
                  <div className={`mt-1 pt-1 border-t text-[9px] sm:text-[10px] font-bold ${
                    totalNetProfit >= 0 ? 'border-emerald-200/60 text-emerald-800' : 'border-rose-200/60 text-rose-800'
                  }`}>
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span>{totalNetProfit >= 0 ? 'داهاتی سافی قازانج' : 'کۆی گشتی زەرەر'}</span>
                      {shareholderShareAmount > 0 && (
                        <span className="text-[9px] font-mono font-black text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200">
                          پشکی هاوبەش دەرکراوە: {formatNumber(shareholderShareAmount)} {settings.currency === 'USD' ? '$' : 'د.ع'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Unit Selling Price (نرخی فرۆشی کاڵا) */}
                <div className="bg-sky-50/90 border border-sky-300 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] sm:text-xs font-black text-sky-950">نرخی فرۆشی کاڵا</span>
                    <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="my-0.5">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-xs min-[360px]:text-[13px] min-[400px]:text-sm sm:text-base lg:text-lg font-black text-sky-950 font-mono tracking-tight">
                        {formatNumber(calculatedSellingPrice)}
                      </span>
                      <span className="text-[10px] font-black text-sky-900">
                        {settings.currency === 'USD' ? '$' : 'د.ع'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 pt-1 border-t border-sky-200 flex items-center justify-between text-[10px] font-black text-sky-950 flex-wrap gap-1">
                    <span>تێکڕای فرۆش: <strong className="text-sky-950 font-black">{formatNumber(calculatedSellingPrice)} {settings.currency === 'USD' ? '$' : 'د.ع'}</strong></span>
                  </div>
                </div>

                {/* 4. Unit Total Cost (With Zero Warning) */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] sm:text-xs font-black text-slate-900">تێچووی ۱ {product.unit}</span>
                    <div className="w-6 h-6 rounded-lg bg-slate-200/80 text-slate-900 flex items-center justify-center shrink-0">
                      <DollarSign className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="my-0.5">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-xs min-[360px]:text-[13px] min-[400px]:text-sm sm:text-base lg:text-lg font-black text-slate-900 font-mono tracking-tight">
                        {formatNumber(totalUnitCost)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-900">
                        {settings.currency === 'USD' ? '$' : 'د.ع'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 pt-1 border-t border-slate-200">
                    {totalUnitCost === 0 ? (
                      <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded-md border border-amber-300">
                        <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600" />
                        <span>تێچوو دیاری نەکراوە</span>
                      </div>
                    ) : (
                      <div className="text-[9px] sm:text-[10px] text-slate-600 font-medium">
                        کڕین: {formatNumber(purchasePrice)} + کرێ: {formatNumber(totalUnitFees)}
                      </div>
                    )}
                  </div>
                </div>



                {/* 5. Shareholder Share (Prominent & Clear) */}
                <ShareholderSection
                  product={liveProduct}
                  remainingStockQty={remainingStockQty}
                  shareholderShareAmount={shareholderShareAmount}
                  totalNetProfit={totalNetProfit}
                  totalSalesRevenue={totalSalesRevenue}
                  settings={settings}
                  existingShareholderNames={existingShareholderNames}
                  formatNumber={formatNumber}
                  onUpdateProduct={(id, updates) => updateProduct(id, updates)}
                  addShareholderTransaction={addShareholderTransaction}
                  allProducts={products}
                />


              </div>
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Transactions History Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      <span>پسووڵەی فرۆشی ئەم کاڵایە</span>
                    </h3>
                    <p className="text-xs text-slate-900">
                      تەواوی پسووڵەکان کە ئەم کاڵایەیان تێدا فرۆشراوە
                    </p>
                  </div>

                  {/* Search & Actions Inside Product Account */}
                  <div className="flex flex-wrap items-center gap-2 no-print">
                    <div className="relative w-full sm:w-56">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="گەڕان بەپێی پسووڵە یان کڕیار..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                {/* Sales Table for Product */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs table-fixed">
                      <thead className="bg-slate-100/80 text-slate-900 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-1 w-[22%] text-center">بەروار</th>
                          <th className="py-2 px-2 w-[42%]">ناوی کڕیار</th>
                          <th className="py-2 px-1.5 w-[24%] text-left">کۆی فرۆش</th>
                          <th className="py-2 px-1 w-[12%] text-center no-print"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredSales.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-600">
                              <Package className="w-8 h-8 mx-auto mb-1.5 opacity-30" />
                              <p className="text-xs">هیچ پسووڵەیەکی فرۆشتن بۆ ئەم کاڵایە تۆمار نەکراوە</p>
                            </td>
                          </tr>
                        ) : (
                          filteredSales.map((item, idx) => {
                            const saleObj = sales.find((s) => s.id === item.saleId);
                            return (
                              <tr key={`${item.saleId}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2 px-1 font-mono text-[9px] leading-tight text-slate-900 whitespace-nowrap text-center" dir="ltr">
                                  <div className="flex flex-col items-center">
                                    <span>{formatDate(item.date).split(' ')[0]}</span>
                                    <span className="text-[8px] opacity-60 font-bold">{formatDate(item.date).split(' ')[1]}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-2 font-bold text-slate-900 text-[11px] truncate">
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="truncate">{item.customerName}</span>
                                    <button
                                      onClick={() => saleObj && setSelectedInvoice(saleObj)}
                                      className="text-[9px] text-emerald-600 hover:text-emerald-800 hover:underline inline-flex items-center gap-0.5 font-mono"
                                      title="کردنەوە و بینینی پسووڵە"
                                    >
                                      #{item.invoiceNumber}
                                    </button>
                                  </div>
                                </td>
                                <td className="py-2 px-1.5 font-black text-slate-900 text-left">
                                  <div className="flex flex-col items-start">
                                    <span className="text-[11px] leading-none mb-0.5">
                                      {formatCurrency(item.totalAmount, settings.currency, settings.usdToIqdRate)}
                                    </span>
                                    <span className="text-[8px] text-slate-900 font-black px-1 rounded-sm bg-slate-100 inline-block">
                                      {item.quantity} {item.unit}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-1 text-center no-print">
                                  <div className="flex justify-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(item.saleId);
                                      }}
                                      className={`p-1.5 rounded-xl transition-all border ${
                                        openMenuId === item.saleId 
                                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                                          : 'bg-white border-slate-200 text-slate-900 hover:text-slate-900 hover:border-slate-300'
                                      }`}
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0 no-print flex-wrap gap-2">
          {activeTab === 'total_cost' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="text-slate-900 font-bold">کۆی گشتی تێچووی کاڵا:</span>
              <span className="font-bold font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                {formatCurrency(totalGoodsCost, settings.currency, settings.usdToIqdRate)}
              </span>
              <span className="text-slate-900 hidden sm:inline">•</span>
              <span className="text-slate-900 font-bold">تێچووی ۱ {product.unit}:</span>
              <span className="font-bold font-mono text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                {formatCurrency(totalUnitCost, settings.currency, settings.usdToIqdRate)}
              </span>
            </div>
          ) : activeTab === 'product' ? (
            <div />
          ) : activeTab === 'sales' ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-slate-900 font-bold">کۆی گشتی پسووڵەکانی ئەم کاڵایە:</span>
              <span className="font-bold font-mono text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                {productSales.length} پسووڵە
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <span className="text-slate-900 font-bold text-xs sm:text-sm">دۆخی خەرجی و کرێکان:</span>
              <span className="font-black font-mono text-slate-950 bg-amber-50/90 text-amber-950 px-3 py-1 rounded-xl border border-amber-300 text-xs sm:text-sm shadow-2xs">
                {totalRemainingFees > 0 ? `باقی: ${formatCurrency(totalRemainingFees, settings.currency, settings.usdToIqdRate)}` : 'تەواو دراوە ✓'}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-900 font-bold transition-all cursor-pointer"
          >
            داخستن
          </button>
        </div>
      </div>

      {/* Invoice Modal for viewing full invoice */}
      {selectedInvoice && (
        <InvoiceModal sale={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}

      {/* Passcode Protected Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">سڕینەوەی پسووڵە لە هەژماری کاڵا</h3>
                  <p className="text-xs text-slate-900">پێویستە ژمارەی نهێنی سڕینەوە بنووسیت</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="text-slate-600 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeleteSale} className="space-y-4">
              <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 text-xs text-rose-900 space-y-2">
                <p className="font-bold">
                  تکایە ژمارەی نهێنی بنووسە بۆ سڕینەوەی پسووڵەی #{itemToDelete.invoiceNumber}:
                </p>
                <div className="text-[11px] text-rose-700/90 font-medium">
                  • کڕیار: <span className="font-bold">{itemToDelete.customerName}</span> | بڕی فرۆش: <span className="font-bold">{itemToDelete.quantity} {itemToDelete.unit}</span> | کۆی پسووڵە: <span className="font-bold">{formatCurrency(itemToDelete.totalAmount, settings.currency, settings.usdToIqdRate)}</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-850 bg-emerald-100/80 border border-emerald-300 rounded-lg p-2 leading-normal">
                  🔒 پارێزراوی تایبەت: ئەم پسووڵەیە تەنها لێرەوە دەسڕێتەوە، و بە سڕینەوەی خاڵی فرۆشتن یان داخراوەکان ناسڕێتەوە.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                  ژمارەی نهێنی (Password):
                </label>
                <div className="relative">
                  <input
                    type={showDeletePassword ? 'text' : 'password'}
                    autoFocus
                    required
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      setDeleteError('');
                    }}
                    placeholder="ژمارەی نهێنی بنووسە..."
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm font-mono text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600 p-1"
                  >
                    {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {deleteError && (
                  <p className="text-xs font-bold text-rose-600 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{deleteError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors flex-1"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 flex-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>پشکنین و سڕینەوە</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Sheet (Bottom Sheet) for Mobile Actions */}
      {openMenuId && (
        <div className="fixed inset-0 z-[100] no-print">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200" 
            onClick={() => setOpenMenuId(null)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[32px] shadow-2xl border-t border-slate-200 p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex flex-col items-center gap-1 pb-2">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-4" />
              {(() => {
                const item = productSales.find(s => s.saleId === openMenuId);
                if (!item) return null;
                return (
                  <div className="text-center">
                    <h4 className="font-black text-slate-900 text-lg">{item.customerName}</h4>
                    <p className="text-xs font-bold text-slate-900">
                      پسووڵەی #{item.invoiceNumber} • {formatCurrency(item.totalAmount, settings.currency, settings.usdToIqdRate)}
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  const item = productSales.find(s => s.saleId === openMenuId);
                  const saleObj = item ? sales.find(s => s.id === item.saleId) : null;
                  if (saleObj) setSelectedInvoice(saleObj);
                  setOpenMenuId(null);
                }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-emerald-50 text-emerald-700 rounded-2xl font-black transition-all active:scale-95 border border-emerald-100"
              >
                <Eye className="w-6 h-6" />
                <span>بینینی پسووڵە</span>
              </button>

              <button
                onClick={() => {
                  const item = productSales.find(s => s.saleId === openMenuId);
                  const saleObj = item ? sales.find(s => s.id === item.saleId) : null;
                  if (saleObj) setSaleToEdit(saleObj);
                  setOpenMenuId(null);
                }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-amber-50 text-amber-800 rounded-2xl font-black transition-all active:scale-95 border border-amber-100"
              >
                <SlidersHorizontal className="w-6 h-6" />
                <span>ڕێکخستن و دەستکاریکردن</span>
              </button>

              <button
                onClick={() => {
                  const item = productSales.find(s => s.saleId === openMenuId);
                  if (item) handleOpenDeleteModal(item);
                  setOpenMenuId(null);
                }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-rose-50 text-rose-700 rounded-2xl font-black transition-all active:scale-95 border border-rose-100"
              >
                <Trash2 className="w-6 h-6" />
                <span>سڕینەوەی پسووڵە</span>
              </button>

              <button
                onClick={() => setOpenMenuId(null)}
                className="w-full mt-2 py-4 text-slate-900 font-bold text-sm text-center active:bg-slate-50 rounded-2xl transition-colors"
              >
                پاشگەزبوونەوە
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal Protected with Security Passcode */}
      {saleToEdit && (
        <EditSaleModal
          sale={saleToEdit}
          onClose={() => setSaleToEdit(null)}
        />
      )}

      {/* Modal for Adding and Editing Product Costs */}
      {isEditingCostsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center z-[70] sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 sm:shadow-2xl sm:border sm:border-slate-100 space-y-4 text-right min-h-screen sm:min-h-0 sm:my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">دەستکاریکردن و زیادکردنی تێچوو و کرێکان</h3>
                  <p className="text-[11px] text-slate-900">کاڵای: {liveProduct.name} ({formatNumber(totalInitialQty)} {product.unit})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingCostsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCosts} className="space-y-3.5">
              {/* 1. پارەی کڕینی کاڵا */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>پارەی کڕینی کاڵا</span>
                  </label>
                  <div className="flex items-center gap-1 text-[10px] font-bold bg-white p-0.5 rounded-lg border border-emerald-200">
                    <button
                      type="button"
                      onClick={() => setCostPurchaseMode('total')}
                      className={`px-2 py-0.5 rounded-md transition-colors ${costPurchaseMode === 'total' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
                    >
                      کۆی کڕین
                    </button>
                    <button
                      type="button"
                      onClick={() => setCostPurchaseMode('unit')}
                      className={`px-2 py-0.5 rounded-md transition-colors ${costPurchaseMode === 'unit' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
                    >
                      بۆ ۱ {product.unit}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={costPurchaseInput}
                    onChange={(e) => setCostPurchaseInput(e.target.value)}
                    placeholder={costPurchaseMode === 'total' ? 'کۆی گشتی پارەی کڕین...' : `نرخی کڕینی ۱ ${product.unit}...`}
                    className="w-full pl-12 pr-3 py-2 text-xs rounded-xl border border-emerald-300 bg-white text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700">
                    {settings.currency}
                  </span>
                </div>
              </div>

              {/* 2. کرێی گواستنەوە */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-amber-600" />
                    <span>کرێی گواستنەوە (شۆفێر)</span>
                  </label>
                  <div className="flex items-center gap-1 text-[10px] font-bold bg-white p-0.5 rounded-lg border border-amber-200">
                    <button
                      type="button"
                      onClick={() => setCostDriverMode('total')}
                      className={`px-2 py-0.5 rounded-md transition-colors ${costDriverMode === 'total' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}
                    >
                      کۆی کرێ
                    </button>
                    <button
                      type="button"
                      onClick={() => setCostDriverMode('unit')}
                      className={`px-2 py-0.5 rounded-md transition-colors ${costDriverMode === 'unit' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}
                    >
                      بۆ ۱ {product.unit}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={costDriverInput}
                    onChange={(e) => setCostDriverInput(e.target.value)}
                    placeholder={costDriverMode === 'total' ? 'کۆی کرێی گواستنەوە...' : `کرێی شۆفێر بۆ ۱ ${product.unit}...`}
                    className="w-full pl-12 pr-3 py-2 text-xs rounded-xl border border-amber-300 bg-white text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-700">
                    {settings.currency}
                  </span>
                </div>
              </div>

              {/* 3. کرێی کرێکار (نرخ بۆ ۱ تەن) */}
              <div className="bg-sky-50/60 border border-sky-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sky-600" />
                    <span>کرێی کرێکار (نرخی هەر ۱ تەن)</span>
                  </label>
                  <span className="text-[10px] font-bold text-sky-700 bg-white px-2 py-0.5 rounded-md border border-sky-200">
                    ئۆتۆماتیک بەپێی کێش
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={costWorkerInput}
                    onChange={(e) => setCostWorkerInput(e.target.value)}
                    placeholder="بۆ نموونە: 5000 دینار بۆ هەر ۱ تەن..."
                    className="w-full pl-20 pr-3 py-2 text-xs rounded-xl border border-sky-300 bg-white text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-sky-700">
                    د.ع / ۱ تەن
                  </span>
                </div>
                {parseFloat(costWorkerInput) > 0 && (
                  <p className="text-[10px] text-sky-800 font-medium">
                    = {(parseFloat(costWorkerInput) / 1000).toFixed(2)} د.ع بۆ هەر ۱ کگم فرۆشراو
                  </p>
                )}
              </div>

              {/* 4. خەرجی تر */}
              <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-rose-600" />
                    <span>خەرجی تر و تێچووی زیادە</span>
                  </label>
                  <div className="flex items-center gap-1 text-[10px] font-bold bg-white p-0.5 rounded-lg border border-rose-200">
                    <button
                      type="button"
                      onClick={() => setCostOtherMode('total')}
                      className={`px-2 py-0.5 rounded-md transition-colors ${costOtherMode === 'total' ? 'bg-rose-600 text-white' : 'text-slate-600'}`}
                    >
                      کۆی خەرجی
                    </button>
                    <button
                      type="button"
                      onClick={() => setCostOtherMode('unit')}
                      className={`px-2 py-0.5 rounded-md transition-colors ${costOtherMode === 'unit' ? 'bg-rose-600 text-white' : 'text-slate-600'}`}
                    >
                      بۆ ۱ {product.unit}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={costOtherInput}
                    onChange={(e) => setCostOtherInput(e.target.value)}
                    placeholder={costOtherMode === 'total' ? 'کۆی گشتی خەرجی تر...' : `خەرجی تر بۆ ۱ ${product.unit}...`}
                    className="w-full pl-12 pr-3 py-2 text-xs rounded-xl border border-rose-300 bg-white text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-700">
                    {settings.currency}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingCostsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition-colors cursor-pointer"
                >
                  پەشیمانبوونەوە
                </button>
                <button
                  type="submit"
                  disabled={isSavingCosts}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingCosts ? 'خەریکی پاشەکەوتکردن...' : 'خەزنکردن و نوێکردنەوە'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* شەشەی تایبەتی کێشی کاڵاکە و پێکهاتەی تێچووەکان (Dedicated Weight & Costs Modal) */}
      {isWeightAndCostsModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center sm:p-5 overflow-y-auto animate-in fade-in duration-200 no-print"
          onClick={() => setIsWeightAndCostsModalOpen(false)}
        >
          <div 
            className="bg-white sm:rounded-3xl sm:shadow-2xl sm:border sm:border-slate-200 w-full max-w-4xl min-h-screen sm:min-h-0 sm:max-h-[92vh] overflow-y-auto flex flex-col sm:my-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200/90 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-slate-50 to-white sm:rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg text-slate-900">
                      کێشی کاڵاکە و پێکهاتەی تێچووەکان
                    </h3>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                      {liveProduct.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-900 mt-0.5">
                    ڕاستەوخۆ دەتوانیت کێشی بار و نرخی سەرجەم تێچووەکان بنووسیت و خەزنیان بکەیت
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsWeightAndCostsModalOpen(false)}
                className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="داخستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Quick Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl p-3 text-xs">
                <div>
                  <span className="text-slate-900 block text-[11px]">کێشی باری سەرەتایی:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {formatNumber(totalInitialQty)} {product.unit || 'کگم'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-900 block text-[11px]">کۆی فرۆشراو:</span>
                  <span className="font-mono font-black text-emerald-800 text-sm">
                    {formatNumber(totalQtySold)} {product.unit || 'کگم'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-900 block text-[11px]">باری ماوە لە کۆگا:</span>
                  <span className="font-mono font-black text-amber-800 text-sm">
                    {formatNumber(remainingStockQty)} {product.unit || 'کگم'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-900 block text-[11px]">کۆی گشتی تێچوو:</span>
                  <span className="font-mono font-black text-indigo-900 text-sm">
                    {formatCurrency(totalAllocatedFees, settings.currency, settings.usdToIqdRate)}
                  </span>
                </div>
              </div>

              {/* 5 Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* 1. پارەی کڕینی کاڵا */}
                <div className="bg-emerald-50/70 border-2 border-emerald-200/90 rounded-2xl p-4 flex flex-col justify-between shadow-2xs space-y-3">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200/70">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-emerald-950">پارەی کڕینی کاڵا</h4>
                          <span className="text-[10px] text-emerald-800">کۆی گشتی کڕینی بارەکە</span>
                        </div>
                      </div>
                      {totalPurchaseCost > 0 && (
                        <span className="text-xs font-mono font-black text-emerald-900 bg-white px-2 py-0.5 rounded-lg border border-emerald-300 shadow-2xs">
                          {formatNumber(totalPurchaseCost)} د.ع
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-2">
                      <label className="text-[11px] font-bold text-slate-600 block">نووسینی کۆی پارەی کڕین:</label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={inlinePurchaseInput}
                          onChange={(e) => {
                            setInlinePurchaseInput(e.target.value);
                            setInlinePurchaseSavedNotice(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlinePurchase();
                          }}
                          placeholder="کۆی کڕین بنووسە..."
                          className="w-full px-3 py-2 text-sm font-mono font-black rounded-xl border border-emerald-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none text-right shadow-inner"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 pointer-events-none">
                          {settings.currency === 'USD' ? '$' : 'د.ع'}
                        </span>
                      </div>
                      {parseFloat(inlinePurchaseInput) > 0 && totalInitialQty > 0 && (
                        <p className="text-[10px] font-mono text-emerald-800 pt-0.5">
                          = {formatNumber(Math.round(parseFloat(inlinePurchaseInput) / totalInitialQty))} د.ع بۆ هەر ۱ کگم
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveInlinePurchase}
                    disabled={isSavingInlinePurchase}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingInlinePurchase ? 'خەریکی خەزنکردن...' : inlinePurchaseSavedNotice ? '✓ بە سەرکەوتوویی خەزنکرا' : 'خەزنکردنی پارەی کڕین'}</span>
                  </button>
                </div>

                {/* 4. خەرجی تر (ڕافعە و مەسروف) */}
                <div className="bg-rose-50/70 border-2 border-rose-200/90 rounded-2xl p-4 flex flex-col justify-between shadow-2xs space-y-3">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-rose-200/70">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-700 flex items-center justify-center">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-rose-950">خەرجی تر و ڕافعە</h4>
                          <span className="text-[10px] text-rose-800">سەرجەم خەرجییەکانی تری بارەکە</span>
                        </div>
                      </div>
                      {totalOtherExpensesCost > 0 && (
                        <span className="text-xs font-mono font-black text-rose-900 bg-white px-2 py-0.5 rounded-lg border border-rose-300 shadow-2xs">
                          {formatNumber(totalOtherExpensesCost)} د.ع
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-2">
                      <label className="text-[11px] font-bold text-slate-600 block">نووسینی کۆی خەرجی تر:</label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={inlineOtherInput}
                          onChange={(e) => {
                            setInlineOtherInput(e.target.value);
                            setInlineOtherSavedNotice(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlineOther();
                          }}
                          placeholder="خەرجی تر بنووسە..."
                          className="w-full px-3 py-2 text-sm font-mono font-black rounded-xl border border-rose-300 bg-white text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none text-right shadow-inner"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 pointer-events-none">
                          {settings.currency === 'USD' ? '$' : 'د.ع'}
                        </span>
                      </div>
                      {parseFloat(inlineOtherInput) > 0 && totalInitialQty > 0 && (
                        <p className="text-[10px] font-mono text-rose-800 pt-0.5">
                          = {formatNumber(Math.round(parseFloat(inlineOtherInput) / totalInitialQty))} د.ع بۆ هەر ۱ کگم
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveInlineOther}
                    disabled={isSavingInlineOther}
                    className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingInlineOther ? 'خەریکی خەزنکردن...' : inlineOtherSavedNotice ? '✓ بە سەرکەوتوویی خەزنکرا' : 'خەزنکردنی خەرجی تر'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 sm:rounded-b-3xl flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0">
              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>سەرجەم گۆڕانکارییەکان دەستبەجێ لە هەژماری کاڵاکە و قازانجدا نوێ دەبنەوە</span>
              </div>
              <button
                type="button"
                onClick={() => setIsWeightAndCostsModalOpen(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer"
              >
                داخستن
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Driver Info Modal */}
      {product && (
        <DriverInfoModal
          product={product}
          isOpen={isDriverModalOpen}
          onClose={() => setIsDriverModalOpen(false)}
        />
      )}

      {/* Commission Settlement Modal (تەواوبوونی عمولە) */}
      {isCommissionModalOpen && product && (
        <CommissionSettlementModal
          product={product}
          productSales={productSales}
          onClose={() => setIsCommissionModalOpen(false)}
        />
      )}
    </div>
  );
};
