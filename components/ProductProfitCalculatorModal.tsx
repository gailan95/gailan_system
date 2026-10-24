import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Percent,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Currency } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ProductProfitCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: Currency;
  usdToIqdRate: number;
}

export const ProductProfitCalculatorModal: React.FC<ProductProfitCalculatorModalProps> = ({
  isOpen,
  onClose,
  currency,
  usdToIqdRate,
}) => {
  // Input states
  const [productName, setProductName] = useState('');
  const [costInput, setCostInput] = useState('');
  const [retailPriceInput, setRetailPriceInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');

  // Advanced cost breakdown toggle
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [purchasePriceInput, setPurchasePriceInput] = useState('');
  const [extraExpensesInput, setExtraExpensesInput] = useState('');

  // Handle advanced breakdown calculation
  const handleUpdateBreakdown = (purchaseVal: string, extraVal: string) => {
    setPurchasePriceInput(purchaseVal);
    setExtraExpensesInput(extraVal);
    const p = parseFloat(purchaseVal.replace(/,/g, '')) || 0;
    const e = parseFloat(extraVal.replace(/,/g, '')) || 0;
    const total = p + e;
    setCostInput(total > 0 ? String(total) : '');
  };

  // Parsed numerical values
  const cost = useMemo(() => {
    return parseFloat(costInput.replace(/,/g, '')) || 0;
  }, [costInput]);

  const targetRetailPrice = useMemo(() => {
    return parseFloat(retailPriceInput.replace(/,/g, '')) || 0;
  }, [retailPriceInput]);

  const quantity = useMemo(() => {
    const q = parseFloat(quantityInput.replace(/,/g, ''));
    return isNaN(q) || q <= 0 ? 1 : q;
  }, [quantityInput]);

  // Calculations
  const unitDifference = targetRetailPrice - cost; // Difference in currency per unit
  const isProfitable = unitDifference > 0;
  const isLoss = unitDifference < 0;
  const isBreakEven = unitDifference === 0 && targetRetailPrice > 0;

  // Margin % = (Retail Price - Cost) / Retail Price * 100
  const profitMarginPercent = useMemo(() => {
    if (targetRetailPrice <= 0) return 0;
    return (unitDifference / targetRetailPrice) * 100;
  }, [unitDifference, targetRetailPrice]);

  // Markup % = (Retail Price - Cost) / Cost * 100
  const markupPercent = useMemo(() => {
    if (cost <= 0) return 0;
    return (unitDifference / cost) * 100;
  }, [unitDifference, cost]);

  // Batch calculations
  const totalRevenue = targetRetailPrice * quantity;
  const totalCost = cost * quantity;
  const totalDifference = unitDifference * quantity;

  // Percentage distribution of selling price: Cost % vs Margin %
  const costShareOfPrice = useMemo(() => {
    if (targetRetailPrice <= 0) return 0;
    const ratio = (cost / targetRetailPrice) * 100;
    return Math.min(100, Math.max(0, ratio));
  }, [cost, targetRetailPrice]);

  const marginShareOfPrice = useMemo(() => {
    if (targetRetailPrice <= 0) return 0;
    const ratio = (unitDifference / targetRetailPrice) * 100;
    return Math.min(100, Math.max(0, ratio));
  }, [unitDifference, targetRetailPrice]);

  // Quick Margin Target Setter: given cost and desired margin %, set retail price
  const applyTargetMargin = (targetMargin: number) => {
    if (cost <= 0) return;
    // formula: Price = Cost / (1 - Margin/100)
    const suggestedPrice = Math.round(cost / (1 - targetMargin / 100));
    setRetailPriceInput(String(suggestedPrice));
  };

  // Quick Markup Target Setter: given cost and desired markup %, set retail price
  const applyTargetMarkup = (targetMarkup: number) => {
    if (cost <= 0) return;
    // formula: Price = Cost * (1 + Markup/100)
    const suggestedPrice = Math.round(cost * (1 + targetMarkup / 100));
    setRetailPriceInput(String(suggestedPrice));
  };

  const handleReset = () => {
    setProductName('');
    setCostInput('');
    setRetailPriceInput('');
    setQuantityInput('1');
    setPurchasePriceInput('');
    setExtraExpensesInput('');
    setShowCostBreakdown(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0 relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.4),inset_0_1.5px_1.5px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.2)] border border-emerald-300/50 shrink-0">
              <Calculator className="w-5 h-5 filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">ئەژمێرەری قازانجی کاڵا</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  خەمڵاندنی نوێ
                </span>
              </div>
              <p className="text-xs text-slate-900">
                حیسابکردنی دەستیی جیاوازی نرخ و ڕێژەی قازانج بە پارە و بە سەدی (%) پێش فرۆشتن
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="داخستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Input Fields Grid */}
          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-600" />
                زانیارییەکانی تێچوو و نرخی فرۆشتنی دیاریکراو
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] font-bold text-slate-900 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                پاککردنەوە
              </button>
            </div>

            {/* Optional Product Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-900 mb-1">
                ناوی کاڵا (ئارەزوومەندانە):
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="بۆ نموونە: تەماتەی ئێرانی پلە یەک..."
                className="w-full bg-white text-slate-900 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold"
              />
            </div>

            {/* Two Main Inputs: Cost & Target Retail Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Cost Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-900">
                    تێچووی کڕین / یەکە (Cost) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCostBreakdown(!showCostBreakdown)}
                    className="text-[10px] font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    {showCostBreakdown ? 'تێچووی ڕاستەوخۆ' : 'وردەکاریی خەرجی'}
                    {showCostBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {!showCostBreakdown ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={costInput}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                        setCostInput(raw);
                      }}
                      placeholder="0"
                      className="w-full bg-white text-slate-900 font-mono font-bold text-sm sm:text-base rounded-xl pr-3.5 pl-12 py-2.5 border border-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-700 pointer-events-none">
                      {currency === 'USD' ? 'USD' : 'د.ع'}
                    </span>
                  </div>
                ) : (
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] font-black text-slate-800 block mb-0.5">نرخی کڕین:</span>
                        <input
                          type="text"
                          value={purchasePriceInput}
                          onChange={(e) =>
                            handleUpdateBreakdown(e.target.value.replace(/[^0-9.]/g, ''), extraExpensesInput)
                          }
                          placeholder="0"
                          className="w-full bg-white text-xs font-mono font-bold rounded-lg px-2 py-1.5 border border-slate-300 focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-800 block mb-0.5">خەرجی زیادە/کرێ:</span>
                        <input
                          type="text"
                          value={extraExpensesInput}
                          onChange={(e) =>
                            handleUpdateBreakdown(purchasePriceInput, e.target.value.replace(/[^0-9.]/g, ''))
                          }
                          placeholder="0"
                          className="w-full bg-white text-xs font-mono font-bold rounded-lg px-2 py-1.5 border border-slate-300 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-black text-emerald-900 pt-1 border-t border-emerald-200">
                      <span>کۆی تێچوو:</span>
                      <span className="font-mono">
                        {formatCurrency(cost, currency, usdToIqdRate)}
                      </span>
                    </div>
                  </div>
                )}
                <span className="text-[10px] text-slate-800 font-bold block">نرخی کڕین لەگەڵ سەرجەم خەرجییەکان</span>
              </div>

              {/* Target Retail Price Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-900">
                  نرخی فرۆشتنی دیاریکراو (Target Price) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={retailPriceInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, '');
                      setRetailPriceInput(raw);
                    }}
                    placeholder="0"
                    className="w-full bg-white text-slate-900 font-mono font-black text-sm sm:text-base rounded-xl pr-3.5 pl-12 py-2.5 border border-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-slate-700 pointer-events-none">
                    {currency === 'USD' ? 'USD' : 'د.ع'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-800 font-bold block">نرخی فرۆشتن بە کڕیار بۆ هەر یەکەیەک</span>
              </div>
            </div>

            {/* Quick Profit Margin Presets */}
            {cost > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-200/70">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-black text-slate-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    دیاریکردنی نرخ بەپێی ڕێژەی قازانجی دیاریکراو (Margin %):
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[10, 15, 20, 25, 30, 40, 50].map((percent) => (
                    <button
                      key={percent}
                      type="button"
                      onClick={() => applyTargetMargin(percent)}
                      className="px-2.5 py-1 rounded-lg text-[10.5px] font-black bg-white hover:bg-emerald-50 text-slate-900 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      +{percent}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity / Weight Input for batch simulation */}
            <div className="pt-2 border-t border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <label className="text-xs font-bold text-slate-900">
                    کێشی کاڵاکە یان بڕ (کگم یان دانە):
                  </label>
                </div>
                <div className="w-32 relative">
                  <input
                    type="text"
                    value={quantityInput}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, '');
                      setQuantityInput(raw);
                    }}
                    placeholder="کێش بنووسە..."
                    className="w-full text-center bg-white text-slate-900 font-mono font-black text-xs sm:text-sm rounded-xl py-1.5 border border-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <span className="text-[10px] text-slate-800 font-bold">کێشە باوەکان:</span>
                {[100, 500, 1000, 5000, 10000, 25000].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setQuantityInput(String(w))}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border bg-white hover:bg-emerald-50 border-slate-200 text-slate-900 transition-colors cursor-pointer"
                  >
                    {w >= 1000 ? `${w / 1000} تەن` : `${w} کگم`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-600" />
                ئەنجامی خەمڵاندنی قازانج و جیاوازی نرخ
              </h4>

              {/* Status Badge */}
              {targetRetailPrice > 0 && cost > 0 && (
                <div>
                  {isProfitable && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300/80">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      قازانجدارە (+{profitMarginPercent.toFixed(1)}%)
                    </span>
                  )}
                  {isLoss && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300/80">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                      زیانە ({profitMarginPercent.toFixed(1)}%)
                    </span>
                  )}
                  {isBreakEven && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-300/80">
                      سەربەسەر (بێ قازانج و زیان)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Primary Difference Highlights Cards (Currency & Percentage) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Card 1: Difference in Currency */}
              <div
                className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                  isLoss
                    ? 'bg-gradient-to-br from-rose-50/80 to-rose-100/50 border-rose-200 shadow-sm'
                    : isProfitable
                    ? 'bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-emerald-100/50 border-emerald-200 shadow-sm'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-900">جیاوازی بە پارە (قازانجی یەکە)</span>
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                      isLoss
                        ? 'bg-rose-500 text-white'
                        : isProfitable
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-400 text-white'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div
                    className={`text-xl sm:text-2xl font-mono font-black tracking-tight ${
                      isLoss
                        ? 'text-rose-600'
                        : isProfitable
                        ? 'text-emerald-700'
                        : 'text-slate-900'
                    }`}
                  >
                    {isProfitable ? '+' : ''}
                    {formatCurrency(unitDifference, currency, usdToIqdRate)}
                  </div>
                  <span className="text-[10px] text-slate-900 block mt-1">
                    جیاوازی نێوان نرخی فرۆشتن و تێچوو بۆ هەر ١ یەکە
                  </span>
                </div>
              </div>

              {/* Card 2: Difference in Percentage (Profit Margin %) */}
              <div
                className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                  isLoss
                    ? 'bg-gradient-to-br from-rose-50/80 to-rose-100/50 border-rose-200 shadow-sm'
                    : isProfitable
                    ? 'bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-emerald-100/50 border-emerald-200 shadow-sm'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-900">ڕێژەی قازانج لە فرۆش (Margin %)</span>
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                      isLoss
                        ? 'bg-rose-500 text-white'
                        : isProfitable
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-400 text-white'
                    }`}
                  >
                    <Percent className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div
                    className={`text-xl sm:text-2xl font-mono font-black tracking-tight ${
                      isLoss
                        ? 'text-rose-600'
                        : isProfitable
                        ? 'text-emerald-700'
                        : 'text-slate-900'
                    }`}
                  >
                    {isProfitable ? '+' : ''}
                    {profitMarginPercent.toFixed(2)}%
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-900">
                    <span>ڕێژەی زیادکردن لەسەر تێچوو (Markup):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {isProfitable ? '+' : ''}
                      {markupPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Margin Composition Bar */}
            {targetRetailPrice > 0 && cost > 0 && (
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                    تێچوو: {costShareOfPrice.toFixed(1)}%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full inline-block ${
                        isLoss ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    ></span>
                    {isLoss ? 'زیان' : 'قازانج'}: {Math.abs(marginShareOfPrice).toFixed(1)}%
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${Math.min(100, costShareOfPrice)}%` }}
                    className="bg-slate-400 h-full transition-all duration-300"
                    title={`تێچوو: ${costShareOfPrice.toFixed(1)}%`}
                  ></div>
                  <div
                    style={{ width: `${Math.min(100, Math.abs(marginShareOfPrice))}%` }}
                    className={`h-full transition-all duration-300 ${
                      isLoss ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    title={`${isLoss ? 'زیان' : 'قازانج'}: ${Math.abs(marginShareOfPrice).toFixed(1)}%`}
                  ></div>
                </div>
              </div>
            )}

            {/* Batch Totals Grid (If Quantity > 1 or for total batch evaluation) */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-white">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Layers className="w-4 h-4" />
                  خەمڵاندنی کۆی گشتی بۆ بڕی ({quantity.toLocaleString()} یەکە)
                </span>
                {productName && (
                  <span className="bg-white/10 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white">
                    {productName}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-800">
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-300 font-bold block mb-0.5">کۆی تێچوو:</span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-amber-200 block">
                    {formatCurrency(totalCost, currency, usdToIqdRate)}
                  </span>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-300 font-bold block mb-0.5">کۆی فرۆش:</span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-white block">
                    {formatCurrency(totalRevenue, currency, usdToIqdRate)}
                  </span>
                </div>
                <div
                  className={`p-2 rounded-xl border ${
                    totalDifference >= 0
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-200 block mb-0.5">کۆی قازانج:</span>
                  <span className="font-mono text-xs sm:text-sm font-black block">
                    {totalDifference >= 0 ? '+' : ''}
                    {formatCurrency(totalDifference, currency, usdToIqdRate)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-900 hidden sm:block">
            دەتوانیت نرخەکان بگۆڕیت و ڕاستەوخۆ کاردانەوەی قازانجەکە ببینیت
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black transition-colors shadow-xs cursor-pointer text-center"
            >
              داخستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
