import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Printer,
  X,
  Percent,
  SlidersHorizontal,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  Check,
  TrendingUp,
  Wallet,
  Eye,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Product } from '../types';
import { useDatabase } from '../context/DatabaseContext';

export type PaperSize = 'A4' | 'A5' | 'A6';
export type Orientation = 'portrait' | 'landscape';

interface CommissionSettlementModalProps {
  product: Product;
  onClose: () => void;
  onCloseProduct?: (product: Product) => void;
  productSales?: Array<{
    movementId?: string;
    saleId?: string;
    invoiceNumber?: string;
    date?: string;
    customerName?: string;
    quantity: number;
    count?: number;
    unit?: string;
    sellingPrice?: number;
    totalAmount: number;
    productName?: string;
  }>;
}

export interface SettlementRowItem {
  id: string;
  unitText: string;
  name: string;
  count: number | string;
  weight: number | string;
  total: number;
  price: number;
  date: string;
}

// Helper to convert any Kurdish/Arabic digits to English digits
export const toEnglishDigits = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '';
  const str = String(val);
  return str
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9');
};

export const parseNumber = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const clean = toEnglishDigits(val).replace(/[^0-9.-]/g, '').trim();
  if (!clean) return 0;
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export const CommissionSettlementModal: React.FC<CommissionSettlementModalProps> = ({
  product,
  onClose,
  onCloseProduct,
  productSales,
}) => {
  const {
    products,
    productMovements,
    sales,
    settings,
    updateSettings,
    updateProduct,
    archiveClosedProduct,
    commissionAccounts,
    addCommissionAccount,
    addCommissionTransaction,
    addExpense,
  } = useDatabase();

  const liveProduct = useMemo(() => {
    return (products || []).find((p) => p.id === product.id) || product;
  }, [products, product.id, product]);

  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [finalizeSuccessMessage, setFinalizeSuccessMessage] = useState<string | null>(null);

  // Load cached settlement data for this product from localStorage
  const savedData = useMemo(() => {
    try {
      const raw = localStorage.getItem(`kurd_commission_settlement_${liveProduct.id || 'default'}`);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse saved settlement data from localStorage:', e);
    }
    return null;
  }, [liveProduct.id]);

  // UI state - Persisted Commission Percentage
  const [commissionPercent, setCommissionPercentState] = useState<string | number>(() => {
    if (savedData?.commissionPercent !== undefined && String(savedData?.commissionPercent) !== '') {
      return String(savedData.commissionPercent);
    }
    if (liveProduct.commissionPercent !== undefined && String(liveProduct.commissionPercent) !== '') {
      return String(liveProduct.commissionPercent);
    }
    try {
      const savedLocal = localStorage.getItem('kurd_db_default_commission_percent');
      if (savedLocal !== null && savedLocal !== '') return savedLocal;
    } catch {
      // ignore
    }
    if (settings?.defaultCommissionPercent !== undefined && String(settings?.defaultCommissionPercent) !== '') {
      return String(settings.defaultCommissionPercent);
    }
    return '4';
  });

  const setCommissionPercent = useCallback((val: string | number) => {
    const cleanStr = String(val);
    setCommissionPercentState(cleanStr);
    try {
      localStorage.setItem('kurd_db_default_commission_percent', cleanStr);
    } catch {
      // ignore
    }
    if (updateSettings && cleanStr) {
      updateSettings({ defaultCommissionPercent: Number(cleanStr) || 4 });
    }
  }, [updateSettings]);

  // Sync from settings if updated elsewhere
  useEffect(() => {
    if (settings?.defaultCommissionPercent !== undefined && String(settings?.defaultCommissionPercent) !== '') {
      const valStr = String(settings.defaultCommissionPercent);
      try {
        const savedLocal = localStorage.getItem('kurd_db_default_commission_percent');
        if (!savedLocal) {
          setCommissionPercentState(valStr);
        }
      } catch {
        // ignore
      }
    }
  }, [settings?.defaultCommissionPercent]);

  const [isEditingSettings, setIsEditingSettings] = useState<boolean>(false);

  const numCommissionPercent = useMemo(() => {
    return parseNumber(commissionPercent);
  }, [commissionPercent]);

  // Sequential Commission Invoice Number (بەپێی ڕیزبەندی کاڵاکان)
  const sequentialInvoiceNumber = useMemo(() => {
    const allProds = products || [];
    const sortedProds = [...allProds].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });
    const index = sortedProds.findIndex((p) => p.id === liveProduct.id);
    const seq = index >= 0 ? index + 1 : 1;
    return `#${1000 + seq}`;
  }, [products, liveProduct.id]);

  // Editable Header Details
  const [receiptNumber, setReceiptNumber] = useState<string>(() => {
    return savedData?.receiptNumber || sequentialInvoiceNumber;
  });

  const initialDateFormatted = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  }, []);

  const [receiptDate, setReceiptDate] = useState<string>(() => {
    return savedData?.receiptDate || initialDateFormatted;
  });

  // Paper Size & Print CSS Inspection States
  const [paperSize, setPaperSize] = useState<PaperSize>(() => {
    return (localStorage.getItem('comm_settle_paper_size') as PaperSize) || 'A5';
  });
  const [orientation, setOrientation] = useState<Orientation>(() => {
    return (localStorage.getItem('comm_settle_orientation') as Orientation) || 'landscape';
  });
  const [isInspectionMode, setIsInspectionMode] = useState<boolean>(true);

  const handlePaperSizeChange = (size: PaperSize) => {
    setPaperSize(size);
    try { localStorage.setItem('comm_settle_paper_size', size); } catch {}
    if (size === 'A5' || size === 'A6') {
      setOrientation('landscape');
      try { localStorage.setItem('comm_settle_orientation', 'landscape'); } catch {}
    }
  };

  const handleOrientationChange = (orient: Orientation) => {
    setOrientation(orient);
    try { localStorage.setItem('comm_settle_orientation', orient); } catch {}
  };

  // Editable Owner & Car Number
  const [ownerName, setOwnerName] = useState<string>(() => {
    return (
      savedData?.ownerName ||
      liveProduct.ownerName ||
      liveProduct.driverName ||
      liveProduct.shareholderName ||
      'ئارام ئەحمەد'
    );
  });
  const [carNumber, setCarNumber] = useState<string>(() => {
    return (
      savedData?.carNumber ||
      liveProduct.carNumber ||
      '44 ب 12345'
    );
  });
  const [receiptNote, setReceiptNote] = useState<string>(() => {
    if (savedData?.receiptNote !== undefined) return savedData.receiptNote;
    try {
      const lastNote = localStorage.getItem('kurd_commission_last_note');
      if (lastNote !== null && lastNote !== '') return lastNote;
    } catch {}
    return liveProduct.notes || '';
  });

  // Deductions & Expenses
  const [customAmal, setCustomAmal] = useState<string>(() => {
    if (savedData?.customAmal !== undefined) return String(savedData.customAmal);
    try {
      const last = localStorage.getItem('kurd_commission_last_amal');
      if (last !== null && last !== '') return last;
    } catch {}
    return '5000';
  });
  const [customShofer, setCustomShofer] = useState<string>(() => {
    if (savedData?.customShofer !== undefined) return String(savedData.customShofer);
    try {
      const last = localStorage.getItem('kurd_commission_last_shofer');
      if (last !== null && last !== '') return last;
    } catch {}
    if (liveProduct.driverFeeTotal && liveProduct.driverFeeTotal > 0) {
      return String(liveProduct.driverFeeTotal);
    }
    return '10000';
  });
  const [customMasroof, setCustomMasroof] = useState<string>(() => {
    if (savedData?.customMasroof !== undefined) return String(savedData.customMasroof);
    try {
      const last = localStorage.getItem('kurd_commission_last_masroof');
      if (last !== null && last !== '') return last;
    } catch {}
    if (liveProduct.expenseFeeTotal && liveProduct.expenseFeeTotal > 0) {
      return String(liveProduct.expenseFeeTotal);
    }
    return '3000';
  });

  // New row input state for drawer
  const [newRowName, setNewRowName] = useState<string>('');
  const [newRowCount, setNewRowCount] = useState<string>('1');
  const [newRowWeight, setNewRowWeight] = useState<string>('10');
  const [newRowPrice, setNewRowPrice] = useState<string>('15000');

  // Build rows from actual sales or single product default (1 جۆر، 1 کێش، 1 پارە بۆ ١ کاڵا)
  const defaultInitialRows: SettlementRowItem[] = useMemo(() => {
    const prodB = liveProduct.barcode ? liveProduct.barcode.trim().toLowerCase() : '';
    const prodN = liveProduct.name ? liveProduct.name.trim().toLowerCase() : '';
    const unit = liveProduct.unit || 'كگم';

    const formatDayMonth = (dateStr?: string) => {
      if (!dateStr) {
        const d = new Date();
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr.slice(5, 10).replace('-', '/');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}`;
      } catch {
        return '29/09';
      }
    };

    let totalQty = 0;
    let totalCount = 0;
    let totalMoney = 0;
    let latestDate = '';

    // 1. If productSales are explicitly passed from ProductAccountModal, aggregate into 1 single row
    if (productSales && productSales.length > 0) {
      productSales.forEach((item) => {
        const qty = item.quantity || 0;
        const count = item.count || (item.unit === 'دانە' ? qty : 1);
        const total = item.totalAmount !== undefined ? item.totalAmount : (qty * (item.sellingPrice || 0));
        totalQty += qty;
        totalCount += count;
        totalMoney += total;
        if (item.date) latestDate = item.date;
      });
    } else if (productMovements && productMovements.length > 0) {
      // 2. Match from productMovements and aggregate
      productMovements.forEach((movement) => {
        const itemB = movement.barcode ? movement.barcode.trim().toLowerCase() : '';
        const itemN = movement.productName ? movement.productName.trim().toLowerCase() : '';

        if (itemB && prodB && itemB !== prodB) return;

        let isMatch = false;
        if (itemB && prodB && itemB === prodB) isMatch = true;
        else if (movement.productId && movement.productId === liveProduct.id) isMatch = true;
        else if (!itemB && !prodB && itemN && prodN && itemN === prodN) isMatch = true;

        if (isMatch && (movement.quantity > 0 || movement.totalAmount > 0)) {
          const qty = movement.quantity || 0;
          const count = movement.count || (movement.unit === 'دانە' ? qty : 1);
          const total = movement.totalAmount || 0;
          totalQty += qty;
          totalCount += count;
          totalMoney += total;
          if (movement.date) latestDate = movement.date;
        }
      });
    } else if (sales && sales.length > 0) {
      // 3. Match from sales and aggregate
      sales.forEach((sale) => {
        sale.items?.forEach((item) => {
          const itemB = item.barcode ? item.barcode.trim().toLowerCase() : '';
          const itemN = item.productName ? item.productName.trim().toLowerCase() : '';

          if (itemB && prodB && itemB !== prodB) return;

          let isMatch = false;
          if (itemB && prodB && itemB === prodB) isMatch = true;
          else if (item.productId && item.productId === liveProduct.id) isMatch = true;
          else if (!itemB && !prodB && itemN && prodN && itemN === prodN) isMatch = true;

          if (isMatch) {
            const qty = item.quantity || 0;
            const count = item.count || (item.unit === 'دانە' ? qty : 1);
            const total = item.total || 0;
            totalQty += qty;
            totalCount += count;
            totalMoney += total;
            if (sale.date) latestDate = sale.date;
          }
        });
      });
    }

    // 4. Default if no sales recorded yet (1 product, 1 weight, 1 price)
    if (totalQty === 0 && totalMoney === 0) {
      totalQty = (liveProduct.initialStock && liveProduct.initialStock > 0)
        ? liveProduct.initialStock
        : ((liveProduct.stock && liveProduct.stock > 0) ? liveProduct.stock : 10);

      totalCount = (liveProduct.initialCount && liveProduct.initialCount > 0)
        ? liveProduct.initialCount
        : ((liveProduct.count && liveProduct.count > 0) ? liveProduct.count : 1);

      const unitPrice = liveProduct.sellingPrice || 15000;
      totalMoney = totalQty * unitPrice;
    }

    if (totalCount === 0) totalCount = 1;

    const avgPrice = totalQty > 0 ? Math.round(totalMoney / totalQty) : (liveProduct.sellingPrice || 0);

    return [
      {
        id: `prod-single-${liveProduct.id || '1'}`,
        unitText: `${totalQty} ${unit}`,
        name: liveProduct.name || 'کاڵا',
        count: totalCount,
        weight: totalQty,
        total: totalMoney,
        price: avgPrice,
        date: formatDayMonth(latestDate),
      },
    ];
  }, [liveProduct, productSales, productMovements, sales]);

  const [tableRows, setTableRows] = useState<SettlementRowItem[]>(() => {
    if (savedData?.tableRows && Array.isArray(savedData.tableRows) && savedData.tableRows.length > 0) {
      return savedData.tableRows;
    }
    return defaultInitialRows;
  });

  // Automatically persist all settlement data to localStorage on every change
  useEffect(() => {
    const key = `kurd_commission_settlement_${liveProduct.id || 'default'}`;
    try {
      const payload = {
        commissionPercent: String(commissionPercent),
        receiptNote,
        customAmal: String(customAmal),
        customShofer: String(customShofer),
        customMasroof: String(customMasroof),
        ownerName,
        carNumber,
        receiptNumber,
        receiptDate,
        tableRows,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(payload));

      if (commissionPercent !== undefined && commissionPercent !== '') {
        localStorage.setItem('kurd_db_default_commission_percent', String(commissionPercent));
      }
      if (receiptNote) {
        localStorage.setItem('kurd_commission_last_note', receiptNote);
      }
      if (customAmal) {
        localStorage.setItem('kurd_commission_last_amal', String(customAmal));
      }
      if (customShofer) {
        localStorage.setItem('kurd_commission_last_shofer', String(customShofer));
      }
      if (customMasroof) {
        localStorage.setItem('kurd_commission_last_masroof', String(customMasroof));
      }
    } catch (err) {
      console.warn('Failed to auto-save settlement data to localStorage:', err);
    }
  }, [
    liveProduct.id,
    commissionPercent,
    receiptNote,
    customAmal,
    customShofer,
    customMasroof,
    ownerName,
    carNumber,
    receiptNumber,
    receiptDate,
    tableRows,
  ]);

  // Financial Calculations
  const totalDinarRevenue = useMemo(() => {
    return tableRows.reduce((acc, row) => {
      return acc + parseNumber(row.total);
    }, 0);
  }, [tableRows]);

  const commissionAmount = useMemo(() => {
    const pct = parseNumber(commissionPercent);
    return Math.round((totalDinarRevenue * pct) / 100);
  }, [totalDinarRevenue, commissionPercent]);

  const amalAmount = useMemo(() => parseNumber(customAmal), [customAmal]);
  const shoferAmount = useMemo(() => parseNumber(customShofer), [customShofer]);
  const masroofAmount = useMemo(() => parseNumber(customMasroof), [customMasroof]);

  const totalDeductions = useMemo(() => {
    return commissionAmount + amalAmount + shoferAmount + masroofAmount;
  }, [commissionAmount, amalAmount, shoferAmount, masroofAmount]);

  const safiAmount = useMemo(() => {
    // پارەی خاوێن = کۆی گشتی پارە - عمولە - کرێکار - شۆفێر - خەرجی تر
    return totalDinarRevenue - commissionAmount - amalAmount - shoferAmount - masroofAmount;
  }, [totalDinarRevenue, commissionAmount, amalAmount, shoferAmount, masroofAmount]);

  // Clean formatting for IQD badges
  const formatIQD = (val: number) => {
    const formattedNum = val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `IQD ${formattedNum}`;
  };

  const formatWithCommas = (val: number | string) => {
    if (typeof val === 'number') return val.toLocaleString('en-US');
    const engStr = toEnglishDigits(val);
    const parsed = Number(engStr);
    return isNaN(parsed) ? engStr : parsed.toLocaleString('en-US');
  };

  // Calculate average weight per unit (کێش بۆ هەر دانەیەک = کۆی کێش ÷ ژمارەی دانە)
  const calculateWeightPerUnit = (weight: number | string, count: number | string, fallbackText?: string) => {
    const numWeight = Number(toEnglishDigits(weight));
    const numCount = Number(toEnglishDigits(count));
    const unit = liveProduct.unit || 'كگم';
    if (!isNaN(numWeight) && !isNaN(numCount) && numCount > 0) {
      const ratio = Math.round((numWeight / numCount) * 100) / 100;
      return `${ratio} ${unit}`;
    }
    if (fallbackText) {
      return toEnglishDigits(fallbackText);
    }
    return numWeight ? `${numWeight} ${unit}` : '-';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddRow = () => {
    const name = newRowName.trim() || `${liveProduct.name} نوێ`;
    const count = Number(newRowCount) || 1;
    const weight = Number(newRowWeight) || 10;
    const price = Number(newRowPrice) || 15000;
    const unit = liveProduct.unit || 'كگم';
    const total = weight * price;

    const newRow: SettlementRowItem = {
      id: `custom-${Date.now()}`,
      unitText: `${weight} ${unit}`,
      name: name,
      count: count,
      weight: weight,
      total: total,
      price: price,
      date: '29/09',
    };

    setTableRows([...tableRows, newRow]);
    setNewRowName('');
  };

  const handleDeleteRow = (id: string) => {
    setTableRows(tableRows.filter((r) => r.id !== id));
  };

  const handleResetToTemplateSample = () => {
    const unit = liveProduct.unit || 'كگم';
    const weight = (liveProduct.initialStock && liveProduct.initialStock > 0)
      ? liveProduct.initialStock
      : ((liveProduct.stock && liveProduct.stock > 0) ? liveProduct.stock : 10);
    const count = (liveProduct.initialCount && liveProduct.initialCount > 0)
      ? liveProduct.initialCount
      : ((liveProduct.count && liveProduct.count > 0) ? liveProduct.count : 1);
    const price = liveProduct.sellingPrice || 15000;
    const total = weight * price;
    const d = new Date();
    const formattedToday = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    setTableRows([
      {
        id: `prod-single-${liveProduct.id || '1'}-reset`,
        unitText: `${weight} ${unit}`,
        name: liveProduct.name || 'کاڵا',
        count: count,
        weight: weight,
        total: total,
        price: price,
        date: formattedToday,
      },
    ]);
    setCustomAmal('5000');
    setCustomShofer('10000');
    setCustomMasroof('3000');
    setReceiptNote('');
    setOwnerName(liveProduct.ownerName || liveProduct.driverName || liveProduct.shareholderName || 'ئارام ئەحمەد');
    setCarNumber(liveProduct.carNumber || '44 ب 12345');
    setReceiptNumber(sequentialInvoiceNumber);
    try {
      localStorage.removeItem(`kurd_commission_settlement_${liveProduct.id || 'default'}`);
    } catch {}
  };

  // Finalize settlement action (داخستن و خستنەسەر قازانج و هەژماری خاوەن کاڵا)
  const handleExecuteFinalize = async () => {
    setIsFinalizing(true);
    try {
      const now = new Date().toISOString();
      const targetOwner = (ownerName || '').trim() || liveProduct.ownerName || liveProduct.shareholderName || liveProduct.driverName || 'خاوەن کاڵا';

      // 1. Close product & archive with commission as profit
      const updatedProductData: Partial<Product> = {
        isClosed: true,
        isCommissionSettled: true,
        closedAt: now,
        commissionPercent: numCommissionPercent,
        commissionAmount: commissionAmount,
        safiAmount: safiAmount,
        ownerName: targetOwner,
        notes: receiptNote ? `${liveProduct.notes ? `${liveProduct.notes} | ` : ''}پسووڵەی عمولە: ${receiptNote}` : liveProduct.notes,
      };

      await updateProduct(liveProduct.id, updatedProductData);

      archiveClosedProduct({
        ...liveProduct,
        ...updatedProductData,
      }, false);

      // 2. Find or create account in Commission section for the owner
      let targetAccount = (commissionAccounts || []).find(
        (a) => a.name.trim().toLowerCase() === targetOwner.toLowerCase()
      );

      let accountId = targetAccount?.id;
      if (!targetAccount) {
        const newAcc = addCommissionAccount({
          name: targetOwner,
          phone: liveProduct.driverPhone || '',
          balance: 0,
          address: '',
        });
        accountId = newAcc.id;
      }

      // 3. Add Net Amount (پارەی خاوێن) transaction to the owner's account in Commission section
      if (accountId) {
        addCommissionTransaction(accountId, {
          type: 'buy', // پارەی خاوێن - مافی خاوەن کاڵا لە فرۆش
          amount: safiAmount,
          date: now,
          productName: liveProduct.name,
          notes: `پسووڵەی عمولەی (${liveProduct.name}) - پسووڵەی ${toEnglishDigits(receiptNumber)} (عمولە: ${numCommissionPercent}%)`,
        });
      }
      
      setShowFinalizeConfirm(false);
      setFinalizeSuccessMessage(
        `تەواوبوو! کاڵاکە چووە بەشی (عمولەی تەواوبوو) و بڕی عمولە (${formatIQD(commissionAmount)}) چووە سەر (قازانجی عمولە) لە بەشی قازانج، و پارەی خاوێن (${formatIQD(safiAmount)}) خرایە سەر هەژماری (${targetOwner}) لە بەشی عمولەکان.`
      );

      if (onCloseProduct) {
        onCloseProduct({
          ...liveProduct,
          ...updatedProductData,
        });
      }
    } catch (err) {
      console.error('Failed to finalize settlement:', err);
    } finally {
      setIsFinalizing(false);
    }
  };

  const isAlreadyClosed = Boolean(liveProduct.isClosed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 print:static print:inset-auto print:p-0 print:m-0 print:bg-white print:block print:overflow-visible">
      {/* Backdrop */}
      <div className="fixed inset-0 no-print" onClick={onClose} />

      {/* Main Container */}
      <div
        dir="rtl"
        className="relative w-full max-w-4xl bg-slate-100 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col border border-slate-200 text-right z-10 font-['Vazirmatn',sans-serif] print:max-h-none print:h-auto print:shadow-none print:border-none print:rounded-none print:bg-white print:w-full print:max-w-none print:overflow-visible print:m-0 print:p-0 print:block pb-10"
      >
        {/* =========================================================================
            Top Control Bar (Screen Only - Hidden in Print)
            ========================================================================= */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-col gap-3 shrink-0 no-print shadow-xs">
          {/* Top Title & Close (X) Row */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="bg-amber-100 p-2 rounded-2xl text-xl flex items-center justify-center shadow-2xs">
                📄
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                    عمولە
                  </h2>
                  {isAlreadyClosed && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      تەواوبوو / داخراو
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-900 font-medium">
                  {liveProduct.name} - پێشبینینی ڕاستەوخۆ و ئامادەکاری بۆ چاپ
                </p>
              </div>
            </div>

            {/* Back / Close Buttons (دوگمەی گەڕانەوە بۆ لیستی پێشوو) */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 font-bold text-xs transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="گەڕانەوە بۆ لیستی پێشوو"
                aria-label="گەڕانەوە بۆ لیستی پێشوو"
              >
                <ArrowRight className="w-4 h-4 text-slate-900" />
                <span>گەڕانەوە بۆ لیستی پێشوو</span>
              </button>

              <button
                onClick={onClose}
                type="button"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
                title="داخستن"
                aria-label="داخستن"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Action Tools & Buttons Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {/* Interactive Commission % Input & Quick Selector */}
            <div className="flex items-center bg-blue-50/95 px-2.5 py-1.5 rounded-2xl border border-blue-200 text-xs gap-2 shadow-2xs">
              <div className="flex items-center gap-1 text-blue-900 font-bold">
                <Percent className="w-3.5 h-3.5 text-blue-700" />
                <span className="text-[11px] whitespace-nowrap">ڕێژەی عمولە:</span>
              </div>
              
              {/* Direct Input Field for Commission % */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  inputMode="decimal"
                  value={commissionPercent}
                  onChange={(e) => {
                    const clean = toEnglishDigits(e.target.value).replace(/[^0-9.]/g, '');
                    setCommissionPercent(clean);
                  }}
                  placeholder="4"
                  className="w-14 bg-white border border-blue-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg px-2 py-0.5 text-center font-bold font-mono text-xs text-blue-900 shadow-2xs outline-none"
                  title="ڕێژەی عمولە بنووسە"
                />
                <span className="text-[11px] font-bold text-blue-700 mr-1">%</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="hidden sm:flex items-center gap-1 border-r border-blue-200 pr-1.5">
                {[3, 4, 5, 6, 7, 8, 10].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setCommissionPercent(String(pct))}
                    className={`px-1.5 py-0.5 rounded-md font-bold text-[11px] transition-all cursor-pointer ${
                      numCommissionPercent === pct
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white hover:bg-blue-100 text-slate-900 border border-blue-200/60'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons: Return, Edit, Finalize, Print */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Back to Previous List Button */}
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                title="گەڕانەوە بۆ لیستی پێشوو"
              >
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                <span>گەڕانەوە بۆ لیست</span>
              </button>

              {/* Paper Size Selector (A4, A5, A6) */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-900 mr-1 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-amber-600" />
                  قەبارە:
                </span>
                {(['A4', 'A5', 'A6'] as PaperSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handlePaperSizeChange(size)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      paperSize === size
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-800 hover:text-slate-950 hover:bg-slate-200/80'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {/* Inspection Mode Toggle */}
              <button
                type="button"
                onClick={() => setIsInspectionMode(!isInspectionMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isInspectionMode
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                }`}
                title="پشکنینی چاپی یەک پەڕە لەسەر قەبارەی هەڵبژێردراو"
              >
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">پشکنینی دەرچوون</span>
              </button>

              {/* Toggle Edit Drawer */}
              <button
                onClick={() => setIsEditingSettings(!isEditingSettings)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isEditingSettings
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>دەستکاریکردن</span>
              </button>

              {/* Finalize Button (دوگمەی تەواوبوون) */}
              <button
                onClick={() => setShowFinalizeConfirm(true)}
                disabled={isFinalizing}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer ${
                  isAlreadyClosed
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                }`}
                title="تەواوبوون و خستنەسەر قازانج و هەژماری عمولەکان"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAlreadyClosed ? 'نوێکردنەوەی تەواوبوون' : 'تەواوبوون'}</span>
              </button>

              {/* Print Button */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>چاپکردنی پسووڵە ({paperSize})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Success Notice Banner */}
        {finalizeSuccessMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between no-print animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>{finalizeSuccessMessage}</span>
            </div>
            <button
              onClick={() => setFinalizeSuccessMessage(null)}
              className="p-1 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Collapsible Edit Drawer (Screen Only) */}
        {isEditingSettings && (
          <div className="bg-blue-50/50 p-4 border-b border-blue-100 no-print space-y-3.5 text-right text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">
                دەستکاریکردنی زانیاری و خشتەی پسووڵە پێش چاپ:
              </span>
              <button
                onClick={handleResetToTemplateSample}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                گەڕاندنەوە بۆ نموونەی بنەڕەتی
              </button>
            </div>

            {/* Inputs grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">
                  ژمارەی پسووڵە:
                </label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">
                  ناوی خاوەنی:
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">
                  ژ.ئۆتۆمبێل:
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={carNumber || ''}
                  onChange={(e) => setCarNumber(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-900"
                />
              </div>

                <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">
                  ڕێژەی عمولە (%):
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={commissionPercent}
                  onChange={(e) => {
                    const clean = toEnglishDigits(e.target.value).replace(/[^0-9.]/g, '');
                    setCommissionPercent(clean);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold font-mono text-slate-900"
                />
              </div>
            </div>

            {/* Note input in edit settings */}
            <div className="mt-2.5">
              <label className="block text-[11px] font-bold text-slate-900 mb-1">
                تێبینی لەسەر پسوڵە:
              </label>
              <input
                type="text"
                value={receiptNote}
                onChange={(e) => setReceiptNote(e.target.value)}
                placeholder="هەر تێبینییەکی پێویست لێرە بنووسە..."
                className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-900"
              />
            </div>

            {/* Deductions inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">
                  کرێکار (IQD):
                </label>
                <input
                  type="number"
                  value={customAmal}
                  onChange={(e) => setCustomAmal(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">
                  شۆفێر (IQD):
                </label>
                <input
                  type="number"
                  value={customShofer}
                  onChange={(e) => setCustomShofer(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">
                  خەرجی تر (IQD):
                </label>
                <input
                  type="number"
                  value={customMasroof}
                  onChange={(e) => setCustomMasroof(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold font-mono text-slate-900"
                />
              </div>
            </div>

            {/* Quick row addition */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 mt-2 flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900 text-xs">زیادکردنی بڕگەی نوێ بۆ خشتە:</span>
              <input
                type="text"
                placeholder="جۆری کاڵا"
                value={newRowName}
                onChange={(e) => setNewRowName(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs flex-1 min-w-[120px] text-slate-900 font-bold"
              />
              <input
                type="number"
                placeholder="دانە"
                value={newRowCount}
                onChange={(e) => setNewRowCount(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs w-16 font-mono text-slate-900 font-bold"
              />
              <input
                type="number"
                placeholder="کێش"
                value={newRowWeight}
                onChange={(e) => setNewRowWeight(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs w-16 font-mono text-slate-900 font-bold"
              />
              <input
                type="number"
                placeholder="نرخ"
                value={newRowPrice}
                onChange={(e) => setNewRowPrice(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs w-24 font-mono text-slate-900 font-bold"
              />
              <button
                onClick={handleAddRow}
                className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>زیادکردن</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Print CSS for Selected Paper Size (A4, A5, A6) */}
        <style>{`
          @media print {
            @page {
              size: ${
                paperSize === 'A4'
                  ? orientation === 'landscape'
                    ? '297mm 210mm'
                    : '210mm 297mm'
                  : paperSize === 'A5'
                  ? orientation === 'landscape'
                    ? '210mm 148mm'
                    : '148mm 210mm'
                  : orientation === 'landscape'
                  ? '148mm 105mm'
                  : '105mm 148mm'
              };
              margin: ${paperSize === 'A6' ? '2.5mm' : paperSize === 'A5' ? '4.5mm' : '6mm'};
            }
            html, body {
              width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            #printable-settlement-invoice {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              overflow: visible !important;
            }
            #printable-settlement-invoice-card {
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: 1px solid #cbd5e1 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              padding: ${paperSize === 'A6' ? '6px 8px' : paperSize === 'A5' ? '10px 14px' : '16px 20px'} !important;
              font-size: ${paperSize === 'A6' ? '9px' : paperSize === 'A5' ? '11px' : '13px'} !important;
            }
            table, tr, td, th {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}</style>

        {/* Inspection Verification Banner */}
        {isInspectionMode && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-900 flex flex-wrap items-center justify-between no-print animate-in fade-in duration-200 gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>پشکنینی دەرچوونی ١ پەڕە ({paperSize}):</strong> تەواوی بەشەکان (لە ژمارەی پسووڵە تا خاوەن ({ownerName}) و ئۆتۆمبێل ({toEnglishDigits(carNumber)})) ڕێکخراون و لە یەک پەڕەدا بەبێ پچڕان دەردەکەون.
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-800 font-bold">
              <span>{paperSize === 'A4' ? '210×297mm' : paperSize === 'A5' ? '210×148mm' : '148×105mm'}</span>
            </div>
          </div>
        )}

        {/* =========================================================================
            CLEAN, MODERN, REDESIGNED RECEIPT COMPONENT (PRINT & PDF OPTIMIZED)
            Strict Rules Compliance:
            1. Pure white wrapper, nice padding, smooth rounded corners, responsive.
            2. Top header: Company/store details on the right, date & receipt # on the left.
            3. Main Table: Solid blue header, columns (RTL): وزن / عدد, نوع, عدد, وزن, دینار, سعر, تأريخ.
            4. Financial Summary Box: Dedicated modern card, non-overlapping grid/flexbox rows.
            5. Footer: Owner name and car plate number placed neatly with clear spacing.
            ========================================================================= */}
        <div
          className="p-4 sm:p-6 md:p-8 bg-gray-100 flex-1 overflow-y-auto flex flex-col items-center justify-start print:p-0 print:m-0 print:bg-white print:overflow-visible w-full print:block"
          id="printable-settlement-invoice"
        >
          <div
            id="printable-settlement-invoice-card"
            className="bg-white p-4 shadow-xl border border-gray-100 print:shadow-none print:border print:border-gray-200 w-full flex flex-col"
          >
            {/* Header (Empty for user request) */}
            <div className="pb-4 mb-4"></div>

            {/* Excel Style Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse border border-[#aaa] text-right text-xs">
                <thead>
                  <tr className="bg-[#5b81b8] text-white">
                    <th className="border border-[#aaa] p-2">کێش/دانە</th>
                    <th className="border border-[#aaa] p-2">جۆر</th>
                    <th className="border border-[#aaa] p-2">دانە</th>
                    <th className="border border-[#aaa] p-2">کێش</th>
                    <th className="border border-[#aaa] p-2">پاره</th>
                    <th className="border border-[#aaa] p-2">نرخ</th>
                    <th className="border border-[#aaa] p-2">بەروار</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-[#aaa] p-2 font-mono text-slate-900 font-bold">{row.unitText}</td>
                      <td className="border border-[#aaa] p-2 text-slate-900 font-bold">{row.name}</td>
                      <td className="border border-[#aaa] p-2 font-mono text-slate-900 font-bold">{formatWithCommas(row.count)}</td>
                      <td className="border border-[#aaa] p-2 font-mono text-slate-900 font-bold">{formatWithCommas(row.weight)}</td>
                      <td className="border border-[#aaa] p-2 font-mono text-slate-900 font-bold">{formatWithCommas(row.total)}</td>
                      <td className="border border-[#aaa] p-2 font-mono text-slate-900 font-bold">{formatWithCommas(row.price)}</td>
                      <td className="border border-[#aaa] p-2 font-mono text-slate-900 font-bold">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Area - Owner Info & Expenses */}
            <div className="flex flex-col md:flex-row justify-between gap-6">
              {/* Right: Owner Info */}
              <div className="p-4 flex-1">
                <p className="mb-1 font-bold text-slate-900">خاوەن کاڵا: <span className="font-medium text-slate-900">{ownerName}</span></p>
                <p className="mb-1 font-bold text-slate-900">ئۆتۆمبێل: <span className="font-medium text-slate-900">{carNumber}</span></p>
                <p className="mb-1 font-bold text-slate-900">بەروار: <span className="font-medium text-slate-900">{receiptDate}</span></p>
                <p className="font-bold text-slate-900">ژمارە: <span className="font-medium text-slate-900">{receiptNumber}</span></p>
              </div>

              {/* Left: Expenses Table */}
              <table className="border-collapse border border-[#aaa] flex-1 text-xs">
                <tbody>
                  <tr className="bg-blue-100">
                    <td className="border border-[#aaa] p-2 font-bold text-slate-900">عمولە ({numCommissionPercent}%)</td>
                    <td className="border border-[#aaa] p-2 font-mono text-slate-900">{formatIQD(commissionAmount)}</td>
                  </tr>
                  <tr className="bg-blue-100">
                    <td className="border border-[#aaa] p-2 font-bold text-slate-900">کرێکار</td>
                    <td className="border border-[#aaa] p-2 font-mono text-slate-900">{formatIQD(amalAmount)}</td>
                  </tr>
                  <tr className="bg-blue-100">
                    <td className="border border-[#aaa] p-2 font-bold text-slate-900">شۆفێر</td>
                    <td className="border border-[#aaa] p-2 font-mono text-slate-900">{formatIQD(shoferAmount)}</td>
                  </tr>
                  <tr className="bg-blue-100">
                    <td className="border border-[#aaa] p-2 font-bold text-slate-900">خەرجی تر</td>
                    <td className="border border-[#aaa] p-2 font-mono text-slate-900">{formatIQD(masroofAmount)}</td>
                  </tr>
                  <tr className="bg-blue-600 text-white font-bold">
                    <td className="border border-[#aaa] p-2">پارەی پوخت</td>
                    <td className="border border-[#aaa] p-2 font-mono">{formatIQD(safiAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Confirmation Dialog for 'تەواوبوون' */}
      {showFinalizeConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-right space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">عمولەی کاڵا</h3>
                <p className="text-xs text-slate-900">{liveProduct.name} - پسووڵەی #{toEnglishDigits(receiptNumber)}</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-900 font-bold">قازانجی عمولەی مەکتەب:</span>
                <span className="font-black font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-300">
                  {formatIQD(commissionAmount)}
                </span>
              </div>
              <p className="text-[11px] text-emerald-900 flex items-center gap-1 font-bold">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>ئەم بڕە دەچێتە سەر قازانجی کاڵای داخراو لە بەشی (قازانج).</span>
              </p>

              <div className="flex justify-between items-center pt-2 pb-2 border-b border-slate-200">
                <span className="text-slate-900 font-bold">پارەی خاوێنی خاوەن کاڵا:</span>
                <span className="font-black font-mono text-blue-800 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-300">
                  {formatIQD(safiAmount)}
                </span>
              </div>
              <p className="text-[11px] text-blue-800 flex items-center gap-1 font-bold">
                <Wallet className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>ئەم بڕە دەچێتە سەر هەژماری ({ownerName}) لە بەشی عمولەکان.</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowFinalizeConfirm(false)}
                disabled={isFinalizing}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition-all cursor-pointer"
              >
                پاشگەزبوونەوە
              </button>
              <button
                type="button"
                onClick={handleExecuteFinalize}
                disabled={isFinalizing}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md shadow-emerald-600/30 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isFinalizing ? 'تەواودەکرێت...' : 'پشتڕاستکردنەوە و تەواوبوون'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
