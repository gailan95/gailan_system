import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  BarChart3,
  LineChart,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  Award,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Table as TableIcon,
  Sparkles,
} from 'lucide-react';
import { Sale, Expense, ClosedProductArchive, Product, Currency } from '../types';
import { formatCurrency } from '../utils/formatters';

interface MonthlyProfitComparisonChartProps {
  sales: Sale[];
  expenses: Expense[];
  closedProductArchives: ClosedProductArchive[];
  products: Product[];
  closedMonthsArchives: Array<{
    monthKey: string;
    closedAt: string;
    closedProductsProfit: number;
    totalExpenses: number;
    netProfit: number;
  }>;
  currency?: Currency;
  usdToIqdRate?: number;
  onSelectMonth?: (monthKey: string) => void;
}

export const MonthlyProfitComparisonChart: React.FC<MonthlyProfitComparisonChartProps> = ({
  sales,
  expenses,
  closedProductArchives,
  products,
  closedMonthsArchives,
  currency = 'IQD',
  usdToIqdRate = 1500,
  onSelectMonth,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [chartType, setChartType] = useState<'bar' | 'area' | 'table'>('bar');
  const [metricMode, setMetricMode] = useState<'profit' | 'all'>('profit');
  const [isExpanded, setIsExpanded] = useState(true);

  // Determine available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    sales.forEach((s) => {
      const y = new Date(s.date).getFullYear();
      if (!isNaN(y) && y > 2000) years.add(y);
    });
    expenses.forEach((e) => {
      const y = new Date(e.date).getFullYear();
      if (!isNaN(y) && y > 2000) years.add(y);
    });
    closedProductArchives.forEach((a) => {
      const y = new Date(a.closedAt).getFullYear();
      if (!isNaN(y) && y > 2000) years.add(y);
    });
    closedMonthsArchives.forEach((m) => {
      const y = parseInt(m.monthKey.split('-')[0], 10);
      if (!isNaN(y) && y > 2000) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [sales, expenses, closedProductArchives, closedMonthsArchives]);

  // Aggregate monthly data for the selected year
  const comparisonData = useMemo(() => {
    const kurdishMonths = [
      'کانوونی دووەم',
      'شوبات',
      'ئادار',
      'نیسان',
      'ئایار',
      'حوزەیران',
      'تەمموز',
      'ئاب',
      'ئەیلوول',
      'تشرینی یەکەم',
      'تشرینی دووەم',
      'کانوونی یەکەم',
    ];
    const kurdishMonthsShort = [
      'ک. دووەم',
      'شوبات',
      'ئادار',
      'نیسان',
      'ئایار',
      'حوزەیران',
      'تەمموز',
      'ئاب',
      'ئەیلوول',
      'ت. یەکەم',
      'ت. دووەم',
      'ک. یەکەم',
    ];

    const months = [];
    let totalProfit = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalCost = 0;
    let maxProfit = -Infinity;
    let bestMonthIdx = -1;
    let profitableCount = 0;
    let lossCount = 0;

    for (let m = 0; m < 12; m++) {
      const monthKey = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
      const archived = closedMonthsArchives.find((item) => item.monthKey === monthKey);

      // Monthly expenses
      const monthExp = expenses
        .filter((e) => {
          const d = new Date(e.date);
          return d.getFullYear() === selectedYear && d.getMonth() === m;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      // Monthly sales
      const monthSales = sales.filter((s) => {
        const d = new Date(s.date);
        return d.getFullYear() === selectedYear && d.getMonth() === m;
      });
      const salesRev = monthSales.reduce((sum, s) => sum + s.total, 0);
      const salesCost = monthSales.reduce(
        (sum, s) =>
          sum +
          s.items.reduce((iSum, item) => iSum + (item.purchasePrice || 0) * item.quantity, 0),
        0
      );
      const salesGross = salesRev - salesCost;

      // Closed products
      const monthClosedArchives = closedProductArchives.filter((a) => {
        const d = new Date(a.closedAt);
        return d.getFullYear() === selectedYear && d.getMonth() === m;
      });
      const closedProfit = monthClosedArchives.reduce((sum, a) => {
        const p = a.totalRevenue - (a.totalCost || 0);
        const share = a.shareholderPercentage ? (p * a.shareholderPercentage) / 100 : 0;
        return sum + (p - share);
      }, 0);
      const closedRev = monthClosedArchives.reduce((sum, a) => sum + a.totalRevenue, 0);
      const closedCost = monthClosedArchives.reduce((sum, a) => sum + (a.totalCost || 0), 0);

      let netProfit = 0;
      let revenue = salesRev || closedRev;
      let cost = salesCost || closedCost;
      let expenseVal = archived ? archived.totalExpenses : monthExp;

      if (archived) {
        netProfit = archived.netProfit;
      } else if (closedProfit > 0) {
        netProfit = closedProfit - monthExp;
      } else if (salesRev > 0) {
        netProfit = salesGross - monthExp;
      } else if (monthExp > 0) {
        netProfit = -monthExp;
      } else {
        netProfit = 0;
      }

      totalProfit += netProfit;
      totalRevenue += revenue;
      totalExpenses += expenseVal;
      totalCost += cost;

      if (netProfit > 0) profitableCount++;
      if (netProfit < 0) lossCount++;

      if (netProfit > maxProfit && (revenue > 0 || netProfit !== 0)) {
        maxProfit = netProfit;
        bestMonthIdx = m;
      }

      months.push({
        monthIndex: m,
        monthKey,
        monthName: kurdishMonths[m],
        monthShort: kurdishMonthsShort[m],
        monthNumber: m + 1,
        netProfit,
        revenue,
        cost,
        expenses: expenseVal,
        isArchived: Boolean(archived),
        hasActivity: revenue > 0 || expenseVal > 0 || netProfit !== 0,
      });
    }

    // Month-over-month growth
    const withGrowth = months.map((item, idx, arr) => {
      let growthPercent: number | null = null;
      if (idx > 0) {
        const prev = arr[idx - 1].netProfit;
        if (prev !== 0) {
          growthPercent = Math.round(((item.netProfit - prev) / Math.abs(prev)) * 100);
        } else if (item.netProfit > 0) {
          growthPercent = 100;
        } else if (item.netProfit < 0) {
          growthPercent = -100;
        }
      }
      return {
        ...item,
        growthPercent,
      };
    });

    const avgMonthlyProfit = Math.round(totalProfit / 12);
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

    return {
      year: selectedYear,
      months: withGrowth,
      totalProfit,
      totalRevenue,
      totalExpenses,
      totalCost,
      avgMonthlyProfit,
      profitMargin,
      bestMonth: bestMonthIdx >= 0 ? withGrowth[bestMonthIdx] : null,
      profitableCount,
      lossCount,
    };
  }, [selectedYear, sales, expenses, closedProductArchives, closedMonthsArchives]);

  // Custom Glass Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          dir="rtl"
          className="bg-slate-950/90 backdrop-blur-xl p-3.5 rounded-2xl border border-white/20 shadow-2xl text-white text-xs space-y-2 min-w-[200px]"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-extrabold text-sm text-cyan-300">{data.monthName} {selectedYear}</span>
            {data.isArchived && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                ئەرشیفکراو
              </span>
            )}
          </div>
          <div className="space-y-1.5 font-medium text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-200 font-bold">سافی قازانج:</span>
              <span
                className={`font-mono font-black ${
                  data.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {data.netProfit >= 0 ? '+' : ''}
                {formatCurrency(data.netProfit, currency, usdToIqdRate)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-200 font-medium">
              <span>داهاتی فرۆش:</span>
              <span className="font-mono font-bold text-sky-300">
                {formatCurrency(data.revenue, currency, usdToIqdRate)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-200 font-medium">
              <span>خەرجییەکان:</span>
              <span className="font-mono font-bold text-rose-300">
                {formatCurrency(data.expenses, currency, usdToIqdRate)}
              </span>
            </div>
            {data.growthPercent !== null && (
              <div className="flex justify-between items-center pt-1 border-t border-white/10 text-[10px]">
                <span className="text-slate-300 font-medium">گەشە بەرامبەر مانگی پێشوو:</span>
                <span
                  className={`font-mono font-bold ${
                    data.growthPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {data.growthPercent >= 0 ? '▲ +' : '▼ '}
                  {data.growthPercent}%
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      dir="rtl"
      className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl text-white space-y-4 transition-all duration-300 relative overflow-hidden"
    >
      {/* Top Accent Line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-500 opacity-90"></div>

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        {/* Title & Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-emerald-400 via-teal-500 to-cyan-600 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 border border-cyan-300/40">
            <BarChart3 className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              بەراوردکاری قازانجی مانگەکانی ساڵ
              <span className="text-xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded-lg border border-white/15 text-cyan-300">
                {selectedYear}
              </span>
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              شیکاری و بەراوردکردنی قازانج، داهات و خەرجی مانگ بە مانگ
            </p>
          </div>
        </div>

        {/* Controls: Year Selector + View Mode Switcher + Expand */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Year Switcher */}
          <div className="flex items-center gap-1 bg-slate-950/60 border border-white/10 rounded-xl p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="ساڵی پێشوو"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold font-mono text-cyan-300 px-2 py-0.5 focus:outline-none cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} className="bg-slate-900 text-white">
                  {yr}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y + 1)}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="ساڵی دواتر"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center gap-1 bg-slate-950/60 border border-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setMetricMode('profit')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                metricMode === 'profit'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-200 hover:text-white hover:bg-white/10 font-bold'
              }`}
            >
              سافی قازانج
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                metricMode === 'all'
                  ? 'bg-cyan-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-200 hover:text-white hover:bg-white/10 font-bold'
              }`}
            >
              گشت ئامارەکان
            </button>
          </div>

          {/* Chart View Switcher */}
          <div className="flex items-center gap-1 bg-slate-950/60 border border-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-white/20 text-cyan-300 shadow-inner'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="هێڵکاری ستوونی"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                chartType === 'area'
                  ? 'bg-white/20 text-cyan-300 shadow-inner'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="هێڵکاری ڕووبەر"
            >
              <LineChart className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('table')}
              className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                chartType === 'table'
                  ? 'bg-white/20 text-cyan-300 shadow-inner'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="خشتەی بەراوردکاری"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle Expand */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-slate-950/60 border border-white/10 text-cyan-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title={isExpanded ? 'داخستن' : 'کردنەوە'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-1 animate-fadeIn">
          {/* 4 Summary KPI Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Total Annual Profit */}
            <div className="bg-slate-950/50 border border-white/10 rounded-2xl p-3 sm:p-3.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-white font-black mb-1">
                <span>کۆی قازانجی ساڵ</span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  {comparisonData.profitMargin}%
                </span>
              </div>
              <div
                className={`text-lg sm:text-xl lg:text-2xl font-black font-mono tracking-tight ${
                  comparisonData.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {comparisonData.totalProfit >= 0 ? '+' : ''}
                {formatCurrency(comparisonData.totalProfit, currency, usdToIqdRate)}
              </div>
              <span className="text-[10px] text-slate-300 font-medium mt-0.5">پوختەی دەستکەوتی ساڵانە</span>
            </div>

            {/* Best Month */}
            <div className="bg-slate-950/50 border border-white/10 rounded-2xl p-3 sm:p-3.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-white font-black mb-1">
                <span>باشترین مانگ</span>
                <Award className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-base sm:text-lg font-black text-amber-300 truncate">
                {comparisonData.bestMonth ? comparisonData.bestMonth.monthName : '—'}
              </div>
              <span className="text-[10.5px] font-mono font-bold text-emerald-400 mt-0.5">
                {comparisonData.bestMonth
                  ? formatCurrency(comparisonData.bestMonth.netProfit, currency, usdToIqdRate)
                  : '—'}
              </span>
            </div>

            {/* Monthly Average Profit */}
            <div className="bg-slate-950/50 border border-white/10 rounded-2xl p-3 sm:p-3.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-white font-black mb-1">
                <span>تێکڕای مانگانە</span>
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div
                className={`text-base sm:text-lg lg:text-xl font-black font-mono ${
                  comparisonData.avgMonthlyProfit >= 0 ? 'text-cyan-300' : 'text-rose-400'
                }`}
              >
                {comparisonData.avgMonthlyProfit >= 0 ? '+' : ''}
                {formatCurrency(comparisonData.avgMonthlyProfit, currency, usdToIqdRate)}
              </div>
              <span className="text-[10px] text-slate-300 font-medium mt-0.5">تێکڕای قازانج لە مانگێکدا</span>
            </div>

            {/* Profitable Months Count */}
            <div className="bg-slate-950/50 border border-white/10 rounded-2xl p-3 sm:p-3.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-white font-black mb-1">
                <span>مانگە قازانجدارەکان</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-base sm:text-lg lg:text-xl font-black text-emerald-400 font-mono">
                {comparisonData.profitableCount} <span className="text-xs text-slate-300 font-medium">لە 12 مانگ</span>
              </div>
              <span className="text-[10px] text-slate-300 font-medium mt-0.5">
                {comparisonData.lossCount > 0 ? `${comparisonData.lossCount} مانگ لە زیاندا بووە` : 'سەرجەم مانگەکان قازانجدارن'}
              </span>
            </div>
          </div>

          {/* Main Visual Section (Bar / Area / Table) */}
          <div className="bg-slate-950/40 border border-white/10 rounded-2xl p-3 sm:p-4">
            {chartType === 'bar' && (
              <div className="h-[280px] sm:h-[320px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData.months} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />
                    <XAxis
                      dataKey="monthShort"
                      stroke="#94a3b8"
                      tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
                    {metricMode === 'all' ? (
                      <>
                        <Bar dataKey="revenue" name="داهات" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" name="خەرجی" fill="#fb7185" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="netProfit" name="سافی قازانج" radius={[4, 4, 0, 0]}>
                          {comparisonData.months.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.netProfit >= 0 ? '#10b981' : '#f43f5e'}
                            />
                          ))}
                        </Bar>
                      </>
                    ) : (
                      <Bar dataKey="netProfit" name="سافی قازانج" radius={[6, 6, 0, 0]}>
                        {comparisonData.months.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.netProfit >= 0 ? '#10b981' : '#f43f5e'}
                          />
                        ))}
                      </Bar>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartType === 'area' && (
              <div className="h-[280px] sm:h-[320px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={comparisonData.months} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />
                    <XAxis
                      dataKey="monthShort"
                      stroke="#94a3b8"
                      tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
                    {metricMode === 'all' && (
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="داهات"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#revGrad)"
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="netProfit"
                      name="سافی قازانج"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#profitGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartType === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[600px]">
                  <thead className="bg-slate-900/90 text-cyan-200 font-black border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3">مانگ</th>
                      <th className="py-2.5 px-3">داهاتی فرۆش</th>
                      <th className="py-2.5 px-3">تێچووی کاڵا</th>
                      <th className="py-2.5 px-3">خەرجییەکان</th>
                      <th className="py-2.5 px-3">سافی قازانج</th>
                      <th className="py-2.5 px-3 text-center">گەشە</th>
                      <th className="py-2.5 px-3 text-center">کردار</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {comparisonData.months.map((m) => (
                      <tr key={m.monthKey} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                          <span>{m.monthName}</span>
                          {m.isArchived && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                              ئەرشیف
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-100">
                          {formatCurrency(m.revenue, currency, usdToIqdRate)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-200">
                          {formatCurrency(m.cost, currency, usdToIqdRate)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-300">
                          {formatCurrency(m.expenses, currency, usdToIqdRate)}
                        </td>
                        <td
                          className={`py-2.5 px-3 font-mono font-black ${
                            m.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {m.netProfit >= 0 ? '+' : ''}
                          {formatCurrency(m.netProfit, currency, usdToIqdRate)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          {m.growthPercent !== null ? (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                                m.growthPercent >= 0
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {m.growthPercent >= 0 ? '+' : ''}
                              {m.growthPercent}%
                            </span>
                          ) : (
                            <span className="text-slate-400 font-bold">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {onSelectMonth && (
                            <button
                              type="button"
                              onClick={() => onSelectMonth(m.monthKey)}
                              className="text-[10px] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 px-2 py-1 rounded-lg border border-cyan-500/30 transition-colors cursor-pointer font-bold"
                            >
                              پیشاندان
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 12 Months Interactive Mini-Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {comparisonData.months.map((m) => {
              const isPositive = m.netProfit >= 0;
              const isBest = comparisonData.bestMonth?.monthKey === m.monthKey && m.netProfit > 0;
              return (
                <div
                  key={m.monthKey}
                  onClick={() => onSelectMonth && onSelectMonth(m.monthKey)}
                  className={`bg-slate-950/40 hover:bg-slate-950/70 border ${
                    isBest
                      ? 'border-amber-400/50 shadow-md shadow-amber-500/10'
                      : 'border-white/10 hover:border-white/20'
                  } rounded-2xl p-2.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group`}
                >
                  <div className="flex items-center justify-between text-[11px] font-black text-white mb-1">
                    <span className="group-hover:text-cyan-300 transition-colors truncate">
                      {m.monthName}
                    </span>
                    {isBest && <Award className="w-3 h-3 text-amber-400 shrink-0" />}
                  </div>
                  <div
                    className={`font-mono font-black text-xs sm:text-sm tracking-tight ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {formatCurrency(m.netProfit, currency, usdToIqdRate)}
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5 text-[9.5px] text-slate-300 font-mono font-medium">
                    <span>خەرجی: {formatCurrency(m.expenses, currency, usdToIqdRate)}</span>
                    {m.growthPercent !== null && (
                      <span className={m.growthPercent >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {m.growthPercent >= 0 ? '▲' : '▼'}{Math.abs(m.growthPercent)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
