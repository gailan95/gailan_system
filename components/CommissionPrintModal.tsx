import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  FileCheck,
  Eye,
  Sliders,
  Maximize2,
  Calendar,
  User,
  Car,
  CheckCircle2,
  Package,
  Layers,
  FileText
} from 'lucide-react';
import { CommissionAccount, CommissionTransaction, Product } from '../types';
import { useDatabase } from '../context/DatabaseContext';

interface CommissionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: CommissionAccount;
  transaction?: CommissionTransaction | null;
}

export type PaperSize = 'A4' | 'A5' | 'A6';
export type Orientation = 'portrait' | 'landscape';

// Helper to convert English/Arabic numbers to clean standard digits
const toDigits = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '';
  return String(val)
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
};

// Currency formatter
const formatIQD = (amount: number | string | undefined | null): string => {
  const num = Math.round(Number(amount) || 0);
  const abs = Math.abs(num).toLocaleString('en-US');
  return `${toDigits(abs)} دینار`;
};

export const CommissionPrintModal: React.FC<CommissionPrintModalProps> = ({
  isOpen,
  onClose,
  account,
  transaction,
}) => {
  const { products, settings } = useDatabase();

  // Print Settings State with LocalStorage memory
  const [paperSize, setPaperSize] = useState<PaperSize>(() => {
    return (localStorage.getItem('comm_print_paper_size') as PaperSize) || 'A5';
  });
  const [orientation, setOrientation] = useState<Orientation>(() => {
    return (localStorage.getItem('comm_print_orientation') as Orientation) || 'landscape';
  });
  const [isInspectionMode, setIsInspectionMode] = useState<boolean>(true);
  const [scalePercent, setScalePercent] = useState<number>(100);

  // Sync settings to localStorage
  const handlePaperSizeChange = (size: PaperSize) => {
    setPaperSize(size);
    localStorage.setItem('comm_print_paper_size', size);
    // Automatic best orientation: A5 & A6 look best in landscape, A4 in portrait or landscape
    if (size === 'A4' && orientation === 'landscape') {
      // Keep or let user choose
    } else if ((size === 'A5' || size === 'A6') && orientation === 'portrait') {
      setOrientation('landscape');
      localStorage.setItem('comm_print_orientation', 'landscape');
    }
  };

  const handleOrientationChange = (orient: Orientation) => {
    setOrientation(orient);
    localStorage.setItem('comm_print_orientation', orient);
  };

  // Find matching product if this transaction is linked to a product
  const matchingProduct = useMemo(() => {
    if (!transaction?.productName) return null;
    const cleanName = transaction.productName.trim().toLowerCase();
    return (products || []).find(
      (p) => (p.name || '').trim().toLowerCase() === cleanName
    );
  }, [transaction?.productName, products]);

  // Extract owner and car details
  const ownerName = account.name || matchingProduct?.ownerName || 'خاوەن کاڵا';
  const carNumber = matchingProduct?.carNumber || 'دیاری نەکراوە';

  // Extract receipt number from notes or transaction ID
  const receiptNumber = useMemo(() => {
    if (transaction?.notes) {
      const match = transaction.notes.match(/پسووڵەی\s*#?([0-9٠-٩۰-۹]+)/);
      if (match && match[1]) {
        return toDigits(match[1]);
      }
    }
    if (transaction?.id) {
      const cleaned = transaction.id.replace(/[^0-9]/g, '');
      if (cleaned.length >= 4) {
        return cleaned.slice(-4);
      }
    }
    return '1001';
  }, [transaction]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  // Paper Dimensions for inspection frame
  const paperDimensionsText = {
    A4: orientation === 'landscape' ? '297 × 210 mm' : '210 × 297 mm',
    A5: orientation === 'landscape' ? '210 × 148 mm' : '148 × 210 mm',
    A6: orientation === 'landscape' ? '148 × 105 mm' : '105 × 148 mm',
  }[paperSize];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs font-['Vazirmatn',sans-serif] animate-in fade-in duration-200 print:static print:inset-auto print:p-0 print:m-0 print:bg-white print:block">
      {/* Dynamic Print CSS Style Injection for strict single-page output */}
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
            margin: ${paperSize === 'A6' ? '2.5mm' : paperSize === 'A5' ? '4.5mm' : '7mm'};
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
          #commission-print-area {
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
          .commission-receipt-card {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            padding: ${paperSize === 'A6' ? '6px 8px' : paperSize === 'A5' ? '10px 14px' : '16px 20px'} !important;
            font-size: ${paperSize === 'A6' ? '9.5px' : paperSize === 'A5' ? '11px' : '13px'} !important;
          }
          table, tr, td, th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Screen Backdrop */}
      <div className="fixed inset-0 no-print" onClick={onClose} />

      {/* Main Dialog Modal */}
      <div
        dir="rtl"
        className="relative w-full max-w-5xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 text-right z-10 flex flex-col max-h-[96vh] overflow-hidden print:max-h-none print:h-auto print:border-none print:shadow-none print:bg-white print:rounded-none"
      >
        {/* =========================================================================
            TOP CONTROL & INSPECTION TOOLBAR (NO-PRINT)
            ========================================================================= */}
        <div className="p-3.5 sm:p-4 bg-slate-900/95 border-b border-slate-800 flex flex-col gap-3 shrink-0 no-print select-none">
          {/* Header Row: Title & Close */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-lg shadow-inner">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-white">
                    پشکنین و چاپکردنی پسوڵەی عمولە
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Print CSS جێگیر
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  پشکنینی دەرچوونی تەواوی بەشەکان لە یەک پەڕەدا ({paperSize} - {paperDimensionsText})
                </p>
              </div>
            </div>

            {/* Print & Close Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>چاپکردن ئێستا</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-2xl bg-slate-800 hover:bg-rose-950/60 text-slate-600 hover:text-rose-400 border border-slate-700 hover:border-rose-700/50 flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="داخستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Interactive Inspection Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
            {/* Paper Size Selector (A4, A5, A6) */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                قەبارەی پەڕە:
              </span>
              <div className="flex items-center p-1 bg-slate-800/80 rounded-xl border border-slate-700/70 gap-1">
                {(['A4', 'A5', 'A6'] as PaperSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handlePaperSizeChange(size)}
                    className={`px-3 py-1 rounded-lg font-black transition-all cursor-pointer ${
                      paperSize === size
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-white hover:bg-slate-700/60'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-bold">ئاڕاستە:</span>
              <div className="flex items-center p-1 bg-slate-800/80 rounded-xl border border-slate-700/70 gap-1">
                <button
                  type="button"
                  onClick={() => handleOrientationChange('landscape')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    orientation === 'landscape'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  ئاسۆیی (Landscape)
                </button>
                <button
                  type="button"
                  onClick={() => handleOrientationChange('portrait')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    orientation === 'portrait'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  ستوونی (Portrait)
                </button>
              </div>
            </div>

            {/* Inspection Frame Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsInspectionMode(!isInspectionMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                  isInspectionMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                    : 'bg-slate-800 text-slate-600 border-slate-700 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>پشکنینی چاپی یەک پەڕە: {isInspectionMode ? 'چالاکە' : 'ناچالاکە'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            LIVE INSPECTION BANNER (Guaranteed 1-Page Verification)
            ========================================================================= */}
        {isInspectionMode && (
          <div className="bg-emerald-950/60 border-b border-emerald-800/60 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between no-print animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>پشکنینی دەرچوونی ١ پەڕە:</strong> ڕێکخراوە بۆ <strong>{paperSize} ({paperDimensionsText})</strong>. تەواوی بەشەکان (لە ژمارەی پسووڵە تا خاوەن و ئۆتۆمبێل) بەبێ پچڕان لە یەک پەڕەدا جێگیر دەبن.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-[11px] bg-emerald-900/50 px-2 py-0.5 rounded-md border border-emerald-700/50 hidden sm:inline-block">
                page-break-inside: avoid
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-900/80 hover:bg-rose-900/80 text-emerald-300 hover:text-white border border-emerald-700/60 hover:border-rose-500/60 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs"
                title="داخستن (X)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PRINTABLE RECEIPT CANVAS & INSPECTOR VIEW
            ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/80 flex flex-col items-center justify-start print:p-0 print:m-0 print:bg-white print:overflow-visible">
          <div
            id="commission-print-area"
            className={`transition-all duration-300 w-full flex justify-center ${
              isInspectionMode
                ? 'p-2 sm:p-4 rounded-2xl bg-slate-900/50 border border-slate-800 shadow-2xl'
                : ''
            }`}
          >
            {/* The Actual Sheet that matches Paper Ratio */}
            <div
              className={`commission-receipt-card bg-white text-slate-800 rounded-2xl shadow-xl w-full border border-slate-200 flex flex-col justify-between print:shadow-none print:border print:border-slate-300 print:rounded-none ${
                paperSize === 'A4'
                  ? orientation === 'landscape'
                    ? 'max-w-[980px] min-h-[580px]'
                    : 'max-w-[780px] min-h-[920px]'
                  : paperSize === 'A5'
                  ? orientation === 'landscape'
                    ? 'max-w-[720px] min-h-[460px]'
                    : 'max-w-[520px] min-h-[660px]'
                  : orientation === 'landscape'
                  ? 'max-w-[560px] min-h-[380px]'
                  : 'max-w-[400px] min-h-[520px]'
              }`}
              style={{
                padding: paperSize === 'A6' ? '12px 14px' : paperSize === 'A5' ? '18px 22px' : '26px 30px',
              }}
            >
              <div>
                {/* 1. RECEIPT TOP HEADER (Empty for user request) */}
                <div className="pb-3 mb-3"></div>


                {/* 2. ACCOUNT & PRODUCT HIGHLIGHT GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 p-0 text-xs">
                  {/* خاوەن کاڵا */}
                  <div>
                    <span className="text-black text-[10px] block font-medium">خاوەنی:</span>
                    <span className="font-black text-black text-xs sm:text-sm truncate block mt-0.5">
                      {ownerName}
                    </span>
                  </div>

                  {/* ژمارەی ئۆتۆمبێل */}
                  <div>
                    <span className="text-black text-[10px] block font-medium">ژ.ئۆتۆمبێل:</span>
                    <span className="font-black text-black font-mono text-xs sm:text-sm block mt-0.5">
                      {toDigits(carNumber)}
                    </span>
                  </div>

                  {/* جۆری کاڵا */}
                  <div>
                    <span className="text-black text-[10px] block font-medium">جۆری کاڵا:</span>
                    <span className="font-black text-black text-xs sm:text-sm block mt-0.5 truncate">
                      {transaction?.productName || matchingProduct?.name || 'عمولەی گشتی'}
                    </span>
                  </div>

                  {/* باڵانسی ئێستا */}
                  <div>
                    <span className="text-black text-[10px] block font-medium">کۆی باڵانس:</span>
                    <span className={`font-black font-mono text-xs sm:text-sm block mt-0.5 ${
                      account.balance >= 0 ? 'text-black' : 'text-rose-900'
                    }`}>
                      {formatIQD(account.balance)}
                    </span>
                  </div>
                </div>

                {/* 3. TRANSACTION / SETTLEMENT DETAILS TABLE */}
                <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-200 text-black font-bold text-[11px] sm:text-xs">
                        <th className="py-2 px-3">بڕگە / وەسف</th>
                        <th className="py-2 px-3 text-center">جۆری مامەڵە</th>
                        <th className="py-2 px-3 text-center">بەروار</th>
                        <th className="py-2 px-3 text-left">بڕی پارە (IQD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-black">
                      {transaction ? (
                        <tr className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-950 block">
                              {transaction.productName || 'مامەڵەی عمولە'}
                            </span>
                            {transaction.notes && (
                              <span className="text-[11px] text-slate-900 block mt-0.5 font-medium">
                                {transaction.notes}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-100 text-blue-800">
                              {transaction.type === 'buy'
                                ? 'پارەی خاوێن (مافی خاوەن)'
                                : transaction.type === 'pay'
                                ? 'پارەدان بە خاوەن کاڵا'
                                : transaction.type === 'sell'
                                ? 'فرۆشتنی کاڵا'
                                : 'وەرگرتن'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                            {new Date(transaction.date).toLocaleDateString('ku-IQ')}
                          </td>
                          <td className="py-2.5 px-3 text-left font-black font-mono text-sm text-slate-950">
                            {formatIQD(transaction.amount)}
                          </td>
                        </tr>
                      ) : (
                        account.transactions.slice(0, 8).map((tx, idx) => (
                          <tr key={tx.id || idx} className="hover:bg-slate-50/80">
                            <td className="py-1.5 px-3">
                              <span className="font-bold text-slate-950">{tx.productName || 'مامەڵە'}</span>
                              {tx.notes && <span className="text-[10px] text-slate-900 mr-2">{tx.notes}</span>}
                            </td>
                            <td className="py-1.5 px-3 text-center text-[10px]">
                              {tx.type === 'buy' ? 'مافی خاوەن' : tx.type === 'pay' ? 'پارەدان' : 'فرۆش'}
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono text-[10px] text-slate-600">
                              {new Date(tx.date).toLocaleDateString('ku-IQ')}
                            </td>
                            <td className="py-1.5 px-3 text-left font-bold font-mono text-xs text-slate-950">
                              {formatIQD(tx.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. FINANCIAL SUMMARY CARDS */}
                <div className="flex justify-end mb-3">
                  <div className="w-full sm:w-72 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                    {transaction && (
                      <div className="flex justify-between items-center text-slate-900">
                        <span>بڕی ئەم مامەڵەیە:</span>
                        <span className="font-bold font-mono text-slate-950">
                          {formatIQD(transaction.amount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-slate-900">
                      <span>کۆی باڵانسی ماوە:</span>
                      <span className={`font-black font-mono text-xs sm:text-sm ${
                        account.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {formatIQD(account.balance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. FOOTER: OWNER NAME, CAR PLATE & SIGNATURE LINES */}
              <div className="border-t-2 border-slate-800 pt-3 mt-2 text-xs text-slate-900">
                <div className="flex flex-row justify-between items-center mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-950">خاوەنی:</span>
                    <span className="font-semibold text-slate-900">{ownerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-950">ژ.ئۆتۆمبێل:</span>
                    <span className="font-semibold text-slate-900 font-mono tracking-wide">{toDigits(carNumber)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-950">ژمارەی پسووڵە:</span>
                    <span className="font-semibold text-slate-900 font-mono">#{toDigits(receiptNumber)}</span>
                  </div>
                </div>

                {/* Signature placeholders */}
                <div className="grid grid-cols-2 gap-4 text-center pt-2 border-t border-dashed border-slate-200 text-[11px] text-slate-900 font-medium">
                  <div>
                    <span>واژووی خاوەن کاڵا: ___________________</span>
                  </div>
                  <div>
                    <span>واژووی ژمێریار / نووسینگە: ___________________</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
