import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  FileText,
  Phone,
  MapPin,
  User,
  Calendar,
  CreditCard,
  Info,
  ArrowLeft,
  ArrowUp,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { ShareholderTransaction } from '../types';
import { useDatabase } from '../context/DatabaseContext';
import { formatCurrency, formatDate, formatDateShort } from '../utils/formatters';
import { calculateAllShareholderLiveShares } from '../utils/shareholderCalculations';
import { normalizeKurdishText } from '../utils/textNormalization';

interface ShareholderInvoiceModalProps {
  transaction: ShareholderTransaction | null;
  onClose: () => void;
}

export const ShareholderInvoiceModal: React.FC<ShareholderInvoiceModalProps> = ({ transaction, onClose }) => {
  const { 
    settings, 
    shareholderTransactions,
    products,
    closedProductArchives,
    productMovements,
    sales
  } = useDatabase();
  const [viewMode, setViewMode] = useState<'combined' | 'single'>('combined');

  // Find all transactions for this shareholder (matching name or phone)
  const shareholderName = transaction?.name.trim() || '';
  const shareholderPhone = transaction?.phone?.trim() || '';
  const normalizedTarget = useMemo(() => normalizeKurdishText(shareholderName), [shareholderName]);

  const relatedTransactions = useMemo(() => {
    if (!normalizedTarget) return [];
    return shareholderTransactions
      .filter((tx) => {
        const matchName = normalizeKurdishText(tx.name) === normalizedTarget;
        const matchPhone =
          shareholderPhone && tx.phone?.trim()
            ? tx.phone.trim() === shareholderPhone
            : false;
        return matchName || matchPhone;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [shareholderTransactions, normalizedTarget, shareholderPhone]);

  // Filter out historical auto-generated share deposits to avoid double counting
  const filteredManualTransactions = useMemo(() => {
    return relatedTransactions.filter(tx => {
      const isHistoricalShare = tx.type === 'deposit' && (tx.notes?.includes('پشکی قازانجی کاڵای') || tx.notes?.includes('پشکی قازانجی'));
      return !isHistoricalShare;
    });
  }, [relatedTransactions]);

  const totalDeposits = filteredManualTransactions
    .filter((t) => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = filteredManualTransactions
    .filter((t) => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  const manualBalance = totalDeposits - totalWithdrawals;

  // Calculate live shares
  const liveShares = useMemo(() => {
    if (!normalizedTarget) return 0;
    const sharesMap = calculateAllShareholderLiveShares(products, closedProductArchives, productMovements, sales);
    return sharesMap.get(normalizedTarget)?.totalLiveShare || 0;
  }, [products, closedProductArchives, productMovements, sales, normalizedTarget]);

  const currentTotalBalance = manualBalance + liveShares;

  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      setShowScrollTop(scrollRef.current.scrollTop > 60);
    }
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const mainContainer = document.getElementById('main-scroll-container');
    const prevMainOverflow = mainContainer ? mainContainer.style.overflow : '';
    if (mainContainer) {
      mainContainer.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      if (mainContainer) {
        mainContainer.style.overflow = prevMainOverflow;
      }
    };
  }, []);

  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  // Determine phone to display (from current transaction or any matching transaction)
  const displayPhone =
    transaction.phone ||
    relatedTransactions.find((t) => t.phone)?.phone ||
    '';

  return createPortal(
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-md overflow-y-auto overscroll-contain flex justify-center items-start p-2 sm:p-4 pt-6 sm:pt-10 pb-36 sm:pb-28 no-pull-refresh" 
      dir="rtl"
    >
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full shadow-2xl border border-white/10 overflow-hidden mb-12 sm:mb-8 text-white flex flex-col relative">
        {/* Top Controls (Hidden during print) */}
        <div className="p-3.5 sm:p-4 bg-slate-950/95 backdrop-blur-md border-b border-white/10 flex flex-wrap items-center justify-between gap-3 no-print sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>پسووڵەی حیساباتی هاوبەش</span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            {relatedTransactions.length > 1 && (
              <div className="bg-slate-900/80 p-0.5 rounded-xl border border-white/15 flex text-xs">
                <button
                  onClick={() => setViewMode('combined')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    viewMode === 'combined'
                      ? 'bg-cyan-600 text-white shadow-2xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  کۆکراوەی ۱ پسووڵە ({relatedTransactions.length})
                </button>
                <button
                  onClick={() => setViewMode('single')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    viewMode === 'single'
                      ? 'bg-cyan-600 text-white shadow-2xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  تەنها ئەم مامەڵەیە
                </button>
              </div>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپکردن</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer border border-white/10"
              title="گەڕانەوە بۆ لیستی پێشوو"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>گەڕانەوە</span>
            </button>
          </div>
        </div>

        {/* The Printable Invoice Area */}
        <div className="p-4 sm:p-8 space-y-5 bg-slate-900/70 backdrop-blur-md text-white print:bg-white print:text-black print:p-0 print:m-0" id="printable-shareholder-invoice">
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-white/15 print:border-slate-300">
            <h2 className="text-xl sm:text-2xl font-black text-white print:text-slate-900 mb-1">
              {settings.storeName}
            </h2>
            <div className="text-xs text-slate-300 print:text-slate-600 space-y-1 mt-1">
              {settings.address && (
                <p className="flex items-center justify-center gap-1 text-slate-300 print:text-slate-900">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 print:text-slate-600" />
                  <span>{settings.address}</span>
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-slate-300 print:text-slate-900 pt-0.5">
                {settings.phone && (
                  <div className="flex items-center gap-1.5 font-mono" dir="ltr">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span className="font-bold text-white print:text-slate-900">{settings.phone}</span>
                  </div>
                )}
                {settings.phone2 && (
                  <div className="flex items-center gap-1.5 font-mono" dir="ltr">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span className="font-bold text-white print:text-slate-900">{settings.phone2}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-center py-2.5 bg-slate-950/70 border border-white/10 print:border-indigo-100 print:bg-indigo-50/80 rounded-xl flex items-center justify-between px-4">
            <h3 className="text-sm font-black text-cyan-300 print:text-indigo-950">
              {viewMode === 'combined'
                ? 'کەشف حیساب و پسووڵەی گشتی هاوبەش (کۆکراوە)'
                : 'پسووڵەی مامەڵەی هاوبەش'}
            </h3>
            <span className="text-xs text-slate-300 print:text-indigo-700 font-mono" dir="ltr">
              {formatDate(transaction.date)}
            </span>
          </div>

          {/* Shareholder Meta Info - Stylized as dark glass input fields requested */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-900/60 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/80 text-white shadow-md print:bg-slate-50 print:border-slate-200 print:text-slate-900">
              <span className="text-cyan-200 print:text-slate-600 text-[10px] font-bold block mb-1">ناوی هاوبەش:</span>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400 print:text-indigo-600" />
                <span className="font-black text-white print:text-slate-900 text-base">{transaction.name}</span>
              </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/80 text-white shadow-md print:bg-slate-50 print:border-slate-200 print:text-slate-900">
              <span className="text-cyan-200 print:text-slate-600 text-[10px] font-bold block mb-1">ژمارەی پەیوەندی / مۆبایل:</span>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-cyan-400 print:text-indigo-600" />
                <span className="font-mono font-bold text-white print:text-slate-900 text-sm" dir="ltr">
                  {displayPhone || 'تۆمار نەکراوە'}
                </span>
              </div>
            </div>
          </div>

          {/* Combined View: Table of all movements & totals */}
          {viewMode === 'combined' ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-emerald-950/40 border border-emerald-500/30 print:bg-emerald-50/80 print:border-emerald-200 p-3 rounded-xl text-right">
                  <span className="text-[10px] font-bold text-emerald-400 print:text-emerald-700 block mb-0.5">
                    کۆی پارەدان (پشک)
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-black text-emerald-300 print:text-emerald-800">
                    +{formatCurrency(totalDeposits, settings.currency, settings.usdToIqdRate)}
                  </span>
                </div>

                <div className="bg-rose-950/40 border border-rose-500/30 print:bg-rose-50/80 print:border-rose-200 p-3 rounded-xl text-right">
                  <span className="text-[10px] font-bold text-rose-300 print:text-rose-700 block mb-0.5">
                    کۆی ڕاکێشان (وەرگرتن)
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-black text-rose-300 print:text-rose-800">
                    -{formatCurrency(totalWithdrawals, settings.currency, settings.usdToIqdRate)}
                  </span>
                </div>

                <div className="bg-cyan-950/40 border border-cyan-500/30 print:bg-indigo-50 print:border-indigo-200 p-3 rounded-xl text-right">
                  <span className="text-[10px] font-bold text-cyan-300 print:text-indigo-700 block mb-0.5">
                    کۆی پشکی ماوە (باڵانس)
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-black text-white print:text-indigo-900">
                    {formatCurrency(manualBalance, settings.currency, settings.usdToIqdRate)}
                  </span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="border border-white/10 print:border-slate-200 rounded-2xl overflow-hidden bg-slate-950/40">
                <div className="bg-slate-950/80 print:bg-slate-100/80 px-3.5 py-2.5 border-b border-white/10 print:border-slate-200 flex items-center justify-between text-xs font-bold text-white print:text-slate-900">
                  <span>سەرجەم جوڵە و مامەڵە تۆمارکراوەکان ({filteredManualTransactions.length})</span>
                  <span className="text-[11px] text-cyan-300 print:text-slate-600 font-medium">کۆکراوەی هەمان ناو و تەلەفۆن</span>
                </div>
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/90 print:bg-slate-50 border-b border-white/10 print:border-slate-200 text-cyan-300 print:text-slate-800 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">بەروار</th>
                      <th className="py-2.5 px-3">جۆری مامەڵە</th>
                      <th className="py-2.5 px-3">بڕی پارە</th>
                      <th className="py-2.5 px-3">تێبینی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-slate-100">
                    {filteredManualTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/5 print:hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-white font-bold print:text-slate-700 text-xs">
                          {formatDateShort(tx.date)}
                        </td>
                        <td className="py-2.5 px-3">
                          {tx.type === 'deposit' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 print:bg-emerald-50 text-emerald-300 print:text-emerald-700 font-bold text-[10px] border border-emerald-500/30 print:border-emerald-200">
                              <TrendingUp className="w-3 h-3" />
                              پارەدان (پشک)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/60 print:bg-rose-50 text-rose-300 print:text-rose-700 font-bold text-[10px] border border-rose-500/30 print:border-rose-200">
                              <TrendingDown className="w-3 h-3" />
                              وەرگرتن (ڕاکێشان)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <span className={tx.type === 'deposit' ? 'text-emerald-400 print:text-emerald-700' : 'text-rose-400 print:text-rose-700'}>
                            {tx.type === 'deposit' ? '+' : '-'}
                            {formatCurrency(tx.amount, settings.currency, settings.usdToIqdRate)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 print:text-slate-600 text-[11px]">
                          {tx.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Single Transaction View */
            <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-700/80 space-y-3 print:bg-slate-50 print:border-slate-200">
              <div className="flex justify-between items-center border-b border-white/10 print:border-slate-200 pb-3">
                <span className="font-bold text-white print:text-slate-900 text-sm">جۆری مامەڵە:</span>
                <span
                  className={`font-black text-sm px-2.5 py-1 rounded-lg ${
                    transaction.type === 'deposit'
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 print:bg-emerald-100 print:text-emerald-800'
                      : 'bg-rose-950/60 text-rose-300 border border-rose-500/30 print:bg-rose-100 print:text-rose-800'
                  }`}
                >
                  {transaction.type === 'deposit' ? 'پارەدان (پشک)' : 'وەرگرتن (ڕاکێشان)'}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-white/10 print:border-slate-200 pb-3">
                <span className="font-bold text-white print:text-slate-900 text-sm">بڕی ئەم مامەڵەیە:</span>
                <span
                  className={`font-mono text-lg font-black ${
                    transaction.type === 'deposit' ? 'text-emerald-400 print:text-emerald-700' : 'text-rose-400 print:text-rose-700'
                  }`}
                >
                  {formatCurrency(transaction.amount, settings.currency, settings.usdToIqdRate)}
                </span>
              </div>

              {transaction.recordedBy && (
                <div className="flex justify-between items-center border-b border-white/10 print:border-slate-200 pb-3">
                  <span className="font-bold text-white print:text-slate-900 text-sm">ناوی تۆمارکەر:</span>
                  <span className="font-bold text-cyan-300 print:text-indigo-700 text-sm">
                    {transaction.recordedBy}
                  </span>
                </div>
              )}

              {transaction.notes && (
                <div className="space-y-1 pt-1">
                  <span className="font-bold text-white print:text-slate-900 text-xs flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    تێبینی:
                  </span>
                  <p className="text-white print:text-slate-700 text-xs bg-slate-950/60 print:bg-white p-2.5 rounded-xl border border-white/10 print:border-slate-200">
                    {transaction.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Overall Balance Box */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-4 rounded-2xl flex flex-col gap-2 shadow-md border border-white/10">
            {liveShares > 0 && (
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
                <div className="flex items-center gap-2">
                   <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                   <span className="text-xs text-indigo-200 font-bold">کۆی پشکی قازانج (ئۆتۆماتیکی):</span>
                </div>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  +{formatCurrency(liveShares, settings.currency, settings.usdToIqdRate)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Wallet className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <span className="text-sm sm:text-base text-white font-bold block">باڵانسی ئێستا</span>
                </div>
              </div>
              <div className="font-mono text-lg sm:text-xl font-black text-emerald-400" dir="ltr">
                {formatCurrency(currentTotalBalance, settings.currency, settings.usdToIqdRate)}
              </div>
            </div>
          </div>
        </div>


      </div>

      {/* Floating Scroll-to-Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="no-print fixed bottom-6 left-6 z-[160] flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-2xl transition-all active:scale-95 border border-cyan-400/50 cursor-pointer animate-in fade-in zoom-in-90"
          title="گەڕانەوە بۆ سەرەوەی پسووڵە"
        >
          <ArrowUp className="w-4 h-4" />
          <span>بڕۆ سەرەوە</span>
        </button>
      )}
    </div>,
    document.body
  );
};
