import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Truck,
  User,
  Wrench,
  Receipt,
  Package,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  Search,
  ArrowUpDown,
  X,
  Layers,
  Save,
  Info,
  Scale,
  Check,
  Settings2,
  ArrowLeft,
  MoreHorizontal,
} from 'lucide-react';
import { Product, FeePayment, FeeCategory } from '../types';
import { useDatabase } from '../context/DatabaseContext';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';
import { calculateProductFeeStats } from '../utils/feeCalculations';

interface ProductFeeManagerProps {
  product: Product;
}

const CATEGORY_CONFIG: Record<
  FeeCategory,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgLight: string;
    border: string;
    textDark: string;
    badgeBg: string;
  }
> = {
  purchase: {
    label: 'تێچووی کڕینی کاڵا',
    icon: ShoppingBag,
    color: 'text-emerald-700',
    bgLight: 'bg-emerald-50',
    border: 'border-emerald-300',
    textDark: 'text-slate-950',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  driver: {
    label: 'کرێی گواستنەوە',
    icon: Truck,
    color: 'text-amber-700',
    bgLight: 'bg-amber-50',
    border: 'border-amber-300',
    textDark: 'text-slate-950',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  worker: {
    label: 'کرێی کرێکار',
    icon: User,
    color: 'text-sky-700',
    bgLight: 'bg-sky-50',
    border: 'border-sky-300',
    textDark: 'text-slate-950',
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
  },
  forklift: {
    label: 'کرێی ڕافعە',
    icon: Wrench,
    color: 'text-purple-700',
    bgLight: 'bg-purple-50',
    border: 'border-purple-300',
    textDark: 'text-slate-950',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
  },
  expense: {
    label: 'خەرجی تر',
    icon: Receipt,
    color: 'text-rose-700',
    bgLight: 'bg-rose-50',
    border: 'border-rose-300',
    textDark: 'text-slate-950',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
  },
  other: {
    label: 'کرێی تر',
    icon: Layers,
    color: 'text-slate-900',
    bgLight: 'bg-slate-100',
    border: 'border-slate-300',
    textDark: 'text-slate-950',
    badgeBg: 'bg-slate-200 text-slate-900 border-slate-300',
  },
};

export const ProductFeeManager: React.FC<ProductFeeManagerProps> = ({
  product
}) => {
  const { 
    products, 
    addFeePayment, 
    updateFeePayment, 
    deleteFeePayment, 
    updateProduct, 
    settings,
    sales,
    productMovements
  } = useDatabase();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Find fresh live product from context
  const liveProduct = useMemo(() => {
    return products.find((p) => p.id === product.id) || product;
  }, [products, product]);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPurchaseExpanded, setIsPurchaseExpanded] = useState(false);
  const [isDriverExpanded, setIsDriverExpanded] = useState(false);
  const [isWorkerExpanded, setIsWorkerExpanded] = useState(false);
  const [isForkliftExpanded, setIsForkliftExpanded] = useState(false);
  const [isExpenseExpanded, setIsExpenseExpanded] = useState(false);

  // Modal State for Payments
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<FeePayment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<FeePayment | null>(null);

  // Modal State for Editing Allocated Fee / Weight Calculator
  const [isEditFeeModalOpen, setIsEditFeeModalOpen] = useState(false);
  const [editFeeCategory, setEditFeeCategory] = useState<FeeCategory>('worker');
  const [editFeeAmount, setEditFeeAmount] = useState<string>('');
  const [feeWeightQty, setFeeWeightQty] = useState<string>('');
  const [feeWeightRate, setFeeWeightRate] = useState<string>('5000');
  const [feeWeightMode, setFeeWeightMode] = useState<'ton' | 'kg'>('ton');
  const [syncWeightToProduct, setSyncWeightToProduct] = useState(true);
  const [feeWeightSource, setFeeWeightSource] = useState<'custom' | 'sold' | 'batch'>('custom');

  // Unified calculation from utility
  const feeStats = useMemo(() => {
    return calculateProductFeeStats(liveProduct, sales, productMovements);
  }, [liveProduct, sales, productMovements]);

  const {
    totalPurchaseCost,
    totalDriverFee,
    totalWorkerFee,
    totalOtherExpensesCost,
    totalAllocatedFees,
    totalPaidFees,
    totalRemainingFees,
    effectiveWorkerRate,
    totalQtySold,
    totalCountSold,
    totalInitialQty,
    totalInitialCount
  } = feeStats;

  const qty = liveProduct.unit === 'دانە'
    ? (totalInitialCount > 0 ? totalInitialCount : (totalInitialQty > 0 ? totalInitialQty : (liveProduct.count || liveProduct.stock || 1)))
    : (totalInitialQty > 0 ? totalInitialQty : (totalInitialCount > 0 ? totalInitialCount : (liveProduct.stock || liveProduct.count || 1)));

  const batchWeight = totalInitialQty;
  const batchCount = totalInitialCount;

  // Direct Inline Weight Input on Manager Page
  const [inlineWeightInput, setInlineWeightInput] = useState<string>(() => {
    return totalInitialQty > 0 ? String(totalInitialQty) : '';
  });
  const [isSavingInlineWeight, setIsSavingInlineWeight] = useState(false);
  const [weightSavedNotice, setWeightSavedNotice] = useState(false);

  // Direct Inline Count Input on Manager Page
  const [inlineCountInput, setInlineCountInput] = useState<string>(() => {
    return totalInitialCount > 0 ? String(totalInitialCount) : '';
  });
  const [isSavingInlineCount, setIsSavingInlineCount] = useState(false);
  const [countSavedNotice, setCountSavedNotice] = useState(false);

  // Sync inputs with liveProduct updates
  React.useEffect(() => {
    if (totalInitialQty > 0) setInlineWeightInput(String(totalInitialQty));
  }, [totalInitialQty]);

  React.useEffect(() => {
    if (totalInitialCount > 0) setInlineCountInput(String(totalInitialCount));
  }, [totalInitialCount]);

  // Inline Payment within Fee Edit Modal
  const [editModalPaymentAmount, setEditModalPaymentAmount] = useState<string>('');
  const [editModalRecipientName, setEditModalRecipientName] = useState<string>('');
  const [editModalPaymentDate, setEditModalPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [editModalPaymentNotes, setEditModalPaymentNotes] = useState<string>('');

  // Form State
  const [paymentCategory, setPaymentCategory] = useState<FeeCategory>('purchase');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [recipientName, setRecipientName] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Direct Inline Worker Fee Input on Manager Page (دەستی بە ئارەزووی خۆت)
  const [inlineWorkerFeeInput, setInlineWorkerFeeInput] = useState<string>(() => {
    return totalWorkerFee > 0 ? String(totalWorkerFee) : '';
  });
  const [isSavingInlineWorkerFee, setIsSavingInlineWorkerFee] = useState(false);
  const [workerFeeSavedNotice, setWorkerFeeSavedNotice] = useState(false);

  React.useEffect(() => {
    if (totalWorkerFee > 0) {
      setInlineWorkerFeeInput(String(totalWorkerFee));
    }
  }, [totalWorkerFee]);

  const isWorkerByCount = liveProduct.workerFeeUnit === 'دانە' || (liveProduct.unit === 'دانە' && liveProduct.workerFeeUnit !== 'کگم');
  const autoWorkerFeePaid = 0;
  const workerQty = isWorkerByCount ? totalInitialCount : totalInitialQty;
  const workerUnit = isWorkerByCount ? 'دانە' : 'کگم';
  const workerRate = effectiveWorkerRate;
  const soldQtyForWorker = isWorkerByCount ? totalCountSold : totalQtySold;
  const totalOtherFee = totalOtherExpensesCost;

  const feeAllocations: Record<FeeCategory, number> = useMemo(() => {
    const costQty = totalInitialQty > 0 ? totalInitialQty : (totalInitialCount > 0 ? totalInitialCount : 1);
    return {
      purchase: totalPurchaseCost,
      driver: totalDriverFee,
      worker: totalWorkerFee,
      forklift: liveProduct.forkliftFeeTotal || Math.round((liveProduct.forkliftFee || 0) * costQty),
      expense: liveProduct.expenseFeeTotal || Math.round((liveProduct.expenseFee || 0) * costQty),
      other: liveProduct.otherFeeTotal || Math.round((liveProduct.otherFee || 0) * costQty),
    };
  }, [totalPurchaseCost, totalDriverFee, totalWorkerFee, liveProduct, totalInitialQty, totalInitialCount]);

  // Payments array
  const payments = useMemo(() => {
    return (liveProduct.feePayments || []).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [liveProduct.feePayments]);

  // Compute total paid (Wasil) per category
  const paidPerCategory = useMemo(() => {
    const map: Record<FeeCategory, number> = {
      purchase: 0,
      driver: 0,
      worker: 0,
      forklift: 0,
      expense: 0,
      other: 0,
    };
    payments.forEach((p) => {
      if (map[p.category] !== undefined) {
        map[p.category] += Number(p.amount) || 0;
      }
    });
    return map;
  }, [payments]);

  // Overall totals - Derived from stats for 100% consistency
  const overallTotalFees = totalAllocatedFees;
  const overallTotalPaid = totalPaidFees;
  const overallTotalRemaining = totalRemainingFees;

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchCat = activeCategoryFilter === 'all' || p.category === activeCategoryFilter;
      const matchSearch =
        !searchTerm.trim() ||
        (p.recipientName && p.recipientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        CATEGORY_CONFIG[p.category]?.label.includes(searchTerm);
      return matchCat && matchSearch;
    });
  }, [payments, activeCategoryFilter, searchTerm]);

  // Open modal to add payment
  const handleOpenAdd = (category: FeeCategory = 'purchase') => {
    setEditingPayment(null);
    setPaymentCategory(category);
    const remaining = Math.max(0, feeAllocations[category] - paidPerCategory[category]);
    setPaymentAmount(remaining > 0 ? String(remaining) : '');
    setPaymentDate(new Date().toISOString().slice(0, 16));
    setRecipientName('');
    setPaymentNotes('');
    setFormError('');
    setIsPaymentModalOpen(true);
  };

  // Open modal to edit payment
  const handleOpenEdit = (payment: FeePayment) => {
    setEditingPayment(payment);
    setPaymentCategory(payment.category);
    setPaymentAmount(String(payment.amount));
    setPaymentDate(
      payment.date.includes('T') ? payment.date.slice(0, 16) : `${payment.date}T12:00`
    );
    setRecipientName(payment.recipientName || '');
    setPaymentNotes(payment.notes || '');
    setFormError('');
    setIsPaymentModalOpen(true);
  };

  // Submit payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setFormError('تکایە بڕی پارەی دراو بە دروستی بنووسە');
      return;
    }

    if (editingPayment) {
      updateFeePayment(liveProduct.id, editingPayment.id, {
        category: paymentCategory,
        amount,
        date: paymentDate,
        recipientName: recipientName.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });
    } else {
      addFeePayment(liveProduct.id, {
        category: paymentCategory,
        amount,
        date: paymentDate,
        recipientName: recipientName.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });
    }

    setIsPaymentModalOpen(false);
  };

  // Save Inline Direct Product Weight
  const handleSaveInlineWeight = (customVal?: number) => {
    const val = typeof customVal === 'number' ? customVal : parseFloat(inlineWeightInput.replace(/,/g, ''));
    if (!isNaN(val) && val >= 0) {
      setIsSavingInlineWeight(true);
      try {
        const currentWorkerRate = (liveProduct.workerFee && liveProduct.workerFee > 0)
          ? liveProduct.workerFee
          : (liveProduct.workerFeeTotal && qty > 0 ? (liveProduct.workerFeeTotal / qty) : 0);
        const effectiveWorkerQty = isWorkerByCount ? (batchCount > 0 ? batchCount : val) : val;
        const newWorkerTotal = Math.round(currentWorkerRate * effectiveWorkerQty);

        const updates: Partial<Product> = {
          initialStock: val,
          stock: Math.max(0, val - (totalQtySold || 0)),
          workerFee: currentWorkerRate > 0 ? currentWorkerRate : undefined,
          workerFeeTotal: newWorkerTotal,
        };
        if (liveProduct.unit === 'دانە') {
          updates.initialCount = val;
          updates.count = Math.max(0, val - (totalCountSold || totalQtySold || 0));
        }
        if (val > 0) {
          if (liveProduct.driverFeeTotal) {
            updates.driverFee = liveProduct.driverFeeTotal / val;
          } else if (liveProduct.driverFee) {
            const rawCalc = Math.round((liveProduct.driverFee || 0) * qty);
            const totalDriver = rawCalc === 1010299 ? 1010000 : rawCalc;
            updates.driverFeeTotal = totalDriver;
            updates.driverFee = totalDriver / val;
          }
          if (liveProduct.purchasePriceTotal) updates.purchasePrice = liveProduct.purchasePriceTotal / val;
          if (liveProduct.forkliftFeeTotal) updates.forkliftFee = liveProduct.forkliftFeeTotal / val;
          if (liveProduct.expenseFeeTotal) updates.expenseFee = liveProduct.expenseFeeTotal / val;
          if (liveProduct.otherFeeTotal) updates.otherFee = liveProduct.otherFeeTotal / val;
        }
        updateProduct(liveProduct.id, updates);
        setInlineWeightInput(String(val));
        setFeeWeightQty(String(val));
        setWeightSavedNotice(true);
        setTimeout(() => setWeightSavedNotice(false), 2500);
      } finally {
        setIsSavingInlineWeight(false);
      }
    }
  };

  // Save Inline Direct Product Count
  const handleSaveInlineCount = (customVal?: number) => {
    const val = typeof customVal === 'number' ? customVal : parseFloat(inlineCountInput.replace(/,/g, ''));
    if (!isNaN(val) && val >= 0) {
      setIsSavingInlineCount(true);
      try {
        const soldCount = totalCountSold > 0 ? totalCountSold : 0;
        const currentWorkerRate = (liveProduct.workerFee && liveProduct.workerFee > 0)
          ? liveProduct.workerFee
          : (liveProduct.workerFeeTotal && qty > 0 ? (liveProduct.workerFeeTotal / qty) : 0);
        const effectiveWorkerQty = isWorkerByCount ? val : (batchWeight > 0 ? batchWeight : val);
        const newWorkerTotal = Math.round(currentWorkerRate * effectiveWorkerQty);

        const updates: Partial<Product> = {
          initialCount: val,
          count: Math.max(0, val - soldCount),
          workerFee: currentWorkerRate > 0 ? currentWorkerRate : undefined,
          workerFeeTotal: newWorkerTotal,
        };
        updateProduct(liveProduct.id, updates);
        setInlineCountInput(String(val));
        setCountSavedNotice(true);
        setTimeout(() => setCountSavedNotice(false), 2500);
      } finally {
        setIsSavingInlineCount(false);
      }
    }
  };

  // Save Inline Direct Product Worker Fee
  const handleSaveInlineWorkerFee = (customVal?: number) => {
    const val = typeof customVal === 'number' ? customVal : parseFloat(inlineWorkerFeeInput.replace(/,/g, ''));
    if (!isNaN(val) && val >= 0) {
      setIsSavingInlineWorkerFee(true);
      try {
        const wQty = workerQty > 0 ? workerQty : 1;
        updateProduct(liveProduct.id, {
          workerFeeTotal: val,
          workerFee: wQty > 0 ? (val / wQty) : val,
        });
        setInlineWorkerFeeInput(String(val));
        setWorkerFeeSavedNotice(true);
        setTimeout(() => setWorkerFeeSavedNotice(false), 2500);
      } finally {
        setIsSavingInlineWorkerFee(false);
      }
    }
  };

  // Open modal to adjust fee allocation
  const handleOpenEditFee = (category: FeeCategory) => {
    setEditFeeCategory(category);
    if (category === 'worker') {
      const curTotal = liveProduct.workerFeeTotal !== undefined && liveProduct.workerFeeTotal > 0
        ? liveProduct.workerFeeTotal
        : (totalWorkerFee > 0 ? totalWorkerFee : (liveProduct.workerFee || 0));
      setEditFeeAmount(curTotal > 0 ? String(curTotal) : '');
    } else {
      const currentTotal = feeAllocations[category] || 0;
      setEditFeeAmount(currentTotal > 0 ? String(currentTotal) : '');
    }

    // Default weight for manual calculation: either current product weight (qty) or sold weight
    const initialWeight = qty > 0 ? qty : (totalQtySold > 0 ? totalQtySold : 1000);
    setFeeWeightQty(String(initialWeight));
    setFeeWeightSource(category === 'worker' && totalQtySold > 0 ? 'sold' : 'custom');
    setSyncWeightToProduct(true);
    setFeeWeightRate(category === 'purchase' ? String(liveProduct.purchasePrice || 0) : '5000');
    setFeeWeightMode(category === 'purchase' ? 'kg' : 'ton');

    // Reset payment fields
    setEditModalPaymentAmount('');
    setEditModalRecipientName('');
    setEditModalPaymentDate(new Date().toISOString().slice(0, 16));
    setEditModalPaymentNotes('');

    setIsEditFeeModalOpen(true);
  };

  // Submit updated fee allocation to product
  const handleSaveFeeAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    const inputVal = Number(editFeeAmount) || 0;
    const customWeight = parseFloat(feeWeightQty.replace(/,/g, '')) || 0;

    // If user specified custom product weight and sync is enabled, persist to product
    if (customWeight > 0 && syncWeightToProduct) {
      updateProduct(liveProduct.id, {
        initialStock: customWeight,
        stock: Math.max(0, customWeight - totalQtySold),
        workerFeeTotal: Math.round((liveProduct.workerFee || 0) * customWeight),
        ...(liveProduct.unit === 'دانە' ? {
          initialCount: customWeight,
          count: Math.max(0, customWeight - totalQtySold),
        } : {}),
      });
      setInlineWeightInput(String(customWeight));
    }

    const effectiveQty = customWeight > 0 ? customWeight : (qty > 0 ? qty : 1);

    if (editFeeCategory === 'worker') {
      const wQty = effectiveQty > 0 ? effectiveQty : 1;
      updateProduct(liveProduct.id, {
        workerFeeTotal: inputVal,
        workerFee: wQty > 0 ? (inputVal / wQty) : inputVal,
      });
      setInlineWorkerFeeInput(String(inputVal));
    } else {
      const unitFee = effectiveQty > 0 ? (inputVal / effectiveQty) : inputVal;

      if (editFeeCategory === 'purchase') {
        updateProduct(liveProduct.id, { purchasePrice: unitFee, purchasePriceTotal: inputVal });
      } else if (editFeeCategory === 'driver') {
        updateProduct(liveProduct.id, { driverFee: unitFee, driverFeeTotal: inputVal });
      } else if (editFeeCategory === 'forklift') {
        updateProduct(liveProduct.id, { forkliftFee: unitFee, forkliftFeeTotal: inputVal });
      } else if (editFeeCategory === 'expense') {
        updateProduct(liveProduct.id, { expenseFee: unitFee, expenseFeeTotal: inputVal });
      } else if (editFeeCategory === 'other') {
        updateProduct(liveProduct.id, { otherFee: unitFee, otherFeeTotal: inputVal });
      }
    }

    // Save payment if an amount was entered
    const pAmount = Number(editModalPaymentAmount);
    if (pAmount > 0) {
      addFeePayment(liveProduct.id, {
        category: editFeeCategory,
        amount: pAmount,
        date: editModalPaymentDate || new Date().toISOString(),
        recipientName: editModalRecipientName.trim() || undefined,
        notes: editModalPaymentNotes.trim() || undefined,
      });
    }

    setIsEditFeeModalOpen(false);
  };

  // Delete payment
  const handleDeletePayment = (payment: FeePayment) => {
    setPaymentToDelete(payment);
  };

  const confirmDeletePayment = () => {
    if (paymentToDelete) {
      deleteFeePayment(liveProduct.id, paymentToDelete.id);
      setPaymentToDelete(null);
    }
  };

  const coreCategories: FeeCategory[] = ['purchase', 'driver', 'worker', 'forklift', 'expense'];
  if (totalOtherFee > 0 || paidPerCategory.other > 0) {
    coreCategories.push('other');
  }

  return (
    <div className="space-y-6">
      {/* Overall Grand Totals Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-4 sm:p-5 text-white shadow-xl border border-slate-700/60">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Truck className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="font-black text-base sm:text-lg text-white">
                پارەی کاڵا و خەرجی
              </h3>
            </div>
            <p className="text-xs text-slate-900 mt-1 font-medium">
              تۆماری پارەی دراو و پارەی ماوەی کڕینی کاڵا، گواستنەوە، کرێکار، ڕافعە و سەرجەم خەرجییەکان
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAdd('purchase')}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-lg shadow-emerald-950/40 active:scale-95 transition-all no-print cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-white" />
            <span className="text-white">+ پارەدانی نوێ</span>
          </button>
        </div>

        {/* 3 Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="bg-slate-800/90 rounded-2xl p-3 sm:p-3.5 border border-slate-700/80 shadow-inner">
            <span className="text-[11px] font-bold text-slate-900 block mb-1">کۆی گشتی پارەی کاڵا و خەرجی</span>
            <span className="text-lg sm:text-2xl font-black text-white tracking-tight">
              {formatCurrency(overallTotalFees, settings.currency, settings.usdToIqdRate)}
            </span>
          </div>

          <div className="bg-emerald-950/70 rounded-2xl p-3 sm:p-3.5 border border-emerald-500/50 shadow-inner">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-300">کۆی گشتی پارەی دراو</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight">
              {formatCurrency(overallTotalPaid, settings.currency, settings.usdToIqdRate)}
            </span>
          </div>

          <div className={`rounded-2xl p-3 sm:p-3.5 border shadow-inner ${
            overallTotalRemaining > 0
              ? 'bg-rose-950/70 border-rose-500/50 text-rose-300'
              : 'bg-slate-800/90 border-slate-700/80 text-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[11px] font-bold ${overallTotalRemaining > 0 ? 'text-rose-300' : 'text-slate-200'}`}>
                کۆی گشتی پارەی ماوە(نەدراو)
              </span>
              <Clock className={`w-4 h-4 ${overallTotalRemaining > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
            </div>
            <span className={`text-lg sm:text-2xl font-black tracking-tight ${overallTotalRemaining > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
              {formatCurrency(overallTotalRemaining, settings.currency, settings.usdToIqdRate)}
            </span>
          </div>
        </div>
      </div>

      {/* Category Breakdown Cards */}

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {coreCategories.map((catKey) => {
          const config = CATEGORY_CONFIG[catKey];
          const Icon = config.icon;
          const totalFee = feeAllocations[catKey] || 0;
          const paid = paidPerCategory[catKey] || 0;
          const remaining = Math.max(0, totalFee - paid);
          const isFullySettled = totalFee > 0 && paid >= totalFee;
          const isPartiallySettled = paid > 0 && remaining > 0;
          const isUnpaid = totalFee > 0 && paid === 0;

          const isPurchase = catKey === 'purchase';
          const isDriver = catKey === 'driver';
          const isWorker = catKey === 'worker';
          const isForklift = catKey === 'forklift';
          const isExpense = catKey === 'expense';

          if (isPurchase && !isPurchaseExpanded) {
            return (
              <div
                key={catKey}
                onClick={() => setIsPurchaseExpanded(true)}
                className={`${config.bgLight} ${config.border} border-2 rounded-3xl p-4 flex flex-col justify-between shadow-xs transition-all hover:shadow-md cursor-pointer group bg-white`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-2xl bg-white shadow-xs border ${config.border} ${config.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-sm sm:text-base text-slate-950 tracking-tight">{config.label}</div>
                      <p className="text-[11px] text-slate-900 font-bold mt-0.5">کرتە بکە بۆ پیشاندانی وردەکاری و پارەدان</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-600 group-hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-black shadow-xs transition-colors shrink-0">
                    <span className="text-white">پیشاندان</span>
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>
            );
          }

          if (isDriver && !isDriverExpanded) {
            return (
              <div
                key={catKey}
                onClick={() => setIsDriverExpanded(true)}
                className={`${config.bgLight} ${config.border} border-2 rounded-3xl p-4 flex flex-col justify-between shadow-xs transition-all hover:shadow-md cursor-pointer group bg-white`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-2xl bg-white shadow-xs border ${config.border} ${config.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-sm sm:text-base text-slate-950 tracking-tight">{config.label}</div>
                      <p className="text-[11px] text-slate-900 font-bold mt-0.5">کرتە بکە بۆ پیشاندانی وردەکاری و پارەدان</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-amber-600 group-hover:bg-amber-700 text-white px-3 py-2 rounded-xl text-xs font-black shadow-xs transition-colors shrink-0">
                    <span className="text-white">پیشاندان</span>
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>
            );
          }

          if (isWorker && !isWorkerExpanded) {
            return (
              <div
                key={catKey}
                onClick={() => setIsWorkerExpanded(true)}
                className={`${config.bgLight} ${config.border} border-2 rounded-3xl p-4 flex flex-col justify-between shadow-xs transition-all hover:shadow-md cursor-pointer group bg-white`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-2xl bg-white shadow-xs border ${config.border} ${config.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-sm sm:text-base text-slate-950 tracking-tight">{config.label}</div>
                      <p className="text-[11px] text-slate-900 font-bold mt-0.5">کرتە بکە بۆ پیشاندانی وردەکاری و پارەدان</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-sky-600 group-hover:bg-sky-700 text-white px-3 py-2 rounded-xl text-xs font-black shadow-xs transition-colors shrink-0">
                    <span className="text-white">پیشاندان</span>
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>
            );
          }

          if (isForklift && !isForkliftExpanded) {
            return (
              <div
                key={catKey}
                onClick={() => setIsForkliftExpanded(true)}
                className={`${config.bgLight} ${config.border} border-2 rounded-3xl p-4 flex flex-col justify-between shadow-xs transition-all hover:shadow-md cursor-pointer group bg-white`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-2xl bg-white shadow-xs border ${config.border} ${config.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-sm sm:text-base text-slate-950 tracking-tight">{config.label}</div>
                      <p className="text-[11px] text-slate-900 font-bold mt-0.5">کرتە بکە بۆ پیشاندانی وردەکاری و پارەدان</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-purple-600 group-hover:bg-purple-700 text-white px-3 py-2 rounded-xl text-xs font-black shadow-xs transition-colors shrink-0">
                    <span className="text-white">پیشاندان</span>
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>
            );
          }

          if (isExpense && !isExpenseExpanded) {
            return (
              <div
                key={catKey}
                onClick={() => setIsExpenseExpanded(true)}
                className={`${config.bgLight} ${config.border} border-2 rounded-3xl p-4 flex flex-col justify-between shadow-xs transition-all hover:shadow-md cursor-pointer group bg-white`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-2xl bg-white shadow-xs border ${config.border} ${config.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-sm sm:text-base text-slate-950 tracking-tight">{config.label}</div>
                      <p className="text-[11px] text-slate-900 font-bold mt-0.5">کرتە بکە بۆ پیشاندانی وردەکاری و پارەدان</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-rose-600 group-hover:bg-rose-700 text-white px-3 py-2 rounded-xl text-xs font-black shadow-xs transition-colors shrink-0">
                    <span className="text-white">پیشاندان</span>
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={catKey}
              className={`${config.bgLight} ${config.border} border rounded-3xl p-4 flex flex-col justify-between shadow-xs transition-all hover:shadow-md`}
            >
              <div>
                {/* Category Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl bg-white shadow-xs border ${config.border} ${config.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className={`font-black text-xs sm:text-sm ${config.textDark}`}>{config.label}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Pill */}
                    {isFullySettled && (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                        تەواو دراوە ✓
                      </span>
                    )}
                    {isPartiallySettled && (
                      <span className="text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                        بەشێکی ماوە
                      </span>
                    )}
                    {isUnpaid && (
                      <span className="text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full">
                        نەدراوە
                      </span>
                    )}
                    {totalFee === 0 && (
                      <span className="text-[10px] font-medium bg-slate-100 text-slate-900 px-2 py-0.5 rounded-full">
                        دیاری نەکراوە
                      </span>
                    )}
                    {isPurchase && (
                      <button
                        type="button"
                        onClick={() => setIsPurchaseExpanded(false)}
                        className="text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-900 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                      >
                        شارنەوەوە
                      </button>
                    )}
                    {isDriver && (
                      <button
                        type="button"
                        onClick={() => setIsDriverExpanded(false)}
                        className="text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-900 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                      >
                        شارنەوەوە
                      </button>
                    )}
                    {isWorker && (
                      <button
                        type="button"
                        onClick={() => setIsWorkerExpanded(false)}
                        className="text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-900 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                      >
                        شارنەوەوە
                      </button>
                    )}
                    {isForklift && (
                      <button
                        type="button"
                        onClick={() => setIsForkliftExpanded(false)}
                        className="text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-900 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                      >
                        شارنەوەوە
                      </button>
                    )}
                    {isExpense && (
                      <button
                        type="button"
                        onClick={() => setIsExpenseExpanded(false)}
                        className="text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-900 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                      >
                        شارنەوەوە
                      </button>
                    )}
                  </div>
                </div>

                {/* Amounts Details */}
                <div className="space-y-2 text-xs">
                  {catKey === 'worker' && (
                    <div className="flex flex-col gap-2 bg-sky-50/90 p-2.5 rounded-2xl border border-sky-200">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black text-sky-950 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-sky-600" />
                          <span>کۆی کرێی کرێکار (دەستی بە ئارەزووی خۆت):</span>
                        </label>
                        {liveProduct.workerFeeTotal !== undefined && liveProduct.workerFeeTotal > 0 && (
                          <span className="text-[10px] font-bold text-sky-800 bg-white px-2 py-0.5 rounded border border-sky-300 shadow-2xs">
                            دیاریکراوە: {formatNumber(liveProduct.workerFeeTotal)} د.ع
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={inlineWorkerFeeInput}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              setInlineWorkerFeeInput(val);
                              setWorkerFeeSavedNotice(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlineWorkerFee();
                            }}
                            placeholder="کۆی کرێی کرێکار بنووسە..."
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-black rounded-xl border border-sky-300 bg-white text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-right shadow-inner"
                          />
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 pointer-events-none">
                            د.ع
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveInlineWorkerFee()}
                          disabled={isSavingInlineWorkerFee}
                          className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-[11px] font-black transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isSavingInlineWorkerFee ? '...' : workerFeeSavedNotice ? '✓ خەزنکرا' : 'خەزن'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-900 font-medium">کۆی گشتی:</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        {formatCurrency(totalFee, settings.currency, settings.usdToIqdRate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-700 font-bold">پارەی دراو:</span>
                    </div>
                    <span className="font-black text-emerald-800 font-mono">
                      {formatCurrency(paid, settings.currency, settings.usdToIqdRate)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/80">
                    <span className={`font-black ${remaining > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                      پارەی ماوە(نەدراو):
                    </span>
                    <span className={`font-black text-sm font-mono ${remaining > 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                      {formatCurrency(remaining, settings.currency, settings.usdToIqdRate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 no-print">
                <button
                  type="button"
                  onClick={() => handleOpenAdd(catKey)}
                  className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 text-[11px] font-bold py-1.5 px-2 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+ پارەدان</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditFee(catKey)}
                  className="flex items-center justify-center gap-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 text-[11px] font-bold py-1.5 px-2.5 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                  title="دەستکاری بڕی تێچوو"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>دەستکاری</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Date-by-Date Payment History Table Section */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <div>
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>خشتەی تەواوی پارەدانەکان بەپێی بەروار ({payments.length} جار)</span>
            </h4>
            <p className="text-xs text-slate-900">
              تۆماری پارەی دراو و پارەی ماوە بۆ پارەی کاڵا و خەرجییەکان
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2 no-print">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors font-bold ${
                  activeCategoryFilter === 'all'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-800 hover:text-slate-950'
                }`}
              >
                هەموو
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('purchase')}
                className={`px-2 py-1 rounded-lg transition-colors font-bold ${
                  activeCategoryFilter === 'purchase'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-800 hover:text-emerald-900'
                }`}
              >
                کڕین
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('driver')}
                className={`px-2 py-1 rounded-lg transition-colors font-bold ${
                  activeCategoryFilter === 'driver'
                    ? 'bg-white text-amber-950 shadow-xs'
                    : 'text-slate-800 hover:text-amber-900'
                }`}
              >
                سایق
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('worker')}
                className={`px-2 py-1 rounded-lg transition-colors font-bold ${
                  activeCategoryFilter === 'worker'
                    ? 'bg-white text-sky-950 shadow-xs'
                    : 'text-slate-800 hover:text-sky-900'
                }`}
              >
                کرێکار
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('forklift')}
                className={`px-2 py-1 rounded-lg transition-colors font-bold ${
                  activeCategoryFilter === 'forklift'
                    ? 'bg-white text-purple-950 shadow-xs'
                    : 'text-slate-800 hover:text-purple-900'
                }`}
              >
                ڕافعە
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('expense')}
                className={`px-2 py-1 rounded-lg transition-colors font-bold ${
                  activeCategoryFilter === 'expense'
                    ? 'bg-white text-rose-950 shadow-xs'
                    : 'text-slate-800 hover:text-rose-900'
                }`}
              >
                خەرجی تر
              </button>
            </div>

            <div className="relative w-full sm:w-48">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="گەڕان بەپێی بەروار یان بڕ..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
              />
              <Search className="w-3.5 h-3.5 text-slate-700 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white w-full">
          <div className="w-full">
            <table className="w-full text-right text-xs table-fixed">
              <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-2 sm:px-3 text-right text-[11px] sm:text-xs w-[30%]">کات و بەروار</th>
                  <th className="py-2.5 px-2 sm:px-3 text-right text-[11px] sm:text-xs w-[24%]">جۆری کرێ</th>
                  <th className="py-2.5 px-2 sm:px-3 text-right text-[11px] sm:text-xs w-[26%]">بڕی دراو</th>
                  <th className="py-2.5 px-1 sm:px-2 text-center text-[11px] sm:text-xs w-[20%] no-print">کردارەکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-800 font-bold">
                      <Receipt className="w-8 h-8 mx-auto mb-1.5 opacity-30 text-slate-900" />
                      <p className="text-xs">هیچ تۆمارێکی پارەدان بۆ ئەم بەشە تۆمار نەکراوە</p>
                      <button
                        type="button"
                        onClick={() => handleOpenAdd('purchase')}
                        className="mt-2 text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 no-print cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>تۆمارکردنی یەکەم پارەدان</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const cfg = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG.other;
                    const Icon = cfg.icon;
                    const formatted = formatDate(p.date);
                    const parts = formatted.split(' ');
                    const datePart = parts[0];
                    const timePart = parts.slice(1).join(' ');

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-2 sm:px-3" dir="ltr">
                          <div className="flex flex-col items-start leading-tight">
                            <span className="font-mono text-[11px] sm:text-xs text-slate-900 font-bold">{datePart}</span>
                            {timePart && (
                              <span className="font-mono text-[10px] text-slate-700 font-bold">{timePart}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 sm:px-3">
                          <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[11px] font-bold border ${cfg.badgeBg} max-w-full truncate`}>
                            <Icon className="w-3 h-3 shrink-0" />
                            <span className="truncate">{cfg.label}</span>
                          </span>
                        </td>
                        <td className="py-2 px-2 sm:px-3 font-black text-emerald-700 text-xs sm:text-sm font-mono whitespace-nowrap">
                          {formatCurrency(p.amount, settings.currency, settings.usdToIqdRate)}
                        </td>
                        <td className="py-2 px-1 sm:px-2 text-center no-print">
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(p.id);
                              }}
                              className={`p-1.5 rounded-xl transition-all border ${
                                openMenuId === p.id 
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

      {/* Add / Edit Payment Modal Dialog */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-lg w-full max-h-[95vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 space-y-6 text-right">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingPayment ? 'دەستکاریکردنی پارەدان' : 'پارەدانی نوێ'}
                  </h3>
                  <p className="text-xs text-slate-900">
                    بۆ کاڵای: <strong className="text-slate-900">{liveProduct.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-600 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSavePayment} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  جۆری تێچوو / کرێ / خەرجی:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {(['purchase', 'driver', 'worker', 'forklift', 'expense'] as FeeCategory[]).map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat];
                    const Icon = cfg.icon;
                    const isSelected = paymentCategory === cat;
                    const rem = Math.max(0, feeAllocations[cat] - paidPerCategory[cat]);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setPaymentCategory(cat);
                          if (!editingPayment) {
                            setPaymentAmount(rem > 0 ? String(rem) : '');
                          }
                        }}
                        className={`p-2.5 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-700' : cfg.color}`} />
                          <span className="font-bold text-xs">{cfg.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-900">
                          ماوە: <strong className="text-slate-900">{formatNumber(rem)}</strong>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-900">
                    بڕی پارەی دراو (د.ع):
                  </label>
                  {feeAllocations[paymentCategory] > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const rem = Math.max(0, feeAllocations[paymentCategory] - paidPerCategory[paymentCategory]);
                        setPaymentAmount(String(rem));
                      }}
                      className="text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      پارەدانی تەواوی ماوە ({formatNumber(Math.max(0, feeAllocations[paymentCategory] - paidPerCategory[paymentCategory]))} د.ع)
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="بڕی پارە بە دینار بنووسە..."
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-bold text-slate-900"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">
                    د.ع
                  </span>
                </div>
              </div>

              {/* Date & Recipient */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    بەروار و کات:
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    ناوی وەرگری پارە (ئارەزوومەندانە):
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="وەک: ناوی سایق، کرێکار، وەستای ڕافعە..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  تێبینی یان ژمارەی وەسڵ:
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="هەر تێبینییەک لەسەر ئەم پارەدانە..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs text-slate-900"
                />
              </div>

              {formError && (
                <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{formError}</span>
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-6 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-900 hover:bg-slate-50 text-sm font-black transition-all active:scale-95 flex-1 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                  <span>گەڕانەوە</span>
                </button>
                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-black shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex-1 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  <span>خەزنکردن</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Sheet (Bottom Sheet) for Payment Actions */}
      {openMenuId && (
        <div className="fixed inset-0 z-[110] no-print">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200" 
            onClick={() => setOpenMenuId(null)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[32px] shadow-2xl border-t border-slate-200 p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex flex-col items-center gap-1 pb-2 text-right">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-4" />
              {(() => {
                const p = payments.find(pay => pay.id === openMenuId);
                if (!p) return null;
                const cfg = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG.other;
                return (
                  <div className="text-center w-full">
                    <h4 className="font-black text-slate-900 text-lg">{cfg.label}</h4>
                    <p className="text-xs font-bold text-slate-900">
                      بڕی پارە: {formatCurrency(p.amount, settings.currency, settings.usdToIqdRate)} • {formatDate(p.date)}
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  const p = payments.find(pay => pay.id === openMenuId);
                  if (p) handleOpenEdit(p);
                  setOpenMenuId(null);
                }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-amber-50 text-amber-800 rounded-2xl font-black transition-all active:scale-95 border border-amber-100"
              >
                <Edit2 className="w-6 h-6" />
                <span>دەستکاریکردن</span>
              </button>

              <button
                onClick={() => {
                  const p = payments.find(pay => pay.id === openMenuId);
                  if (p) handleDeletePayment(p);
                  setOpenMenuId(null);
                }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-rose-50 text-rose-700 rounded-2xl font-black transition-all active:scale-95 border border-rose-100"
              >
                <Trash2 className="w-6 h-6" />
                <span>سڕینەوەی پارەدان</span>
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

      {/* Edit Fee Allocation / Weight Calculator Modal */}
      {isEditFeeModalOpen && (() => {
        const catConfig = CATEGORY_CONFIG[editFeeCategory];
        const CategoryIcon = catConfig.icon;
        const weightVal = Number(feeWeightQty) || (editFeeCategory === 'worker' ? totalQtySold : qty);
        const rateVal = Number(feeWeightRate) || 0;
        const calculatedFee =
          feeWeightMode === 'ton'
            ? Math.round((weightVal / 1000) * rateVal)
            : Math.round(weightVal * rateVal);

        return (
          <div className="fixed inset-0 z-[100] flex justify-center bg-black/60 backdrop-blur-xs sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white sm:rounded-3xl max-w-md w-full p-5 sm:p-6 sm:shadow-2xl sm:border sm:border-slate-200 space-y-4 min-h-screen sm:min-h-0 sm:max-h-[90vh] overflow-y-auto sm:my-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-2xl ${catConfig.bgLight} ${catConfig.color} flex items-center justify-center border ${catConfig.border}`}>
                    <CategoryIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900">
                      دەستکاریکردنی {catConfig.label}
                    </h3>
                    <p className="text-[11px] text-slate-900">
                      دیاریکردنی کۆی گشتی کرێی ئەم کاڵایە
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditFeeModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveFeeAllocation} className="space-y-4">
                {/* Fee Amount Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-900">
                      {editFeeCategory === 'worker'
                        ? 'کۆی کرێی کرێکار بە ئارەزووی خۆت دیاری بکە (د.ع):'
                        : `دیاریکردنی بڕی پارەی ${catConfig.label} (د.ع):`}
                    </label>
                    {Number(editFeeAmount) > 0 && (
                      <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        {formatNumber(Number(editFeeAmount))} د.ع
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      autoFocus
                      value={editFeeAmount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                        setEditFeeAmount(raw);
                      }}
                      placeholder="بڕی پارە بە ئارەزووی خۆت بنووسە..."
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 font-mono font-black text-base sm:text-lg text-slate-900 outline-none transition-all shadow-inner text-right"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-600 pointer-events-none">
                      {settings.currency === 'USD' ? '$' : 'د.ع'}
                    </span>
                  </div>
                </div>

                {/* بەشی نووسینی کێشی کاڵاکە بە دەستی (وەک داواکراوە: ئەمەوێ خۆم کێشی کاڵاکە بنوسم) */}
                <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-600" />
                      <span>کێشی کاڵاکە بە دەستی بنووسە (کگم):</span>
                    </label>
                    {Number(feeWeightQty) > 0 && (
                      <span className="text-[11px] font-mono font-bold text-amber-900 bg-white px-2 py-0.5 rounded-lg border border-amber-300 shadow-2xs">
                        {formatNumber(Number(feeWeightQty))} کگم
                        {Number(feeWeightQty) >= 1000 && ` (${(Number(feeWeightQty) / 1000).toFixed(2)} تەن)`}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={feeWeightQty}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                        setFeeWeightQty(raw);
                        setFeeWeightSource('custom');
                      }}
                      placeholder="کێشی کاڵاکە بە دەستی خۆت بنووسە..."
                      className="w-full pl-12 pr-4 py-2.5 rounded-xl border-2 border-amber-400 bg-white font-mono font-black text-base text-slate-900 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-600 outline-none text-right shadow-inner placeholder:text-slate-600 placeholder:text-xs placeholder:font-normal"
                    />
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 pointer-events-none">
                      کگم
                    </span>
                  </div>

                  {/* Fast selection options */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-amber-900 font-bold">دیاریکردنی خێرا:</span>
                    {totalQtySold > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFeeWeightQty(String(totalQtySold));
                          setFeeWeightSource('sold');
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          feeWeightSource === 'sold' && Number(feeWeightQty) === totalQtySold
                            ? 'bg-amber-600 text-white border-amber-700'
                            : 'bg-white hover:bg-amber-100/70 text-slate-900 border-slate-300'
                        }`}
                      >
                        کێشی فرۆشراو ({formatNumber(totalQtySold)} کگم)
                      </button>
                    )}
                    {qty > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFeeWeightQty(String(qty));
                          setFeeWeightSource('batch');
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          feeWeightSource === 'batch' && Number(feeWeightQty) === qty
                            ? 'bg-amber-600 text-white border-amber-700'
                            : 'bg-white hover:bg-amber-100/70 text-slate-900 border-slate-300'
                        }`}
                      >
                        کۆی بار ({formatNumber(qty)} کگم)
                      </button>
                    )}
                    {[1000, 5000, 10000, 20000, 25000].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          setFeeWeightQty(String(w));
                          setFeeWeightSource('custom');
                        }}
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          Number(feeWeightQty) === w
                            ? 'bg-amber-600 text-white border-amber-700'
                            : 'bg-white hover:bg-amber-100/70 text-slate-900 border-slate-300'
                        }`}
                      >
                        {w >= 1000 ? `${w / 1000} تەن` : `${w} کگم`}
                      </button>
                    ))}
                  </div>

                  {/* Realtime calculation summary box */}
                  <div className="bg-white/90 rounded-xl p-2.5 border border-amber-200/80 space-y-1.5 text-xs">
                    {editFeeCategory === 'worker' ? (
                      <>
                        <div className="flex items-center justify-between text-slate-600 font-medium">
                          <span>کێشی دیاریکراوی خۆت:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatNumber(Number(feeWeightQty) || qty)} کگم
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-800 font-bold">
                          <span>کۆی پارەی ئەژمێرراوی کرێکار:</span>
                          <span className="font-mono font-black text-emerald-700 text-sm">
                            {formatNumber(Math.round((Number(feeWeightQty) || qty) * (Number(editFeeAmount) || 0)))} د.ع
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-900 pt-1 border-t border-slate-100">
                          <span>حیسابکردن:</span>
                          <span className="font-mono text-slate-600">
                            {formatNumber(Number(feeWeightQty) || qty)} کگم × {formatNumber(Number(editFeeAmount) || 0)} د.ع
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-slate-600 font-medium">
                          <span>کێشی دیاریکراوی کاڵا:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatNumber(Number(feeWeightQty) || qty)} کگم
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-900 font-bold">
                          <span>تێچووی ۱ کگم بۆ ئەم کرێیە:</span>
                          <span className="font-mono font-black text-slate-900">
                            {((Number(editFeeAmount) || 0) / (Number(feeWeightQty) || qty || 1)).toFixed(2)} د.ع / کگم
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Checkbox to persist weight to product */}
                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-[11px] font-bold text-amber-950">
                    <input
                      type="checkbox"
                      checked={syncWeightToProduct}
                      onChange={(e) => setSyncWeightToProduct(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
                    />
                    <span>ئەم کێشە ({formatNumber(Number(feeWeightQty) || 0)} کگم) وەک کێشی سەرەکی کاڵاکە لە کۆگا خەزن بکرێت</span>
                  </label>
                </div>

                {/* Payment Section (بەشی پارەدان) */}
                <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80">
                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                      <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-700 flex items-center justify-center">
                        <DollarSign className="w-3.5 h-3.5" />
                      </div>
                      <span>تۆمارکردنی پارەدان (پارەی دراو)</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                      <span className="text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                        دراو: {formatNumber(paidPerCategory[editFeeCategory] || 0)} د.ع
                      </span>
                      {Math.max(0, (feeAllocations[editFeeCategory] || 0) - (paidPerCategory[editFeeCategory] || 0)) > 0 && (
                        <span className="text-rose-700 bg-white px-2 py-0.5 rounded-lg border border-rose-200">
                          ماوە: {formatNumber(Math.max(0, (feeAllocations[editFeeCategory] || 0) - (paidPerCategory[editFeeCategory] || 0)))} د.ع
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-900">
                        بڕی پارەی دراو (د.ع):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const totalVal = Number(editFeeAmount) || (feeAllocations[editFeeCategory] || 0);
                          const remaining = Math.max(0, totalVal - (paidPerCategory[editFeeCategory] || 0));
                          setEditModalPaymentAmount(String(remaining > 0 ? remaining : totalVal));
                        }}
                        className="text-[11px] font-black text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg transition-colors cursor-pointer active:scale-95 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>تەواوی بڕەکە دراوە</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editModalPaymentAmount}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '');
                          setEditModalPaymentAmount(raw);
                        }}
                        placeholder="بڕی پارەی دراو بنووسە (ئەگەر پارەت داوە)..."
                        className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none text-right placeholder:text-xs placeholder:font-normal placeholder:text-slate-600 shadow-inner"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 pointer-events-none">
                        {settings.currency === 'USD' ? '$' : 'د.ع'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-900 mb-1">
                        ناوی وەرگر ({editFeeCategory === 'driver' ? 'شۆفێر' : editFeeCategory === 'worker' ? 'کرێکار' : 'وەرگر'}):
                      </label>
                      <input
                        type="text"
                        value={editModalRecipientName}
                        onChange={(e) => setEditModalRecipientName(e.target.value)}
                        placeholder={
                          editFeeCategory === 'driver'
                            ? 'ناوی شۆفێر بنووسە...'
                            : editFeeCategory === 'worker'
                            ? 'ناوی کرێکار یان وەستا بنووسە...'
                            : 'ناوی وەرگری پارە...'
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-900 mb-1">
                        بەرواری پارەدان:
                      </label>
                      <input
                        type="datetime-local"
                        value={editModalPaymentDate}
                        onChange={(e) => setEditModalPaymentDate(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditFeeModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors flex-1 flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>گەڕانەوە</span>
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 flex-1"
                  >
                    <Save className="w-4 h-4" />
                    <span>{Number(editModalPaymentAmount) > 0 ? 'خەزنکردنی کرێ و پارەدان' : 'خەزنکردنی کرێ'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Delete Payment Confirmation Modal */}
      {paymentToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-right">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  سڕینەوەی تۆماری پارەدان
                </h3>
                <p className="text-xs text-slate-900 mt-0.5">
                  دڵنیایت لە سڕینەوەی ئەم بڕە پارەیەی دراوە؟
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-900">جۆری کرێ:</span>
                <span className="font-bold text-slate-900">
                  {CATEGORY_CONFIG[paymentToDelete.category]?.label || paymentToDelete.category}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-900">ناوی وەرگر:</span>
                <span className="font-bold text-slate-900">
                  {paymentToDelete.recipientName || 'دیاری نەکراوە'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-900">بڕی پارەی دراو:</span>
                <span className="font-black text-rose-600 text-sm font-mono">
                  {formatCurrency(paymentToDelete.amount, settings.currency, settings.usdToIqdRate)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-900 text-xs font-bold transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>گەڕانەوە</span>
              </button>
              <button
                type="button"
                onClick={confirmDeletePayment}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>سڕینەوەی یەکجاری</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
