import React, { useState, useEffect } from 'react';
import { PieChart, Edit2, Save, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';
import { normalizeKurdishText } from '../utils/textNormalization';

interface ShareholderSectionProps {
  product: Product;
  remainingStockQty: number;
  shareholderShareAmount: number;
  totalNetProfit: number;
  totalSalesRevenue?: number;
  settings: {
    currency?: string;
    usdToIqdRate?: number;
    [key: string]: any;
  };
  existingShareholderNames?: string[];
  formatNumber: (val: number) => string;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  addShareholderTransaction?: (tx: any) => void;
  setCapitalAccounts?: React.Dispatch<React.SetStateAction<any>> | ((accounts: any) => void);
  allProducts?: Product[];
  calculateProductNetProfit?: (p: Product) => number;
}

export default function ShareholderSection({
  product,
  remainingStockQty,
  shareholderShareAmount,
  totalNetProfit,
  totalSalesRevenue = 0,
  settings,
  existingShareholderNames = [],
  formatNumber,
  onUpdateProduct,
  addShareholderTransaction,
  setCapitalAccounts,
  allProducts = [],
  calculateProductNetProfit,
}: ShareholderSectionProps) {
  const [isEditingShareholder, setIsEditingShareholder] = useState(false);
  const [shareholderNameInput, setShareholderNameInput] = useState(product.shareholderName || '');
  const [shareholderPercentInput, setShareholderPercentInput] = useState(
    product.shareholderPercentage ? String(product.shareholderPercentage) : '10'
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync internal state when product changes
  useEffect(() => {
    setShareholderNameInput(product.shareholderName || '');
    setShareholderPercentInput(product.shareholderPercentage ? String(product.shareholderPercentage) : '10');
  }, [product.shareholderName, product.shareholderPercentage]);

  // 1. فەنکشنی هاوتابردنی ئۆتۆماتیکی پشکەکان بۆ بەشی سەرمایە (Capital Accounts Real-time Sync)
  const syncShareholderCapitalToAccount = (shareholderName: string, updatedProductsList?: Product[]) => {
    if (!shareholderName) return;

    const productsToScan = updatedProductsList || allProducts;

    // کۆکردنەوەی هەموو پشکەکانی ئەم هاوبەشە لە تەواوی کاڵاکانی کۆگا
    const totalShareholderBalanceAcrossProducts = productsToScan.reduce((sum, p) => {
      if (p.shareholderName && p.shareholderName.trim().toLowerCase() === shareholderName.trim().toLowerCase()) {
        const pPercent = Number(p.shareholderPercentage) || 0;
        const pProfit = calculateProductNetProfit ? calculateProductNetProfit(p) : (p.id === product.id ? totalNetProfit : 0);
        const pShare = (pProfit * pPercent) / 100;
        return sum + (pShare > 0 ? pShare : 0);
      }
      return sum;
    }, 0);

    // ئەپدێتکردنی بەشی سەرمایە ئەگەر فەنکشنەکە دابین کرابێت
    if (typeof setCapitalAccounts === 'function') {
      try {
        setCapitalAccounts((prevAccounts: any) => {
          if (!prevAccounts) return prevAccounts;
          if (Array.isArray(prevAccounts)) {
            const index = prevAccounts.findIndex((acc: any) => acc.name?.trim().toLowerCase() === shareholderName.trim().toLowerCase());
            if (index >= 0) {
              const updated = [...prevAccounts];
              updated[index] = {
                ...updated[index],
                shareAmount: totalShareholderBalanceAcrossProducts,
                lastUpdated: new Date().toISOString()
              };
              return updated;
            } else {
              return [
                ...prevAccounts,
                {
                  id: Date.now().toString(),
                  name: shareholderName.trim(),
                  shareAmount: totalShareholderBalanceAcrossProducts,
                  type: 'shareholder',
                  lastUpdated: new Date().toISOString()
                }
              ];
            }
          }
          return prevAccounts;
        });
      } catch (err) {
        console.error('Error syncing shareholder to capital accounts:', err);
      }
    }
  };

  // 2. چاودێریکردنی گۆڕانکارییەکان بۆ هاوکاتکردنی ڕاستەوخۆ (Real-time Sync on Profit or Product Changes)
  useEffect(() => {
    if (product.shareholderName) {
      syncShareholderCapitalToAccount(product.shareholderName);
    }
  }, [product.shareholderName, product.shareholderPercentage, totalNetProfit, shareholderShareAmount]);

  // 3. پاشەکەوتکردنی زانیاری هاوبەش
  const handleSaveShareholderInfo = () => {
    const percentage = parseFloat(shareholderPercentInput) || 0;
    const name = shareholderNameInput.trim();

    const updatedProduct = {
      ...product,
      shareholderName: name,
      shareholderPercentage: percentage,
    };

    onUpdateProduct(product.id, {
      shareholderName: name,
      shareholderPercentage: percentage,
    });

    // تۆمارکردنی ئۆتۆماتیکی لە لیستی هاوبەشەکان بۆ ئەوەی ڕاستەوخۆ لە بەشی سەرمایە دەربکەوێت
    if (name) {
      try {
        const stored = localStorage.getItem('kurd_pos_shareholder_profiles_v1');
        const profiles = stored ? JSON.parse(stored) : [];
        const norm = normalizeKurdishText(name);
        if (!profiles.some((p: any) => normalizeKurdishText(p.name) === norm)) {
          profiles.unshift({
            id: 'shp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: name,
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem('kurd_pos_shareholder_profiles_v1', JSON.stringify(profiles));
        }
      } catch {}
    }

    // دروستکردنی تۆماری ئۆتۆماتیکی لە حسابی هاوبەشان ئەگەر پشک هەبێت
    if (name && shareholderShareAmount > 0 && addShareholderTransaction) {
      addShareholderTransaction({
        id: Date.now().toString(),
        name: name,
        amount: Math.round(shareholderShareAmount),
        productId: product.id,
        date: new Date().toISOString(),
        type: 'deposit',
        notes: `پشکی قازانجی کاڵای (${product.name}) - ڕێژەی ${percentage}%`,
      });
    }

    // هاوکاتکردنی ئۆتۆماتیکی لەگەڵ بەشی سەرمایە
    const updatedList = allProducts.map(p => p.id === product.id ? updatedProduct : p);
    syncShareholderCapitalToAccount(name, updatedList);

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    setIsEditingShareholder(false);
  };

  return (
    <div className="col-span-2 sm:col-span-2 lg:col-span-4 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/80 border-2 border-indigo-200/90 hover:border-indigo-300 rounded-2xl p-4 sm:p-5 shadow-xs transition-all space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
            <PieChart className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-black text-sm sm:text-base text-indigo-950">
                پشکی هاوبەش
              </h4>
              {product.shareholderName ? (
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-lg border border-indigo-300 font-black flex items-center gap-1">
                  <span>{product.shareholderName}</span>
                  <span className="text-indigo-600 font-mono">({product.shareholderPercentage || 10}%)</span>
                </span>
              ) : (
                <span className="text-xs bg-slate-100 text-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 font-medium">
                  هاوبەش دیاری نەکراوە
                </span>
              )}

              {remainingStockQty > 0 ? (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md">
                  پشکی ئێستا (کۆگا ماوە: {formatNumber(remainingStockQty)} {product.unit || 'کگم'})
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-md">
                  تەواوبوو (کۆگا نەماوە) ✓
                </span>
              )}
            </div>
            <p className="text-xs text-slate-900 mt-0.5">
              بڕی پارەی دیاریکراو و بەشی پشکی هاوبەش لە قازانجی ئەم بارە
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-indigo-100">
          {!isEditingShareholder && (
            <div className="text-right">
              <span className="text-[11px] text-indigo-700 font-bold block">پارەی پشکی هاوبەش:</span>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-xl sm:text-2xl lg:text-3xl font-black text-indigo-950 tracking-tight">
                  {product.shareholderName
                    ? (shareholderShareAmount > 0 
                        ? formatNumber(Math.round(shareholderShareAmount))
                        : (totalNetProfit <= 0 ? '0' : formatNumber(Math.round(shareholderShareAmount))))
                    : '---'}
                </span>
                <span className="text-xs sm:text-sm font-black text-indigo-600">
                  {settings.currency === 'USD' ? '$' : 'د.ع'}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsEditingShareholder(!isEditingShareholder);
              setShareholderNameInput(product.shareholderName || '');
              setShareholderPercentInput(product.shareholderPercentage?.toString() || '10');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700 hover:text-indigo-900 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 active:scale-95"
            title="دەستکاری زانیاری هاوبەش"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isEditingShareholder ? 'داخستن' : 'دەستکاری پشک'}</span>
          </button>
        </div>
      </div>

      {/* Edit Form */}
      {isEditingShareholder && (
        <div className="space-y-3 pt-3 border-t border-white/10 animate-in fade-in slide-in-from-top-1 duration-200 bg-slate-900/60 backdrop-blur-md p-3 rounded-xl border border-white/10 text-white">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-6">
              <label className="text-[11px] font-bold text-white mb-1 block">ناوی هاوبەش:</label>
              <input
                type="text"
                value={shareholderNameInput}
                onChange={(e) => setShareholderNameInput(e.target.value)}
                list="shareholder-suggestions"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-950/70 text-white outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs font-bold"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-[11px] font-bold text-white mb-1 block">ڕێژەی پشک (٪):</label>
              <div className="relative">
                <input
                  type="number"
                  value={shareholderPercentInput}
                  onChange={(e) => setShareholderPercentInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-950/70 text-white outline-none focus:ring-2 focus:ring-cyan-500 text-center font-mono font-black shadow-2xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-300 font-bold">%</span>
              </div>
            </div>

            <div className="sm:col-span-3 flex items-end">
              <button
                type="button"
                onClick={handleSaveShareholderInfo}
                className="w-full py-2 px-4 bg-cyan-600 text-white text-xs sm:text-sm font-black rounded-xl hover:bg-cyan-500 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>خەزنکرا ✓</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>خەزنکردن</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick percentage buttons */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/10">
            <span className="text-[11px] text-slate-300 font-bold">ڕێژەی خێرا:</span>
            {[5, 10, 15, 20, 25, 33, 50].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setShareholderPercentInput(String(p))}
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border bg-white/5 hover:bg-white/15 border-white/10 text-white transition-colors cursor-pointer"
              >
                {p}%
              </button>
            ))}
          </div>

          <datalist id="shareholder-suggestions">
            {existingShareholderNames.map(name => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      )}
    </div>
  );
}
