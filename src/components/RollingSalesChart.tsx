import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Activity,
  Zap,
  Calendar,
  Sparkles,
  DollarSign,
  Scale,
  Flame,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface RollingSalesChartProps {
  salesRecords: any[];
  settings: any;
  title?: string;
  badgeLabel?: string;
}

interface TimelinePoint {
  date: string;
  fullDate: string;
  sales: number;
  profit: number;
  count: number;
  isPeak?: boolean;
}

export const RollingSalesChart: React.FC<RollingSalesChartProps> = ({
  salesRecords,
  settings,
  title = 'کۆی فرۆشی ڕۆژانە',
  badgeLabel,
}) => {
  const [speed, setSpeed] = useState<'normal' | 'fast' | 'slow'>('normal');
  const [hoveredPoint, setHoveredPoint] = useState<TimelinePoint | null>(null);

  // Group sales chronologically by date
  const timelineData = useMemo(() => {
    const map = new Map<string, { fullDate: string; date: string; sales: number; profit: number; count: number }>();

    (salesRecords || []).forEach((s: any) => {
      const recDate = s.date || s.createdAt || s.purchaseDate;
      if (!recDate) return;
      const d = new Date(recDate);
      if (isNaN(d.getTime())) return;

      const pad = (n: number) => n.toString().padStart(2, '0');
      const fullDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const shortDate = `${d.getMonth() + 1}/${d.getDate()}`;

      const existing = map.get(fullDate) || {
        fullDate,
        date: shortDate,
        sales: 0,
        profit: 0,
        count: 0,
      };

      existing.sales += Number(s.total || s.totalAmount || 0);
      existing.profit += Number(s.profit || 0);
      existing.count += 1;
      map.set(fullDate, existing);
    });

    let sorted = Array.from(map.values()).sort((a, b) => a.fullDate.localeCompare(b.fullDate));

    // Ensure we have at least 14 days for a rich, continuous live rolling stream
    if (sorted.length < 14) {
      const needed = 14;
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const filledMap = new Map<string, typeof sorted[0]>();

      // Populate existing
      sorted.forEach((item) => filledMap.set(item.fullDate, item));

      // Fill in past consecutive days up to today
      for (let i = needed - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const fullDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const shortDate = `${d.getMonth() + 1}/${d.getDate()}`;
        if (!filledMap.has(fullDate)) {
          filledMap.set(fullDate, {
            fullDate,
            date: shortDate,
            sales: 0,
            profit: 0,
            count: 0,
          });
        }
      }

      sorted = Array.from(filledMap.values()).sort((a, b) => a.fullDate.localeCompare(b.fullDate));
    }

    // Keep the most recent 16 days for optimal density
    const recent = sorted.slice(-16);

    // Identify peak sales day
    let peakValue = 0;
    recent.forEach((p) => {
      if (p.sales > peakValue) peakValue = p.sales;
    });

    return recent.map((p) => ({
      ...p,
      isPeak: p.sales > 0 && p.sales === peakValue,
    }));
  }, [salesRecords]);

  // Overall stats
  const totalSales = useMemo(() => timelineData.reduce((acc, p) => acc + p.sales, 0), [timelineData]);
  const maxSales = useMemo(() => {
    const m = Math.max(...timelineData.map((p) => p.sales), 0);
    return m > 0 ? m * 1.15 : 100000; // 15% headroom for top margin
  }, [timelineData]);

  const peakPoint = useMemo(() => timelineData.find((p) => p.isPeak), [timelineData]);
  const averageSales = timelineData.length > 0 ? Math.round(totalSales / timelineData.length) : 0;

  // Chart Dimensions & Bezier path calculation
  const pointSpacing = 110; // pixels between data points
  const N = timelineData.length;
  const trackWidth = Math.max(N * pointSpacing, 900);
  const chartHeight = 240;
  const topPadding = 45;
  const bottomPadding = 45;
  const usableHeight = chartHeight - topPadding - bottomPadding;

  const getY = (val: number) => {
    const ratio = Math.min(Math.max(val / maxSales, 0), 1);
    return topPadding + (1 - ratio) * usableHeight;
  };

  const getX = (index: number) => {
    return (index / N) * trackWidth;
  };

  // Generate seamless periodic cubic Bézier paths
  const { linePath, areaPath, pointsWithCoords } = useMemo(() => {
    if (N === 0) return { linePath: '', areaPath: '', pointsWithCoords: [] };

    const coords = timelineData.map((p, i) => ({
      ...p,
      x: getX(i),
      y: getY(p.sales),
      index: i,
    }));

    // Generate periodic spline with seamless wrap-around at x = trackWidth
    let pathD = `M ${coords[0].x} ${coords[0].y}`;

    for (let i = 0; i < N; i++) {
      const p0 = coords[(i - 1 + N) % N];
      const p1 = coords[i];
      const p2 = coords[(i + 1) % N];
      const p3 = coords[(i + 2) % N];

      // Coordinate adjustments for periodic wrapping
      const p1x = p1.x;
      const p2x = i === N - 1 ? trackWidth : p2.x;
      const p0x = i === 0 ? p0.x - trackWidth : p0.x;
      const p3x = i === N - 1 ? p3.x + trackWidth : i === N - 2 ? trackWidth + p3.x - trackWidth : p3.x;

      const tension = 0.28;
      const dx1 = (p2x - p0x) * tension;
      const dy1 = (p2.y - p0.y) * tension;
      const dx2 = (p3x - p1x) * tension;
      const dy2 = (p3.y - p1.y) * tension;

      const cp1x = p1x + dx1;
      const cp1y = p1.y + dy1;
      const cp2x = p2x - dx2;
      const cp2y = p2.y - dy2;

      pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const baselineY = chartHeight - bottomPadding + 10;
    const areaD = `${pathD} L ${trackWidth} ${baselineY} L 0 ${baselineY} Z`;

    return {
      linePath: pathD,
      areaPath: areaD,
      pointsWithCoords: coords,
    };
  }, [timelineData, trackWidth, usableHeight, maxSales, N]);

  // Grid steps for Y-Axis
  const yAxisTicks = useMemo(() => {
    return [
      { ratio: 1.0, val: maxSales },
      { ratio: 0.66, val: maxSales * 0.66 },
      { ratio: 0.33, val: maxSales * 0.33 },
      { ratio: 0.0, val: 0 },
    ];
  }, [maxSales]);

  // Speed class mapping
  const speedAnimationClass =
    speed === 'fast'
      ? 'animate-chart-marquee-fast'
      : speed === 'slow'
      ? 'animate-chart-marquee-slow'
      : 'animate-chart-marquee-normal';

  // Render identical single SVG track
  const renderTrackSvg = (keyPrefix: string) => (
    <svg
      key={keyPrefix}
      width={trackWidth}
      height={chartHeight}
      className="shrink-0 overflow-visible select-none"
    >
      <defs>
        {/* Glow drop-shadow filter */}
        <filter id={`neonGlow-${keyPrefix}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Dynamic neon gradient fill */}
        <linearGradient id={`areaGrad-${keyPrefix}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
          <stop offset="45%" stopColor="#3b82f6" stopOpacity="0.20" />
          <stop offset="85%" stopColor="#1d4ed8" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#0b0f19" stopOpacity="0.0" />
        </linearGradient>

        {/* Line Stroke gradient */}
        <linearGradient id={`lineGrad-${keyPrefix}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>

      {/* Area under curve */}
      <path d={areaPath} fill={`url(#areaGrad-${keyPrefix})`} />

      {/* Main glowing line */}
      <path
        d={linePath}
        fill="none"
        stroke={`url(#lineGrad-${keyPrefix})`}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#neonGlow-${keyPrefix})`}
      />

      {/* Subtle secondary core line for crispness */}
      <path
        d={linePath}
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeOpacity="0.6"
        strokeLinecap="round"
      />

      {/* Render points, markers, peak crowns, and date labels */}
      {pointsWithCoords.map((pt, i) => {
        const isHovered = hoveredPoint?.fullDate === pt.fullDate;
        const isLatest = i === pointsWithCoords.length - 1;

        return (
          <g
            key={`${keyPrefix}-pt-${i}`}
            className="cursor-pointer transition-transform"
            onMouseEnter={() => setHoveredPoint(pt)}
            onClick={() => setHoveredPoint(pt)}
          >
            {/* Vertical guide line on hover */}
            {isHovered && (
              <line
                x1={pt.x}
                y1={topPadding}
                x2={pt.x}
                y2={chartHeight - bottomPadding}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.8"
              />
            )}

            {/* Glowing radar ping on the newest point (leading edge) */}
            {isLatest && (
              <circle
                cx={pt.x}
                cy={pt.y}
                r="14"
                fill="#38bdf8"
                fillOpacity="0.25"
                className="animate-ping origin-center"
              />
            )}

            {/* Outer halo */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={pt.isPeak ? 9 : isHovered ? 8 : 6}
              fill={pt.isPeak ? '#f59e0b' : '#38bdf8'}
              fillOpacity={isHovered ? 0.45 : 0.25}
            />

            {/* Center dot */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={pt.isPeak ? 5 : isHovered ? 4.5 : 3.5}
              fill={pt.isPeak ? '#fbbf24' : '#ffffff'}
              stroke={pt.isPeak ? '#d97706' : '#0284c7'}
              strokeWidth="2"
            />

            {/* Value badge above peak or hovered */}
            {(pt.isPeak || isHovered) && pt.sales > 0 && (
              <g transform={`translate(${pt.x}, ${pt.y - 14})`}>
                <rect
                  x="-36"
                  y="-18"
                  width="72"
                  height="18"
                  rx="9"
                  fill={pt.isPeak ? '#78350f' : '#0f172a'}
                  stroke={pt.isPeak ? '#f59e0b' : '#38bdf8'}
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="-6"
                  textAnchor="middle"
                  fill={pt.isPeak ? '#fef3c7' : '#e0f2fe'}
                  fontSize="9.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {formatNumber(pt.sales)}
                </text>
              </g>
            )}

            {/* Date label rolling smoothly along the bottom X-axis */}
            <text
              x={pt.x}
              y={chartHeight - bottomPadding + 22}
              textAnchor="middle"
              fill={isHovered ? '#38bdf8' : isLatest ? '#a5f3fc' : '#94a3b8'}
              fontSize="11"
              fontWeight={isHovered || isLatest ? 'bold' : '600'}
              fontFamily="monospace"
            >
              {pt.date}
            </text>
          </g>
        );
      })}
    </svg>
  );

  return (
    <div className="bg-[#0b0f19] p-5 sm:p-6 rounded-3xl border border-slate-700/60 shadow-2xl space-y-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-48 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-black text-slate-100 text-sm sm:text-base tracking-tight">
                {title}
              </h3>
              {/* Live continuous marquee badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-black tracking-wide font-mono">
                  LIVE • پەخشی ڕاستەوخۆ
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-600 font-medium">
              جووڵەی بەردەوام و نەرمی تەوەرەی کات (Marquee Rolling Timeline)
            </div>
          </div>
        </div>

        {/* Speed Controls & Stats Summary */}
        <div className="flex items-center gap-2">
          {/* Speed Selector */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 gap-1 text-[11px]">
            <span className="text-slate-600 px-2 font-bold hidden sm:inline">خێرایی:</span>
            <button
              type="button"
              onClick={() => setSpeed('slow')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                speed === 'slow'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هێواش
            </button>
            <button
              type="button"
              onClick={() => setSpeed('normal')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                speed === 'normal'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ئاسایی
            </button>
            <button
              type="button"
              onClick={() => setSpeed('fast')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                speed === 'fast'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              خێرا
            </button>
          </div>

          {/* Badge */}
          <span className="text-[11px] text-slate-900 font-bold bg-slate-800/90 border border-slate-700/80 px-2.5 py-1 rounded-xl">
            {badgeLabel || `${timelineData.length} ڕۆژی چالاک`}
          </span>
        </div>
      </div>

      {/* KPI Mini-Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 relative z-20">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-800 font-bold">کۆی فرۆشی دەورە</div>
            <div className="text-xs sm:text-sm font-black font-mono text-emerald-400">
              {formatCurrency(totalSales, settings.currency, settings.usdToIqdRate)}
            </div>
          </div>
          <DollarSign className="w-4 h-4 text-emerald-400/60" />
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-300 font-bold">بەرزترین فرۆش لە ڕۆژێکدا</div>
            <div className="text-xs sm:text-sm font-black font-mono text-amber-400">
              {peakPoint ? formatCurrency(peakPoint.sales, settings.currency, settings.usdToIqdRate) : '٠ د.ع'}
            </div>
          </div>
          <Flame className="w-4 h-4 text-amber-400/60" />
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-300 font-bold">تێکڕای فرۆشی ڕۆژانە</div>
            <div className="text-xs sm:text-sm font-black font-mono text-sky-400">
              {formatCurrency(averageSales, settings.currency, settings.usdToIqdRate)}
            </div>
          </div>
          <TrendingUp className="w-4 h-4 text-sky-400/60" />
        </div>
      </div>

      {/* Interactive Selected / Hovered Point Detail Banner */}
      {hoveredPoint && (
        <div className="bg-sky-950/40 border border-sky-500/40 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200 relative z-20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="font-bold text-slate-900">
              زانیاری بەرواری <span className="font-mono text-sky-300 font-bold">{hoveredPoint.fullDate}</span>:
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono font-bold">
            <div className="text-slate-900">
              فرۆشتن: <span className="text-emerald-400">{formatCurrency(hoveredPoint.sales, settings.currency, settings.usdToIqdRate)}</span>
            </div>
            {hoveredPoint.profit > 0 && (
              <div className="text-slate-900">
                قازانج: <span className="text-sky-400">{formatCurrency(hoveredPoint.profit, settings.currency, settings.usdToIqdRate)}</span>
              </div>
            )}
            <div className="text-slate-600">
              پسوولە: <span className="text-slate-900">{hoveredPoint.count} دانە</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHoveredPoint(null)}
            className="text-slate-600 hover:text-slate-100 text-[11px] underline cursor-pointer"
          >
            داخستن
          </button>
        </div>
      )}

      {/* The Rolling Chart Canvas Container */}
      <div className="relative w-full h-[250px] bg-[#070b14] rounded-2xl border border-slate-800/80 overflow-hidden select-none">
        {/* Stationary Pinned Y-Axis Grid Lines & Labels */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between pt-[45px] pb-[45px] px-3 z-10">
          {yAxisTicks.map((tick, idx) => (
            <div key={`ytick-${idx}`} className="w-full flex items-center justify-between border-b border-dashed border-slate-800/70">
              <span className="text-[10px] font-mono text-slate-900 bg-[#070b14]/90 px-1 rounded font-medium">
                {formatNumber(Math.round(tick.val))}
              </span>
            </div>
          ))}
        </div>

        {/* Soft edge fade masks for seamless entering on right and leaving on left */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#070b14] via-[#070b14]/80 to-transparent z-20" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#070b14] via-[#070b14]/80 to-transparent z-20" />

        {/* Continuous Smooth Rolling Track (Marquee) */}
        {/* Contains 2 identical seamless tracks side-by-side moving 0% to -50% */}
        <div className="w-full h-full flex items-center overflow-hidden">
          <div className={`flex ${speedAnimationClass} will-change-transform`}>
            {/* Track Copy 1 */}
            {renderTrackSvg('trackA')}
            {/* Track Copy 2 (identical duplicate for 100% seamless infinite loop) */}
            {renderTrackSvg('trackB')}
          </div>
        </div>
      </div>
    </div>
  );
};
