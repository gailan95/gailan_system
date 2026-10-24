import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Settings,
  X,
  FileJson,
  ShieldCheck,
  Phone,
  User,
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import {
  downloadCSVFile,
  generateAllInOneCSV,
  generateSalesCSV,
  generateCustomersCSV,
  generateProductsCSV,
  generateExpensesCSV,
  generateDebtTransactionsCSV,
} from '../utils/csvExporter';

interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({ isOpen, onClose }) => {
  const {
    exportDatabaseJSON,
    importDatabaseJSON,
    resetToDefaultData,
    clearAllData,
    forceSaveToDisk,
    isAutoSaved,
    saveStatusText,
    products,
    customers,
    sales,
    debtTransactions,
    expenses,
    employees,
    settings,
    updateSettings,
  } = useDatabase();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Settings form
  const cleanVal = (val?: string, forbidden: string[] = []) => {
    if (!val) return '';
    for (const f of forbidden) {
      if (val.includes(f)) return '';
    }
    return val;
  };

  const [storeName, setStoreName] = useState(settings.storeName ?? '');
  const [officeNumber, setOfficeNumber] = useState(settings.officeNumber ?? '');
  const [marketSubtitle, setMarketSubtitle] = useState(settings.marketSubtitle ?? '');
  const [managerNames, setManagerNames] = useState(cleanVal(settings.managerNames, ['سلام', 'عباس']));
  const [phone, setPhone] = useState(cleanVal(settings.phone, ['07829219207']));
  const [phoneOwner1, setPhoneOwner1] = useState(cleanVal(settings.phoneOwner1, ['سلام']));
  const [phone2, setPhone2] = useState(cleanVal(settings.phone2, ['0770 987 6543']));
  const [phoneOwner2, setPhoneOwner2] = useState(cleanVal(settings.phoneOwner2, ['عباس']));
  const [address, setAddress] = useState(settings.address ?? '');
  const [exchangeRate, setExchangeRate] = useState(settings.usdToIqdRate ?? 1530);
  const [footerMsg, setFooterMsg] = useState(settings.invoiceFooterMessage ?? '');

  useEffect(() => {
    if (isOpen) {
      setStoreName(settings.storeName ?? '');
      setOfficeNumber(settings.officeNumber ?? '');
      setMarketSubtitle(settings.marketSubtitle ?? '');
      setManagerNames(cleanVal(settings.managerNames, ['سلام', 'عباس']));
      setPhone(cleanVal(settings.phone, ['07829219207']));
      setPhoneOwner1(cleanVal(settings.phoneOwner1, ['سلام']));
      setPhone2(cleanVal(settings.phone2, ['0770 987 6543']));
      setPhoneOwner2(cleanVal(settings.phoneOwner2, ['عباس']));
      setAddress(settings.address ?? '');
      setExchangeRate(settings.usdToIqdRate ?? 1530);
      setFooterMsg(settings.invoiceFooterMessage ?? '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      const jsonStr = exportDatabaseJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `kurdish_pos_database_backup_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage('کۆپی پاشەکەوتی داتابەیس بە سەرکەوتوویی دابەزێنرا!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e) {
      setErrorMessage('کێشەیەک لە دەرهێنانی داتابەیس ڕوویدا');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDatabaseJSON(content);
        if (success) {
          setSuccessMessage('داتابەیس بە سەرکەوتوویی گەڕێندرایەوە!');
          setTimeout(() => setSuccessMessage(null), 4000);
        } else {
          setErrorMessage('فایلی داتابەیس دروست نییە یان تێکچووە');
          setTimeout(() => setErrorMessage(null), 4000);
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportCSV = (type: 'all' | 'sales' | 'customers' | 'products' | 'expenses' | 'debts') => {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      let csvData = '';
      let filename = '';

      switch (type) {
        case 'all':
          csvData = generateAllInOneCSV({ sales, customers, products, expenses, debtTransactions, employees });
          filename = `pos_full_database_sheets_${timestamp}.csv`;
          break;
        case 'sales':
          csvData = generateSalesCSV(sales);
          filename = `pos_sales_sheets_${timestamp}.csv`;
          break;
        case 'customers':
          csvData = generateCustomersCSV(customers);
          filename = `pos_customers_debts_sheets_${timestamp}.csv`;
          break;
        case 'products':
          csvData = generateProductsCSV(products);
          filename = `pos_products_inventory_sheets_${timestamp}.csv`;
          break;
        case 'expenses':
          csvData = generateExpensesCSV(expenses);
          filename = `pos_expenses_sheets_${timestamp}.csv`;
          break;
        case 'debts':
          csvData = generateDebtTransactionsCSV(debtTransactions, customers);
          filename = `pos_debt_transactions_sheets_${timestamp}.csv`;
          break;
      }

      downloadCSVFile(csvData, filename);
      setSuccessMessage(`فایلی CSV بۆ Google Sheets بە سەرکەوتوویی دابەزێنرا (${filename})`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e) {
      setErrorMessage('کێشەیەک لە هەناردەکردنی CSV ڕوویدا');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleCopyCSV = (type: 'all' | 'sales' | 'customers' | 'products' | 'expenses') => {
    try {
      let csvData = '';
      switch (type) {
        case 'all':
          csvData = generateAllInOneCSV({ sales, customers, products, expenses, debtTransactions, employees });
          break;
        case 'sales':
          csvData = generateSalesCSV(sales);
          break;
        case 'customers':
          csvData = generateCustomersCSV(customers);
          break;
        case 'products':
          csvData = generateProductsCSV(products);
          break;
        case 'expenses':
          csvData = generateExpensesCSV(expenses);
          break;
      }

      navigator.clipboard.writeText(csvData);
      setCopiedSection(type);
      setSuccessMessage('داتاکە لە کلیپبۆرد کۆپی کرا! ئێستا دەتوانیت لە Google Sheets یەکسەر Paste ی بکەیت.');
      setTimeout(() => {
        setCopiedSection(null);
        setSuccessMessage(null);
      }, 3500);
    } catch (e) {
      setErrorMessage('نەتوانرا لە کلیپبۆرد کۆپی بکرێت');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName,
      officeNumber,
      marketSubtitle,
      managerNames,
      phone,
      phoneOwner1,
      phone2,
      phoneOwner2,
      address,
      usdToIqdRate: Number(exchangeRate),
      invoiceFooterMessage: footerMsg,
    });
    setSuccessMessage('زانیاری و ڕێکخستنەکانی فرۆشگا نوێکرانەوە!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleResetSample = () => {
    const pass = prompt('بۆ بارکردنەوەی داتای نموونەیی وشەی نهێنی بەڕێوەبەر داخڵ بکە:');
    if (!pass) return;
    if (pass !== '1995@') {
      setErrorMessage('وشەی نهێنی هەڵەیە! ناتوانیت داتای نوێ دابنێیت.');
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }
    if (confirm('دڵنیایت لە بارکردنەوەی داتای نموونەیی؟ (ئەمە داتای نوێی تاقیکاری دێنێتە بەر دەست)')) {
      resetToDefaultData();
      setSuccessMessage('داتای سەرەتایی بارکرایەوە!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleClear = () => {
    const pass = prompt('ئاگاداری گرنگ! بۆ بەتاڵکردنی تەواوی داتابەیس دەبێت وشەی نهێنی بەڕێوەبەر داخڵ بکەیت:');
    if (!pass) return;
    if (pass !== '1995@') {
      setErrorMessage('وشەی نهێنی هەڵەیە! سڕینەوەی داتابەیس هەڵوەشایەوە.');
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }
    if (confirm('ئاگاداری: دڵنیایت لە بەتاڵکردنەوەی تەواوی داتابەیس؟ هەموو تۆمارەکان دەسڕدرێنەوە!')) {
      clearAllData();
      setSuccessMessage('تەواوی داتابەیس بەتاڵکرایەوە!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                بەڕێوەبردن و پاشەکەوتی داتابەیس
              </h3>
              <p className="text-xs text-slate-900">
                پاراستن و هەناردەکردنی داتا، ڕێکخستنی فرۆشگا و گۆڕینەوەی دراو
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition-colors shadow-2xs"
              title="گەڕانەوە بۆ لیستی پێشوو"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>گەڕانەوە بۆ لیستی پێشوو</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-400 rounded-xl"
              title="داخستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Database Status Info */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>دۆخی پاراستنی هەمیشەیی داتا:</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isAutoSaved ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`}></span>
                <span>{saveStatusText || 'داتاکان پارێزراون'}</span>
              </span>
              <button
                type="button"
                onClick={async () => {
                  await forceSaveToDisk();
                  setSuccessMessage('تەواوی داتاکان بە سەرکەوتوویی لە دیسکی سێرڤەر و براوزەردا پاشەکەوت کران!');
                  setTimeout(() => setSuccessMessage(null), 3500);
                }}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-xl transition-colors shadow-2xs flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>پاشەکەوتکردنی دەستی</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-emerald-700 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200">
            ✓ داتاکانت پارێزراون: بە دەرچوون، داخستنی تابلێت یان براوزەر، یان گەڕانەوە بۆ بەرنامەکە، هیچ زانیاریەک ناسڕێتەوە و هەموو کاڵا، قەرز و پسووڵەکان پارێزراون.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-center text-xs">
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-400 block">کاڵاکانی کۆگا</span>
              <span className="font-bold text-slate-900">{products.length} کاڵا</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-400 block">فەرمانبەران</span>
              <span className="font-bold text-slate-900">{employees.length} کارمەند</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-400 block">کڕیاران</span>
              <span className="font-bold text-slate-900">{customers.length} کەس</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-400 block">پسووڵەی فرۆشتن</span>
              <span className="font-bold text-slate-900">{sales.length} پسووڵە</span>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <span className="text-slate-400 block">قەرز و خەرجی</span>
              <span className="font-bold text-slate-900">
                {debtTransactions.length + expenses.length} تۆمار
              </span>
            </div>
          </div>
        </div>

        {/* Backup and Restore Actions */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-900 text-sm">پاشەکەوت و گێڕانەوە (Backup & Restore)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export */}
            <button
              onClick={handleExport}
              className="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center gap-3 text-right group shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                  دابەزاندنی کۆپی پاشەکەوت
                </div>
                <div className="text-[11px] text-slate-900">
                  داگرتنی داتابەیس وەک فایلی پارێزراوی JSON
                </div>
              </div>
            </button>

            {/* Import */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
                id="database-file-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center gap-3 text-right group shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs sm:text-sm">
                    گێڕانەوەی داتابەیس
                  </div>
                  <div className="text-[11px] text-slate-900">
                    بارکردنی فایلی JSON بۆ نوێکردنەوەی داتا
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Google Sheets & CSV Export Section */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  هەناردەکردن بۆ Google Sheets و ئێکسڵ (CSV / خشتەکان)
                </h4>
                <p className="text-[11px] text-slate-900">
                  دابەزاندنی ڕاستەوخۆ بە فۆرماتی UTF-8 بۆ پیشاندانی بێ کێشەی زمانی کوردی لە گووگڵ شیتس
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
              Google Sheets Ready
            </span>
          </div>

          {/* All-in-One Master CSV */}
          <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-bold text-emerald-950 text-xs sm:text-sm flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>سەرجەم خشتەکانی داتابەیس پێکەوە (All-in-One Master CSV)</span>
              </div>
              <p className="text-[11px] text-emerald-800/80">
                هەموو فرۆشەکان، کڕیاران، قەرزەکان، کاڵاکان و خەرجییەکان لە یەک فایلی ڕێکخراودا
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleCopyCSV('all')}
                className="px-3 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                title="کۆپیکردنی دەق بۆ لەزگەکردن لە Google Sheets"
              >
                {copiedSection === 'all' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedSection === 'all' ? 'کۆپی کرا' : 'کۆپیکردن'}</span>
              </button>
              <button
                onClick={() => handleExportCSV('all')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>داگرتنی CSV</span>
              </button>
            </div>
          </div>

          {/* Individual Table CSV Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Sales */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="text-xs font-bold text-slate-900">خشتەی فرۆش و پسووڵەکان</div>
                <div className="text-[11px] text-slate-400 font-mono">{sales.length} پسووڵەی فرۆش</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCopyCSV('sales')}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-400 transition-colors"
                  title="کۆپیکردن بۆ گووگڵ شیتس"
                >
                  {copiedSection === 'sales' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleExportCSV('sales')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* 2. Customers & Debts */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="text-xs font-bold text-slate-900">خشتەی کڕیاران و قەرزەکان</div>
                <div className="text-[11px] text-slate-400 font-mono">{customers.length} کڕیار</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCopyCSV('customers')}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-400 transition-colors"
                  title="کۆپیکردن بۆ گووگڵ شیتس"
                >
                  {copiedSection === 'customers' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleExportCSV('customers')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* 3. Products & Stock */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="text-xs font-bold text-slate-900">خشتەی کاڵاکان و مەوجودی کۆگا</div>
                <div className="text-[11px] text-slate-400 font-mono">{products.length} جۆر کاڵا</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCopyCSV('products')}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-400 transition-colors"
                  title="کۆپیکردن بۆ گووگڵ شیتس"
                >
                  {copiedSection === 'products' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleExportCSV('products')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* 4. Expenses */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="text-xs font-bold text-slate-900">خشتەی خەرجییەکان</div>
                <div className="text-[11px] text-slate-400 font-mono">{expenses.length} تۆماری خەرجی</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCopyCSV('expenses')}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-400 transition-colors"
                  title="کۆپیکردن بۆ گووگڵ شیتس"
                >
                  {copiedSection === 'expenses' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleExportCSV('expenses')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-400 space-y-1">
            <span className="font-bold text-slate-900 block">💡 ڕێنمایی خێرا بۆ بردنە ناو Google Sheets:</span>
            <span>
              ۱. فایلی CSV دابەزێنە یان دوگمەی <b>کۆپیکردن</b> دابگرە.
              <br />
              ۲. لاپەڕەی <b>Google Sheets</b> بکەرەوە ⬅️ بڕۆ <b>File</b> ⬅️ <b>Import</b> ⬅️ <b>Upload</b> یان ڕاستەوخۆ <b>Paste (Ctrl+V)</b> بکە.
            </span>
          </div>
        </div>

        {/* Store Profile & Currency Settings */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-900" />
            <span>ڕێکخستنەکانی فرۆشگا و نرخی دۆلار</span>
          </h4>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  ناوی فرۆشگا / مەڵبەندی بازرگانی لە پسووڵە
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  ژمارەی مەکتەب / نووسینگە (لە سەرووی پسووڵە)
                </label>
                <input
                  type="text"
                  value={officeNumber}
                  onChange={(e) => setOfficeNumber(e.target.value)}
                  placeholder="مەکتەبی ژمارە ( ٤٩ )"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  وەسفی بازرگانی پسووڵە
                </label>
                <input
                  type="text"
                  value={marketSubtitle}
                  onChange={(e) => setMarketSubtitle(e.target.value)}
                  placeholder="بۆ بازرگانی میوە و سەوزە و وشکەبار بە کۆمەڵ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  ناوی بەڕێوەبەران / خاوەنکار لە پسووڵە
                </label>
                <input
                  type="text"
                  value={managerNames}
                  onChange={(e) => setManagerNames(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Two Phone Owners Section */}
              <div className="sm:col-span-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>ژمارەی مۆبایل و ناوی خاوەنەکان (٢ کەس)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Person 1 */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 pb-1 border-b border-slate-100">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>کەسی یەکەم</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        ناوی خاوەنی مۆبایل (کەسی ۱)
                      </label>
                      <input
                        type="text"
                        value={phoneOwner1}
                        onChange={(e) => setPhoneOwner1(e.target.value)}
                        placeholder=""
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        ژمارەی مۆبایل (کەسی ۱)
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder=""
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Person 2 */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 pb-1 border-b border-slate-100">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>کەسی دووەم</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        ناوی خاوەنی مۆبایل (کەسی ۲)
                      </label>
                      <input
                        type="text"
                        value={phoneOwner2}
                        onChange={(e) => setPhoneOwner2(e.target.value)}
                        placeholder=""
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        ژمارەی مۆبایل (کەسی ۲)
                      </label>
                      <input
                        type="text"
                        value={phone2}
                        onChange={(e) => setPhone2(e.target.value)}
                        placeholder=""
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  ناونیشانی شوێن
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="شار یان ناونیشان"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  پەیامی ژێرەوەی پسووڵە
                </label>
                <input
                  type="text"
                  value={footerMsg}
                  onChange={(e) => setFooterMsg(e.target.value)}
                  placeholder="پەیامی دڵخوازی خوارەوەی پسووڵە..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-900 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>گەڕانەوە بۆ لیستی پێشوو</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>پاشەکەوتی ڕێکخستنەکان</span>
              </button>
            </div>
          </form>
        </div>

        {/* Reset / Factory Options */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleResetSample}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-900 font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>بارکردنی داتای نموونەیی کوردی</span>
          </button>

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>بەتاڵکردنی تەواوی داتابەیس</span>
          </button>
        </div>

        {/* Prominent Back Button at the Very Bottom (Mobile Friendly) */}
        <div className="pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>گەڕانەوە بۆ لیستی پێشوو</span>
          </button>
        </div>
      </div>
    </div>
  );
};
