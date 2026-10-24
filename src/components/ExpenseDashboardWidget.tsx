import React, { useState, useMemo } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Wallet,
  Calendar,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Receipt,
  Tag,
  Clock,
  User,
  UserCheck,
  ExternalLink,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Expense } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';

interface ExpenseDashboardWidgetProps {
  expenses: Expense[];
  settings?: any;
  initialMonth?: string;
  onGoToExpenses?: () => void;
}

type PeriodMode = 'month' | 'all' | 'today' | 'year';
type ChartType = 'pie' | 'bar' | 'trend';

// Category color mappings with vibrant, accessible accents
const CATEGORY_COLORS: Record<string, string> = {
  'گواستنەوە': '#f59e0b', // Amber / Orange
  'خزمەتگوزاری': '#0284c7', // Sky Blue
  'مووچە': '#10b981', // Emerald
  'چاککردنەوە': '#8b5cf6', // Violet
  'گشتی': '#f43f5e', // Rose
  'کرێ': '#ec4899', // Pink
  'کرێی دوکان': '#ec4899',
  'خۆراک': '#06b6d4', // Cyan
  'کارەبا و ئاو': '#eab308', // Yellow
};

const FALLBACK_PALETTE = [
  '#f59e0b',
  '#0284c7',
  '#10b981',
  '#8b5cf6',
  '#f43f5e',
  '#ec4899',
  '#06b6d4',
  '#14b8a6',
  '#6366f1',
  '#e11d48',
];

const getCategoryColor = (categoryName: string, index: number = 0): string => {
  if (CATEGORY_COLORS[categoryName]) {
    return CATEGORY_COLORS[categoryName];
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
};

export const ExpenseDashboardWidget: React.FC<ExpenseDashboardWidgetProps> = ({
  expenses = [],
  settings = { currency: 'IQD', usdToIqdRate: 1500 },
  initialMonth,
  onGoToExpenses,
}) => {
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [chartType, setChartType] = useState<ChartType>('pie');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Selected Month (defaults to initialMonth or current local month YYYY-MM)
  const [activeMonth, setActiveMonth] = useState<string>(() => {
    if (initialMonth && /^\d{4}-\d{2}$/.test(initialMonth)) {
      return initialMonth;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Keep synced if initialMonth changes from parent
  React.useEffect(() => {
    if (initialMonth && /^\d{4}-\d{2}$/.test(initialMonth) && initialMonth !== activeMonth) {
      setActiveMonth(initialMonth);
    }
  }, [initialMonth]);

  // Robust date parser for any expense date format (ISO, Timestamp, YYYY-MM-DD, Kurdish digits)
  const parseExpenseDate = (raw: any): { ymd: string; year: number; month: number; day: number; dateObj: Date | null } => {
    if (!raw) {
      return { ymd: '', year: 0, month: 0, day: 0, dateObj: null };
    }
    try {
      if (typeof raw === 'string') {
        const norm = raw.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).trim();
        const m = norm.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (m) {
          const y = parseInt(m[1], 10);
          const mo = parseInt(m[2], 10);
          const da = parseInt(m[3], 10);
          const ymd = `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
          return { ymd, year: y, month: mo, day: da, dateObj: new Date(y, mo - 1, da) };
        }
      }
      let d: Date | null = null;
      if (raw && typeof raw === 'object') {
        if (raw.seconds) d = new Date(raw.seconds * 1000);
        else if (typeof raw.toDate === 'function') d = raw.toDate();
        else if (raw instanceof Date) d = raw;
      }
      if (!d) {
        d = new Date(raw);
      }
      if (!d || isNaN(d.getTime())) {
        return { ymd: '', year: 0, month: 0, day: 0, dateObj: null };
      }
      const y = d.getFullYear();
      const mo = d.getMonth() + 1;
      const da = d.getDate();
      const ymd = `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
      return { ymd, year: y, month: mo, day: da, dateObj: d };
    } catch {
      return { ymd: '', year: 0, month: 0, day: 0, dateObj: null };
    }
  };

  // Stepper handlers for Month navigation
  const handlePrevMonth = () => {
    try {
      const [yStr, mStr] = activeMonth.split('-');
      let y = parseInt(yStr, 10);
      let m = parseInt(mStr, 10) - 1;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      setActiveMonth(`${y}-${String(m).padStart(2, '0')}`);
      setPeriodMode('month');
    } catch {}
  };

  const handleNextMonth = () => {
    try {
      const [yStr, mStr] = activeMonth.split('-');
      let y = parseInt(yStr, 10);
      let m = parseInt(mStr, 10) + 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      setActiveMonth(`${y}-${String(m).padStart(2, '0')}`);
      setPeriodMode('month');
    } catch {}
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setActiveMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    setPeriodMode('month');
  };

  // Filtered expenses based on selected periodMode and activeMonth
  const periodExpenses = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    const now = new Date();
    const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const [targetYear, targetMonth] = activeMonth.split('-').map(Number);

    return expenses.filter((e) => {
      const parsed = parseExpenseDate(e.date || (e as any).createdAt);
      if (!parsed.ymd) return false;

      if (periodMode === 'today') {
        return parsed.ymd === todayYmd;
      }
      if (periodMode === 'year') {
        return parsed.year === (targetYear || now.getFullYear());
      }
      if (periodMode === 'all') {
        return true;
      }
      // 'month' mode: exact year and month match
      return parsed.year === targetYear && parsed.month === targetMonth;
    });
  }, [expenses, periodMode, activeMonth]);

  // Aggregate Category breakdown data
  const categoryStats = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    periodExpenses.forEach((e) => {
      const cat = (e.category || 'گشتی').trim();
      const amount = Number(e.amount) || 0;
      const current = map.get(cat) || { total: 0, count: 0 };
      map.set(cat, {
        total: current.total + amount,
        count: current.count + 1,
      });
    });

    const totalPeriodAmount = periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const list = Array.from(map.entries())
      .map(([name, data], idx) => {
        const percentage = totalPeriodAmount > 0 ? (data.total / totalPeriodAmount) * 100 : 0;
        return {
          name,
          total: data.total,
          count: data.count,
          percentage: Number(percentage.toFixed(1)),
          color: getCategoryColor(name, idx),
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      list,
      totalAmount: totalPeriodAmount,
      totalCount: periodExpenses.length,
      topCategory: list.length > 0 ? list[0] : null,
      avgExpense: periodExpenses.length > 0 ? Math.round(totalPeriodAmount / periodExpenses.length) : 0,
    };
  }, [periodExpenses]);

  // Daily trend data for the active month
  const dailyTrendData = useMemo(() => {
    if (periodMode !== 'month') return [];

    const [targetYear, targetMonth] = activeMonth.split('-').map(Number);
    if (!targetYear || !targetMonth) return [];

    // Days in target month
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const dayMap = new Map<number, number>();

    for (let i = 1; i <= daysInMonth; i++) {
      dayMap.set(i, 0);
    }

    periodExpenses.forEach((e) => {
      const parsed = parseExpenseDate(e.date || (e as any).createdAt);
      if (parsed.day && dayMap.has(parsed.day)) {
        dayMap.set(parsed.day, (dayMap.get(parsed.day) || 0) + (Number(e.amount) || 0));
      }
    });

    return Array.from(dayMap.entries()).map(([day, total]) => ({
      day: `${day}`,
      total,
    }));
  }, [periodExpenses, periodMode, activeMonth]);

  // Filtered expense records for the table / list
  const filteredRecords = useMemo(() => {
    return periodExpenses.filter((e) => {
      const matchesCat =
        selectedCategoryFilter === 'all' ||
        (e.category || 'گشتی').trim().toLowerCase() === selectedCategoryFilter.trim().toLowerCase();

      if (!matchesCat) return false;

      if (!searchTerm.trim()) return true;

      const q = searchTerm.trim().toLowerCase();
      const titleMatch = (e.title || '').toLowerCase().includes(q);
      const noteMatch = (e.notes || '').toLowerCase().includes(q);
      const recorderMatch = (e.recordedBy || (e as any).recorderName || '').toLowerCase().includes(q);
      const recipientMatch = ((e as any).recipient || '').toLowerCase().includes(q);
      const categoryMatch = (e.category || '').toLowerCase().includes(q);

      return titleMatch || noteMatch || recorderMatch || recipientMatch || categoryMatch;
    });
  }, [periodExpenses, selectedCategoryFilter, searchTerm]);

  // Convert to USD equivalent
  const totalUsdEquivalent = useMemo(() => {
    const rate = Number(settings.usdToIqdRate) || 1500;
    return (categoryStats.totalAmount / rate).toFixed(2);
  }, [categoryStats.totalAmount, settings.usdToIqdRate]);

  return (
    <div className="bg-slate-900/75 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6" dir="rtl">
      {/* 1. Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 text-rose-400 border border-rose-500/30 shadow-inner">
              <PieIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>داشبۆردی شیکاریی خەرجییەکان و دابەشبوونیان</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  بەپێی بەش
                </span>
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                شیکاریی وردی خەرجییەکان، دیاریکردنی قورسایی بەشەکان، و ڕەوتی کاتی
              </p>
            </div>
          </div>
        </div>

        {/* Right side controls: Period Switcher & Month Picker */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Period Mode Selector */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => setPeriodMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodMode === 'month'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              مانگانە
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodMode === 'all'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              هەمووی
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodMode === 'today'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              ئەمڕۆ
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('year')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodMode === 'year'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              ئەمساڵ
            </button>
          </div>

          {/* Month Stepper (active when in 'month' or 'year' mode) */}
          {periodMode === 'month' && (
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="مانگی پێشوو"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <input
                type="month"
                value={activeMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    setActiveMonth(e.target.value);
                    setPeriodMode('month');
                  }
                }}
                className="bg-transparent text-rose-300 font-mono font-black text-xs px-2 py-0.5 focus:outline-none cursor-pointer text-center"
                title="دەستنیشانکردنی مانگ"
              />

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="مانگی داهاتوو"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleCurrentMonth}
                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 cursor-pointer ml-1"
                title="گەڕانەوە بۆ مانگی ئێستا"
              >
                ئەم مانگە
              </button>
            </div>
          )}

          {/* Quick link to Expenses View / Add Expense */}
          {onGoToExpenses && (
            <button
              type="button"
              onClick={onGoToExpenses}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تۆمارکردن / بەڕێوەبردن</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Summary Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Expenses */}
        <div className="bg-slate-950/70 p-4 rounded-2xl border border-rose-500/20 shadow-inner flex flex-col justify-between relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-2">
            <span>کۆی خەرجییەکان</span>
            <Wallet className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black font-mono text-rose-400 tracking-tight">
              {formatCurrency(categoryStats.totalAmount, settings.currency, settings.usdToIqdRate)}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              ≈ ${totalUsdEquivalent} USD
            </div>
          </div>
        </div>

        {/* Card 2: Total Records Count */}
        <div className="bg-slate-950/70 p-4 rounded-2xl border border-sky-500/20 shadow-inner flex flex-col justify-between relative overflow-hidden group hover:border-sky-500/40 transition-all">
          <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-sky-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-2">
            <span>ژمارەی خەرجییەکان</span>
            <Receipt className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black font-mono text-white tracking-tight">
              {categoryStats.totalCount} <span className="text-xs text-slate-400 font-bold">پسوولە</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              لە ماوەی هەڵبژێردراودا
            </div>
          </div>
        </div>

        {/* Card 3: Top Category */}
        <div className="bg-slate-950/70 p-4 rounded-2xl border border-amber-500/20 shadow-inner flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-2">
            <span>زۆرترین بەشی خەرجکراو</span>
            <Tag className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-sm sm:text-base font-black text-amber-300 truncate">
              {categoryStats.topCategory ? categoryStats.topCategory.name : 'تۆمار نەکراوە'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1.5">
              {categoryStats.topCategory ? (
                <>
                  <span className="font-bold text-amber-400">{categoryStats.topCategory.percentage}%</span>
                  <span>( {formatCurrency(categoryStats.topCategory.total, settings.currency, settings.usdToIqdRate)} )</span>
                </>
              ) : (
                'هیچ بەشێک نییە'
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Average per expense */}
        <div className="bg-slate-950/70 p-4 rounded-2xl border border-emerald-500/20 shadow-inner flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-2">
            <span>تێکڕای هەر خەرجییەک</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-base sm:text-xl font-black font-mono text-emerald-400 tracking-tight">
              {formatCurrency(categoryStats.avgExpense, settings.currency, settings.usdToIqdRate)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              تێکڕا بۆ هەر خەرجییەک
            </div>
          </div>
        </div>
      </div>

      {/* 3. Visualization Area (Chart + Category Breakdown) */}
      <div className="bg-slate-950/80 p-4 sm:p-5 rounded-3xl border border-white/10 space-y-4">
        {/* Chart View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 font-bold">جۆری پێشاندانی شیکاری:</span>
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setChartType('pie')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartType === 'pie'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PieIcon className="w-3.5 h-3.5" />
                <span>دابەشبوونی بازنەیی</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>خشتەی ستوونی</span>
              </button>
              {periodMode === 'month' && (
                <button
                  type="button"
                  onClick={() => setChartType('trend')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartType === 'trend'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>ڕەوتی ڕۆژانە</span>
                </button>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-300 font-bold">
            مەودا: <span className="text-rose-400 font-mono font-black">{periodMode === 'month' ? activeMonth : periodMode}</span> ({categoryStats.list.length} بەش)
          </div>
        </div>

        {/* Charts and Breakdown Container */}
        {categoryStats.list.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Chart Column (7 cols on lg) */}
            <div className="lg:col-span-7 h-72 sm:h-80 w-full relative">
              {chartType === 'pie' && (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={categoryStats.list}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={3}
                      dataKey="total"
                      label={({ name, percent }: any) => `${name} (${((Number(percent) || 0) * 100).toFixed(1)}%)`}
                      labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                    >
                      {categoryStats.list.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        formatCurrency(Number(val) || 0, settings.currency, settings.usdToIqdRate),
                        `خەرجی (${name})`,
                      ]}
                      contentStyle={{
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'right',
                        direction: 'rtl',
                      }}
                    />
                    <Legend
                      formatter={(value) => <span className="text-slate-200 text-xs font-bold">{value}</span>}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}

              {chartType === 'bar' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryStats.list} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#94a3b8"
                      tick={{ fill: '#cbd5e1', fontSize: 11 }}
                      tickFormatter={(val) => formatNumber(val)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{ fill: '#f8fafc', fontSize: 12, fontWeight: 'bold' }}
                      width={90}
                    />
                    <Tooltip
                      formatter={(val: any) => [
                        formatCurrency(Number(val) || 0, settings.currency, settings.usdToIqdRate),
                        'بڕی خەرجی',
                      ]}
                      contentStyle={{
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'right',
                        direction: 'rtl',
                      }}
                    />
                    <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                      {categoryStats.list.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {chartType === 'trend' && periodMode === 'month' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="expenseTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="day" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} tickFormatter={(val) => formatNumber(val)} />
                    <Tooltip
                      formatter={(val: any) => [
                        formatCurrency(Number(val) || 0, settings.currency, settings.usdToIqdRate),
                        'خەرجی ڕۆژ',
                      ]}
                      labelFormatter={(label) => `ڕۆژی ${label}ی مانگ`}
                      contentStyle={{
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'right',
                        direction: 'rtl',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#expenseTrendGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Department Breakdown Progress Cards (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-2.5 max-h-80 overflow-y-auto pr-1">
              <div className="text-xs font-black text-slate-200 mb-2 flex items-center justify-between">
                <span>بەشەکان بەپێی بڕ و ڕێژەی سەدی</span>
                <span className="text-[11px] text-slate-400 font-normal">کلیک بکە بۆ فلتەر</span>
              </div>
              {categoryStats.list.map((cat) => {
                const isSelected = selectedCategoryFilter === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter(isSelected ? 'all' : cat.name);
                    }}
                    className={`w-full text-right p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-rose-500/15 border-rose-500/50 shadow-md shadow-rose-500/10'
                        : 'bg-slate-900/60 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs sm:text-sm font-black text-white">{cat.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono">
                          {cat.count} پسوولە
                        </span>
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-xs sm:text-sm font-black text-rose-300">
                          {formatCurrency(cat.total, settings.currency, settings.usdToIqdRate)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Percentage */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                        <span>ڕێژەی خەرجی:</span>
                        <span className="font-bold text-white">{cat.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(2, cat.percentage))}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-14 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-900 flex items-center justify-center border border-white/10 text-slate-400">
              <PieIcon className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-200">هیچ خەرجییەک لەم مەودایەدا ({periodMode === 'month' ? activeMonth : periodMode}) تۆمار نەکراوە</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              دەتوانیت مانگێکی تر هەڵبژێریت یان دوگمەی «هەمووی» دابگریت تا خەرجییە تۆمارکراوەکانی گشت کاتەکان ببینیت.
            </p>
            {onGoToExpenses && (
              <button
                type="button"
                onClick={onGoToExpenses}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>تۆمارکردنی خەرجی نوێ</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Detailed Expense Transactions List */}
      <div className="bg-slate-950/80 p-4 sm:p-5 rounded-3xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-black text-white">تۆماری وردی پسوولەکانی خەرجی</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
              {filteredRecords.length} تۆمار
            </span>
          </div>

          {/* Search & Filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="گەڕان لە ناونیشان یان تێبینی..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 transition-all"
              />
            </div>

            {selectedCategoryFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('all')}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all cursor-pointer"
              >
                لابردنی فلتەری: {selectedCategoryFilter} ✕
              </button>
            )}
          </div>
        </div>

        {/* Expense Items Grid */}
        {filteredRecords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRecords.map((e) => {
              const catColor = getCategoryColor(e.category || 'گشتی');
              return (
                <div
                  key={e.id}
                  className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/10 hover:border-rose-500/40 transition-all flex flex-col justify-between gap-2.5 group shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white truncate">{e.title}</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatDate(e.date)}</span>
                      </div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-lg text-[11px] font-bold shrink-0 border"
                      style={{
                        backgroundColor: `${catColor}22`,
                        color: catColor,
                        borderColor: `${catColor}55`,
                      }}
                    >
                      {e.category || 'گشتی'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between bg-slate-950/60 px-3 py-2 rounded-xl border border-white/5">
                    <span className="text-[11px] text-slate-300 font-bold">بڕی پارە:</span>
                    <span className="text-sm sm:text-base font-black font-mono text-rose-400">
                      {formatCurrency(e.amount, settings.currency, settings.usdToIqdRate)}
                    </span>
                  </div>

                  {(e.recipient || e.recordedBy || (e as any).recorderName || e.notes) && (
                    <div className="pt-2 border-t border-white/5 flex flex-col gap-1 text-[11px] text-slate-300">
                      {e.recipient && (
                        <div className="flex items-center gap-1 text-slate-300">
                          <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>وەرگر: <strong className="text-white">{e.recipient}</strong></span>
                        </div>
                      )}
                      {(e.recordedBy || (e as any).recorderName) && (
                        <div className="flex items-center gap-1 text-slate-300">
                          <User className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>تۆمارکەر: <strong className="text-white">{e.recordedBy || (e as any).recorderName}</strong></span>
                        </div>
                      )}
                      {e.notes && (
                        <p className="text-slate-400 text-[10px] line-clamp-2">
                          {e.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            هیچ خەرجییەک نەدۆزرایەوە بەم مەرجانە
          </div>
        )}
      </div>
    </div>
  );
};
