import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import {
  LayoutDashboard,
  TrendingUp,
  PieChart as PieIcon,
  ShoppingCart,
  DollarSign,
  Package,
  Calendar,
  Receipt,
  Activity,
  ChevronRight,
  ChevronLeft,
  X,
  Coins,
  Scale,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { calculateNetProfitOfClosedProducts } from '../utils/profitCalculations';
import { ModernSalesChart } from './ModernSalesChart';
import { RollingSalesChart } from './RollingSalesChart';
import { TopActiveCustomersWidget } from './TopActiveCustomersWidget';

type TimeRange = 'today' | 'month' | 'custom_day' | 'custom_month';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#64748B', '#14B8A6'];

export const ChartsView: React.FC<{ onBackToMain?: () => void; onGoToExpenses?: () => void }> = ({ onBackToMain, onGoToExpenses }) => {
  const { sales, expenses, settings, employees, products, closedProductArchives, productMovements, customers, debtTransactions } = useDatabase();
  
  // Persisted timeRange: today | month | custom_day | custom_month
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    try {
      const saved = localStorage.getItem('dashboard_timeRange');
      if (saved && ['today', 'month', 'custom_day', 'custom_month'].includes(saved)) {
        return saved as TimeRange;
      }
    } catch {}
    return 'today';
  });

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedDailySalesDay, setSelectedDailySalesDay] = useState<string | null>(null);
  const [velocityPeriod, setVelocityPeriod] = useState<'day' | 'week' | 'ten_days' | 'month' | 'custom_range'>('day');
  const [velocityCustomDay, setVelocityCustomDay] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const [velocityCustomMonth, setVelocityCustomMonth] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  });
  const [velocityRangeStart, setVelocityRangeStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [velocityRangeEnd, setVelocityRangeEnd] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });

  const handlePrevVelocityDay = () => {
    try {
      const parts = velocityCustomDay.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        d.setDate(d.getDate() - 1);
        const pad = (n: number) => n.toString().padStart(2, '0');
        setVelocityCustomDay(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }
    } catch {}
  };

  const handleNextVelocityDay = () => {
    try {
      const parts = velocityCustomDay.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        d.setDate(d.getDate() + 1);
        const pad = (n: number) => n.toString().padStart(2, '0');
        setVelocityCustomDay(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }
    } catch {}
  };

  const handlePrevVelocityMonth = () => {
    try {
      const [yStr, mStr] = velocityCustomMonth.split('-');
      let y = parseInt(yStr, 10);
      let m = parseInt(mStr, 10) - 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      setVelocityCustomMonth(`${y}-${String(m).padStart(2, '0')}`);
    } catch {}
  };

  const handleNextVelocityMonth = () => {
    try {
      const [yStr, mStr] = velocityCustomMonth.split('-');
      let y = parseInt(yStr, 10);
      let m = parseInt(mStr, 10) + 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      setVelocityCustomMonth(`${y}-${String(m).padStart(2, '0')}`);
    } catch {}
  };

  // Default to persisted selectedDate, or active_statsDate, or today
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('dashboard_selectedDate') || localStorage.getItem('active_statsDate');
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
        return saved;
      }
    } catch {}
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });

  // Persisted Selected Month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('dashboard_selectedMonth');
      if (saved && /^\d{4}-\d{2}$/.test(saved)) {
        return saved;
      }
    } catch {}
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  });

  // Save changes to localStorage so they persist across page reloads
  useEffect(() => {
    try {
      localStorage.setItem('dashboard_timeRange', timeRange);
      localStorage.setItem('dashboard_selectedDate', selectedDate);
      localStorage.setItem('active_statsDate', selectedDate);
      localStorage.setItem('dashboard_selectedMonth', selectedMonth);
    } catch {}
  }, [timeRange, selectedDate, selectedMonth]);

  // Safe robust date extractor converting any string, Date, or Timestamp to YYYY-MM-DD
  const getRecordYmd = (rawDate: any): string | null => {
    if (!rawDate) return null;
    try {
      if (typeof rawDate === 'string') {
        const normalized = rawDate.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).trim();
        const match = normalized.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (match) {
          return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        }
      }
      let d: Date | null = null;
      if (typeof rawDate === 'object') {
        if (rawDate.seconds) d = new Date(rawDate.seconds * 1000);
        else if (typeof rawDate.toDate === 'function') d = rawDate.toDate();
        else if (rawDate instanceof Date) d = rawDate;
      }
      if (!d) {
        let str = String(rawDate).trim();
        str = str.replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString());
        if (str.includes(' ') && !str.includes('T')) {
          str = str.replace(' ', 'T');
        }
        d = new Date(str);
      }
      if (!d || isNaN(d.getTime())) return null;
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } catch {
      return null;
    }
  };

  // Match a record against active timeRange, selectedDate, or selectedMonth
  const matchesDateFilter = (rawDate: any): boolean => {
    if (!rawDate) return false;
    const recYmd = getRecordYmd(rawDate);
    if (!recYmd) return false;

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayYmd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const currentMonthYm = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

    if (timeRange === 'today') {
      return recYmd === todayYmd;
    }
    if (timeRange === 'month') {
      return recYmd.startsWith(currentMonthYm);
    }
    if (timeRange === 'custom_day') {
      return recYmd === selectedDate;
    }
    if (timeRange === 'custom_month') {
      return recYmd.startsWith(selectedMonth);
    }
    return true;
  };

  // Unified sales records stream from both employees and sales tables to capture 100% of entries
  const allSalesRecords = useMemo(() => {
    const empSaleIds = new Set((employees || []).map((e) => e.saleId).filter(Boolean));
    const empIds = new Set((employees || []).map((e) => e.id));
    const standaloneSales = (sales || []).filter((s) => !empSaleIds.has(s.id) && !empIds.has(s.id));
    return [...(employees || []), ...standaloneSales];
  }, [employees, sales]);

  // Daily sales for the last 10 days with rich metadata
  const dailySalesData = useMemo(() => {
    const kurdishDays = ['یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی', 'شەممە'];
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayYmd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    interface DayData {
      ymd: string;
      fullDate: string;
      date: string;
      dayLabel: string;
      total: number;
      invoiceCount: number;
      totalWeight: number;
      cashAmount: number;
      debtAmount: number;
      topProducts: { name: string; qty: number; unit: string; amount: number }[];
      customers: string[];
      isToday: boolean;
      isPeak: boolean;
      displayLabel: string;
    }

    const daysMap = new Map<string, DayData>();

    // 10 calendar days up to today
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const dayLabel = kurdishDays[d.getDay()];
      daysMap.set(ymd, {
        ymd,
        fullDate: `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`,
        date: `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`,
        dayLabel,
        total: 0,
        invoiceCount: 0,
        totalWeight: 0,
        cashAmount: 0,
        debtAmount: 0,
        topProducts: [],
        customers: [],
        isToday: ymd === todayYmd,
        isPeak: false,
        displayLabel: '0',
      });
    }

    const dayProductsMap = new Map<string, Map<string, { qty: number; unit: string; amount: number }>>();

    (allSalesRecords || []).forEach((sale: any) => {
      const dateStr = sale.date || sale.createdAt || sale.purchaseDate;
      if (!dateStr) return;
      const ymd = getRecordYmd(dateStr);
      if (ymd && daysMap.has(ymd)) {
        const d = daysMap.get(ymd)!;
        const total = Number(sale.total || sale.totalAmount) || 0;
        const paid = Number(sale.paidAmount) || 0;
        const debt = Number(sale.debtAmount) || 0;

        d.total += total;
        d.invoiceCount += 1;
        d.cashAmount += paid;
        d.debtAmount += debt;

        if (sale.customerName && !d.customers.includes(sale.customerName)) {
          d.customers.push(sale.customerName);
        }

        // Process items
        if (sale.items && Array.isArray(sale.items)) {
          if (!dayProductsMap.has(ymd)) {
            dayProductsMap.set(ymd, new Map());
          }
          const pMap = dayProductsMap.get(ymd)!;
          sale.items.forEach((it: any) => {
            const pName = it.productName || it.name || 'کاڵا';
            const qty = Number(it.quantity || it.weight || it.count || 1);
            const amt = Number(it.total || (qty * (it.price || it.sellingPrice || 0)));
            const unit = it.unit || 'کگم';
            d.totalWeight += qty;

            const existing = pMap.get(pName) || { qty: 0, unit, amount: 0 };
            existing.qty += qty;
            existing.amount += amt;
            pMap.set(pName, existing);
          });
        }
      }
    });

    // Finalize top products per day
    dayProductsMap.forEach((pMap, ymd) => {
      const dayData = daysMap.get(ymd);
      if (dayData) {
        dayData.topProducts = Array.from(pMap.entries())
          .map(([name, val]) => ({ name, qty: val.qty, unit: val.unit, amount: val.amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3);
      }
    });

    const list = Array.from(daysMap.values());
    const maxVal = Math.max(...list.map((d) => d.total), 1);

    return list.map((item) => {
      let displayLabel = '';
      if (item.total >= 1000000) {
        displayLabel = `${(item.total / 1000000).toFixed(1)}M`;
      } else if (item.total >= 1000) {
        displayLabel = `${Math.round(item.total / 1000)}k`;
      } else if (item.total > 0) {
        displayLabel = `${item.total}`;
      } else {
        displayLabel = '0';
      }

      return {
        ...item,
        isPeak: item.total === maxVal && item.total > 0,
        displayLabel,
      };
    });
  }, [allSalesRecords]);

  // Overall 10-day summary calculations
  const tenDaysSummary = useMemo(() => {
    const totalSales = dailySalesData.reduce((sum, d) => sum + d.total, 0);
    const totalInvoices = dailySalesData.reduce((sum, d) => sum + d.invoiceCount, 0);
    const totalWeight = dailySalesData.reduce((sum, d) => sum + d.totalWeight, 0);
    const avgDailySales = Math.round(totalSales / 10);
    const activeDaysCount = dailySalesData.filter((d) => d.total > 0).length;
    const peakDay = [...dailySalesData].sort((a, b) => b.total - a.total)[0] || null;
    const avgPerInvoice = totalInvoices > 0 ? Math.round(totalSales / totalInvoices) : 0;

    return {
      totalSales,
      totalInvoices,
      totalWeight,
      avgDailySales,
      activeDaysCount,
      peakDay,
      avgPerInvoice,
    };
  }, [dailySalesData]);

  // Selected day object
  const selectedDayInfo = useMemo(() => {
    if (!selectedDailySalesDay) return null;
    return dailySalesData.find((d) => d.ymd === selectedDailySalesDay) || null;
  }, [selectedDailySalesDay, dailySalesData]);

  // Date filtered sales
  const filteredSales = useMemo(() => {
    return allSalesRecords.filter((s: any) => {
      const recDate = s.date || s.createdAt || s.purchaseDate;
      return matchesDateFilter(recDate);
    });
  }, [allSalesRecords, timeRange, selectedDate, selectedMonth]);

  // Date filtered expenses
  const filteredExpenses = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    return expenses.filter((e) => {
      const expDate = e.date || (e as any).createdAt;
      return matchesDateFilter(expDate);
    });
  }, [expenses, timeRange, selectedDate, selectedMonth]);

  // Handlers for specific date navigation
  const handlePrevDate = () => {
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        d.setDate(d.getDate() - 1);
        const pad = (n: number) => n.toString().padStart(2, '0');
        setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        setTimeRange('custom_day');
      }
    } catch {}
  };

  const handleNextDate = () => {
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        d.setDate(d.getDate() + 1);
        const pad = (n: number) => n.toString().padStart(2, '0');
        setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        setTimeRange('custom_day');
      }
    } catch {}
  };

  // Handlers for specific month navigation
  const handlePrevMonth = () => {
    try {
      const [yStr, mStr] = selectedMonth.split('-');
      let y = parseInt(yStr, 10);
      let m = parseInt(mStr, 10) - 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
      setTimeRange('custom_month');
    } catch {}
  };

  const handleNextMonth = () => {
    try {
      const [yStr, mStr] = selectedMonth.split('-');
      let y = parseInt(yStr, 10);
      let m = parseInt(mStr, 10) + 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
      setTimeRange('custom_month');
    } catch {}
  };

  const handleJumpToToday = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    setSelectedDate(today);
    setTimeRange('today');
  };

  // Overall KPI summaries
  const totalSalesAmount = useMemo(
    () => filteredSales.reduce((acc, s: any) => acc + (s.total || s.totalAmount || 0), 0),
    [filteredSales]
  );

  const totalSalesProfit = useMemo(
    () => filteredSales.reduce((acc, s: any) => acc + (s.profit || 0), 0),
    [filteredSales]
  );

  const totalExpensesAmount = useMemo(
    () => filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0),
    [filteredExpenses]
  );

  // Active month key based on selectedDate or selectedMonth
  const activeMonthKey = useMemo(() => {
    if (timeRange === 'custom_month' || timeRange === 'month') {
      return selectedMonth;
    }
    if (selectedDate) {
      return selectedDate.slice(0, 7);
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [timeRange, selectedMonth, selectedDate]);

  // Expenses for the entire active month (خەرجی هەر مانگێک)
  const monthlyExpensesAmount = useMemo(() => {
    if (!expenses || expenses.length === 0) return 0;
    return expenses.reduce((acc, e) => {
      const expDate = e.date || (e as any).createdAt;
      const recYmd = getRecordYmd(expDate);
      if (recYmd && recYmd.startsWith(activeMonthKey)) {
        return acc + (Number(e.amount) || 0);
      }
      return acc;
    }, 0);
  }, [expenses, activeMonthKey]);

  // قازانجی پوخت بەپێی بەرواری دیاریکراو (سافی خێری کاڵای داخراو/تەواوبوو یان فرۆش کەمکردنی خەرجییەکان لە ماوەی دیاریکراودا)
  const netProfit = useMemo(() => {
    try {
      // 1. If month filter is selected, check if there's a closed month archive
      const currentMonthKey =
        timeRange === 'month'
          ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
          : timeRange === 'custom_month'
          ? selectedMonth
          : null;

      if (currentMonthKey) {
        const closedArchives = JSON.parse(localStorage.getItem('pos_closed_months_archives') || '[]');
        const foundArchive = closedArchives.find((arc: any) => arc.monthKey === currentMonthKey);
        if (foundArchive && typeof foundArchive.netProfit === 'number') {
          return foundArchive.netProfit;
        }
      }

      // 2. Period expenses for currently selected date filter
      const periodExpenses = (filteredExpenses || []).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

      const processedProductIds = new Set<string>();
      const processedBarcodes = new Set<string>();

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

      const perfList: Array<{
        status: 'active' | 'closed' | 'deleted';
        houseProfit: number;
        totalRev: number;
        totalCost: number;
      }> = [];

      // Current products
      (products || []).forEach((product) => {
        const baseCost =
          (product.purchasePrice || 0) +
          (product.driverFee || 0) +
          (product.workerFee || 0) +
          (product.forkliftFee || 0) +
          (product.otherFee || 0) +
          (product.expenseFee || 0);

        const prodBarcode = product.barcode ? product.barcode.trim().toLowerCase() : '';
        const prodName = product.name ? product.name.trim().toLowerCase() : '';

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
          const timeFiltered = matchingMovements.filter((m) => matchesDateFilter(m.date));
          totalQty = timeFiltered.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
          totalRev = timeFiltered.reduce((acc, m) => acc + (Number(m.totalAmount) || 0), 0);
        } else {
          filteredSales.forEach((sale: any) => {
            (sale.items || []).forEach((item: any) => {
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
                totalRev += Number(item.total || item.totalAmount) || 0;
              }
            });
          });
        }

        const totalInitialQty =
          product.initialStock && product.initialStock > 0
            ? product.initialStock
            : (product.stock || 0) + totalQty;

        const isProductClosed = Boolean(product.isClosed);
        const totalGoodsCost = totalInitialQty * baseCost;
        const totalCost = isProductClosed
          ? (totalGoodsCost > 0 ? totalGoodsCost : totalQty * baseCost)
          : (totalQty * baseCost);
        const productNetProfit = totalRev - totalCost;

        const sharePercent = product.shareholderPercentage || 0;
        const shareAmount = productNetProfit > 0 ? (productNetProfit * sharePercent) / 100 : 0;
        const houseProfit = productNetProfit - shareAmount;

        const status: 'active' | 'closed' = isProductClosed ? 'closed' : 'active';

        processedProductIds.add(product.id);
        if (prodBarcode) processedBarcodes.add(prodBarcode);

        perfList.push({
          status,
          houseProfit,
          totalRev,
          totalCost,
        });
      });

      // Closed product archives
      (closedProductArchives || []).forEach((archive) => {
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
          const timeFiltered = matchingMovements.filter((m) => matchesDateFilter(m.date));
          totalQty = timeFiltered.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
          totalRev = timeFiltered.reduce((acc, m) => acc + (Number(m.totalAmount) || 0), 0);
        } else {
          let matchedAny = false;
          filteredSales.forEach((sale: any) => {
            (sale.items || []).forEach((item: any) => {
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
                totalRev += Number(item.total || item.totalAmount) || 0;
              }
            });
          });

          if (!matchedAny && matchesDateFilter(archive.closedAt)) {
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
        const productNetProfit = totalRev - totalCost;

        const sharePercent = archive.shareholderPercentage || 0;
        const shareAmount = productNetProfit > 0 ? (productNetProfit * sharePercent) / 100 : 0;
        const houseProfit = productNetProfit - shareAmount;

        perfList.push({
          status: isArchClosed ? 'closed' : 'deleted',
          houseProfit,
          totalRev,
          totalCost,
        });
      });

      // Orphaned sales fallback
      const orphanMap = new Map<string, { totalQty: number; totalRev: number; totalCost: number }>();
      filteredSales.forEach((sale: any) => {
        (sale.items || []).forEach((item: any) => {
          const itemB = item.barcode ? item.barcode.trim().toLowerCase() : '';
          const itemPid = item.productId || '';
          if (itemPid && processedProductIds.has(itemPid)) return;
          if (itemB && processedBarcodes.has(itemB)) return;

          const key = itemB || itemPid || item.productName.trim().toLowerCase();
          const existing = orphanMap.get(key) || { totalQty: 0, totalRev: 0, totalCost: 0 };
          existing.totalQty += Number(item.quantity) || 0;
          existing.totalRev += Number(item.total || item.totalAmount) || 0;
          existing.totalCost += (Number(item.purchasePrice) || 0) * (Number(item.quantity) || 0);
          orphanMap.set(key, existing);
        });
      });

      orphanMap.forEach((orphan) => {
        const productNetProfit = orphan.totalRev - orphan.totalCost;
        perfList.push({
          status: 'deleted',
          houseProfit: productNetProfit,
          totalRev: orphan.totalRev,
          totalCost: orphan.totalCost,
        });
      });

      const closedList = perfList.filter((p) => p.status === 'closed');
      const closedProfit = closedList.reduce((sum, item) => sum + item.houseProfit, 0);

      // 3. Simplified formula: Profit - Expenses
      return closedProfit - periodExpenses;
    } catch {
      return totalSalesProfit - totalExpensesAmount;
    }
  }, [
    products,
    closedProductArchives,
    productMovements,
    filteredSales,
    filteredExpenses,
    timeRange,
    selectedDate,
    selectedMonth,
    totalSalesProfit,
    totalExpensesAmount,
  ]);

  // Monthly Profit & Loss Line Chart Trend
  const monthlyProfitLossTrend = useMemo(() => {
    const monthsMap = new Map<
      string,
      {
        key: string;
        monthLabel: string;
        sales: number;
        grossProfit: number;
        expenses: number;
        netProfit: number;
        profitMargin: number;
      }
    >();

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

    // Process Sales (all sales records stream)
    (allSalesRecords || []).forEach((sale: any) => {
      const recDate = sale.date || sale.createdAt || sale.purchaseDate;
      if (!recDate) return;
      const recYmd = getRecordYmd(recDate);
      let year: number;
      let monthIndex: number;

      if (recYmd) {
        const parts = recYmd.split('-');
        year = parseInt(parts[0], 10);
        monthIndex = parseInt(parts[1], 10) - 1;
      } else {
        const d = new Date(recDate);
        if (isNaN(d.getTime())) return;
        year = d.getFullYear();
        monthIndex = d.getMonth();
      }

      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const monthLabel = `${kurdishMonths[monthIndex] || monthIndex + 1} ${year}`;

      const existing = monthsMap.get(key) || {
        key,
        monthLabel,
        sales: 0,
        grossProfit: 0,
        expenses: 0,
        netProfit: 0,
        profitMargin: 0,
      };

      existing.sales += Number(sale.total || sale.totalAmount) || 0;
      existing.grossProfit += Number(sale.profit) || 0;
      monthsMap.set(key, existing);
    });

    // Process Expenses
    (expenses || []).forEach((exp: any) => {
      const expDate = exp.date || exp.createdAt;
      if (!expDate) return;
      const recYmd = getRecordYmd(expDate);
      let year: number;
      let monthIndex: number;

      if (recYmd) {
        const parts = recYmd.split('-');
        year = parseInt(parts[0], 10);
        monthIndex = parseInt(parts[1], 10) - 1;
      } else {
        const d = new Date(expDate);
        if (isNaN(d.getTime())) return;
        year = d.getFullYear();
        monthIndex = d.getMonth();
      }

      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const monthLabel = `${kurdishMonths[monthIndex] || monthIndex + 1} ${year}`;

      const existing = monthsMap.get(key) || {
        key,
        monthLabel,
        sales: 0,
        grossProfit: 0,
        expenses: 0,
        netProfit: 0,
        profitMargin: 0,
      };

      existing.expenses += Number(exp.amount) || 0;
      monthsMap.set(key, existing);
    });

    // Sort chronologically and calculate net profit and margins
    const sorted = Array.from(monthsMap.values()).sort((a, b) => a.key.localeCompare(b.key));

    return sorted.map((m) => {
      const net = m.grossProfit - m.expenses;
      const margin = m.sales > 0 ? (net / m.sales) * 100 : 0;
      return {
        ...m,
        netProfit: net,
        profitMargin: parseFloat(margin.toFixed(1)),
      };
    });
  }, [allSalesRecords, expenses]);

  // Statistics for monthly trend according to formula:
  // تێکڕای مانگانە = کۆی فرۆشی پارەی هەموو مانگەکان دابەشی ژمارەی ئەو مانگانەی کاڵاکانی تێدا فرۆشراوە
  const monthlyStats = useMemo(() => {
    // ژمارەی ئەو مانگانەی کاڵاکانی تێدا فرۆشراوە (months where sales > 0)
    const monthsWithSales = monthlyProfitLossTrend.filter((m) => m.sales > 0);
    const monthsWithSalesCount = monthsWithSales.length;

    // کۆی فرۆشی پارەی هەموو مانگەکان (total sales money of all months)
    const totalSalesAllMonths = monthlyProfitLossTrend.reduce((sum, m) => sum + (m.sales || 0), 0);

    // تێکڕای مانگانەی فرۆش بەپێی فۆرمۆلاکە
    const avgMonthlySales =
      monthsWithSalesCount > 0 ? Math.round(totalSalesAllMonths / monthsWithSalesCount) : 0;

    let bestMonth = monthlyProfitLossTrend[0] || null;
    let totalNet = 0;

    monthlyProfitLossTrend.forEach((m) => {
      totalNet += m.netProfit;
      if (m.netProfit > (bestMonth?.netProfit ?? -Infinity)) {
        bestMonth = m;
      }
    });

    const avgNetProfit =
      monthlyProfitLossTrend.length > 0 ? Math.round(totalNet / monthlyProfitLossTrend.length) : 0;

    let growthRate = 0;
    if (monthlyProfitLossTrend.length >= 2) {
      const prev = monthlyProfitLossTrend[monthlyProfitLossTrend.length - 2].netProfit;
      const curr = monthlyProfitLossTrend[monthlyProfitLossTrend.length - 1].netProfit;
      if (prev !== 0) {
        growthRate = Math.round(((curr - prev) / Math.abs(prev)) * 100);
      }
    }

    return {
      bestMonth,
      avgNetProfit,
      avgMonthlySales,
      monthsWithSalesCount,
      totalSalesAllMonths,
      growthRate,
    };
  }, [monthlyProfitLossTrend]);

  // Chart 2: Daily Sales & Profit Timeline
  const salesTimelineData = useMemo(() => {
    const map = new Map<string, { date: string; sales: number; profit: number }>();

    filteredSales.forEach((s: any) => {
      const recDate = s.date || s.createdAt;
      if (!recDate) return;
      const d = new Date(recDate);
      if (isNaN(d.getTime())) return;

      const dateKey = `${d.getMonth() + 1}/${d.getDate()}`;
      const existing = map.get(dateKey) || { date: dateKey, sales: 0, profit: 0 };
      map.set(dateKey, {
        date: dateKey,
        sales: existing.sales + (s.total || s.totalAmount || 0),
        profit: existing.profit + (s.profit || 0),
      });
    });

    const result = Array.from(map.values());
    return result.slice(-15);
  }, [filteredSales]);

  // Chart 3: Top 6 Fastest Selling Products (Ranked by Sales Velocity / Speed)
  // Whichever product sells faster has highest velocity score and ranks #1. Always shows 6 top products.
  const topProductsData = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;
    const tenDaysMs = 10 * oneDayMs;
    const thirtyDaysMs = 30 * oneDayMs;

    // Filter sales according to selected velocity period (ڕۆژ / ١٠ ڕۆژ / حەفتە / مانگ / دیاریکراو)
    const salesForVelocity = (allSalesRecords || []).filter((s: any) => {
      const rawDate = s.date || s.createdAt || s.purchaseDate;
      const recYmd = getRecordYmd(rawDate);
      if (!recYmd) return false;

      if (velocityPeriod === 'day') {
        return recYmd === velocityCustomDay;
      } else if (velocityPeriod === 'ten_days') {
        const timeVal = new Date(recYmd).getTime();
        return !isNaN(timeVal) && (now - timeVal <= tenDaysMs);
      } else if (velocityPeriod === 'week') {
        const timeVal = new Date(recYmd).getTime();
        return !isNaN(timeVal) && (now - timeVal <= sevenDaysMs);
      } else if (velocityPeriod === 'month') {
        return recYmd.startsWith(velocityCustomMonth);
      } else if (velocityPeriod === 'custom_range') {
        return recYmd >= velocityRangeStart && recYmd <= velocityRangeEnd;
      }
      return true;
    });

    const processSalesIntoMap = (salesList: any[]) => {
      const productMap = new Map<
        string,
        {
          name: string;
          totalQty: number;
          totalWeight: number;
          totalRevenue: number;
          transactionCount: number;
          firstTimestamp: number;
          lastTimestamp: number;
          unit: string;
        }
      >();

      salesList.forEach((s: any) => {
        const rawDate = s.date || s.createdAt || s.purchaseDate;
        const timeVal = rawDate ? new Date(rawDate).getTime() : Date.now();
        const validTime = isNaN(timeVal) ? Date.now() : timeVal;

        if (s.items && Array.isArray(s.items) && s.items.length > 0) {
          s.items.forEach((item: any) => {
            const rawName = (item.productName || item.name || '').trim();
            if (!rawName) return;
            const weight = Number(item.weight) || Number(item.quantity) || 0;
            const qty = Number(item.quantity) || weight;
            const revenue = Number(item.total) || Number(item.totalAmount) || 0;
            const unit = item.unit || 'کگم';

            const existing = productMap.get(rawName) || {
              name: rawName,
              totalQty: 0,
              totalWeight: 0,
              totalRevenue: 0,
              transactionCount: 0,
              firstTimestamp: validTime,
              lastTimestamp: validTime,
              unit,
            };

            existing.totalQty += qty;
            existing.totalWeight += weight;
            existing.totalRevenue += revenue;
            existing.transactionCount += 1;
            if (validTime < existing.firstTimestamp) existing.firstTimestamp = validTime;
            if (validTime > existing.lastTimestamp) existing.lastTimestamp = validTime;
            if (unit && unit !== 'دانە') existing.unit = unit;

            productMap.set(rawName, existing);
          });
        } else if (s.productName) {
          const rawName = String(s.productName).trim();
          if (!rawName) return;
          const weight = Number(s.quantity) || Number(s.weight) || 0;
          const qty = Number(s.quantity) || weight;
          const revenue = Number(s.totalAmount) || Number(s.total) || 0;
          const unit = s.unit || 'کگم';

          const existing = productMap.get(rawName) || {
            name: rawName,
            totalQty: 0,
            totalWeight: 0,
            totalRevenue: 0,
            transactionCount: 0,
            firstTimestamp: validTime,
            lastTimestamp: validTime,
            unit,
          };

          existing.totalQty += qty;
          existing.totalWeight += weight;
          existing.totalRevenue += revenue;
          existing.transactionCount += 1;
          if (validTime < existing.firstTimestamp) existing.firstTimestamp = validTime;
          if (validTime > existing.lastTimestamp) existing.lastTimestamp = validTime;
          if (unit && unit !== 'دانە') existing.unit = unit;

          productMap.set(rawName, existing);
        }
      });

      return productMap;
    };

    // 1. Process filtered sales for the active period
    const currentPeriodMap = processSalesIntoMap(salesForVelocity);

    // 2. If fewer than 6 products, supplement from all historical sales records
    const allHistoricalMap = processSalesIntoMap(allSalesRecords || []);

    // Merge: prioritize period sales, fill with historical sales to always reach 6 products
    const finalMap = new Map(currentPeriodMap);

    if (finalMap.size < 6) {
      allHistoricalMap.forEach((item, name) => {
        if (!finalMap.has(name) && finalMap.size < 6) {
          finalMap.set(name, item);
        }
      });
    }

    // 3. If still fewer than 6, supplement from existing registered products in inventory
    if (finalMap.size < 6 && products && products.length > 0) {
      products.forEach((prod) => {
        const prodName = (prod.name || '').trim();
        if (prodName && !finalMap.has(prodName) && finalMap.size < 6) {
          const pAny = prod as any;
          const defaultUnit = pAny.unit || 'کگم';
          const defaultPrice = Number(pAny.salePrice) || Number(pAny.price) || Number(pAny.purchasePrice) || 0;
          finalMap.set(prodName, {
            name: prodName,
            totalQty: Number(pAny.totalWeight) || Number(pAny.quantity) || 10,
            totalWeight: Number(pAny.totalWeight) || Number(pAny.weight) || Number(pAny.quantity) || 10,
            totalRevenue: defaultPrice * (Number(pAny.totalWeight) || Number(pAny.quantity) || 10),
            transactionCount: 1,
            firstTimestamp: Date.now() - 86400000,
            lastTimestamp: Date.now(),
            unit: defaultUnit,
          });
        }
      });
    }

    // Calculate Sales Velocity (خێرایی فرۆشتن):
    // Velocity is higher when more weight/quantity is sold within fewer active days/hours
    const productList = Array.from(finalMap.values()).map((p) => {
      const timeDiffMs = Math.max(0, p.lastTimestamp - p.firstTimestamp);
      const daysSpan = Math.max(1, Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24)));
      const dailyVelocity = p.totalWeight / daysSpan;
      const velocityScore = (dailyVelocity * 100) + (p.transactionCount * 50) + (p.totalRevenue / 1000);

      return {
        ...p,
        daysSpan,
        dailyVelocity,
        velocityScore,
      };
    });

    // Sort strictly by Velocity Score (Fastest Selling First) and take exactly top 6
    const sorted = productList.sort((a, b) => b.velocityScore - a.velocityScore).slice(0, 6);
    const totalTop6Revenue = sorted.reduce((sum, p) => sum + p.totalRevenue, 0);

    return sorted.map((p, idx) => ({
      ...p,
      rank: idx + 1,
      avgPrice: p.totalWeight > 0 ? Math.round(p.totalRevenue / p.totalWeight) : 0,
      percentage: totalTop6Revenue > 0 ? ((p.totalRevenue / totalTop6Revenue) * 100).toFixed(1) : '0',
      speedDisplay: `${Math.max(1, Math.round(p.dailyVelocity))} ${p.unit || 'کگم'}/ڕۆژ`,
    }));
  }, [allSalesRecords, velocityPeriod, velocityCustomDay, velocityCustomMonth, velocityRangeStart, velocityRangeEnd, products]);

  // Keep selected product synchronized with new data when date changes
  useEffect(() => {
    if (selectedProduct) {
      const match = topProductsData.find((p) => p.name === selectedProduct.name);
      if (match) {
        setSelectedProduct(match);
      } else {
        setSelectedProduct(null);
      }
    }
  }, [topProductsData]);

  // Chart 4: Expense Categories Distribution
  const expenseCategoriesData = useMemo(() => {
    const catMap = new Map<string, number>();

    filteredExpenses.forEach((e) => {
      const cat = e.category || 'خەرجی گشتی';
      catMap.set(cat, (catMap.get(cat) || 0) + (e.amount || 0));
    });

    return Array.from(catMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredExpenses]);

  // Helper to dynamically adjust font size for large numbers
  const getAdaptiveStatFontSize = (text: string): string => {
    const len = text.length;
    if (len <= 8) return 'text-sm sm:text-base';
    if (len <= 12) return 'text-xs sm:text-sm';
    if (len <= 16) return 'text-[11px] sm:text-xs';
    return 'text-[10px] sm:text-[11px]';
  };

  return (
    <div className="w-full space-y-6 pb-12 bg-transparent" dir="rtl">
      {/* Top Header with Back to Main button & Editable Analysis Date */}
      <div className="bg-slate-900/60 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-3">
        {onBackToMain && (
          <button
            onClick={onBackToMain}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs sm:text-sm transition-all active:scale-95 cursor-pointer border border-white/15 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>سەرەکی</span>
          </button>
        )}

        {/* بەرواری شیکاری لە تەنیشت سەرەکی بە بەرواری سەوزی دەستکاریکراو */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 text-slate-100 font-black text-xs sm:text-sm">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-white font-black">مانگی شیکاری:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="مانگی دواتر"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedMonth(e.target.value);
                  setTimeRange('custom_month');
                }
              }}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono font-black text-xs sm:text-sm px-2.5 py-1 rounded-lg border border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer transition-all text-center"
              title="کلیک بکە بۆ گۆڕینی مانگ"
            />

            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="مانگی پێشتر"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const pad = (n: number) => n.toString().padStart(2, '0');
              const currentM = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
              setSelectedMonth(currentM);
              setTimeRange('custom_month');
            }}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 ${
              timeRange === 'month' || selectedMonth === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
                ? 'bg-emerald-500 text-slate-950 font-black'
                : 'bg-emerald-600/80 hover:bg-emerald-500 text-white'
            }`}
          >
            ئەم مانگە
          </button>
        </div>
      </div>

      {/* KPI Stats Quick Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 px-3.5 sm:px-0">
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
          <div className="text-xs font-black text-slate-200 mb-1.5 flex items-center justify-between">
            <span className="text-sky-300 font-black">فرۆشی بەرواری دیاریکراو</span>
            <div className="p-1.5 rounded-lg bg-sky-500/20 border border-sky-500/30">
              <ShoppingCart className="w-4 h-4 text-sky-400" />
            </div>
          </div>
          <div className={`font-black font-mono text-white tracking-wide break-all ${getAdaptiveStatFontSize(formatCurrency(totalSalesAmount, settings.currency, settings.usdToIqdRate))}`}>
            {formatCurrency(totalSalesAmount, settings.currency, settings.usdToIqdRate)}
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
          <div className="text-xs font-black text-slate-200 mb-1.5 flex items-center justify-between">
            <span className="text-rose-300 font-black">کۆی خەرجییەکانی مانگ</span>
            <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30">
              <Receipt className="w-4 h-4 text-rose-400" />
            </div>
          </div>
          <div className={`font-black font-mono text-white tracking-wide break-all ${getAdaptiveStatFontSize(formatCurrency(monthlyExpensesAmount, settings.currency, settings.usdToIqdRate))}`}>
            {formatCurrency(monthlyExpensesAmount, settings.currency, settings.usdToIqdRate)}
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
          <div className="text-xs font-black text-slate-200 mb-1.5 flex items-center justify-between">
            <span className="text-indigo-200 font-black">تێکڕای مانگانە</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
              <Activity className="w-4 h-4 text-indigo-300" />
            </div>
          </div>
          <div className={`font-black font-mono text-indigo-200 tracking-wide break-all ${getAdaptiveStatFontSize(formatCurrency(monthlyStats.avgMonthlySales, settings.currency, settings.usdToIqdRate))}`}>
            {formatCurrency(monthlyStats.avgMonthlySales, settings.currency, settings.usdToIqdRate)}
          </div>
        </div>
      </div>

      {/* Daily Sales Recharts Area Chart Card (Moved from MainView) */}
      <div className="px-3.5 sm:px-0">
        <div className="w-full bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-5 border border-slate-700 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 px-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-black text-white tracking-wide">فرۆشتنی ڕۆژانەی</span>
                <span className="text-[11px] font-black text-emerald-300 uppercase tracking-widest">(١٠ ڕۆژی ڕابردوو)</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-300 font-bold bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
                {tenDaysSummary.activeDaysCount} لە ١٠ ڕۆژ چالاکە
              </span>
              <div className="flex items-center gap-1.5 bg-emerald-500/15 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black text-emerald-300">بەردەوام • زانیاری زیندوو</span>
              </div>
            </div>
          </div>

          {/* 10-Day Quick Stats Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                کۆی فرۆشی ١٠ ڕۆژ
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-emerald-400 mt-1.5">
                {formatCurrency(tenDaysSummary.totalSales, settings.currency, settings.usdToIqdRate)}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                تێکڕای ڕۆژانە
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-sky-300 mt-1.5">
                {formatCurrency(tenDaysSummary.avgDailySales, settings.currency, settings.usdToIqdRate)}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                بەرزترین ڕۆژ
              </span>
              <div className="flex items-baseline justify-between gap-1 mt-1.5">
                <span className="text-xs font-black text-amber-300 truncate">
                  {tenDaysSummary.peakDay?.dayLabel || '—'}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-200">
                  {formatCurrency(tenDaysSummary.peakDay?.total || 0, settings.currency, settings.usdToIqdRate)}
                </span>
              </div>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-purple-400" />
                پسووڵە و کێش
              </span>
              <div className="flex items-baseline justify-between gap-1 mt-1.5">
                <span className="text-xs font-black text-purple-300 font-mono">
                  {tenDaysSummary.totalInvoices} پسووڵە
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-300">
                  {formatNumber(tenDaysSummary.totalWeight)} کگم
                </span>
              </div>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="w-full h-56 sm:h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySalesData} margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barTodayGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="barPeakGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="barNormalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis 
                  dataKey="dayLabel" 
                  stroke="#cbd5e1" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#cbd5e1', fontWeight: 'bold' }}
                />
                <YAxis 
                  stroke="#cbd5e1" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#cbd5e1', fontWeight: 'bold' }}
                  tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-white/15 text-right min-w-[200px] space-y-2" dir="rtl">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <span className="font-black text-xs text-white">{d.dayLabel} ({d.fullDate})</span>
                            {d.isToday && <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold">ئەمڕۆ</span>}
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-300 font-bold">کۆی فرۆش:</span>
                              <span className="font-mono font-black text-emerald-400">{formatCurrency(d.total, settings.currency, settings.usdToIqdRate)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-300 font-bold">پسووڵەکان:</span>
                              <span className="font-mono font-bold text-sky-300">{d.invoiceCount} پسووڵە</span>
                            </div>
                            {d.totalWeight > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-300 font-bold">کێشی گشتی:</span>
                                <span className="font-mono font-bold text-amber-300">{formatNumber(d.totalWeight)} کگم</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="total" 
                  radius={[8, 8, 0, 0]} 
                  animationDuration={1200}
                  cursor="pointer"
                  onClick={(entry: any) => setSelectedDailySalesDay((prev) => prev === entry?.ymd ? null : entry?.ymd)}
                >
                  <LabelList 
                    dataKey="displayLabel" 
                    position="top" 
                    fill="#6ee7b7" 
                    fontSize={10} 
                    fontWeight={900} 
                    offset={6}
                  />
                  {dailySalesData.map((entry, index) => {
                    const isSelected = selectedDailySalesDay === entry.ymd;
                    const fill = entry.isPeak 
                      ? 'url(#barPeakGrad)' 
                      : entry.isToday 
                        ? 'url(#barTodayGrad)' 
                        : 'url(#barNormalGrad)';
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fill}
                        stroke={isSelected ? '#f59e0b' : 'transparent'}
                        strokeWidth={isSelected ? 2.5 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Day Inspection Drawer / Box */}
          {selectedDayInfo && (
            <div className="mt-3 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-sky-950/40 p-4 rounded-2xl border-2 border-emerald-500/40 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-black text-sm sm:text-base text-white">
                    وردەکاری فرۆشی ڕۆژی {selectedDayInfo.dayLabel} ({selectedDayInfo.fullDate})
                  </span>
                  {selectedDayInfo.isToday && (
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-black border border-emerald-500/30">
                      ئەمڕۆ
                    </span>
                  )}
                  {selectedDayInfo.isPeak && (
                    <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-black border border-amber-500/30">
                      لوتکەی ١٠ ڕۆژ
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDailySalesDay(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                  title="داخستن"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-300 font-bold block mb-0.5">کۆی داهات:</span>
                  <span className="text-sm font-black font-mono text-emerald-400">
                    {formatCurrency(selectedDayInfo.total, settings.currency, settings.usdToIqdRate)}
                  </span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-300 font-bold block mb-0.5">ژمارەی پسووڵەکان:</span>
                  <span className="text-sm font-black font-mono text-sky-400">
                    {selectedDayInfo.invoiceCount} پسووڵە
                  </span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-300 font-bold block mb-0.5">کێشی فرۆشراو:</span>
                  <span className="text-sm font-black font-mono text-amber-400">
                    {formatNumber(selectedDayInfo.totalWeight)} کگم
                  </span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                  <span className="text-[10px] text-slate-300 font-bold block mb-0.5">شێوازی پارەدان:</span>
                  <span className="text-xs font-bold text-slate-200">
                    نەختینە: {formatNumber(selectedDayInfo.cashAmount)} | قەرز: {formatNumber(selectedDayInfo.debtAmount)}
                  </span>
                </div>
              </div>

              {selectedDayInfo.topProducts && selectedDayInfo.topProducts.length > 0 && (
                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-300">کاڵاکانی ئەم ڕۆژە:</span>
                  {selectedDayInfo.topProducts.map((p, idx) => (
                    <span key={idx} className="bg-white/10 px-2.5 py-1 rounded-lg text-xs font-black text-emerald-300 border border-white/10">
                      {p.name} ({formatNumber(p.qty)} {p.unit})
                    </span>
                  ))}
                </div>
              )}

              {selectedDayInfo.customers && selectedDayInfo.customers.length > 0 && (
                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-300">کڕیاران:</span>
                  {selectedDayInfo.customers.map((c, idx) => (
                    <span key={idx} className="bg-sky-500/10 px-2.5 py-1 rounded-lg text-xs font-black text-sky-300 border border-sky-500/20">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Clickable Day Pills at the bottom of the card */}
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-300">کلیک لە هەر ڕۆژێک بکە بۆ بینینی وردەکاری:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {dailySalesData.map((d) => (
                <button
                  key={d.ymd}
                  type="button"
                  onClick={() => setSelectedDailySalesDay((prev) => prev === d.ymd ? null : d.ymd)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedDailySalesDay === d.ymd
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30 ring-2 ring-emerald-300'
                      : d.isToday
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {d.dayLabel} {d.isToday ? '(ئەمڕۆ)' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section: پڕفرۆشترین ٦ کاڵا (Top 6 Best Selling Products) */}
      <div className="w-full bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-amber-400 via-orange-500 to-emerald-600 text-slate-950 flex items-center justify-center border border-amber-300/50 shadow-md">
                <Zap className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              </div>
              <h3 className="font-black text-white text-lg sm:text-xl">
                پڕفرۆشترین ٦ کاڵا
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              {/* Period Tabs: Day, 10 Days, Week, Month, Custom */}
              <div className="flex flex-wrap items-center bg-slate-950/80 p-1 rounded-2xl border border-white/10 shadow-inner">
                <button
                  type="button"
                  onClick={() => setVelocityPeriod('day')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    velocityPeriod === 'day'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-orange-500/25'
                      : 'text-slate-300 font-bold hover:text-white'
                  }`}
                >
                  ڕۆژ
                </button>
                <button
                  type="button"
                  onClick={() => setVelocityPeriod('ten_days')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    velocityPeriod === 'ten_days'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-orange-500/25'
                      : 'text-slate-300 font-bold hover:text-white'
                  }`}
                >
                  ١٠ ڕۆژ
                </button>
                <button
                  type="button"
                  onClick={() => setVelocityPeriod('week')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    velocityPeriod === 'week'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-orange-500/25'
                      : 'text-slate-300 font-bold hover:text-white'
                  }`}
                >
                  حەفتە
                </button>
                <button
                  type="button"
                  onClick={() => setVelocityPeriod('month')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    velocityPeriod === 'month'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-orange-500/25'
                      : 'text-slate-300 font-bold hover:text-white'
                  }`}
                >
                  مانگ
                </button>
                <button
                  type="button"
                  onClick={() => setVelocityPeriod('custom_range')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    velocityPeriod === 'custom_range'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-orange-500/25'
                      : 'text-slate-300 font-bold hover:text-white'
                  }`}
                >
                  دیاریکراو
                </button>
              </div>

              {/* Day Date Picker */}
              {velocityPeriod === 'day' && (
                <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={handleNextVelocityDay}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                    title="ڕۆژی دواتر"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <input
                    type="date"
                    value={velocityCustomDay}
                    onChange={(e) => setVelocityCustomDay(e.target.value)}
                    className="bg-transparent text-amber-300 font-mono text-xs font-bold px-1.5 py-0.5 focus:outline-none cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={handlePrevVelocityDay}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                    title="ڕۆژی پێشتر"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Month Picker */}
              {velocityPeriod === 'month' && (
                <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={handleNextVelocityMonth}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                    title="مانگی دواتر"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <input
                    type="month"
                    value={velocityCustomMonth}
                    onChange={(e) => setVelocityCustomMonth(e.target.value)}
                    className="bg-transparent text-amber-300 font-mono text-xs font-bold px-1.5 py-0.5 focus:outline-none cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={handlePrevVelocityMonth}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                    title="مانگی پێشتر"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Custom Range Inputs */}
              {velocityPeriod === 'custom_range' && (
                <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-2xl border border-white/10 text-xs font-black text-slate-100">
                  <span className="text-amber-200">لە:</span>
                  <input
                    type="date"
                    value={velocityRangeStart}
                    onChange={(e) => setVelocityRangeStart(e.target.value)}
                    className="bg-transparent text-amber-300 font-mono text-xs font-bold focus:outline-none cursor-pointer"
                  />
                  <span className="text-amber-200">بۆ:</span>
                  <input
                    type="date"
                    value={velocityRangeEnd}
                    onChange={(e) => setVelocityRangeEnd(e.target.value)}
                    className="bg-transparent text-amber-300 font-mono text-xs font-bold focus:outline-none cursor-pointer"
                  />
                </div>
              )}

              {velocityPeriod === 'ten_days' && (
                <span className="text-[11px] font-black px-3 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-sm font-mono">
                  ١٠ ڕۆژی ڕابردوو
                </span>
              )}

              {velocityPeriod === 'week' && (
                <span className="text-[11px] font-black px-3 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-sm font-mono">
                  ٧ ڕۆژی ڕابردوو
                </span>
              )}
            </div>
          </div>

          {/* Selected Product Highlight Details Box */}
          {selectedProduct && (
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/40 text-white p-4 sm:p-5 rounded-2xl border-2 border-amber-500/50 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                  <h4 className="text-base sm:text-lg font-black text-white">
                    {selectedProduct.name}
                  </h4>
                  <span className="bg-amber-500/30 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border border-amber-500/40">
                    پلەی #{selectedProduct.rank} لە خێرایی فرۆشتن
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="داخستن"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {/* خێرایی فرۆشتن */}
                <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
                  <div className="text-[11px] text-amber-300 font-bold mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>خێرایی فرۆشتن</span>
                  </div>
                  <div className="text-sm sm:text-base font-black font-mono text-amber-300">
                    {selectedProduct.speedDisplay}
                  </div>
                </div>

                {/* پارەی فرۆشت (کۆی داهات) */}
                <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
                  <div className="text-[11px] text-emerald-300 font-bold mb-1 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>کۆی داهاتی فرۆشتن</span>
                  </div>
                  <div className="text-sm sm:text-base font-black font-mono text-emerald-400">
                    {formatCurrency(selectedProduct.totalRevenue, settings.currency, settings.usdToIqdRate)}
                  </div>
                </div>

                {/* کێشی فرۆش */}
                <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
                  <div className="text-[11px] text-sky-300 font-bold mb-1 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-sky-400" />
                    <span>کێشی گشتی</span>
                  </div>
                  <div className="text-sm sm:text-base font-black font-mono text-sky-300">
                    {formatNumber(selectedProduct.totalWeight)} {selectedProduct.unit || 'کگم'}
                  </div>
                </div>

                {/* تێکڕای نرخ بۆ هەر یەکە */}
                <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
                  <div className="text-[11px] text-cyan-300 font-bold mb-1 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                    <span>تێکڕای نرخ</span>
                  </div>
                  <div className="text-sm sm:text-base font-black font-mono text-cyan-300">
                    {formatCurrency(selectedProduct.avgPrice, settings.currency, settings.usdToIqdRate)} / {selectedProduct.unit || 'کگم'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bar Chart View */}
          <div className="h-[480px] w-full pt-4 relative">
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProductsData}
                  layout="vertical"
                  margin={{ top: 30, right: 125, left: 10, bottom: 10 }}
                  barGap={8}
                >
                  <defs>
                    {COLORS.map((color, i) => (
                      <linearGradient key={`barGrad-${i}`} id={`barGrad-${i}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={color} stopOpacity={0.7} />
                        <stop offset="100%" stopColor={color} stopOpacity={1} />
                      </linearGradient>
                    ))}
                    <linearGradient id="selectedGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    type="number"
                    orientation="top"
                    domain={[0, 'dataMax * 1.2']}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#cbd5e1', fontWeight: 700, fontFamily: 'monospace' }}
                    tickFormatter={(val) => `${val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    orientation="left"
                    axisLine={false}
                    tickLine={false}
                    hide={true}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-white/10 text-right min-w-[220px] space-y-2.5" dir="rtl">
                            <div className="font-black text-sm text-amber-400 border-b border-white/5 pb-2 flex items-center justify-between">
                              <span>{item.name}</span>
                              <span className="text-[9px] text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded font-mono uppercase">پلەی #{item.rank}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[10px] text-amber-300 font-bold">⚡ خێرایی فرۆشتن:</span>
                                <span className="text-xs font-black font-mono text-amber-300">
                                  {item.speedDisplay}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[10px] text-slate-300 font-bold">داهاتی فرۆشتن:</span>
                                <span className="text-xs font-black font-mono text-emerald-400">
                                  {formatCurrency(item.totalRevenue, settings.currency, settings.usdToIqdRate)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[10px] text-slate-300 font-bold">کێشی فرۆشراو:</span>
                                <span className="text-xs font-black font-mono text-sky-400">
                                  {formatNumber(item.totalWeight)} {item.unit || 'کگم'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="totalRevenue"
                    radius={[0, 12, 12, 0]}
                    barSize={28}
                    minPointSize={6}
                    cursor="pointer"
                    onClick={(entry) => {
                      if (selectedProduct?.name === entry.name) {
                        setSelectedProduct(null);
                      } else {
                        setSelectedProduct(entry);
                      }
                    }}
                  >
                    <LabelList 
                      dataKey="name" 
                      position="top" 
                      offset={10}
                      style={{ fontSize: 13, fontWeight: 900, fill: '#f8fafc', textAnchor: 'start' }}
                    />
                    <LabelList 
                      dataKey="speedDisplay" 
                      position="right" 
                      offset={12}
                      style={{ fontSize: 11, fontWeight: 800, fill: '#fbbf24', fontFamily: 'monospace' }}
                    />
                    {topProductsData.map((entry, index) => {
                      const isSelected = selectedProduct?.name === entry.name;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={isSelected ? 'url(#selectedGrad)' : `url(#barGrad-${index % COLORS.length})`}
                          stroke={isSelected ? '#f59e0b' : 'transparent'}
                          strokeWidth={isSelected ? 1.5 : 0}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

      {/* 2 Main Dashboard Sections: Modern Sales Chart & Top Active Customers Widget (Full Width, Side-by-Side) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <ModernSalesChart
          salesRecords={allSalesRecords}
          settings={settings}
        />
        <TopActiveCustomersWidget
          customers={customers}
          sales={sales}
          debtTransactions={debtTransactions}
          settings={settings}
        />
      </div>

      {/* Expense Categories Chart (Full Width) */}
      <div className="w-full bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <span>دابەشبوونی خەرجییەکان بەپێی بەش</span>
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-200 font-bold">بەروار/مانگ:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedMonth(e.target.value);
                  setTimeRange('custom_month');
                }
              }}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono font-black text-xs px-2.5 py-1 rounded-lg border border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer transition-all text-center"
              title="هەڵبژاردنی مانگ بۆ خەرجییەکان"
            />
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          {expenseCategoriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseCategoriesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {expenseCategoriesData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: string) => {
                    const total = expenseCategoriesData.reduce((sum, item) => sum + item.value, 0);
                    const percentage = total > 0 ? ((Number(val) / total) * 100).toFixed(1) : '0';
                    return [
                      `${formatCurrency(Number(val) || 0, settings.currency, settings.usdToIqdRate)} (${percentage}%)`,
                      name,
                    ];
                  }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', backgroundColor: '#0f172a', color: '#fff', fontSize: '12px' }}
                />
                <Legend 
                  formatter={(value: string) => {
                    const item = expenseCategoriesData.find(i => i.name === value);
                    if (!item) return value;
                    const total = expenseCategoriesData.reduce((sum, i) => sum + i.value, 0);
                    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                    return <span className="text-slate-200 text-xs font-bold">{value} ({percentage}%)</span>;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold">
              هیچ خەرجییەک لەم مەودایەدا تۆمار نەکراوە
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
