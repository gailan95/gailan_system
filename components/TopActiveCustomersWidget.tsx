import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Users, TrendingUp, Clock, AlertCircle, Award, Search, ArrowUpDown } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { Customer, Sale, DebtTransaction } from '../types';

export interface CustomerPerformance {
  customerName: string;
  totalSales: number;
  avgDaysToPay: number;
  currentDebt: number;
  transactionCount: number;
  score: number;
}

interface TopActiveCustomersWidgetProps {
  customersData?: CustomerPerformance[];
  customers?: Customer[];
  sales?: Sale[];
  debtTransactions?: DebtTransaction[];
  settings?: any;
}

export const TopActiveCustomersWidget: React.FC<TopActiveCustomersWidgetProps> = ({
  customersData,
  customers = [],
  sales = [],
  debtTransactions = [],
  settings = { currency: 'IQD', usdToIqdRate: 1500 },
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'totalSales' | 'avgDaysToPay'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Compute live data from real database records (customers, sales, debtTransactions)
  const computedData = useMemo<CustomerPerformance[]>(() => {
    // If explicit pre-formatted customer performance data was passed, prefer that
    if (customersData && customersData.length > 0) {
      return customersData;
    }

    if ((!customers || customers.length === 0) && (!sales || sales.length === 0)) {
      return [];
    }

    // Map id to customer name for consistent canonical name mapping
    const idToNameMap = new Map<string, string>();
    (customers || []).forEach(c => {
      if (c.name && c.id) {
        idToNameMap.set(c.id.toLowerCase().trim(), c.name.trim());
      }
    });

    const getCanonicalCustomerName = (name?: string, id?: string): string => {
      if (name && name.trim()) return name.trim();
      if (id && idToNameMap.has(id.toLowerCase().trim())) return idToNameMap.get(id.toLowerCase().trim())!;
      return (name || id || 'کڕیاری گشتی').trim();
    };

    const getCanonicalKey = (name?: string, id?: string): string => {
      const canonicalName = getCanonicalCustomerName(name, id);
      return canonicalName.toLowerCase().replace(/\s+/g, ' ');
    };

    const statsMap = new Map<string, {
      customerName: string;
      totalSales: number;
      currentDebt: number;
      transactionCount: number;
      repaymentDaysList: number[];
    }>();

    // Map existing customer accounts
    (customers || []).forEach(c => {
      if (!c.name) return;
      const key = getCanonicalKey(c.name, c.id);
      const existing = statsMap.get(key) || {
        customerName: c.name.trim(),
        totalSales: 0,
        currentDebt: 0,
        transactionCount: 0,
        repaymentDaysList: [],
      };
      existing.currentDebt += Number(c.totalDebt) || 0;
      statsMap.set(key, existing);
    });

    // Aggregate sales volume and transaction count (Frequency) per unified customer
    (sales || []).forEach(s => {
      const key = getCanonicalKey(s.customerName, s.customerId);
      const canonName = getCanonicalCustomerName(s.customerName, s.customerId);
      if (!key) return;

      if (!statsMap.has(key)) {
        statsMap.set(key, {
          customerName: canonName,
          totalSales: 0,
          currentDebt: 0,
          transactionCount: 0,
          repaymentDaysList: [],
        });
      }
      const item = statsMap.get(key)!;
      item.totalSales += Number(s.total || s.subtotal || 0);
      item.transactionCount += 1;
    });

    // Calculate real payment speed (avgDaysToPay / Recency) based on debt repayment records vs sales dates
    const salesDateMap = new Map<string, number>();
    (sales || []).forEach(s => {
      const key = getCanonicalKey(s.customerName, s.customerId);
      if (!key) return;
      const sTime = new Date(s.date).getTime();
      if (!isNaN(sTime)) {
        if (!salesDateMap.has(key) || sTime < salesDateMap.get(key)!) {
          salesDateMap.set(key, sTime);
        }
      }
    });

    (debtTransactions || []).forEach(dt => {
      if (dt.type === 'repayment') {
        const key = getCanonicalKey(dt.customerName, dt.customerId);
        if (key && statsMap.has(key)) {
          const item = statsMap.get(key)!;
          const dtTime = new Date(dt.date).getTime();
          const saleTime = salesDateMap.get(key);
          if (!isNaN(dtTime) && saleTime && dtTime >= saleTime) {
            const diffDays = Math.max(1, Math.round((dtTime - saleTime) / (1000 * 60 * 60 * 24)));
            item.repaymentDaysList.push(diffDays);
          }
        }
      }
    });

    const rawList = Array.from(statsMap.values()).filter(item => item.totalSales > 0 || item.currentDebt > 0);
    const maxSales = Math.max(1, ...rawList.map(v => v.totalSales));
    const maxFreq = Math.max(1, ...rawList.map(v => v.transactionCount));

    return rawList.map(item => {
      const avgDays = item.repaymentDaysList.length > 0
        ? Math.round(item.repaymentDaysList.reduce((a, b) => a + b, 0) / item.repaymentDaysList.length)
        : (item.currentDebt > 0 ? 15 : 3);

      // 1. کۆی فرۆش: کێشی ٥٠٪ (Sales Volume = 50%)
      const salesScore = (item.totalSales / maxSales) * 50;

      // 2. فرەوانی و دووبارەبوونەوەی مامەڵەکان: کێشی ٣٠٪ (Frequency = 30%)
      const freqScore = (Math.max(1, item.transactionCount) / maxFreq) * 30;

      // 3. کاتی دوایین پارەدان / خێرایی پارەدان: کێشی ٢٠٪ (Recency / Speed = 20%)
      const speedFactor = Math.max(0, 30 - Math.min(30, avgDays)) / 30;
      const recencyScore = speedFactor * 20;

      // کۆی گشتی خاڵبەندی (Total Weighted Score out of 100)
      const totalScore = Math.round((salesScore + freqScore + recencyScore) * 10) / 10;

      return {
        customerName: item.customerName,
        totalSales: item.totalSales,
        avgDaysToPay: avgDays,
        currentDebt: item.currentDebt,
        transactionCount: item.transactionCount,
        score: totalScore,
      };
    });
  }, [customersData, customers, sales, debtTransactions]);

  const dataToUse = computedData;

  // Process top 10 sorted by the 50/30/20 Weighted Score Model
  const top10Data = useMemo(() => {
    return [...dataToUse]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [dataToUse]);

  // Filtered and sorted data for the summary table (Displays Top 10 Best & Most Active Customers)
  const tableData = useMemo(() => {
    // Take the top 10 ranked customers based on the scoring model
    let result = [...top10Data];
    if (searchTerm.trim()) {
      result = result.filter(c => c.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    result.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'score') {
        diff = b.score - a.score;
      } else if (sortBy === 'totalSales') {
        diff = b.totalSales - a.totalSales;
      } else if (sortBy === 'avgDaysToPay') {
        diff = b.avgDaysToPay - a.avgDaysToPay;
      }
      if (sortOrder === 'asc') diff = -diff;
      return diff;
    });
    return result;
  }, [top10Data, searchTerm, sortBy, sortOrder]);

  const handleSort = (field: 'totalSales' | 'avgDaysToPay') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const barColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6'];

  return (
    <div className="w-full bg-[#0b0f19] p-6 rounded-[32px] border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-white font-black text-lg sm:text-xl tracking-tight">
            ١٠ چالاکترین کڕیار
          </h3>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="گەڕان بەدوای کڕیار..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-2 pr-10 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="space-y-4 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-black text-white">بەراوردکاری کڕیاران</span>
          </div>

          {/* Color Distinction Legend */}
          <div className="flex items-center gap-4 text-xs font-black">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-gradient-to-tr from-sky-600 to-sky-400 shadow-sm shadow-sky-500/30" />
              <span className="text-sky-400">کۆی فرۆش (پارە)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-gradient-to-tr from-amber-600 to-amber-400 shadow-sm shadow-amber-500/30" />
              <span className="text-amber-400">ماوەی پارەدان (ڕۆژ)</span>
            </div>
          </div>
        </div>

        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top10Data} margin={{ top: 20, right: 10, left: -10, bottom: 40 }}>
              <defs>
                <linearGradient id="customerSalesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="customerDaysGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="3 3" opacity={0.4} />
              <XAxis
                dataKey="customerName"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 800 }}
                angle={-25}
                textAnchor="end"
                dy={10}
              />
              {/* Money Y-Axis (Left / Blue) */}
              <YAxis
                yAxisId="left"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#38bdf8', fontSize: 10, fontWeight: 800, fontFamily: 'monospace' }}
                tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val}
              />
              {/* Days Y-Axis (Right / Amber) */}
              <YAxis
                yAxisId="right"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#fbbf24', fontSize: 10, fontWeight: 800, fontFamily: 'monospace' }}
                tickFormatter={(val) => `${val} ڕۆژ`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as CustomerPerformance;
                    return (
                      <div className="bg-[#0b0f19]/95 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl shadow-2xl min-w-[210px] space-y-2.5 ring-1 ring-white/5" dir="rtl">
                        <div className="text-xs text-white font-black border-b border-slate-800 pb-2 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-amber-400" />
                            {data.customerName}
                          </span>
                          <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-mono font-bold">
                            نمرە: {data.score}
                          </span>
                        </div>
                        <div className="space-y-2 text-xs font-bold">
                          <div className="flex justify-between items-center">
                            <span className="text-sky-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-sky-400" />
                              کۆی فرۆش (پارە):
                            </span>
                            <span className="text-sky-400 font-mono font-black">{formatCurrency(data.totalSales, settings.currency, settings.usdToIqdRate)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-amber-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              ماوەی پارەدان:
                            </span>
                            <span className="text-amber-400 font-mono font-black">{data.avgDaysToPay} ڕۆژ</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-white/5 pt-1.5">
                            <span className="text-slate-300 font-bold">قەرزی ئێستا:</span>
                            <span className="text-rose-400 font-mono font-black">{formatCurrency(data.currentDebt, settings.currency, settings.usdToIqdRate)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="totalSales"
                name="کۆی فرۆش (پارە)"
                fill="url(#customerSalesGrad)"
                radius={[6, 6, 0, 0]}
                animationDuration={1000}
              />
              <Bar
                yAxisId="right"
                dataKey="avgDaysToPay"
                name="ماوەی پارەدان (ڕۆژ)"
                fill="url(#customerDaysGrad)"
                radius={[6, 6, 0, 0]}
                animationDuration={1200}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Table */}
      <div className="space-y-3 relative z-10 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between cursor-pointer group" onClick={() => setShowTable(!showTable)}>
          <span className="text-xs font-black text-slate-100 group-hover:text-white transition-colors">
            {showTable ? 'شاردنەوەی خشتەی وردەکاری' : 'خشتەی وردەکاری کڕیاران'}
          </span>
          <span className="text-[10px] text-slate-400 font-bold group-hover:text-slate-200 transition-colors">
            {showTable ? 'کرتە بکە بۆ شاردنەوە' : 'کرتە بکە بۆ پیشاندان'}
          </span>
        </div>

        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-black text-slate-300">
                  <th className="py-3 px-4">ناوی کڕیار</th>
                  <th className="py-3 px-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('totalSales')}>
                    <div className="flex items-center gap-1.5">
                      کۆی فرۆش
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('avgDaysToPay')}>
                    <div className="flex items-center gap-1.5">
                      ماوەی پارەدان (ڕۆژ)
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs font-bold">
                {tableData.map((customer, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 text-white font-black flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-[10px] font-mono border border-blue-500/20">
                          {idx + 1}
                        </span>
                        {customer.customerName}
                      </td>
                      <td className="py-3.5 px-4 text-blue-400 font-mono font-black">
                        {formatCurrency(customer.totalSales, settings.currency, settings.usdToIqdRate)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black ${
                          customer.avgDaysToPay <= 7 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : customer.avgDaysToPay <= 14 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {customer.avgDaysToPay} ڕۆژ
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
