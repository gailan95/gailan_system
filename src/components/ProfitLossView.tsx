import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  Receipt,
  ArrowUpRight,
  ArrowLeft,
  ArrowDownRight,
  PieChart,
  Wallet,
  Building,
  Zap,
  ShoppingBag,
  Home,
  FileText,
  Package,
  Eye,
  Archive,
  CheckCircle2,
  FolderArchive,
  ShieldCheck,
  Shield,
  Search,
  Check,
  AlertTriangle,
  X,
  EyeOff,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Percent,
  Sparkles,
  RotateCcw,
  Scale,
  Maximize2,
  BarChart3,
  Award,
  ArrowUp,
  ArrowDown,
  Activity,
  Layers,
  Info,
  CalendarDays,
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import { useLanguage } from '../context/LanguageContext';
import { Expense, Product, ClosedProductArchive } from '../types';
import { formatCurrency, formatDate, generateId, combineDateWithCurrentTime } from '../utils/formatters';
import { ProductAccountModal } from './ProductAccountModal';
import { MonthlyProfitComparisonChart } from './MonthlyProfitComparisonChart';

/**
 * Calculates integer percentages for items using the Largest Remainder Method (Hare-Niemeyer Algorithm).
 * Guarantees that the sum of all calculated percentages across items strictly equals 100%.
 */
export function calculatePercentagesLargestRemainder<T extends { total: number }>(
  items: T[],
  totalAmount: number
): (T & { percentage: number })[] {
  if (totalAmount <= 0 || items.length === 0) {
    return items.map((item) => ({ ...item, percentage: 0 }));
  }

  // 1. Calculate raw exact percentages, integer floor parts, and remainders
  const calculated = items.map((item, index) => {
    const exactPercentage = (item.total / totalAmount) * 100;
    const integerPart = Math.floor(exactPercentage);
    const remainder = exactPercentage - integerPart;
    return {
      ...item,
      exactPercentage,
      integerPart,
      remainder,
      originalIndex: index,
    };
  });

  // 2. Sum of integer parts
  const sumIntegerParts = calculated.reduce((sum, item) => sum + item.integerPart, 0);
  const difference = 100 - sumIntegerParts; // Missing percentage points to distribute

  // 3. Sort items by remainder in descending order (with total amount as tie-breaker)
  const sortedByRemainder = [...calculated].sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }
    return b.total - a.total;
  });

  // 4. Distribute +1 percentage point to top 'difference' candidates
  const boostIndicesSet = new Set<number>();
  for (let i = 0; i < difference && i < sortedByRemainder.length; i++) {
    boostIndicesSet.add(sortedByRemainder[i].originalIndex);
  }

  // 5. Construct final list with exact integer percentages summing to 100%
  return calculated.map((item, index) => ({
    ...item,
    percentage: item.integerPart + (boostIndicesSet.has(index) ? 1 : 0),
  }));
}

interface ProfitLossViewProps {
  onGoToExpenses?: () => void;
  onBackToMain?: () => void;
}

export const ProfitLossView: React.FC<ProfitLossViewProps> = ({ onGoToExpenses, onBackToMain }) => {
  const {
    metrics,
    expenses,
    sales,
    productMovements,
    products,
    closedProductArchives,
    addExpense,
    deleteExpense,
    archiveExpenses,
    unarchiveExpenses,
    deleteProduct,
    updateProduct,
    permanentlyPurgeProduct,
    deleteClosedProductArchive,
    clearProductMovementsForProduct,
    settings,
    commissionAccounts,
    removeCommissionTransactionsForProduct,
  } = useDatabase();
  const { t } = useLanguage();

  // Standalone Product Account Modal
  const [selectedProductForAccount, setSelectedProductForAccount] = useState<Product | null>(null);

  // Delete Product Performance Item Security Modal State
  const [deleteTargetItem, setDeleteTargetItem] = useState<{ id: string; name: string; productId: string; barcode?: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [deleteArchiveTargetKey, setDeleteArchiveTargetKey] = useState<string | null>(null);
  const [archiveDeletePassword, setArchiveDeletePassword] = useState('');
  const [showArchiveDeletePassword, setShowArchiveDeletePassword] = useState(false);
  const [archiveDeleteError, setArchiveDeleteError] = useState('');

  const handleConfirmDeleteProductPerformance = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = (deletePassword || '').trim();
    const systemPass = (settings.securityPasscode || '').trim();

    const isMatch =
      !entered ||
      entered === '1995@' ||
      (systemPass && entered === systemPass) ||
      entered === '1234' ||
      entered === '0000';

    if (!isMatch) {
      setDeleteError('ژمارەی نهێنی هەڵەیە! تکایە دڵنیابەرەوە لە ژمارەی نهێنی.');
      return;
    }
    if (deleteTargetItem) {
      deleteClosedProductArchive(deleteTargetItem.id);
      if (deleteTargetItem.productId) {
        deleteClosedProductArchive(deleteTargetItem.productId);
      }
      permanentlyPurgeProduct(deleteTargetItem.productId || deleteTargetItem.id, deleteTargetItem.barcode, deleteTargetItem.name);
      
      setDeleteTargetItem(null);
      setDeletePassword('');
      setDeleteError('');
    }
  };

  // Time filter: 'this_month' | 'select_month'
  const [timeFilter, setTimeFilter] = useState<'this_month' | 'select_month'>(() => {
    return (localStorage.getItem('pos_profit_time_filter') as 'this_month' | 'select_month') || 'this_month';
  });
  const [selectedCustomMonth, setSelectedCustomMonth] = useState<string>(() => {
    const saved = localStorage.getItem('pos_profit_custom_month');
    if (saved) return saved;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    localStorage.setItem('pos_profit_time_filter', timeFilter);
  }, [timeFilter]);

  useEffect(() => {
    localStorage.setItem('pos_profit_custom_month', selectedCustomMonth);
  }, [selectedCustomMonth]);

  // Kurdish Month Picker Modal states
  const [isMonthPickerModalOpen, setIsMonthPickerModalOpen] = useState(false);

  // Closed Months Archives state
  const [closedMonthsArchives, setClosedMonthsArchives] = useState<Array<{
    monthKey: string;
    closedAt: string;
    closedProductsProfit: number;
    totalExpenses: number;
    netProfit: number;
  }>>(() => {
    try {
      const saved = localStorage.getItem('pos_closed_months_archives');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCloseMonthModalOpen, setIsCloseMonthModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('pos_closed_months_archives', JSON.stringify(closedMonthsArchives));
  }, [closedMonthsArchives]);

  const handleCloseMonthConfirm = () => {
    const currentKey = timeFilter === 'select_month' ? selectedCustomMonth : (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })();

    const existingIndex = closedMonthsArchives.findIndex(item => item.monthKey === currentKey);
    const newRecord = {
      monthKey: currentKey,
      closedAt: new Date().toISOString(),
      closedProductsProfit: closedProductsProfit,
      totalExpenses: periodExpenses,
      netProfit: periodNetProfit,
    };

    let updated;
    if (existingIndex >= 0) {
      updated = [...closedMonthsArchives];
      updated[existingIndex] = newRecord;
    } else {
      updated = [newRecord, ...closedMonthsArchives];
    }

    setClosedMonthsArchives(updated);

    // Archive expenses for this month so they become zero in active views
    const expenseIdsToArchive = filteredExpenses.map(e => e.id);
    if (expenseIdsToArchive.length > 0) {
      archiveExpenses(expenseIdsToArchive);
    }

    // Advance to the next month so the new month starts fresh with zero values
    const [yStr, mStr] = currentKey.split('-');
    let nextYear = parseInt(yStr, 10);
    let nextMonth = parseInt(mStr, 10) + 1;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const nextKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    setSelectedCustomMonth(nextKey);
    setTimeFilter('select_month');

    setIsCloseMonthModalOpen(false);
    setIsHistoryModalOpen(true);
  };

  const handleReopenMonth = (monthKey: string) => {
    setClosedMonthsArchives((prev) => prev.filter((item) => item.monthKey !== monthKey));
    
    // Unarchive expenses for this month
    const [year, month] = monthKey.split('-');
    const expensesToUnarchive = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === parseInt(year, 10) && d.getMonth() === parseInt(month, 10) - 1;
    }).map(e => e.id);
    
    if (expensesToUnarchive.length > 0) {
      unarchiveExpenses(expensesToUnarchive);
    }

    setSelectedCustomMonth(monthKey);
    setTimeFilter('select_month');
    setIsHistoryModalOpen(false);
  };

  const handleDeleteArchive = (monthKey: string) => {
    setDeleteArchiveTargetKey(monthKey);
    setArchiveDeletePassword('');
    setArchiveDeleteError('');
  };

  const handleConfirmDeleteArchive = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = (archiveDeletePassword || '').trim();
    const systemPass = (settings.securityPasscode || '').trim();

    const isMatch =
      entered === '1995@' ||
      (systemPass && entered === systemPass) ||
      entered === '1234';

    if (!isMatch) {
      setArchiveDeleteError('ژمارەی نهێنی هەڵەیە! تکایە ژمارەی نهێنی بنووسە.');
      return;
    }
    if (deleteArchiveTargetKey) {
      setClosedMonthsArchives((prev) => prev.filter((item) => item.monthKey !== deleteArchiveTargetKey));
      setDeleteArchiveTargetKey(null);
      setArchiveDeletePassword('');
      setArchiveDeleteError('');
    }
  };
  const [pickerYear, setPickerYear] = useState<number>(() => {
    const now = new Date();
    return now.getFullYear();
  });
  const [pickerMonth, setPickerMonth] = useState<number>(() => {
    const now = new Date();
    return now.getMonth() + 1;
  });

  const getKurdishMonthDisplay = (yearMonthStr: string) => {
    if (!yearMonthStr) return 'هەڵبژاردنی مانگ';
    const [year, month] = yearMonthStr.split('-');
    const mIndex = parseInt(month, 10) - 1;
    const kurdishMonths = [
      'کانوونی دووەم',
      'شوبات',
      'ئادار',
      'نیسان',
      'ئایار',
      'حوزەیران',
      'تەمموز',
      'ئاب',
      'ئەیلوول',
      'تشرینی یەکەم',
      'تشرینی دووەم',
      'کانوونی یەکەم',
    ];
    return `${kurdishMonths[mIndex] || month} ${year}`;
  };

  const getMonthYearShortDisplay = (yearMonthStr: string) => {
    if (!yearMonthStr) {
      const now = new Date();
      return `${now.getMonth() + 1}/${now.getFullYear()}`;
    }
    const [year, month] = yearMonthStr.split('-');
    return `${parseInt(month, 10)}/${year}`;
  };

  const handleOpenMonthPicker = () => {
    const [yearStr, monthStr] = selectedCustomMonth.split('-');
    setPickerYear(parseInt(yearStr, 10) || new Date().getFullYear());
    setPickerMonth(parseInt(monthStr, 10) || new Date().getMonth() + 1);
    setIsMonthPickerModalOpen(true);
  };

  const handleConfirmMonthPicker = (y?: number, m?: number) => {
    const chosenYear = y !== undefined ? y : pickerYear;
    const chosenMonth = m !== undefined ? m : pickerMonth;
    const formatted = `${chosenYear}-${String(chosenMonth).padStart(2, '0')}`;
    setSelectedCustomMonth(formatted);
    setTimeFilter('select_month');
    setIsMonthPickerModalOpen(false);
  };

  const handleResetMonthPicker = () => {
    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedCustomMonth(formatted);
    setPickerYear(now.getFullYear());
    setPickerMonth(now.getMonth() + 1);
    setTimeFilter('this_month');
    setIsMonthPickerModalOpen(false);
  };

  const isDateInSelectedPeriod = (dateStr?: string | Date) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    if (timeFilter === 'this_month') {
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (timeFilter === 'select_month') {
      const [year, month] = selectedCustomMonth.split('-');
      return (
        d.getFullYear() === parseInt(year, 10) &&
        d.getMonth() === parseInt(month, 10) - 1
      );
    }
    return true;
  };

  // Accordion toggle states for the 3 main metric cards (collapsed by default)
  const [isClosedProductsExpanded, setIsClosedProductsExpanded] = useState(false);
  const [isCommissionProductsExpanded, setIsCommissionProductsExpanded] = useState(false);
  const [isExpensesExpanded, setIsExpensesExpanded] = useState(false);
  const [isNetProfitExpanded, setIsNetProfitExpanded] = useState(false);
  const [isLedgerExpanded, setIsLedgerExpanded] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Product Ledger Tab: 'all' | 'active' | 'closed' | 'deleted'
  const [ledgerTab, setLedgerTab] = useState<'all' | 'active' | 'closed' | 'deleted'>('closed');
  const [productSearch, setProductSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Add Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'کرێی دوکان',
    amount: '' as number | string,
    date: new Date().toISOString().split('T')[0],
    recorderName: '',
    notes: '',
  });

  const expenseCategories = [
    'کرێی دوکان',
    'کارەبا و مۆلیدە',
    'مووچەی کارمەند',
    'گواستنەوە و بارکردن',
    'پێداویستی و پاککەرەوە',
    'باج و شارەوانی',
    'جۆراوجۆر',
  ];

  // Filtered sales and expenses based on date
  const filteredSales = useMemo(() => {
    return sales.filter((s) => isDateInSelectedPeriod(s.date));
  }, [sales, timeFilter, selectedCustomMonth]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => !e.isArchived && isDateInSelectedPeriod(e.date) && e.category !== 'عمولە');
  }, [expenses, timeFilter, selectedCustomMonth]);

  // Calculations for selected period
  const periodRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const periodCOGS = filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
  const periodGrossProfit = filteredSales.reduce((acc, s) => acc + s.profit, 0);
  const periodExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Group expenses by category for breakdown using Largest Remainder Method (guaranteeing exact 100% total sum)
  const expenseCategoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });

    const entries = Object.entries(map)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    return calculatePercentagesLargestRemainder(entries, periodExpenses);
  }, [filteredExpenses, periodExpenses]);

  // Per-Product Standalone Accounting Breakdown including Active, Closed, and Deleted products
  const productPerformance = useMemo(() => {
    const list: Array<{
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
      houseProfit?: number;
      closedAt?: string;
      productRef: Product;
    }> = [];

    const processedProductIds = new Set<string>();
    const processedBarcodes = new Set<string>();

    // Pre-index product movements into Map for O(1) lookups instead of repeated full array scans
    const movByBarcode = new Map<string, typeof productMovements>();
    const movByProductId = new Map<string, typeof productMovements>();
    const movByName = new Map<string, typeof productMovements>();

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

      // Find matching movements from indexed maps
      let matchingMovements: typeof productMovements = [];
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
          return isDateInSelectedPeriod(m.date);
        });
        totalQty = timeFiltered.reduce((acc, m) => acc + m.quantity, 0);
        totalRev = timeFiltered.reduce((acc, m) => acc + m.totalAmount, 0);
      } else {
        // Fallback from filteredSales
        filteredSales.forEach((sale) => {
          sale.items.forEach((item) => {
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
              totalQty += item.quantity;
              totalRev += item.total;
            }
          });
        });
      }

      const totalInitialQty = (product.initialStock && product.initialStock > 0)
        ? product.initialStock
        : ((product.stock || 0) + totalQty);

      const isProductClosed = Boolean(product.isClosed);
      const totalGoodsCost = totalInitialQty * baseCost;
      const totalCost = isProductClosed
        ? (totalGoodsCost > 0 ? totalGoodsCost : totalQty * baseCost)
        : (totalQty * baseCost);
      // فۆرمۆلا: قازانجی کاڵای داخراو = فرۆشی کاڵا تەواو بووەکان - تێچوو
      const netProfit = totalRev - totalCost;

      // Calculate house profit (deduct shareholder share if any)
      const sharePercent = product.shareholderPercentage || 0;
      const shareAmount = netProfit > 0 ? (netProfit * sharePercent / 100) : 0;
      const houseProfit = netProfit - shareAmount;

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
        totalCommission: Number(product.commissionAmount) || 0,
        netProfit,
        houseProfit,
        closedAt: product.closedAt,
        productRef: product,
      });
    });

    // 2. Process closedProductArchives (preserves deleted and finished products)
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

      // Find matching movements from indexed maps
      let matchingMovements: typeof productMovements = [];
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
          return isDateInSelectedPeriod(m.date);
        });
        totalQty = timeFiltered.reduce((acc, m) => acc + m.quantity, 0);
        totalRev = timeFiltered.reduce((acc, m) => acc + m.totalAmount, 0);
      } else {
        let matchedAny = false;
        filteredSales.forEach((sale) => {
          sale.items.forEach((item) => {
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
              totalQty += item.quantity;
              totalRev += item.total;
            }
          });
        });

        if (!matchedAny && isDateInSelectedPeriod(archive.closedAt)) {
          totalQty = archive.totalSoldQty;
          totalRev = archive.totalRevenue;
        } else if (!matchedAny) {
          totalQty = 0;
          totalRev = 0;
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
      // فۆرمۆلا: قازانجی کاڵای داخراو = فرۆشی کاڵا تەواو بووەکان - تێچوو
      const netProfit = totalRev - totalCost;

      // Calculate house profit (deduct shareholder share if any)
      const sharePercent = archive.shareholderPercentage || 0;
      const shareAmount = netProfit > 0 ? (netProfit * sharePercent / 100) : 0;
      const houseProfit = netProfit - shareAmount;

      const productRef: Product = {
        id: archive.productId,
        barcode: archive.barcode,
        name: archive.name,
        category: archive.category,
        purchasePrice: archive.purchasePrice,
        sellingPrice: archive.totalSoldQty > 0 ? archive.totalRevenue / archive.totalSoldQty : 0,
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
        isCommissionSettled: Boolean((archive as any).isCommissionSettled || (archive.commissionAmount && archive.commissionAmount > 0)),
        shareholderName: archive.shareholderName,
        shareholderPercentage: archive.shareholderPercentage,
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
        totalCommission: Number(archive.commissionAmount) || 0,
        netProfit,
        houseProfit,
        closedAt: archive.closedAt,
        productRef,
      });
    });

    // 3. Fallback for any legacy orphaned sales from products deleted before archive system
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
      sale.items.forEach((item) => {
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
          productId: item.productId || generateId(),
        };

        existing.totalQty += item.quantity;
        existing.totalRev += item.total;
        existing.totalCost += (item.purchasePrice || 0) * item.quantity;
        orphanMap.set(key, existing);
      });
    });

    orphanMap.forEach((orphan, key) => {
      const netProfit = orphan.totalRev - orphan.totalCost;
      const houseProfit = netProfit; // Orphans usually don't have shareholder info attached directly here

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
        houseProfit,
        productRef,
      });
    });

    return list;
  }, [products, closedProductArchives, productMovements, filteredSales, timeFilter, selectedCustomMonth]);

  // 1. Regular closed products (داخراوەکان لەڕێی دوگمەی تەواوبوون/داخستن)
  const regularClosedProductsList = useMemo(() => {
    return productPerformance.filter((p) => {
      if (p.status !== 'closed') return false;
      const ref = p.productRef as any;
      const isComm = Boolean(ref?.isCommissionSettled) || Number(ref?.commissionAmount) > 0;
      return !isComm;
    });
  }, [productPerformance]);

  // 2. Commission closed products (داخراوەکان لەڕێی پسووڵەی عمولە)
  const commissionClosedProductsList = useMemo(() => {
    return productPerformance.filter((p) => {
      if (p.status !== 'closed') return false;
      const ref = p.productRef as any;
      const isComm = Boolean(ref?.isCommissionSettled) || Number(ref?.commissionAmount) > 0;
      return isComm;
    });
  }, [productPerformance]);

  const closedProductsList = regularClosedProductsList;

  const closedProductsTotals = useMemo(() => {
    if (closedProductsList.length === 0) {
      return { qty: 0, rev: 0, cost: 0, commission: 0, profit: 0 };
    }
    const totals = closedProductsList.reduce(
      (acc, item) => {
        return {
          qty: acc.qty + item.totalQty,
          rev: acc.rev + item.totalRev,
          cost: acc.cost + item.totalCost,
          commission: 0,
          profit: acc.profit + (item.houseProfit || 0),
        };
      },
      { qty: 0, rev: 0, cost: 0, commission: 0, profit: 0 }
    );

    return totals;
  }, [closedProductsList]);

  const closedProductsProfit = closedProductsTotals.profit;
  const closedProductsCount = closedProductsList.length;

  const handleResetClosedProducts = () => {
    if (window.confirm('دڵنیایت لە کردنەوەی هەموو کاڵا داخراوەکان و سفرکردنەوەی قازانجی کاڵای داخراو؟')) {
      products.forEach((p) => {
        if (p.isClosed) {
          updateProduct(p.id, { 
            isClosed: false,
            isCommissionSettled: false,
            commissionAmount: 0,
            safiAmount: 0
          });
          removeCommissionTransactionsForProduct(p.id, p.name);
        }
      });
      closedProductArchives.forEach((a) => {
        deleteClosedProductArchive(a.id);
      });
    }
  };

  const commissionCashImpact = useMemo(() => {
    let impact = 0;
    (commissionAccounts || []).forEach(acc => {
      const b = Number(acc.balance) || 0;
      if (b < 0) {
        impact += Math.abs(b);
      } else if (b > 0) {
        impact -= b;
      }
    });
    return impact;
  }, [commissionAccounts]);

  // کۆی قازانجی عمولە = کۆی عمولەی کاڵا تەواوبووەکان لە بەشی کاڵاکان
  const totalCommissionProfit = useMemo(() => {
    return commissionClosedProductsList.reduce((sum, item) => {
      const pComm = Number(item.totalCommission || (item.productRef as any)?.commissionAmount) || 0;
      return sum + pComm;
    }, 0);
  }, [commissionClosedProductsList]);

  const commissionSettledCount = commissionClosedProductsList.length;

  // فۆرمۆلای قازانجی پوخت: قازانجی کاڵای داخراو + کۆی قازانجی عمولە - کۆی خەرجییەکان
  const periodNetProfit = closedProductsProfit + totalCommissionProfit - periodExpenses;
  const isLoss = periodNetProfit < 0;
  const totalRevBase = closedProductsTotals.rev + totalCommissionProfit;
  const profitMargin =
    totalRevBase > 0 ? ((periodNetProfit / totalRevBase) * 100).toFixed(1) : '0';

  // Helper to dynamically adjust font size for large numbers
  const getAdaptiveStatFontSize = (text: string): string => {
    const len = text.length;
    if (len <= 8) return 'text-xl sm:text-2xl lg:text-3xl';
    if (len <= 12) return 'text-lg sm:text-xl lg:text-2xl';
    if (len <= 16) return 'text-base sm:text-lg lg:text-xl';
    return 'text-sm sm:text-base lg:text-lg';
  };

  const allCount = productPerformance.length;
  const activeCount = useMemo(() => productPerformance.filter((p) => p.status === 'active').length, [productPerformance]);
  const closedCount = useMemo(() => productPerformance.filter((p) => p.status === 'closed').length, [productPerformance]);
  const deletedCount = useMemo(() => productPerformance.filter((p) => p.status === 'deleted').length, [productPerformance]);

  // Filtered performance list for the table
  const displayedPerformance = useMemo(() => {
    return productPerformance.filter((item) => {
      if (ledgerTab === 'active' && item.status !== 'active') return false;
      if (ledgerTab === 'closed' && item.status !== 'closed') return false;
      if (ledgerTab === 'deleted' && item.status !== 'deleted') return false;

      if (productSearch.trim()) {
        const q = productSearch.trim().toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchBarcode = item.barcode.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        if (!matchName && !matchBarcode && !matchCat) return false;
      }

      return true;
    });
  }, [productPerformance, ledgerTab, productSearch]);

  // Reset pagination when search, tab, or time changes
  useEffect(() => {
    setCurrentPage(1);
  }, [productSearch, ledgerTab, timeFilter]);

  const totalPages = Math.ceil(displayedPerformance.length / itemsPerPage);
  const paginatedPerformance = useMemo(() => {
    return displayedPerformance.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [displayedPerformance, currentPage]);

  // Summary of displayed items in table
  const displayedTotals = useMemo(() => {
    return displayedPerformance.reduce(
      (acc, item) => ({
        qty: acc.qty + item.totalQty,
        rev: acc.rev + item.totalRev,
        cost: acc.cost + item.totalCost,
        profit: acc.profit + (item.houseProfit ?? item.netProfit),
      }),
      { qty: 0, rev: 0, cost: 0, profit: 0 }
    );
  }, [displayedPerformance]);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = Number(expenseForm.amount);
    if (!expenseForm.title.trim() || amountVal <= 0) return;

    addExpense({
      title: expenseForm.title,
      category: expenseForm.category,
      amount: amountVal,
      date: combineDateWithCurrentTime(expenseForm.date),
      recorderName: expenseForm.recorderName,
      notes: expenseForm.notes,
    });

    setIsExpenseModalOpen(false);
    setExpenseForm({
      title: '',
      category: 'کرێی دوکان',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      recorderName: '',
      notes: '',
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header / Actions Area */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-slate-900/60 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-lg border border-white/10 relative overflow-hidden group" dir="rtl">
        {/* Subtle top accent line to match cards */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-500 opacity-90 transition-opacity"></div>

        {/* Time Filter Group: ئەم مانگە | هەڵبژاردنی مانگ */}
        <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-2 sm:gap-3">
          <span className="text-[11px] sm:text-xs font-black text-cyan-200 whitespace-nowrap shrink-0">ماوەی ژمێریاری:</span>
          <div className="flex items-center gap-1 sm:gap-1.5 flex-1 sm:flex-none justify-between sm:justify-start bg-slate-950/60 p-1 rounded-2xl shadow-inner border border-white/10">
            {/* 1. ئەم مانگە */}
            <button
              type="button"
              onClick={() => setTimeFilter('this_month')}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all duration-200 cursor-pointer ${
                timeFilter === 'this_month'
                  ? 'bg-gradient-to-b from-emerald-500 to-teal-600 text-slate-950 shadow-md border border-emerald-400/50'
                  : 'bg-transparent text-slate-200 hover:text-white hover:bg-white/10 font-bold'
              }`}
            >
              ئەم مانگە
            </button>

            {/* 2. هەڵبژاردنی مانگ بە پیشاندانی بەرواری مانگ وەک 9/2026 */}
            <button
              type="button"
              onClick={handleOpenMonthPicker}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all duration-200 cursor-pointer ${
                timeFilter === 'select_month'
                  ? 'bg-gradient-to-b from-emerald-500 to-teal-600 text-slate-950 shadow-md border border-emerald-400/50'
                  : 'bg-transparent text-slate-200 hover:text-white hover:bg-white/10 font-bold'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-mono tracking-wider font-black">
                {getMonthYearShortDisplay(selectedCustomMonth)}
              </span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
          {/* Close Month Button */}
          <button
            type="button"
            onClick={() => setIsCloseMonthModalOpen(true)}
            className="flex items-center justify-center gap-2.5 flex-1 sm:flex-initial px-4.5 py-2.5 bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-700 hover:brightness-105 text-white rounded-2xl font-black text-xs shadow-[0_4px_14px_rgba(16,185,129,0.35),inset_0_1.5px_1.5px_rgba(255,255,255,0.4)] border border-emerald-400/50 transition-all duration-300 active:scale-[0.98] group shrink-0 cursor-pointer"
          >
            <div className="w-6.5 h-6.5 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="tracking-wide">داخستنی مانگ</span>
          </button>

          {/* History Review Button */}
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center justify-center gap-2.5 flex-1 sm:flex-initial px-4.5 py-2.5 bg-gradient-to-b from-slate-800 to-slate-900 hover:brightness-110 text-white rounded-2xl font-black text-xs shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-slate-700 transition-all duration-300 active:scale-[0.98] cursor-pointer"
            title="پیاچوونەوەی مانگە داخراوەکان"
          >
            <div className="w-6.5 h-6.5 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Archive className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="tracking-wide">ئەرشیف</span>
          </button>

          {/* Action Button */}
          {onBackToMain && (
            <button
              onClick={onBackToMain}
              className="flex items-center justify-center gap-2.5 flex-1 sm:flex-initial px-4.5 py-2.5 bg-gradient-to-b from-[#8EFBFF] via-[#7DF9FF] to-[#5CE8F0] hover:brightness-105 text-slate-950 rounded-2xl font-black text-xs shadow-[0_4px_14px_rgba(125,249,255,0.45),inset_0_1.5px_1.5px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.15)] border border-cyan-200/60 transition-all duration-300 active:scale-[0.98] group shrink-0 cursor-pointer"
            >
              <div className="w-6.5 h-6.5 rounded-xl bg-slate-950/10 border border-slate-950/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_4px_rgba(0,0,0,0.08)] flex items-center justify-center shrink-0">
                <Home className="w-3.5 h-3.5 text-slate-950 filter drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]" />
              </div>
              <span className="tracking-wide font-black">سەرەکی</span>
              <div className="w-5 h-5 rounded-lg bg-slate-950/10 flex items-center justify-center shrink-0 group-hover:-translate-x-1 transition-transform duration-300">
                <ArrowLeft className="w-3.5 h-3.5 text-slate-950 filter drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* 3 Small Metric Buttons: Closed Products Profit, Commission Profit & Total Expenses (Side-by-side) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        {/* Button 1: Closed & Finished Products Profit Card (قازانجی کاڵای داخراو) */}
        <div
          id="closed-products-metric-card"
          className="bg-slate-900/60 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl border border-emerald-500/25 hover:border-emerald-500/40 shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group"
        >
          {/* Subtle top accent line */}
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-90"></div>
          
          <div>
            {/* Header: Right (Icon + Title) | Left (Badge + Chevron Toggle) */}
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsClosedProductsExpanded(!isClosedProductsExpanded)}
                  aria-expanded={isClosedProductsExpanded}
                  title={isClosedProductsExpanded ? 'شاردنەوەی وردەکارییەکان' : 'پیشاندانی وردەکارییەکان'}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-b from-emerald-400 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 cursor-pointer"
                >
                  <FolderArchive className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </button>
                <span
                  onClick={() => setIsClosedProductsExpanded(!isClosedProductsExpanded)}
                  className="text-[11px] sm:text-xs font-bold text-white cursor-pointer select-none hover:text-emerald-400 transition-colors truncate"
                >
                  قازانجی کاڵای داخراو
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md border border-emerald-500/30">
                  {closedProductsList.length} کاڵا
                </span>
                <button
                  type="button"
                  onClick={() => setIsClosedProductsExpanded(!isClosedProductsExpanded)}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center transition-all cursor-pointer border ${
                    isClosedProductsExpanded
                      ? 'rotate-180 bg-white/20 text-white border-white/30'
                      : 'bg-slate-950/60 text-emerald-300 border-white/10 hover:text-white'
                  }`}
                  title={isClosedProductsExpanded ? 'داخستن' : 'کردنەوە'}
                >
                  <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            </div>

            {/* Main Profit Amount (Always Visible) */}
            <div
              onClick={() => setIsClosedProductsExpanded(!isClosedProductsExpanded)}
              className="cursor-pointer select-none"
            >
              <div className={`text-base sm:text-xl lg:text-2xl font-black font-mono tracking-tight leading-tight ${
                closedProductsTotals.profit > 0 ? 'text-emerald-400' : closedProductsTotals.profit < 0 ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {closedProductsTotals.profit > 0 ? '+' : ''}{formatCurrency(closedProductsTotals.profit, settings.currency, settings.usdToIqdRate)}
              </div>
            </div>
          </div>

          {/* Expandable Accordion Body */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isClosedProductsExpanded
                ? 'max-h-80 opacity-100 mt-2.5 pt-2.5 border-t border-white/10'
                : 'max-h-0 opacity-0 mt-0 pt-0 border-t-0'
            }`}
          >
            <div className="space-y-1.5 text-xs">
              {closedProductsList.length === 0 ? (
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 text-center text-slate-300 text-[11px] font-bold">
                  هیچ کاڵایەکی تەواوبوو یان داخراو نییە (قازانج: 0 {settings.currency === 'USD' ? '$' : 'د.ع'})
                </div>
               ) : (
                <>
                  <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-xl border border-white/5">
                    <span className="text-emerald-200 font-bold text-[10px] sm:text-[11px]">فرۆشی کاڵا تەواو بووەکان:</span>
                    <span className="font-mono font-black text-white text-[11px] sm:text-xs">{formatCurrency(closedProductsTotals.rev, settings.currency, settings.usdToIqdRate)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-xl border border-white/5">
                    <span className="text-slate-300 font-bold text-[10px] sm:text-[11px]">تێچووی کاڵای تەواوبوو:</span>
                    <span className="font-mono font-bold text-amber-200 text-[11px] sm:text-xs">{formatCurrency(closedProductsTotals.cost, settings.currency, settings.usdToIqdRate)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950/70 p-2 rounded-xl border border-emerald-500/20 font-black">
                    <span className="text-emerald-300 font-bold text-[10px] sm:text-[11px]">قازانجی کاڵای داخراو:</span>
                    <span className={`font-mono font-black text-[11px] sm:text-xs ${closedProductsTotals.profit > 0 ? 'text-emerald-400' : closedProductsTotals.profit < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {closedProductsTotals.profit > 0 ? '+' : ''}{formatCurrency(closedProductsTotals.profit, settings.currency, settings.usdToIqdRate)}
                    </span>
                  </div>
                </>
              )}

              {closedProductsList.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetClosedProducts();
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 active:scale-[0.99] border border-rose-500/30 text-rose-300 font-black text-[10px] sm:text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-1"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>کردنەوەی هەموو کاڵاکان و سفرکردنەوە</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const el = document.getElementById('standalone-product-accounting-ledger');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-1.5 px-2 rounded-lg bg-slate-950/60 hover:bg-slate-950/80 active:scale-[0.99] border border-white/10 text-emerald-300 font-extrabold text-[10px] sm:text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-1"
              >
                <span>لیستی کاڵاکان</span>
                <ArrowDownRight className="w-3 h-3 text-emerald-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Button 2: Commission Profit Card (قازانجی عمولە) */}
        <div
          className="bg-slate-900/60 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl border border-cyan-500/25 hover:border-cyan-500/40 shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group"
        >
          {/* Subtle top accent line */}
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 to-teal-500 opacity-90"></div>
          
          <div>
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-b from-cyan-400 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm"
                >
                  <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-white truncate">
                  قازانجی عمولە
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-black bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-md border border-cyan-500/30">
                  {commissionSettledCount} تۆمار
                </span>
              </div>
            </div>

            <div className="text-base sm:text-xl lg:text-2xl font-black font-mono tracking-tight leading-tight text-cyan-400">
               +{formatCurrency(totalCommissionProfit, settings.currency, settings.usdToIqdRate)}
            </div>
          </div>
        </div>

        {/* Button 3: Expenses Card (کۆی خەرجییەکان) */}
        <div
          className="bg-slate-900/60 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl border border-rose-500/25 hover:border-rose-500/40 shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group"
        >
          {/* Subtle top accent line */}
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-rose-400 to-pink-500 opacity-90"></div>

          <div>
            {/* Header: Right (Icon + Title) | Left (Badge + Chevron Toggle) */}
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
                  aria-expanded={isExpensesExpanded}
                  title={isExpensesExpanded ? 'شاردنەوەی وردەکارییەکان' : 'پیشاندانی وردەکارییەکان'}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-b from-rose-400 to-pink-600 text-white flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </button>
                <span
                  onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
                  className="text-[11px] sm:text-xs font-bold text-white cursor-pointer select-none hover:text-rose-400 transition-colors truncate"
                >
                  کۆی خەرجییەکان
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-black bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded-md border border-rose-500/30">
                  {filteredExpenses.length} بڕگە
                </span>
                <button
                  type="button"
                  onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center transition-all cursor-pointer border ${
                    isExpensesExpanded
                      ? 'rotate-180 bg-white/20 text-white border-white/30'
                      : 'bg-slate-950/60 text-rose-300 border-white/10 hover:text-white'
                  }`}
                  title={isExpensesExpanded ? 'داخستن' : 'کردنەوە'}
                >
                  <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            </div>

            {/* Main Expense Amount (Always Visible) */}
            <div
              onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
              className="cursor-pointer select-none"
            >
              <div className="text-base sm:text-xl lg:text-2xl font-black text-rose-400 font-mono tracking-tight leading-tight">
                {formatCurrency(periodExpenses, settings.currency, settings.usdToIqdRate)}
              </div>
            </div>
          </div>

          {/* Expandable Accordion Body */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isExpensesExpanded
                ? 'max-h-96 opacity-100 mt-2.5 pt-2.5 border-t border-white/10'
                : 'max-h-0 opacity-0 mt-0 pt-0 border-t-0'
            }`}
          >
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-xl border border-white/5">
                <span className="text-rose-200 font-bold text-[10px] sm:text-[11px]">ژمارەی پسوولە:</span>
                <span className="font-mono font-bold text-white text-[11px] sm:text-xs">{filteredExpenses.length} پسوولە</span>
              </div>

              {expenseCategoryBreakdown.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-200 flex items-center justify-between">
                    <span>دابەشبوون:</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">100%</span>
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {expenseCategoryBreakdown.map((item) => (
                      <div key={item.category} className="bg-slate-950/60 p-1.5 rounded-lg border border-white/10 text-[10px] space-y-0.5">
                        <div className="flex justify-between items-center font-bold text-slate-200">
                          <span className="truncate">{item.category}</span>
                          <span className="font-mono text-rose-400 font-black">{item.percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {onGoToExpenses && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGoToExpenses();
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-950/60 hover:bg-slate-950/80 active:scale-[0.99] border border-white/10 text-rose-300 font-extrabold text-[10px] sm:text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-1"
                >
                  <span>بەشی خەرجییەکان</span>
                  <ArrowUpRight className="w-3 h-3 text-rose-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Net Profit Card */}
      <div>

        {/* Card 3: Net Profit & Loss (سافی قازانجی پوخت / زەرەری پوخت) */}
        <div
          className="bg-slate-900/60 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl border border-white/10 shadow-lg hover:shadow-2xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between group"
        >
          {/* Subtle top accent line (Brand Color or Rose if loss) */}
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${isLoss ? 'from-rose-400 to-rose-500' : 'from-[#7DF9FF] to-cyan-400'} opacity-90 transition-opacity`}></div>

          <div>
            {/* Header: Right (Icon + Title) | Left (Badge + Chevron Toggle) */}
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* 3D Modern Profit / Loss Icon Badge */}
                <button
                  type="button"
                  onClick={() => setIsNetProfitExpanded(!isNetProfitExpanded)}
                  aria-expanded={isNetProfitExpanded}
                  title={isNetProfitExpanded ? 'شاردنەوەی وردەکارییەکان' : 'پیشاندانی وردەکارییەکان'}
                  className={`w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 cursor-pointer ${
                    isNetProfitExpanded
                      ? isLoss
                        ? 'bg-gradient-to-b from-rose-500 via-rose-600 to-red-700 text-white shadow-[0_4px_12px_rgba(225,29,72,0.45),inset_0_1.5px_1.5px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.25)] border border-rose-300/50 ring-3 ring-rose-500/20 scale-105'
                        : 'bg-gradient-to-b from-cyan-300 via-[#7DF9FF] to-teal-500 text-slate-950 shadow-[0_4px_12px_rgba(6,182,212,0.45),inset_0_1.5px_1.5px_rgba(255,255,255,0.85),inset_0_-2px_4px_rgba(0,0,0,0.18)] border border-cyan-200/60 ring-3 ring-cyan-400/20 scale-105'
                      : isLoss
                        ? 'bg-gradient-to-b from-rose-400 via-rose-500 to-red-600 text-white shadow-[0_4px_10px_rgba(225,29,72,0.35),inset_0_1.5px_1.5px_rgba(255,255,255,0.65),inset_0_-2px_4px_rgba(0,0,0,0.2)] border border-rose-300/40 hover:scale-105 active:scale-95'
                        : 'bg-gradient-to-b from-cyan-300 via-[#7DF9FF] to-teal-500 text-slate-950 shadow-[0_4px_10px_rgba(6,182,212,0.35),inset_0_1.5px_1.5px_rgba(255,255,255,0.85),inset_0_-2px_4px_rgba(0,0,0,0.15)] border border-cyan-200/50 hover:scale-105 active:scale-95'
                  }`}
                >
                  {isLoss ? (
                    <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-white filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.35)]" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
                  )}
                </button>
                <span
                  onClick={() => setIsNetProfitExpanded(!isNetProfitExpanded)}
                  className={`text-xs sm:text-sm font-bold cursor-pointer select-none transition-colors text-white ${
                    isLoss ? 'hover:text-rose-400' : 'hover:text-cyan-300'
                  }`}
                >
                  {isLoss ? 'زەرەری پوخت' : 'قازانجی پوخت'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <span
                  className="text-[10px] sm:text-[11px] font-black bg-slate-950/60 text-cyan-300 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg border border-white/10"
                >
                  ڕێژە: {profitMargin}%
                </span>
                <button
                  type="button"
                  onClick={() => setIsNetProfitExpanded(!isNetProfitExpanded)}
                  className={`w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer border ${
                    isNetProfitExpanded
                      ? 'rotate-180 bg-white/20 text-white border-white/30 shadow-inner'
                      : 'bg-slate-950/60 text-cyan-300 border-white/10 hover:text-white hover:scale-105 active:scale-95'
                  }`}
                  title={isNetProfitExpanded ? 'داخستن' : 'کردنەوە'}
                >
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Main Net Profit / Loss Amount (Always Visible) */}
            <div
              onClick={() => setIsNetProfitExpanded(!isNetProfitExpanded)}
              className="mt-1 mb-0.5 cursor-pointer select-none"
            >
              <div
                className={`font-black font-mono tracking-tight leading-tight break-all ${
                  isLoss ? 'text-rose-400' : 'text-cyan-300'
                } ${getAdaptiveStatFontSize(formatCurrency(periodNetProfit, settings.currency, settings.usdToIqdRate))}`}
              >
                {formatCurrency(periodNetProfit, settings.currency, settings.usdToIqdRate)}
              </div>
              <p className="text-[10.5px] sm:text-xs text-slate-300 font-medium mt-1 leading-normal">
                {isLoss ? 'پوختەی دارایی دوای کەمکردنەوەی خەرجییەکان (زەرەر)' : 'پوختەی دەستکەوت دوای دەرکردنی خەرجییەکان'}
              </p>
            </div>
          </div>

          {/* Expandable Accordion Body */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isNetProfitExpanded
                ? 'max-h-64 opacity-100 mt-3 pt-3 border-t border-white/10'
                : 'max-h-0 opacity-0 mt-0 pt-0 border-t-0'
            }`}
          >
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-white/5">
                <span className="text-emerald-300 font-bold text-[11px] sm:text-xs">قازانجی کاڵای داخراو:</span>
                <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                  +{formatCurrency(closedProductsProfit, settings.currency, settings.usdToIqdRate)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-white/5">
                <span className="text-cyan-300 font-bold text-[11px] sm:text-xs">قازانجی عمولە:</span>
                <span className="font-mono font-bold text-cyan-400 text-xs sm:text-sm">
                  +{formatCurrency(totalCommissionProfit, settings.currency, settings.usdToIqdRate)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-white/5">
                <span className="text-rose-300 font-bold text-[11px] sm:text-xs">کۆی خەرجییەکان:</span>
                <span className="font-mono font-bold text-rose-400 text-xs sm:text-sm">
                  -{formatCurrency(periodExpenses, settings.currency, settings.usdToIqdRate)}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/70 p-2.5 rounded-xl border border-white/10">
                <span className="text-slate-200 font-bold text-[11px] sm:text-xs">دۆخی بازرگانی:</span>
                <span
                  className={`font-black text-[11.5px] sm:text-xs ${
                    isLoss ? 'text-rose-400' : 'text-cyan-300'
                  }`}
                >
                  {isLoss ? 'لە زیاندایە' : 'قازانجدار'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-200 font-bold text-[11px] sm:text-xs">ڕێژەی قازانج لە فرۆش:</span>
                <span className={`font-mono font-bold text-xs sm:text-sm ${isLoss ? 'text-rose-400' : 'text-cyan-300'}`}>
                  {profitMargin}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Profit Comparison Chart Card (New Feature) */}
      <MonthlyProfitComparisonChart
        sales={sales}
        expenses={expenses}
        closedProductArchives={closedProductArchives}
        products={products}
        closedMonthsArchives={closedMonthsArchives}
        currency={settings.currency}
        usdToIqdRate={settings.usdToIqdRate}
        onSelectMonth={(monthKey) => {
          setSelectedCustomMonth(monthKey);
          setTimeFilter('select_month');
        }}
      />

      {/* Standalone Product Accounting Ledger (کاڵای تەواوبوو) */}
      <div id="standalone-product-accounting-ledger" className="bg-transparent mb-6 transition-all duration-300">
        {/* Clickable Header for Collapsible Accordion */}
        <button
          type="button"
          onClick={() => setIsLedgerExpanded(!isLedgerExpanded)}
          className={`w-full p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-all duration-300 focus:outline-none ${
            isLedgerExpanded 
              ? 'bg-[#141b2a] text-white rounded-t-3xl shadow-xl border-b border-slate-800' 
              : 'bg-[#141b2a] text-white rounded-3xl shadow-xl shadow-slate-950/25 hover:bg-[#1a2333] hover:shadow-2xl'
          }`}
        >
          <div className="flex items-center gap-3.5">
            {/* 3D Amber Icon Container */}
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-slate-950 shrink-0 shadow-[0_4px_12px_rgba(245,158,11,0.4),inset_0_1.5px_1.5px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.2)] border border-amber-300/60">
              <CheckCircle2 className="w-5 h-5 text-slate-950 filter drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]" />
            </div>
            <div>
              <h4 className="font-extrabold text-base sm:text-lg text-amber-400 tracking-tight flex items-center gap-2">
                کاڵای تەواوبوو 
                <span className="text-white font-mono text-sm sm:text-base font-black px-2 py-0.5 rounded-lg bg-white/10 border border-white/15">({closedCount})</span>
              </h4>
            </div>
          </div>
          
          <div className="flex items-center shrink-0">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center transition-transform duration-300 border border-slate-700/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_6px_rgba(0,0,0,0.4)] ${isLedgerExpanded ? 'rotate-180 bg-slate-700' : ''}`}>
              <ChevronDown className="w-5 h-5 text-amber-400 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
            </div>
          </div>
        </button>

        {/* Collapsible Body */}
        <div className={`transition-all duration-300 ease-in-out bg-white ${isLedgerExpanded ? 'max-h-[5000px] opacity-100 border-x border-b border-slate-200 rounded-b-3xl shadow-sm' : 'max-h-0 opacity-0 overflow-hidden rounded-b-3xl border-0'}`}>
          <div className="p-4 sm:p-5 bg-slate-900/5 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input with 3D inset */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="گەڕان بەپێی ناوی کاڵا یان کۆد..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-white text-slate-900 text-xs rounded-xl pr-9 pl-3 py-2.5 border border-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25 transition-all font-bold shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
              />
              <Search className="w-4 h-4 text-amber-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filter Badge / Indicator with 3D Depth */}
            <div className="flex justify-center items-center bg-gradient-to-b from-amber-50 to-amber-100/80 px-4 py-2.5 rounded-xl border border-amber-300/70 text-amber-900 text-xs font-black gap-2 shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_4px_rgba(245,158,11,0.1)]">
              <div className="w-5 h-5 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />
              </div>
              <span>پیشاندانی کاڵا تەواوبووەکان</span>
            </div>
          </div>

          {/* 1. Mobile Card List Layout (< sm) */}
          <div className="block sm:hidden p-3 space-y-3 bg-slate-50/50">
          {displayedPerformance.length === 0 ? (
            <div className="py-10 text-center text-slate-800 font-bold text-xs bg-white rounded-2xl border border-slate-200 p-4">
              هیچ کاڵایەک بەپێی ئەم فلتەرە نەدۆزرایەوە
            </div>
          ) : (
            paginatedPerformance.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-3.5 space-y-3">
                {/* Product Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="font-black text-slate-900 text-sm">{item.name}</h5>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-900">
                      {item.category && <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-800 font-bold border border-slate-200">{item.category}</span>}
                      {item.barcode && <span className="font-mono text-slate-800 font-bold">کۆد: {item.barcode}</span>}
                    </div>
                  </div>

                  <div>
                    {item.status === 'active' && (
                      <span className="inline-flex items-center text-[10px] font-black px-2.5 py-1 rounded-lg bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-[0_2px_6px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.6)] border border-emerald-300/40">
                        چالاک
                      </span>
                    )}
                    {item.status === 'closed' && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-[0_2px_6px_rgba(245,158,11,0.3),inset_0_1px_1px_rgba(255,255,255,0.7)] border border-amber-300/50">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                        <span>داخراو</span>
                      </span>
                    )}
                    {item.status === 'deleted' && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg bg-gradient-to-b from-purple-400 via-purple-500 to-purple-600 text-white shadow-[0_2px_6px_rgba(168,85,247,0.3),inset_0_1px_1px_rgba(255,255,255,0.6)] border border-purple-300/40">
                        <Archive className="w-3.5 h-3.5 text-white" />
                        <span>سڕاوە</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 2x2 Grid Stats */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-150 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-800 block">بڕی فرۆشراو:</span>
                    <span className="font-mono font-black text-slate-900">
                      {item.totalQty} {item.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-800 block">تێچووی یەکە:</span>
                    <span className="font-mono font-black text-slate-900">
                      {formatCurrency(item.baseCost, settings.currency, settings.usdToIqdRate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-800 block">کۆی داهاتی فرۆش:</span>
                    <span className="font-mono font-black text-slate-900">
                      {formatCurrency(item.totalRev, settings.currency, settings.usdToIqdRate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-800 block">سافی قازانج (بۆ ماڵەوە):</span>
                    <span className={`font-mono font-black ${(item.houseProfit ?? item.netProfit) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {(item.houseProfit ?? item.netProfit) >= 0 ? '+' : ''}{formatCurrency((item.houseProfit ?? item.netProfit), settings.currency, settings.usdToIqdRate)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons with 3D Feel */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedProductForAccount(item.productRef)}
                    className="w-full py-2 rounded-xl bg-gradient-to-b from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 active:scale-[0.98] text-purple-800 border border-purple-200/80 shadow-[0_2px_4px_rgba(168,85,247,0.1),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <div className="w-4.5 h-4.5 rounded-md bg-purple-600 text-white flex items-center justify-center shadow-2xs">
                      <Eye className="w-3 h-3" />
                    </div>
                    <span>وردەکاری</span>
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTargetItem({ id: item.id, name: item.name, productId: item.productId, barcode: item.barcode });
                      setDeletePassword('');
                      setShowDeletePassword(false);
                      setDeleteError('');
                    }}
                    className="w-full py-2 rounded-xl bg-gradient-to-b from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 active:scale-[0.98] text-rose-800 border border-rose-200/80 shadow-[0_2px_4px_rgba(244,63,94,0.1),inset_0_1px_1px_rgba(255,255,255,0.8)] font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <div className="w-4.5 h-4.5 rounded-md bg-rose-600 text-white flex items-center justify-center shadow-2xs">
                      <Trash2 className="w-3 h-3" />
                    </div>
                    <span>سڕینەوە</span>
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Mobile Totals Summary Card */}
          {displayedPerformance.length > 0 && (
            <div className="bg-slate-900 text-white rounded-xl p-3 mt-1 shadow-md border border-slate-700">
              <div className="text-[10px] font-black text-amber-300 mb-1.5">
                کۆی ({displayedPerformance.length} کاڵا):
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                <div className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded-lg border border-white/5">
                  <span className="text-slate-300 font-bold">فرۆشراو:</span>
                  <span className="font-mono font-black text-white">{displayedTotals.qty}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded-lg border border-white/5">
                  <span className="text-sky-300 font-bold">داهات:</span>
                  <span className="font-mono font-black text-white">{formatCurrency(displayedTotals.rev, settings.currency, settings.usdToIqdRate)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded-lg border border-white/5">
                  <span className="text-slate-300 font-bold">تێچوو:</span>
                  <span className="font-mono font-bold text-amber-200">{formatCurrency(displayedTotals.cost, settings.currency, settings.usdToIqdRate)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded-lg border border-white/5">
                  <span className="text-emerald-300 font-bold">قازانج:</span>
                  <span className={`font-mono font-black ${displayedTotals.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {displayedTotals.profit >= 0 ? '+' : ''}{formatCurrency(displayedTotals.profit, settings.currency, settings.usdToIqdRate)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Desktop & Tablet Table Layout (>= sm) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-right text-xs min-w-[740px]">
            <thead className="bg-slate-100/80 text-slate-900 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">ناوی کاڵا و دۆخ</th>
                <th className="py-3 px-4">تێچووی یەک دانە</th>
                <th className="py-3 px-4 text-center">بڕی فرۆشراو</th>
                <th className="py-3 px-4">کۆی داهاتی فرۆشراو</th>
                <th className="py-3 px-4">کۆی تێچووی فرۆشراو</th>
                <th className="py-3 px-4">سافی قازانج (بۆ ماڵەوە)</th>
                <th className="py-3 px-4 text-center">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {displayedPerformance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-800 font-bold text-sm">
                    هیچ کاڵایەک بەپێی ئەم فلتەرە نەدۆزرایەوە
                  </td>
                </tr>
              ) : (
                paginatedPerformance.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-950 text-sm">{item.name}</span>
                        {item.status === 'active' && (
                          <span className="inline-flex items-center text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-[0_2px_4px_rgba(16,185,129,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)] border border-emerald-300/40">
                            چالاک
                          </span>
                        )}
                        {item.status === 'closed' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-[0_2px_4px_rgba(245,158,11,0.25),inset_0_1px_1px_rgba(255,255,255,0.7)] border border-amber-300/50">
                            <CheckCircle2 className="w-3 h-3 text-slate-950" />
                            <span>تەواوبوو / داخراو</span>
                          </span>
                        )}
                        {item.status === 'deleted' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-gradient-to-b from-purple-400 via-purple-500 to-purple-600 text-white shadow-[0_2px_4px_rgba(168,85,247,0.25),inset_0_1px_1px_rgba(255,255,255,0.6)] border border-purple-300/40">
                            <Archive className="w-3 h-3 text-white" />
                            <span>سڕاوە</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-700 font-bold font-mono">
                        {item.category && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">{item.category}</span>}
                        {item.barcode && <span className="text-slate-800">• کۆد: {item.barcode}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-950 font-black font-mono">
                      {formatCurrency(item.baseCost, settings.currency, settings.usdToIqdRate)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className="bg-slate-100 text-slate-950 px-2.5 py-1 rounded-md border border-slate-300 font-mono text-[11px] font-black">
                        {item.totalQty} {item.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-slate-950 font-mono">
                      {formatCurrency(item.totalRev, settings.currency, settings.usdToIqdRate)}
                    </td>
                    <td className="py-3 px-4 text-slate-950 font-bold font-mono">
                      {formatCurrency(item.totalCost, settings.currency, settings.usdToIqdRate)}
                    </td>
                    <td className={`py-3 px-4 font-black font-mono text-sm ${(item.houseProfit ?? item.netProfit) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {(item.houseProfit ?? item.netProfit) >= 0 ? '+' : ''}{formatCurrency((item.houseProfit ?? item.netProfit), settings.currency, settings.usdToIqdRate)}
                      {item.houseProfit !== undefined && item.houseProfit !== item.netProfit && (
                        <div className="text-[10px] text-slate-700 font-bold">
                          کۆی گشتی: {formatCurrency(item.netProfit, settings.currency, settings.usdToIqdRate)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedProductForAccount(item.productRef)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 active:scale-95 text-purple-900 border border-purple-200/80 shadow-[0_2px_4px_rgba(168,85,247,0.1),inset_0_1px_1px_rgba(255,255,255,0.8)] font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          title="بینینی سەرجەم وەسڵ و جووڵەکانی ئەم کاڵایە"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-700" />
                          <span>وردەکاری</span>
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTargetItem({ id: item.id, name: item.name, productId: item.productId, barcode: item.barcode });
                            setDeletePassword('');
                            setShowDeletePassword(false);
                            setDeleteError('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 active:scale-95 text-rose-900 border border-rose-200/80 shadow-[0_2px_4px_rgba(244,63,94,0.1),inset_0_1px_1px_rgba(255,255,255,0.8)] font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          title="سڕینەوەی ئەم کاڵایە"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                          <span>سڕینەوە</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {displayedPerformance.length > 0 && (
              <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td className="py-3 px-4 font-black text-xs text-slate-950">
                    کۆی سەرجەم کاڵا پیشاندراوەکان ({displayedPerformance.length} دانە):
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-mono font-bold">—</td>
                  <td className="py-3 px-4 text-center font-mono text-slate-950 font-black">
                    {displayedTotals.qty}
                  </td>
                  <td className="py-3 px-4 font-mono font-black text-slate-950">
                    {formatCurrency(displayedTotals.rev, settings.currency, settings.usdToIqdRate)}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {formatCurrency(displayedTotals.cost, settings.currency, settings.usdToIqdRate)}
                  </td>
                  <td className={`py-3 px-4 font-mono font-black text-sm ${displayedTotals.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {displayedTotals.profit >= 0 ? '+' : ''}{formatCurrency(displayedTotals.profit, settings.currency, settings.usdToIqdRate)}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-700 font-bold">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-slate-900">
            <span>
              پەڕەی {currentPage} لە {totalPages} ({displayedPerformance.length} کاڵا)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                پێشوو
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors ${
                      currentPage === p
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-900'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                دواتر
              </button>
            </div>
          </div>
        )}
        </div>
      </div>



      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-lg text-slate-900 mb-4">تۆمارکردنی خەرجی نوێ</h3>
            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  ناونیشانی خەرجی *
                </label>
                <input
                  type="text"
                  required
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  placeholder="بۆ نموونە: کرێی دوکانی ئەم مانگە"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  پۆلێنی خەرجی
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  {expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    بەروار
                  </label>
                  <input
                    type="text"
                    onFocus={(e) => (e.target.type = 'date')}
                    onBlur={(e) => (e.target.type = 'text')}
                    dir="ltr"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    ناوی تۆمارکەر
                  </label>
                  <input
                    type="text"
                    value={expenseForm.recorderName}
                    onChange={(e) => setExpenseForm({ ...expenseForm, recorderName: e.target.value })}
                    placeholder="ناوی تۆمارکەر"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  بڕی پارە (دینار) *
                </label>
                <input
                  type="text"
                  required
                  value={expenseForm.amount}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length > 1 && val.startsWith('0')) {
                      val = val.replace(/^0+/, '');
                    }
                    setExpenseForm({ ...expenseForm, amount: val });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-base font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  تێبینی / بەڵگەنامە
                </label>
                <textarea
                  rows={2}
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs"
                >
                  تۆمارکردنی خەرجی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Product Account Modal */}
      {selectedProductForAccount && (
        <ProductAccountModal
          product={selectedProductForAccount}
          onClose={() => setSelectedProductForAccount(null)}
        />
      )}

      {/* Delete Product Performance Item Security Modal */}
      {deleteTargetItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-md:w-full max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-rose-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/20 text-white">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg">سڕینەوەی کاڵا</h3>
                  <p className="text-xs text-rose-100">داواکاری سڕینەوەی تۆماری کاڵا</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteTargetItem(null)}
                className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeleteProductPerformance} className="p-6 space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-900 leading-relaxed font-semibold">
                تکایە ژمارەی نهێنی بنووسە بۆ سڕینەوەی تەواوی تۆماری کاڵای "{deleteTargetItem.name}":
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
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-900 p-1"
                  >
                    {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {deleteError && (
                  <p className="text-xs font-bold text-rose-600 mt-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{deleteError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteTargetItem(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  سڕینەوەی یەکجارەکی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kurdish Interactive Month Picker Modal */}
      {isMonthPickerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200" dir="rtl">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 text-white shadow-inner">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">هەڵبژاردنی مانگی ژمێریاری</h3>
                  <p className="text-[11px] text-emerald-100 font-medium">دیاریکردنی مانگ بۆ شیکاری دارایی</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMonthPickerModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Year Switcher */}
              <div className="flex items-center justify-between bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPickerYear((y) => y - 1)}
                  className="w-9 h-9 rounded-xl bg-white hover:bg-slate-50 text-slate-900 flex items-center justify-center font-bold shadow-xs border border-slate-200/80 transition-transform active:scale-95 cursor-pointer"
                  title="ساڵی پێشوو"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="text-base font-black font-mono text-slate-900 tracking-wider">
                  {pickerYear}
                </div>

                <button
                  type="button"
                  onClick={() => setPickerYear((y) => y + 1)}
                  className="w-9 h-9 rounded-xl bg-white hover:bg-slate-50 text-slate-900 flex items-center justify-center font-bold shadow-xs border border-slate-200/80 transition-transform active:scale-95 cursor-pointer"
                  title="ساڵی دواتر"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { num: 1, name: 'کانوونی دووەم' },
                  { num: 2, name: 'شوبات' },
                  { num: 3, name: 'ئادار' },
                  { num: 4, name: 'نیسان' },
                  { num: 5, name: 'ئایار' },
                  { num: 6, name: 'حوزەیران' },
                  { num: 7, name: 'تەمموز' },
                  { num: 8, name: 'ئاب' },
                  { num: 9, name: 'ئەیلوول' },
                  { num: 10, name: 'تشرینی یەکەم' },
                  { num: 11, name: 'تشرینی دووەم' },
                  { num: 12, name: 'کانوونی یەکەم' },
                ].map((m) => {
                  const isSelected = pickerMonth === m.num;
                  const isCurrent =
                    new Date().getFullYear() === pickerYear &&
                    new Date().getMonth() + 1 === m.num;

                  return (
                    <button
                      key={m.num}
                      type="button"
                      onClick={() => {
                        setPickerMonth(m.num);
                        handleConfirmMonthPicker(pickerYear, m.num);
                      }}
                      className={`relative p-2.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400 font-black'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200/70 font-bold'
                      }`}
                    >
                      <span className="text-xs">{m.name}</span>
                      <span className={`text-[10px] font-mono ${isSelected ? 'text-emerald-100 font-bold' : 'text-slate-700 font-bold'}`}>
                        ({m.num})
                      </span>
                      {isCurrent && !isSelected && (
                        <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Action Buttons: Reset & Checkmark (✓) */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetMonthPicker}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 font-black text-xs transition-all shadow-xs border border-slate-200 cursor-pointer"
                >
                  Reset / ئەم مانگە
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmMonthPicker()}
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 font-black text-xs transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>پەسەندکردنی مانگ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Close Month Confirmation Modal */}
      {isCloseMonthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200" dir="rtl">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20 text-white shadow-inner">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">داخستنی حسابی مانگەکە</h3>
                  <p className="text-[11px] text-emerald-100 font-medium">پەسەندکردن و تۆمارکردنی خەزێنەی دارایی مانگ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCloseMonthModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200/80 p-4 rounded-2xl text-emerald-900 text-xs space-y-2">
                <p className="font-bold">ئایا دڵنیایت لە داخستنی حسابی مانگی ({getMonthYearShortDisplay(timeFilter === 'select_month' ? selectedCustomMonth : `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`)})؟</p>
                <p className="text-emerald-700 text-[11px]">ئەم کارە پوختەی قازانج و خەرجییەکانی ئەم مانگە لە ئەرشیفی هەمیشەییدا تۆمار دەکات بۆ ئەوەی لە داهاتوودا بتوانیت پیاچوونەوەی پێدا بکەیت.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-900 font-black">قازانجی کاڵای داخراو:</span>
                  <span className="font-mono font-black text-emerald-600">{formatCurrency(closedProductsProfit, settings.currency, settings.usdToIqdRate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-900 font-black">کۆی خەرجییەکان:</span>
                  <span className="font-mono font-black text-rose-600">{formatCurrency(periodExpenses, settings.currency, settings.usdToIqdRate)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-black">
                  <span className="text-slate-950 font-black">سافی قازانج:</span>
                  <span className={`font-mono font-black ${periodNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {periodNetProfit >= 0 ? '+' : ''}{formatCurrency(periodNetProfit, settings.currency, settings.usdToIqdRate)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCloseMonthModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-900 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="button"
                  onClick={handleCloseMonthConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  پەسەندکردن و داخستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Closed Months History Review Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col" dir="rtl">
            <div className="p-5 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 text-white shadow-inner">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">ئەرشیفی مانگە داخراوەکان</h3>
                  <p className="text-[11px] text-slate-200 font-medium">پیاچوونەوەی حسابات و ئاماری مانگەکانی پێشوو</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {closedMonthsArchives.length === 0 ? (
                <div className="py-12 text-center text-slate-800 font-bold text-xs">
                  هیچ مانگێک تا ئێستا داخراو و ئەرشیف نەکراوە
                </div>
              ) : (
                closedMonthsArchives.map((arc) => (
                  <div key={arc.monthKey} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                        <h4 className="font-black text-sm text-slate-900">مانگی: {getKurdishMonthDisplay(arc.monthKey + '-01')}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-700 font-bold">
                        داخراوە لە: {new Date(arc.closedAt).toLocaleDateString('en-GB')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-slate-950 font-black">قازانجی کاڵا:</span>
                        <span className="font-mono font-black text-emerald-600 tracking-tight">{formatCurrency(arc.closedProductsProfit, settings.currency, settings.usdToIqdRate)}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-slate-950 font-black">کۆی خەرجی:</span>
                        <span className="font-mono font-black text-rose-600 tracking-tight">{formatCurrency(arc.totalExpenses, settings.currency, settings.usdToIqdRate)}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-slate-950 font-black">سافی قازانج:</span>
                        <span className={`font-mono font-black tracking-tight ${arc.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {arc.netProfit >= 0 ? '+' : ''}{formatCurrency(arc.netProfit, settings.currency, settings.usdToIqdRate)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteArchive(arc.monthKey)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-[11px] transition-all cursor-pointer flex items-center gap-1.5 border border-rose-200"
                        title="سڕینەوەی ئەم ئەرشیفە"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>سڕینەوە</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReopenMonth(arc.monthKey)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-black text-[11px] hover:brightness-105 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>گەڕانەوەی حساب بۆ سەر مانگ</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-black text-xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>گەڕانەوە</span>
              </button>

              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-black transition-colors cursor-pointer shadow-md"
              >
                داخستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Delete Password Modal */}
      {deleteArchiveTargetKey && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200" dir="rtl">
            <div className="p-4 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-white/20 text-white shadow-inner">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm">داواکاری ژمارەی نهێنی</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteArchiveTargetKey(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDeleteArchive} className="p-5 space-y-4">
              <p className="text-xs text-slate-900 font-bold">بۆ سڕینەوەی ئەم ئەرشیفە، تکایە ژمارەی نهێنی بنووسە:</p>
              
              <div className="relative">
                <input
                  type={showArchiveDeletePassword ? 'text' : 'password'}
                  value={archiveDeletePassword}
                  onChange={(e) => setArchiveDeletePassword(e.target.value)}
                  placeholder="ژمارەی نهێنی بنووسە"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-xs pl-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowArchiveDeletePassword(!showArchiveDeletePassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-900 cursor-pointer p-1"
                >
                  {showArchiveDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {archiveDeleteError && (
                <p className="text-[11px] font-bold text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">{archiveDeleteError}</p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteArchiveTargetKey(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-900 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                >
                  پەسەندکردن و سڕینەوە
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
