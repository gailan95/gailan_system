import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Search,
  Printer,
  AlertTriangle,
  ArrowDownLeft,
  AlertCircle,
  History,
  Trash2,
  Eye,
  MoreVertical,
} from 'lucide-react';
import { Customer, Currency } from '../types';
import { formatCurrency, formatPhoneNumber } from '../utils/formatters';

interface DebtorItem {
  customer: Customer;
  debtInfo: {
    days: number;
    isOverdue: boolean;
    formattedDate: string;
  };
}

interface ExcelDebtorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtors: DebtorItem[];
  currency: Currency;
  usdToIqdRate: number;
  onOpenPayment?: (customer: Customer) => void;
  onOpenClearDebt?: (customer: Customer) => void;
  onSelectCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (customer: Customer) => void;
}

export const ExcelDebtorsModal: React.FC<ExcelDebtorsModalProps> = ({
  isOpen,
  onClose,
  debtors,
  currency,
  usdToIqdRate,
  onOpenPayment,
  onOpenClearDebt,
  onSelectCustomer,
  onDeleteCustomer,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'overdue'>('all');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeDropdownCustomerId, setActiveDropdownCustomerId] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveDropdownCustomerId(null);
    };
    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  // Filter debtors based on search and overdue filter
  const filteredDebtors = useMemo(() => {
    return debtors.filter((item) => {
      const matchesFilter = filterType === 'all' || item.debtInfo.isOverdue;
      if (!matchesFilter) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.customer.name.toLowerCase().includes(q) ||
        (item.customer.phone && item.customer.phone.includes(q)) ||
        (item.customer.notes && item.customer.notes.toLowerCase().includes(q))
      );
    });
  }, [debtors, filterType, search]);

  // Calculations for total row
  const totalAmount = useMemo(() => {
    return filteredDebtors.reduce((sum, item) => sum + item.customer.totalDebt, 0);
  }, [filteredDebtors]);

  const overdueCount = useMemo(() => {
    return filteredDebtors.filter((item) => item.debtInfo.isOverdue).length;
  }, [filteredDebtors]);

  // Export to Excel (.xlsx) using xlsx library - containing the 4 primary columns
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const XLSX = await import('xlsx');

      const dataToExport = filteredDebtors.map((item, index) => ({
        '#': index + 1,
        'ناو': item.customer.name,
        'بەروار': item.debtInfo.formattedDate || '',
        'بڕی قەرز (د.ع)': item.customer.totalDebt,
        'دۆخ': item.debtInfo.isOverdue ? `دواکەوتوو (+${item.debtInfo.days} ڕۆژ)` : `قەرزدار (${item.debtInfo.days} ڕۆژ)`,
      }));

      // Append Total summary row
      dataToExport.push({
        '#': '' as any,
        'ناو': `کۆی گشتی (${filteredDebtors.length} قەرزدار)`,
        'بەروار': `${overdueCount} دواکەوتوو`,
        'بڕی قەرز (د.ع)': totalAmount,
        'دۆخ': '',
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      if (!worksheet['!views']) {
        worksheet['!views'] = [];
      }
      worksheet['!views'].push({ RTL: true });

      worksheet['!cols'] = [
        { wch: 6 },  // #
        { wch: 28 }, // ناو
        { wch: 18 }, // بەروار
        { wch: 20 }, // بڕی قەرز
        { wch: 22 }, // دۆخ
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'قەرزەکان');

      const todayStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `debts_list_${todayStr}.xlsx`);
    } catch (err) {
      console.error('Failed to export Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy TSV for Excel pasting
  const handleCopyToClipboard = () => {
    const headers = ['#', 'ناو', 'بەروار', 'بڕی قەرز', 'دۆخ'];
    const rows = filteredDebtors.map((item, idx) => [
      idx + 1,
      item.customer.name,
      item.debtInfo.formattedDate || '',
      item.customer.totalDebt,
      item.debtInfo.isOverdue ? 'دواکەوتوو' : 'ئاسایی',
    ]);

    rows.push([
      'کۆی گشتی',
      `${filteredDebtors.length} قەرزدار`,
      `${overdueCount} دواکەوتوو`,
      totalAmount,
      '',
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');

    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden">
        {/* 1. Authentic Excel Header Bar */}
        <div className="bg-[#107C41] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center border border-white/25 shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white !text-white">
                  خشتەی ئیگزڵی قەرزەکان
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] font-mono font-bold">
                  {filteredDebtors.length} خانە (ڕیز)
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 font-medium">
                ستونەکان: ناو | بەروار | بڕی قەرز | کردارەکان
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              title="داخستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Excel Ribbon / Toolbar */}
        <div className="bg-slate-100 border-b border-slate-300 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="گەڕان بەپێی ناو یان مۆبایل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-8 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#107C41]/30 focus:border-[#107C41]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all border cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 border-slate-400 shadow-2xs'
                  : 'text-slate-600 border-transparent hover:bg-slate-200'
              }`}
            >
              هەموو قەرزەکان ({debtors.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('overdue')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                filterType === 'overdue'
                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs'
                  : 'text-slate-600 border-transparent hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>دواکەوتوو (+٥ ڕۆژ)</span>
            </button>
          </div>

          {/* Action Buttons: Export & Copy */}
          <div className="flex items-center gap-2">
            {/* Copy TSV */}
            <button
              type="button"
              onClick={handleCopyToClipboard}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50 hover:text-slate-900'
              }`}
              title="کۆپیکردنی زانیارییەکان بۆ ناو بەرنامەی ئیگزڵ"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-slate-900" />}
              <span>{copied ? 'کۆپی کرا بۆ ئیگزڵ ✓' : 'کۆپی بۆ ئیگزڵ'}</span>
            </button>

            {/* Download .XLSX */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="bg-[#107C41] hover:bg-[#0c6233] active:scale-95 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs border border-emerald-700 cursor-pointer disabled:opacity-50"
              title="داگرتنی فایلی مایکرۆسۆفت ئیگزڵ"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'دروست دەکرێت...' : 'داگرتن (.xlsx)'}</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              title="چاپکردنی خشتەکە"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4. The Interactive Spreadsheet Table */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 min-h-[300px]">
          <table className="w-full table-fixed border-collapse text-right text-xs select-text">
            <thead className="sticky top-0 z-20 bg-emerald-800 text-white border-b border-emerald-900 shadow-xs">
              {/* Meaningful Column Titles: ناو | بڕی قەرز | کردارەکان */}
              <tr className="bg-emerald-800 text-white font-bold text-[11px] sm:text-xs tracking-wide">
                <th className="w-[45%] sm:w-[46%] px-2 sm:px-3.5 py-1.5 sm:py-2 border-l border-emerald-700 text-right truncate">
                  ناو
                </th>
                <th className="w-[35%] sm:w-[36%] px-1.5 sm:px-3 py-1.5 sm:py-2 border-l border-emerald-700 text-center truncate">
                  بڕی قەرز
                </th>
                <th className="w-[20%] sm:w-[18%] px-1 py-1.5 sm:py-2 text-center whitespace-nowrap text-[11px] sm:text-xs font-black">
                  کردارەکان
                </th>
              </tr>
            </thead>

            {/* Table Rows styled like real Excel cells */}
            <tbody className="divide-y divide-slate-300 bg-white font-medium">
              {filteredDebtors.length > 0 ? (
                filteredDebtors.map((item, index) => {
                  const isEven = index % 2 === 0;
                  const isOverdue = item.debtInfo.isOverdue;
                  const hasDebt = item.customer.totalDebt > 0;

                  return (
                    <tr
                      key={item.customer.id}
                      className={`hover:bg-emerald-50/70 transition-colors ${
                        isOverdue
                          ? 'bg-rose-50/50'
                          : isEven
                          ? 'bg-white'
                          : 'bg-slate-50/80'
                      }`}
                    >
                      {/* 1. ناو (Name) */}
                      <td className="w-[45%] sm:w-[46%] px-2 sm:px-3.5 py-2 sm:py-2.5 border-l border-slate-300 align-middle text-right">
                        <div className="flex flex-col min-w-0">
                          <span className="font-black text-slate-950 text-xs sm:text-sm leading-tight truncate w-full">
                            {item.customer.name}
                          </span>
                          {item.customer.phone && item.customer.phone !== 'نادیار' && (
                            <span className="text-[9.5px] sm:text-[11px] font-mono text-slate-900 font-black leading-tight mt-0.5 truncate w-full" dir="ltr">
                              {formatPhoneNumber(item.customer.phone)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. بڕی قەرز و ماوەی ڕۆژ (Debt Amount & Duration Days) */}
                      <td className="w-[35%] sm:w-[36%] px-1.5 sm:px-3 py-2 sm:py-2.5 border-l border-slate-300 align-middle text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5 min-w-0">
                          <span
                            className={`font-black font-mono text-[11px] sm:text-xs md:text-sm whitespace-nowrap ${
                              isOverdue ? 'text-rose-600' : 'text-amber-700'
                            }`}
                            dir="ltr"
                          >
                            {formatCurrency(item.customer.totalDebt, currency, usdToIqdRate)}
                          </span>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold shrink-0 ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {item.debtInfo.days} ڕۆژ
                          </span>
                        </div>
                      </td>

                      {/* 3. کردارەکان (3 Vertical Dots Dropdown Menu) */}
                      <td className="w-[20%] sm:w-[18%] px-1 py-2 align-middle text-center relative">
                        <div className="inline-block text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownCustomerId(activeDropdownCustomerId === item.customer.id ? null : item.customer.id);
                            }}
                            title="کردارەکان"
                            className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-slate-50 to-slate-100 hover:from-emerald-50 hover:to-emerald-100 text-slate-900 hover:text-emerald-950 rounded-xl border border-slate-300/80 shadow-2xs hover:shadow-sm transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-center mx-auto group"
                          >
                            <MoreVertical className="w-4 h-4 group-hover:scale-110 transition-transform text-slate-900" />
                          </button>

                          {activeDropdownCustomerId === item.customer.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute left-1 sm:left-2 top-full mt-1.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-1.5 sm:p-2 z-50 flex items-center gap-1 sm:gap-1.5 animate-in fade-in zoom-in-95 duration-150"
                            >
                              {/* 1. وەرگرتنەوەی قەرز */}
                              {onOpenPayment && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownCustomerId(null);
                                    onOpenPayment(item.customer);
                                  }}
                                  disabled={!hasDebt}
                                  title="وەرگرتنەوەی قەرز"
                                  className={`flex flex-col items-center justify-center min-w-[44px] sm:min-w-[48px] py-1.5 px-1 rounded-xl transition-all duration-150 ${
                                    hasDebt
                                      ? 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white hover:scale-105 active:scale-95 shadow-2xs cursor-pointer'
                                      : 'bg-slate-100 text-slate-900 cursor-not-allowed opacity-60'
                                  }`}
                                >
                                  <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                  <span className="text-[9px] font-bold mt-1 leading-tight whitespace-nowrap">وەرگرتنەوە</span>
                                </button>
                              )}

                              {/* 2. بەخشینی قەرز */}
                              {onOpenClearDebt && hasDebt && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownCustomerId(null);
                                    onOpenClearDebt(item.customer);
                                  }}
                                  title="بەخشینی قەرز"
                                  className="flex flex-col items-center justify-center min-w-[44px] sm:min-w-[48px] py-1.5 px-1 rounded-xl bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white hover:scale-105 active:scale-95 shadow-2xs transition-all duration-150 cursor-pointer"
                                >
                                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                  <span className="text-[9px] font-bold mt-1 leading-tight whitespace-nowrap">بەخشین</span>
                                </button>
                              )}

                              {/* 3. مێژووی حسابات و بینین */}
                              {onSelectCustomer && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownCustomerId(null);
                                    onSelectCustomer(item.customer);
                                  }}
                                  title="مێژووی حسابات"
                                  className="flex flex-col items-center justify-center min-w-[44px] sm:min-w-[48px] py-1.5 px-1 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-900 hover:text-white hover:scale-105 active:scale-95 shadow-2xs transition-all duration-150 cursor-pointer"
                                >
                                  <History className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                  <span className="text-[9px] font-bold mt-1 leading-tight whitespace-nowrap">مێژوو</span>
                                </button>
                              )}

                              {/* 4. سڕینەوەی کڕیار */}
                              {onDeleteCustomer && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownCustomerId(null);
                                    onDeleteCustomer(item.customer);
                                  }}
                                  title="سڕینەوەی کڕیار"
                                  className="flex flex-col items-center justify-center min-w-[44px] sm:min-w-[48px] py-1.5 px-1 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white hover:scale-105 active:scale-95 shadow-2xs transition-all duration-150 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                  <span className="text-[9px] font-bold mt-1 leading-tight whitespace-nowrap">سڕینەوە</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-10 text-slate-600">
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-900" />
                    <p className="font-bold text-xs sm:text-sm">هیچ قەرزدارێک نەدۆزرایەوە</p>
                    {search && (
                      <p className="text-[11px] text-slate-600 mt-1">
                        هیچ ئەنجامێک بەپێی گەڕانەکەت نایەتەوە: "{search}"
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>

            {/* Excel Totals Row (SUM Footer) */}
            {filteredDebtors.length > 0 && (
              <tfoot className="sticky bottom-0 z-20 bg-emerald-50 border-t-2 border-slate-400 font-bold text-[10px] sm:text-xs shadow-inner">
                <tr className="text-emerald-950">
                  <td className="w-[45%] sm:w-[46%] px-2 sm:px-3.5 py-2 border-l border-slate-300 font-black text-[11px] sm:text-xs text-right truncate">
                    کۆی گشتی ({filteredDebtors.length} قەرزدار)
                  </td>
                  <td className="w-[35%] sm:w-[36%] px-1.5 sm:px-3 py-2 border-l border-slate-300 align-middle text-center">
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <span className="font-black font-mono text-emerald-700 text-[11px] sm:text-xs md:text-sm whitespace-nowrap" dir="ltr">
                        {formatCurrency(totalAmount, currency, usdToIqdRate)}
                      </span>
                      {overdueCount > 0 && (
                        <span className="text-[8px] sm:text-[9px] font-bold text-rose-700">
                          {overdueCount} دواکەوتوو (+٥)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="w-[20%] sm:w-[18%] px-1 py-2 text-center text-slate-600 text-[10px]">
                    —
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* 5. Bottom Status Bar */}
        <div className="bg-slate-200 border-t border-slate-300 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-white font-bold border border-slate-300 text-[#107C41] flex items-center gap-1 shadow-2xs">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>پەڕەی ١ (Sheet1)</span>
            </span>
            <span className="text-[11px] text-slate-900">
              ژمارەی ڕیزەکان: {filteredDebtors.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-600">
              کۆی قەرز: <strong className="text-emerald-700 font-bold">{formatCurrency(totalAmount, currency, usdToIqdRate)}</strong>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              داخستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

