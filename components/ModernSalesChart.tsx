import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface ModernSalesChartProps {
  salesRecords: any[];
  settings: any;
}

type ViewMode = 'MONTHS' | '5YEARS';

const dayColors = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
];

const modeLabels: Record<ViewMode, string> = {
  'MONTHS': 'مانگەکانی ساڵ (١٢ مانگ)',
  '5YEARS': '٥ ساڵی ڕابردوو',
};

export const ModernSalesChart: React.FC<ModernSalesChartProps> = ({
  salesRecords,
  settings,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('MONTHS');

  const processedData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    const getRecordDate = (s: any) => {
      const d = s.date || s.createdAt || s.purchaseDate;
      return d ? new Date(d) : null;
    };

    if (viewMode === 'MONTHS') {
      const kurdishMonths = [
        'کانونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران',
        'تەمموز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانونی یەکەم'
      ];
      const data = kurdishMonths.map((name) => ({
        name,
        current: 0,
      }));

      (salesRecords || []).forEach((s) => {
        const d = getRecordDate(s);
        if (!d || isNaN(d.getTime())) return;
        const amount = Number(s.total || s.totalAmount || 0);
        const year = d.getFullYear();
        const month = d.getMonth(); // 0 - 11

        if (year === currentYear) {
          data[month].current += amount;
        }
      });

      return data;
    }

    if (viewMode === '5YEARS') {
      const years = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];
      const yearMap = new Map<number, number>();
      years.forEach((y) => yearMap.set(y, 0));

      (salesRecords || []).forEach((s) => {
        const d = getRecordDate(s);
        if (!d || isNaN(d.getTime())) return;
        const amount = Number(s.total || s.totalAmount || 0);
        const year = d.getFullYear();
        if (yearMap.has(year)) {
          yearMap.set(year, yearMap.get(year)! + amount);
        }
      });

      return years.map((y) => ({
        name: y.toString(),
        current: yearMap.get(y) || 0,
      }));
    }

    return [];
  }, [salesRecords, viewMode]);

  const totalCurrent = useMemo(() => processedData.reduce((acc, d) => acc + d.current, 0), [processedData]);

  return (
    <div className="w-full bg-[#0b0f19] p-6 rounded-[32px] border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden group">
      {/* Glow Effects */}
      <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-white font-black tracking-tight">هێڵکاری فرۆشتن</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {formatCurrency(totalCurrent, settings.currency, settings.usdToIqdRate)}
            </span>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-900/50 p-1 rounded-2xl border border-slate-800 gap-1">
          {(['MONTHS', '5YEARS'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === mode
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {modeLabels[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[320px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={processedData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }}
              tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${Math.round(val / 1000)}k` : val}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#0b0f19]/90 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl shadow-2xl min-w-[180px] space-y-3 ring-1 ring-white/5">
                      <div className="text-[10px] text-slate-300 font-black uppercase tracking-widest border-b border-slate-800 pb-2">
                        {payload[0].payload.name}
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-sky-400 font-black">کۆی فرۆش</span>
                          <span className="text-sm font-black text-white font-mono">
                            {formatCurrency(payload[0].value as number, settings.currency, settings.usdToIqdRate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Current Period Line (Glowing Neon) */}
            <Area
              type="monotone"
              dataKey="current"
              stroke="#38bdf8"
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#colorCurrent)"
              filter="url(#neonGlow)"
              dot={{ r: 6, fill: '#38bdf8', strokeWidth: 3, stroke: '#0b0f19' }}
              activeDot={{ r: 8, fill: '#fff', strokeWidth: 4, stroke: '#38bdf8' }}
              animationDuration={2000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800/50 relative z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
            <span className="text-xs text-slate-200 font-bold">فرۆشتنی گشتی</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-200 font-bold">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          چارتی زیرەک
        </div>
      </div>
    </div>
  );
};
