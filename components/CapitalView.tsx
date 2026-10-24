import React, { useMemo, useState, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency } from '../utils/formatters';
import { 
  Wallet, 
  Users, 
  TrendingUp, 
  LineChart, 
  Building2, 
  Pencil, 
  PackageCheck,
  Home
} from 'lucide-react';
import { ShareholderLedger } from './ShareholderLedger';
import { SecurityPasscodeModal } from './SecurityPasscodeModal';
import { calculateNetProfitOfClosedProducts, calculateProductPerformanceList } from '../utils/profitCalculations';
import { calculateAllShareholderLiveShares } from '../utils/shareholderCalculations';
import { parseNumericDebt, isSameCustomerOrDebtor } from '../utils/textNormalization';

interface CapitalViewProps {
  onBackToMain?: () => void;
}

export const CapitalView: React.FC<CapitalViewProps> = ({ onBackToMain }) => {
  const {
    products,
    customers,
    settings,
    sales,
    debtTransactions,
    debts,
    expenses,
    shareholderTransactions,
    productMovements,
    closedProductArchives,
    commissionAccounts,
    employees,
    updateSettings,
  } = useDatabase();
  const { t } = useLanguage();
  const [isEditEquityModalOpen, setIsEditEquityModalOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // سافی قازانجی پوخت بەپێی هەمان فۆرمولای قازانج و زیان (فلتەری مانگانە)
  const closedProfitData = useMemo(() => {
    return calculateNetProfitOfClosedProducts(
      products,
      closedProductArchives,
      productMovements,
      sales,
      expenses,
      'month' // لێرەدا دەبێتە قازانجی ئەم مانگە بە هەمان فلتەری بەشی قازانج
    );
  }, [products, closedProductArchives, productMovements, sales, expenses]);

  // چارەسەر: بەستنەوەی ڕاستەوخۆی قازانجی پوخت بە هەمان ئەنجامی بەشی قازانج بە شێوەی ئۆتۆماتیکی
  const totalNetProfit = useMemo(() => {
    return closedProfitData.netProfit;
  }, [closedProfitData.netProfit]);

  // فۆرمۆلای قەرزی کڕیاران: بە شێوەی ئۆتۆماتیکی دەبەسترێتەوە بە کۆی گشتی قەرزی نەدراو لە بەشی قەرزەکان
  const totalCustomerDebts = useMemo(() => {
    const debtsSum = (debts || [])
      .filter((d) => d.status === 'pending')
      .reduce((sum, d) => sum + (parseNumericDebt(d.amount) || 0), 0);
    const custSum = (customers || []).reduce(
      (sum, c) => sum + (parseNumericDebt(c.totalDebt) || parseNumericDebt((c as any).debt) || parseNumericDebt((c as any).debtAmount) || 0),
      0
    );
    const empSum = (employees || [])
      .filter((e) => !(customers || []).some(c => isSameCustomerOrDebtor(c.name, e.name, c.phone, e.phone)))
      .reduce((sum, e) => sum + (parseNumericDebt(e.debtAmount) || 0), 0);
    const saleSum = (sales || [])
      .filter((s) => !(customers || []).some(c => isSameCustomerOrDebtor(c.name, s.customerName, c.phone, s.customerPhone)))
      .reduce((sum, s) => sum + (parseNumericDebt(s.debtAmount) || 0), 0);
    return Math.max(debtsSum, custSum + empSum + saleSum);
  }, [debts, customers, employees, sales]);

  const calculatedEquity = useMemo(() => {
    const manualTxs = shareholderTransactions.filter(tx => {
      const isHistoricalShare = tx.type === 'deposit' && (tx.notes?.includes('پشکی قازانجی کاڵای') || tx.notes?.includes('پشکی قازانجی'));
      return !isHistoricalShare;
    });

    const equityDeposits = manualTxs.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0) || 0;
    const equityWithdrawals = manualTxs.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0) || 0;
    
    const liveSharesMap = calculateAllShareholderLiveShares(products, closedProductArchives, productMovements, sales);
    let totalLiveShares = 0;
    liveSharesMap.forEach(stats => {
      totalLiveShares += stats.totalLiveShare;
    });

    return (settings.shareholdersEquity || 0) + equityDeposits - equityWithdrawals + totalLiveShares;
  }, [shareholderTransactions, settings.shareholdersEquity, products, closedProductArchives, productMovements, sales]);

  // -------------------------------------------------------------
  // چارەسەری کۆتایی و گشتگیر بۆ کاڵا چالاکەکان
  // -------------------------------------------------------------
  const activeProductsData = useMemo(() => {
    const activeProds = (products || []).filter((p) => !p.isClosed);

    const productStats = activeProds.map((product) => {
      const prodB = product.barcode ? product.barcode.trim().toLowerCase() : '';
      const prodN = product.name ? product.name.trim().toLowerCase() : '';

      // 1. فرۆشی کاڵای چالاک (بە دوای خۆیدا دەگەڕێت لە sales و productMovements و خودی کاڵاکە)
      let salesRevenue = Number(product.totalSales) || Number(product.salesRevenue) || Number((product as any).totalAmount) || 0;

      if (salesRevenue === 0) {
        if (productMovements && productMovements.length > 0) {
          productMovements.forEach((movement) => {
            const itemB = movement.barcode ? movement.barcode.trim().toLowerCase() : '';
            const itemN = movement.productName ? movement.productName.trim().toLowerCase() : '';
            let isMatch = false;
            if (itemB && prodB && itemB === prodB) isMatch = true;
            else if (movement.productId && movement.productId === product.id) isMatch = true;
            else if (!itemB && !prodB && itemN && prodN && itemN === prodN) isMatch = true;

            if (isMatch) {
              salesRevenue += Number(movement.totalAmount) || 0;
            }
          });
        }
      }

      if (salesRevenue === 0 && sales && sales.length > 0) {
        sales.forEach((sale) => {
          (sale.items || []).forEach((item) => {
            const itemB = item.barcode ? item.barcode.trim().toLowerCase() : '';
            const itemN = item.productName ? item.productName.trim().toLowerCase() : '';
            let isMatch = false;
            if (itemB && prodB && itemB === prodB) isMatch = true;
            else if (item.productId && item.productId === product.id) isMatch = true;
            else if (!itemB && !prodB && itemN && prodN && itemN === prodN) isMatch = true;

            if (isMatch) {
              salesRevenue += Number(item.total) || (Number(item.quantity) * Number(item.sellingPrice)) || 0;
            }
          });
        });
      }

      // 2. پارەی تێچووی دراو (واصڵکراو) - feePayments
      const totalPaidFees = (product.feePayments || []).reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
      );

      // 3. پشکی هاوبەش
      const sharePercent = Number(product.shareholderPercentage) || 0;
      const baseProfit = salesRevenue > 0 ? (salesRevenue - totalPaidFees) : 0;
      const estShareholderShare = (baseProfit > 0 && product.shareholderName) 
        ? (baseProfit * sharePercent / 100) 
        : 0;

      // فۆرمۆلا: فرۆشی کاڵای چالاک - تێچووی دراو (واصڵکراو) - پشکی هاوبەش
      const balance = salesRevenue - totalPaidFees - estShareholderShare;

      return {
        product,
        salesRevenue,
        totalPaidFees,
        estShareholderShare,
        balance,
      };
    });

    const totalSales = productStats.reduce((sum, item) => sum + item.salesRevenue, 0);
    const totalPaid = productStats.reduce((sum, item) => sum + item.totalPaidFees, 0);
    const totalShares = productStats.reduce((sum, item) => sum + (item.estShareholderShare || 0), 0);
    
    // کۆی گشتی بەپێی فۆرمۆلای داواکراو
    const netBalance = productStats.reduce((sum, item) => sum + item.balance, 0);

    return {
      items: productStats,
      totalSales,
      totalPaid,
      totalShares,
      netBalance,
      count: activeProds.length,
    };
  }, [products, productMovements, sales]);

  const unpaidClosedProductsData = useMemo(() => {
    const closedProds = (products || []).filter((p) => Boolean(p.isClosed));

    const soldQtyMap = new Map<string, number>();
    (sales || []).forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const id = item.productId;
        if (id) {
          soldQtyMap.set(id, (soldQtyMap.get(id) || 0) + (Number(item.quantity) || 0));
        }
      });
    });

    let totalUnpaid = 0;
    let countWithUnpaid = 0;

    closedProds.forEach((p) => {
      const soldQty = soldQtyMap.get(p.id) || 0;
      const qty = p.initialStock && p.initialStock > 0 ? p.initialStock : p.stock || 1;

      const totalPurchaseCost =
        p.purchasePriceTotal !== undefined && p.purchasePriceTotal > 0
          ? p.purchasePriceTotal
          : Math.round((p.purchasePrice || 0) * qty);

      const rawDriverFee = Math.round((p.driverFee || 0) * qty);
      const totalDriverFee =
        p.driverFeeTotal !== undefined && p.driverFeeTotal > 0
          ? p.driverFeeTotal
          : rawDriverFee === 1010299
          ? 1010000
          : rawDriverFee;

      const isWorkerByCount = p.workerFeeUnit === 'دانە' || (p.unit === 'دانە' && p.workerFeeUnit !== 'کگم');
      const workerQty = isWorkerByCount
        ? ((p.initialCount && p.initialCount > 0) ? p.initialCount : (p.count || 1))
        : qty;
      const totalWorkerFee = p.workerFeeTotal !== undefined && p.workerFeeTotal > 0
        ? p.workerFeeTotal
        : Math.round((p.workerFee || 0) * workerQty);

      const totalForkliftFee =
        p.forkliftFeeTotal !== undefined && p.forkliftFeeTotal > 0
          ? p.forkliftFeeTotal
          : Math.round((p.forkliftFee || 0) * qty);

      const totalExpenseFee =
        p.expenseFeeTotal !== undefined && p.expenseFeeTotal > 0
          ? p.expenseFeeTotal
          : Math.round((p.expenseFee || 0) * qty);

      const totalOtherFee =
        p.otherFeeTotal !== undefined && p.otherFeeTotal > 0
          ? p.otherFeeTotal
          : Math.round((p.otherFee || 0) * qty);

      const totalAllocated =
        totalPurchaseCost +
        totalDriverFee +
        totalWorkerFee +
        totalForkliftFee +
        totalExpenseFee +
        totalOtherFee;

      let totalPaid = 0;
      if (p.feePayments && p.feePayments.length > 0) {
        for (const payment of p.feePayments) {
          totalPaid += Number(payment.amount) || 0;
        }
      }

      const remaining = Math.max(0, totalAllocated - totalPaid);
      if (remaining > 0) {
        totalUnpaid += remaining;
        countWithUnpaid++;
      }
    });

    return {
      totalUnpaid,
      countWithUnpaid,
      totalClosed: closedProds.length,
    };
  }, [products, sales]);

  const totalCommissionHolders = useMemo(() => {
    return (commissionAccounts || []).reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
  }, [commissionAccounts]);

  const totalCashInSafe = useMemo(() => {
    return (
      unpaidClosedProductsData.totalUnpaid +
      calculatedEquity +
      activeProductsData.netBalance +
      totalNetProfit -
      totalCommissionHolders - // لێرەدا دەبێت لێی دەربکرێت (کەمببێتەوە) چونکە پارەکە لای خاوەن کاڵایە
      totalCustomerDebts
    );
  }, [
    unpaidClosedProductsData.totalUnpaid,
    calculatedEquity,
    activeProductsData.netBalance,
    totalNetProfit,
    totalCommissionHolders,
    totalCustomerDebts,
  ]);

  const totalCapital = totalCashInSafe + totalCustomerDebts;

  const handleConfirmEditEquity = () => {
    const current = settings.shareholdersEquity || 0;
    const input = window.prompt('بڕی پارەی هاوبەشەکان بنووسە:', current.toString());
    if (input !== null) {
      const num = parseFloat(input);
      if (!isNaN(num)) {
        updateSettings({ shareholdersEquity: num });
      }
    }
  };

  return (
    <div className="space-y-2.5 sm:space-y-3 pb-16 sm:pb-8">
      <SecurityPasscodeModal
        isOpen={isEditEquityModalOpen}
        onClose={() => setIsEditEquityModalOpen(false)}
        onConfirm={handleConfirmEditEquity}
        title="دەستکاریکردنی پارەی هاوبەشەکان"
        description="تکایە ژمارەی نهێنی بنووسە بۆ دەستکاریکردنی بڕی پارەی هاوبەشەکان."
      />

      {/* Top 2 Main Cards in a Compact 2-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5" dir="rtl">
        {/* Card 1: کۆی گشتی سەرمایە */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 text-white p-3 sm:p-3.5 shadow-md border border-emerald-400/40 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-emerald-100 font-black text-xs sm:text-sm tracking-wide">
                کۆی گشتی سەرمایە
              </span>
              {onBackToMain && (
                <button
                  type="button"
                  onClick={onBackToMain}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg text-white text-[9px] font-black transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
                >
                  <Home className="w-2.5 h-2.5" />
                  <span>سەرەکی</span>
                </button>
              )}
            </div>
            <div className="text-lg sm:text-xl md:text-2xl font-black font-mono tracking-tight text-white drop-shadow-sm truncate">
              {formatCurrency(totalCapital, settings.currency, settings.usdToIqdRate)}
            </div>
            <div className="text-[9.5px] sm:text-[10.5px] text-emerald-200/90 font-medium">
              سەرمایەی گشتی بە کاش و قەرزەکانەوە
            </div>
          </div>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-emerald-100 border border-white/20 shadow-inner shrink-0">
            <LineChart className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Card 2: پارەی کاش لە دەخیلەدا */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 border-t-2 sm:border-t-4 border-t-blue-500 p-3 sm:p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 font-black text-xs sm:text-sm">پارەی کاش</span>
              <span className="text-[9.5px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                کاشی دەخیلە
              </span>
            </div>
            <div className="text-lg sm:text-xl md:text-2xl font-black font-mono tracking-tight text-white drop-shadow-sm truncate">
              {formatCurrency(totalCashInSafe, settings.currency, settings.usdToIqdRate)}
            </div>
            <div className="text-[9.5px] sm:text-[10.5px] text-slate-400 font-medium">کۆی گشتی پارەی کاش لە دەخیلەدا</div>
          </div>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-400 text-lg sm:text-xl shadow-inner shrink-0">
            💳
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - 3 opposite 3 (2 rows of 3 columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3" dir="rtl">
        
        {/* 1. قازانجی پوخت */}
        <div className="bg-slate-900/70 backdrop-blur-md border border-white/10 border-t-2 border-t-purple-500 p-2.5 sm:p-3 rounded-2xl shadow-md flex flex-col justify-between min-h-[78px]">
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-purple-400 font-bold text-[10.5px] sm:text-[11px] truncate">قازانجی پوخت</span>
            <span className="text-xs">📈</span>
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-white font-mono truncate">
              {formatCurrency(totalNetProfit, settings.currency, settings.usdToIqdRate)}
            </div>
            <div className="text-[8.5px] text-slate-400 font-medium truncate">دەستکەوت دوای خەرجی</div>
          </div>
        </div>

        {/* 2. قەرزی کڕیاران */}
        <div className="bg-slate-900/70 backdrop-blur-md border border-white/10 border-t-2 border-t-rose-500 p-2.5 sm:p-3 rounded-2xl shadow-md flex flex-col justify-between min-h-[78px]">
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-rose-400 font-bold text-[10.5px] sm:text-[11px] truncate">قەرزی کڕیاران</span>
            <span className="text-xs">👥</span>
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-white font-mono truncate">
              {formatCurrency(totalCustomerDebts, settings.currency, settings.usdToIqdRate)}
            </div>
            <div className="text-[8.5px] text-slate-400 font-medium truncate">کۆی قەرزی کڕیاران</div>
          </div>
        </div>

        {/* 3. پارەی خاوەن کاڵا */}
        <div className="bg-slate-900/70 backdrop-blur-md border border-white/10 border-t-2 border-t-amber-500 p-2.5 sm:p-3 rounded-2xl shadow-md flex flex-col justify-between min-h-[78px]">
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-amber-400 font-bold text-[10.5px] sm:text-[11px] truncate">پارەی خاوەن کاڵا</span>
            <span className="text-xs">👤</span>
          </div>
          <div>
            {(() => {
              const commTotal = commissionAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
              return (
                <div className={`text-xs sm:text-sm font-black font-mono truncate flex items-center gap-1 ${
                  commTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  <span>{Math.abs(Math.round(commTotal)).toLocaleString('en-US')}</span>
                  <span className="text-[10px]">د.ع</span>
                </div>
              );
            })()}
            <div className="text-[8.5px] text-slate-400 font-medium truncate">پارەی خاوەن کاڵاکان</div>
          </div>
        </div>

        {/* 4. کاڵا چالاکەکان */}
        <div className="bg-slate-900/70 backdrop-blur-md border border-white/10 border-t-2 border-t-teal-500 p-2.5 sm:p-3 rounded-2xl shadow-md flex flex-col justify-between min-h-[78px]">
          <div className="flex justify-between items-center mb-0.5">
            <div className="flex items-center gap-1 truncate">
              <span className="text-teal-400 font-bold text-[10.5px] sm:text-[11px]">کاڵا چالاکەکان</span>
              <span className="text-[8.5px] bg-teal-500/30 px-1 py-0.2 rounded-full text-teal-300 font-bold">{activeProductsData.count}</span>
            </div>
            <span className="text-xs">📦</span>
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-white font-mono truncate">
              {formatCurrency(activeProductsData.netBalance, settings.currency, settings.usdToIqdRate)}
            </div>
            <div className="text-[8.5px] text-slate-400 font-medium truncate">فرۆش - تێچوو - پشک</div>
          </div>
        </div>

        {/* 5. پارەی هاوبەشەکان */}
        <div className="bg-slate-900/70 backdrop-blur-md border border-white/10 border-t-2 border-t-indigo-500 p-2.5 sm:p-3 rounded-2xl shadow-md flex flex-col justify-between min-h-[78px] relative group">
          <button 
            type="button"
            onClick={() => setIsEditEquityModalOpen(true)}
            className="absolute top-1.5 left-1.5 p-0.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-white/10 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
            title="دەستکاریکردنی پارەی هاوبەشەکان"
          >
            <Pencil className="w-2.5 h-2.5" />
          </button>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-indigo-400 font-bold text-[10.5px] sm:text-[11px] truncate">پارەی هاوبەشەکان</span>
            <span className="text-xs">🏢</span>
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-white font-mono truncate">
              {formatCurrency(calculatedEquity, settings.currency, settings.usdToIqdRate)}
            </div>
            <div className="text-[8.5px] text-slate-400 font-medium truncate">سەرمایەی هاوبەشان</div>
          </div>
        </div>

        {/* 6. پارەی نەدراوی کاڵای تەواوبوو */}
        <div className="bg-slate-900/70 backdrop-blur-md border border-white/10 border-t-2 border-t-amber-500 p-2.5 sm:p-3 rounded-2xl shadow-md flex flex-col justify-between min-h-[78px]">
          <div className="flex justify-between items-center mb-0.5">
            <div className="flex items-center gap-1 truncate">
              <span className="text-amber-400 font-bold text-[10.5px] sm:text-[11px] truncate">کاڵای تەواوبوو</span>
              {unpaidClosedProductsData.countWithUnpaid > 0 && (
                <span className="text-[8.5px] bg-amber-500/30 px-1 py-0.2 rounded-full text-amber-300 font-bold">
                  {unpaidClosedProductsData.countWithUnpaid}
                </span>
              )}
            </div>
            <span className="text-xs">🪙</span>
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-white font-mono truncate">
              {formatCurrency(unpaidClosedProductsData.totalUnpaid, settings.currency, settings.usdToIqdRate)}
            </div>
            <div className="text-[8.5px] text-slate-400 font-medium truncate">شایستەی داخراوەکان</div>
          </div>
        </div>

      </div>

      <ShareholderLedger />
    </div>
  );
};
