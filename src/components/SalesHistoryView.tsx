import React, { useState, useMemo, useEffect } from 'react';
import {
  Receipt,
  Search,
  Printer,
  Trash2,
  Calendar,
  User,
  Eye,
  CheckCircle,
  CheckCircle2,
  CreditCard,
  Percent,
  Clock,
  Coins,
  ShieldAlert,
  EyeOff,
  KeyRound,
  X,
  Lock,
  AlertTriangle,
  SlidersHorizontal,
  FileDown,
  FileSpreadsheet,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Database,
  Camera,
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import { Sale } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { EditSaleModal } from './EditSaleModal';
import { SecurityPasscodeModal } from './SecurityPasscodeModal';
import { OrdersAndDebtsModal } from './OrdersAndDebtsModal';

interface SalesHistoryViewProps {
  onViewInvoice: (sale: Sale) => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({ onViewInvoice }) => {
  const { sales, deleteSale, settings } = useDatabase();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, filterPayment, timeFilter]);

  // Edit Sale Modal State
  const [editModalSale, setEditModalSale] = useState<Sale | null>(null);

  // Delete Password Modal State
  const [deleteModalSale, setDeleteModalSale] = useState<Sale | null>(null);

  // Delete All Sales State
  const [deleteAllSalesModalOpen, setDeleteAllSalesModalOpen] = useState(false);

  // Firestore orders_and_debts Modal State
  const [showOrdersAndDebtsModal, setShowOrdersAndDebtsModal] = useState(false);

  const handleRequestDeleteSale = (sale: Sale) => {
    setDeleteModalSale(sale);
  };

  const handleConfirmDeleteSale = () => {
    if (deleteModalSale) {
      deleteSale(deleteModalSale.id);
      setDeleteModalSale(null);
    }
  };

  const handleConfirmDeleteAllSalesHistory = () => {
    sales.forEach((s) => deleteSale(s.id));
    setDeleteAllSalesModalOpen(false);
  };

  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    return sales.filter((s) => {
      const saleDate = new Date(s.date);

      // Time filter
      if (timeFilter === 'today') {
        if (saleDate.toDateString() !== todayStr) return false;
      } else if (timeFilter === 'week') {
        if (saleDate < oneWeekAgo) return false;
      } else if (timeFilter === 'month') {
        if (
          saleDate.getMonth() !== now.getMonth() ||
          saleDate.getFullYear() !== now.getFullYear()
        ) {
          return false;
        }
      }

      // Search
      const matchSearch =
        s.invoiceNumber.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        s.customerName.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      // Payment type filter improvement
      let matchPayment = true;
      if (filterPayment === 'cash') {
        matchPayment = s.paymentType === 'cash' || (s.debtAmount <= 0 && s.paidAmount >= s.total);
      } else if (filterPayment === 'debt') {
        matchPayment = s.paymentType === 'debt' || s.debtAmount > 0;
      } else if (filterPayment === 'partial') {
        matchPayment = s.paymentType === 'partial' || (s.debtAmount > 0 && s.paidAmount > 0);
      }

      return matchSearch && matchPayment;
    });
  }, [sales, debouncedSearchQuery, filterPayment, timeFilter]);

  const totalSalesAmount = useMemo(() => filteredSales.reduce((acc, s) => acc + s.total, 0), [filteredSales]);
  const totalPaidAmount = useMemo(() => filteredSales.reduce((acc, s) => acc + s.paidAmount, 0), [filteredSales]);
  const totalProfitAmount = useMemo(() => filteredSales.reduce((acc, s) => acc + s.profit, 0), [filteredSales]);

  const totalPages = Math.ceil(filteredSales.length / pageSize) || 1;
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, currentPage, pageSize]);

  const exportToExcel = () => {
    import('xlsx').then((XLSX) => {
      const dataToExport = filteredSales.map((sale) => {
        const itemsDetail = sale.items
          .map((item) => `${item.productName || (item as any).name || 'کاڵا'} (${item.quantity} ${item.unit || 'کگم'} * ${item.sellingPrice ?? (item as any).price ?? 0})`)
          .join(' ، ');

        return {
          'ژمارەی پسووڵە': sale.invoiceNumber,
          'بەروار و کات': formatDate(sale.date),
          'ناوی کڕیار': sale.customerName,
          'ژمارەی تەلەفۆن': sale.customerPhone || '',
          'شێوازی پارەدان':
            sale.paymentType === 'cash'
              ? 'کاش'
              : sale.paymentType === 'debt'
              ? 'قەرز'
              : 'قیست / بەشێک قەرز',
          'کۆی پسووڵە (د.ع)': sale.total,
          'پارەی دراو (د.ع)': sale.paidAmount,
          'بڕی قەرز (د.ع)': sale.debtAmount,
          'داشکاندن (د.ع)': sale.discount || 0,
          'قازانج / خێر (د.ع)': sale.profit,
          'لیستی کاڵاکان': itemsDetail,
          'تێبینی': sale.notes || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      if (!worksheet['!views']) {
        worksheet['!views'] = [];
      }
      worksheet['!views'].push({ RTL: true });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ڕاپۆرتی فرۆشتنەکان');
      XLSX.writeFile(workbook, `sales_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
  };

  return (
    <div className="w-full max-w-full">
      {/* Single Cohesive Main Container */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-7 space-y-6 w-full max-w-full" dir="rtl">
        {/* 1. Header: Prominently Centered Title and Clean Description */}
        <div className="text-center space-y-2 pt-2 pb-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 shadow-2xs">
            <Receipt className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            پسووڵەکان
          </h1>
          <p className="text-xs sm:text-sm text-slate-900 max-w-lg mx-auto leading-relaxed">
            مێژووی پسووڵەکان
          </p>
        </div>

        {/* 2. Consolidated Configuration & Documents Summary Section */}
        <div className="bg-slate-50/90 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3.5">
          {/* Document Count Badge */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-teal-100/80 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Receipt className="w-5 h-5 text-teal-700" />
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-900 font-bold">ژمارەی پسووڵەکان</div>
              <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
                {filteredSales.length}{' '}
                <span className="text-xs font-normal text-slate-900">پسووڵە (تەواوکراو و خەزنکراو)</span>
              </div>
            </div>
          </div>

          {/* Configuration Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setShowOrdersAndDebtsModal(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-bold text-xs border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="ڕێکخستن و بەڕێوەبردنی orders_and_debts لە فایەربەیس"
            >
              <Sliders className="w-4 h-4 text-teal-600" />
              <span>ڕێکخستن: orders_and_debts</span>
            </button>

            {sales.length > 0 && (
              <button
                type="button"
                onClick={() => setDeleteAllSalesModalOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 font-bold text-xs border border-rose-200/90 shadow-2xs transition-all cursor-pointer active:scale-95"
                title="سڕینەوەی سەرجەم پسووڵەکان (پێویستی بە ژمارەی نهێنییە)"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>سڕینەوەی هەمووی</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Refined Date/Time Segment Buttons (Full single row without horizontal scroll) */}
        <div className="flex flex-col gap-3 w-full">
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/90 text-[11px] sm:text-xs font-bold w-full">
            <button
              type="button"
              onClick={() => setTimeFilter('all')}
              className={`w-full py-2 px-1 rounded-xl transition-all cursor-pointer text-center whitespace-nowrap leading-tight ${
                timeFilter === 'all'
                  ? 'bg-teal-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              هەموو کاتێک
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('today')}
              className={`w-full py-2 px-1 rounded-xl transition-all cursor-pointer text-center whitespace-nowrap leading-tight ${
                timeFilter === 'today'
                  ? 'bg-teal-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              ئەمڕۆ
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('week')}
              className={`w-full py-2 px-1 rounded-xl transition-all cursor-pointer text-center whitespace-nowrap leading-tight ${
                timeFilter === 'week'
                  ? 'bg-teal-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              ئەم هەفتەیە
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('month')}
              className={`w-full py-2 px-1 rounded-xl transition-all cursor-pointer text-center whitespace-nowrap leading-tight ${
                timeFilter === 'month'
                  ? 'bg-teal-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              ئەم مانگە
            </button>
          </div>

          {/* Payment Type Filter Segment Buttons */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/90 text-[11px] sm:text-xs font-bold w-full">
            <button
              type="button"
              onClick={() => setFilterPayment('all')}
              className={`w-full py-2 px-1 rounded-xl transition-all cursor-pointer text-center whitespace-nowrap leading-tight ${
                filterPayment === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              هەموو جۆرەکان
            </button>
            <button
              type="button"
              onClick={() => setFilterPayment('cash')}
              className={`w-full py-2 px-1 rounded-xl transition-all cursor-pointer text-center whitespace-nowrap leading-tight ${
                filterPayment === 'cash'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              کاش (نەقد)
            </button>
            <button
              type="button"
              onClick={() => setFilterPayment('debt')}
              className={`w-full py-2 px-1 rounded-xl transition-all cursor-pointer text-center whitespace-nowrap leading-tight ${
                filterPayment === 'debt'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              قەرز
            </button>
            <button
              type="button"
              onClick={() => setFilterPayment('partial')}
              className={`w-full py-2 px-1 rounded-xl transition-all cursor-pointer text-center whitespace-nowrap leading-tight ${
                filterPayment === 'partial'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              قیست / بەشێک
            </button>
          </div>
        </div>

        {/* 4. Search Control */}
        <div className="pt-1">
          {/* Main Clean Search Box */}
          <div className="relative w-full">
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center text-slate-600">
              <Search className="w-4.5 h-4.5 text-slate-600" />
            </div>

            <input
              type="text"
              dir="rtl"
              placeholder="گەڕان بە پێی ژمارەی پسووڵە یان ناوی کڕیار..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-11 pl-20 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm font-medium text-right transition-colors"
            />

            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-600 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                  title="سڕینەوەی گەڕان"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                title="کامێرا یان سکانی کۆد"
              >
                <Camera className="w-4.5 h-4.5 text-slate-900 hover:text-teal-700" />
              </button>
            </div>
          </div>
        </div>

        {/* 5. Logical Grouping: Data List Title with Excel Download Button */}
        <div className="flex items-center justify-between gap-3 pt-3 pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-teal-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              مێژووی پسووڵەکان
            </h2>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
              {filteredSales.length}
            </span>
          </div>

          {/* Excel Download button on the side of list title */}
          <button
            type="button"
            onClick={exportToExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 active:bg-teal-200 text-teal-800 border border-teal-200/90 font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
            title="داگرتنی ڕاپۆرتی فرۆشتنەکان بە فایلی ئێکسڵ"
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-700" />
            <span>داگرتنی ئێکسڵ</span>
          </button>
        </div>

        {/* 6. Invoices List View */}
        {/* A. Mobile List View (md:hidden) */}
        <div className="space-y-2.5 md:hidden w-full max-w-full">
          {paginatedSales.length === 0 ? (
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-8 text-center text-slate-900 shadow-2xs">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-600" />
              <p className="text-sm font-medium">هیچ پسووڵەیەک تۆمار نەکراوە</p>
            </div>
          ) : (
            paginatedSales.map((sale) => {
              const formatted = formatDate(sale.date);
              const parts = formatted.split(' ');
              const dateStr = parts[0] || formatted;
              const timeStr = parts[1] || '';

              const isDebt = sale.paymentType === 'debt' || (sale.debtAmount > 0 && sale.paidAmount === 0);
              const isPaid = (sale.paymentType === 'cash' || sale.paidAmount >= sale.total) && sale.debtAmount <= 0;
              const isPartial = sale.paymentType === 'partial' || (sale.debtAmount > 0 && sale.paidAmount > 0);

              return (
                <div
                  key={`mobile-${sale.id}`}
                  className="w-full max-w-full bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs flex flex-col gap-2.5 transition-all hover:border-slate-300"
                >
                  {/* Row 1: Invoice ID & Status & Date */}
                  <div className="flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-1.5">
                      <div className="font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs shadow-2xs whitespace-nowrap">
                        {sale.invoiceNumber}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isDebt
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {isPaid ? 'کاش / داخراو' : isDebt ? 'قەرز' : 'قیست'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-900" dir="ltr">
                      <Calendar className="w-3 h-3 text-slate-600" />
                      <span>{dateStr}</span>
                      {timeStr && <span className="text-teal-700 font-bold ml-1">{timeStr}</span>}
                    </div>
                  </div>

                  {/* Row 2: Customer Name & Amount */}
                  <div className="flex items-center justify-between gap-2 w-full pt-0.5">
                    <div className="flex-1 min-w-0 text-right">
                      <span
                        className="block font-bold text-slate-900 text-sm leading-snug break-words"
                        title={sale.customerName || 'کڕیاری گشتی'}
                      >
                        {sale.customerName || 'کڕیاری گشتی'}
                      </span>
                    </div>

                    {/* Amount (Green for Income) */}
                    <div className="text-left shrink-0 font-mono font-black text-emerald-700 text-sm" dir="ltr">
                      +{formatCurrency(sale.total)}
                    </div>
                  </div>

                  {/* Row 3: Action Buttons */}
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onViewInvoice(sale)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 active:bg-teal-200 text-teal-800 border border-teal-200/90 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5 stroke-[2.2] text-teal-700" />
                      <span>بینین</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditModalSale(sale)}
                      className="py-1.5 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="دەستکاری پسووڵە، قەرز و کاڵاکان"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.2] text-amber-700" />
                      <span>دەستکاری</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRequestDeleteSale(sale)}
                      className="py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 border border-rose-200/90 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.2] text-rose-600" />
                      <span>سڕینەوە</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* B. Desktop Table View (hidden md:block) */}
        <div className="hidden md:block rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase">
                <tr>
                  <th className="py-3.5 px-4">ژمارەی پسووڵە</th>
                  <th className="py-3.5 px-4">ناوی کڕیار</th>
                  <th className="py-3.5 px-4">بەروار و کات</th>
                  <th className="py-3.5 px-4">بڕی پسووڵە</th>
                  <th className="py-3.5 px-4">دۆخ</th>
                  <th className="py-3.5 px-4 text-center">کردارەکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium bg-white">
                {paginatedSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-600">
                      <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>هیچ پسووڵەیەک تۆمار نەکراوە</p>
                    </td>
                  </tr>
                ) : (
                  paginatedSales.map((sale) => {
                    const formatted = formatDate(sale.date);
                    const parts = formatted.split(' ');
                    const dateStr = parts[0] || formatted;
                    const timeStr = parts[1] || '';

                    const isDebt = sale.paymentType === 'debt' || (sale.debtAmount > 0 && sale.paidAmount === 0);
                    const isPaid = (sale.paymentType === 'cash' || sale.paidAmount >= sale.total) && sale.debtAmount <= 0;
                    const isPartial = sale.paymentType === 'partial' || (sale.debtAmount > 0 && sale.paidAmount > 0);

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          <span className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 text-xs">
                            {sale.invoiceNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-bold text-slate-900 text-sm">
                            {sale.customerName || 'کڕیاری گشتی'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/80" dir="ltr">
                            <Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <span>{dateStr}</span>
                            {timeStr && <span className="text-teal-700 font-bold ml-1">{timeStr}</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm" dir="ltr">
                          +{formatCurrency(sale.total)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isDebt
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            {isPaid ? 'کاش / داخراو' : isDebt ? 'قەرز' : 'قیست'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onViewInvoice(sale)}
                              title="پیشاندان و بینینی پسووڵە"
                              className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditModalSale(sale)}
                              title="دەستکاریکردنی زانیارییەکانی پسووڵە، قەرز و کاڵاکان"
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                            >
                              <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequestDeleteSale(sale)}
                              title="سڕینەوە (پێویستی بە ژمارەی نهێنییە)"
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* 7. Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-slate-50/80 px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-xs text-slate-900 font-medium">
              پیشاندانی {(currentPage - 1) * pageSize + 1} تا{' '}
              {Math.min(currentPage * pageSize, filteredSales.length)} لە کۆی{' '}
              {filteredSales.length} پسووڵە
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors ${
                  currentPage === 1
                    ? 'border-slate-200 text-slate-900 cursor-not-allowed bg-slate-50'
                    : 'border-slate-200 text-slate-900 hover:bg-slate-100 bg-white'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
                <span>پێشوو</span>
              </button>
              <span className="text-xs font-bold text-slate-900 px-2 font-mono">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors ${
                  currentPage === totalPages
                    ? 'border-slate-200 text-slate-900 cursor-not-allowed bg-slate-50'
                    : 'border-slate-200 text-slate-900 hover:bg-slate-100 bg-white'
                }`}
              >
                <span>دواتر</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Password Security Modal */}
      <SecurityPasscodeModal
        isOpen={!!deleteModalSale}
        onClose={() => setDeleteModalSale(null)}
        onConfirm={handleConfirmDeleteSale}
        title="سڕینەوەی پسووڵەی فرۆشتن"
        description={`ئایا دڵنیایت لە سڕینەوەی پسووڵەی ژمارە ${deleteModalSale?.invoiceNumber}؟ (قەرزی کڕیار بۆ هەمیشە دەمێنێتەوە و ناسڕدرێتەوە)`}
        danger={true}
        actionLabel="سڕینەوە"
      />

      <SecurityPasscodeModal
        isOpen={deleteAllSalesModalOpen}
        onClose={() => setDeleteAllSalesModalOpen(false)}
        onConfirm={handleConfirmDeleteAllSalesHistory}
        title="سڕینەوەی گشت مێژووی فرۆشتن"
        description="ئەم کردارە سەرجەم پسووڵەکانی فرۆشتن لە لیستەکە دەسڕێتەوە، بەڵام قەرزی کڕیاران بۆ هەمیشە لە بەشی قەرز پارێزراو دەبێت و ناسڕدرێتەوە!"
        danger={true}
        actionLabel="سڕینەوەی هەمووی"
      />

      {/* Edit Sale Security Modal */}
      {editModalSale && (
        <EditSaleModal
          sale={editModalSale}
          onClose={() => setEditModalSale(null)}
        />
      )}

      {/* Orders and Debts Firestore Modal */}
      <OrdersAndDebtsModal
        isOpen={showOrdersAndDebtsModal}
        onClose={() => setShowOrdersAndDebtsModal(false)}
      />
    </div>
  );
};
