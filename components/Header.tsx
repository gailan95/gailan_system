import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ActiveTab } from '../types';
import {
  Menu,
  X,
  Store,
  ShoppingCart,
  Package,
  Layers,
  CreditCard,
  TrendingUp,
  DollarSign,
  Archive,
  Coins,
  Users,
  HardDrive,
  BarChart3,
  Settings,
  FileCheck,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  RotateCw,
  QrCode,
  Receipt,
} from 'lucide-react';

const TAB_LABELS: Record<string, string> = {
  main: 'سەرەکی',
  pos: 'خاڵی فرۆشتن',
  inventory: 'کاڵاکان',
  inventory_dry: 'وشکەبار',
  debts: 'قەرزەکان',
  profit_loss: 'قازانج',
  expenses: 'خەرجییەکان',
  closed: 'پسووڵەکان',
  capital: 'سەرمایە',
  accounts: 'هەژمارەکان',
  storage: 'بیرگە',
  charts: 'داشبۆرد و ئامار',
  settings: 'ڕێکخستن',
  commission: 'خاوەن کاڵاکان',
};

interface TopHeaderProps {
  activeTab: ActiveTab;
  onOpenDatabaseModal: () => void;
  onToggleMobileMenu: () => void;
  onOpenQRScanner?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onOpenDatabaseModal,
  onToggleMobileMenu,
  onOpenQRScanner,
}) => {
  const { settings, isOnline, isSyncing } = useDatabase();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 200);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
      <div className="w-full px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2.5">
        {/* Right side in RTL: Hamburger menu button + Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors shrink-0 border border-slate-700 shadow-sm cursor-pointer"
            title="مینیۆی سیستەم"
            aria-label="مینیۆ"
          >
            <Menu className="w-5 h-5 text-emerald-400" />
          </button>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-white tracking-wide truncate max-w-[200px] xs:max-w-[260px] sm:max-w-md">
              {TAB_LABELS[activeTab] || settings?.storeName || 'مەڵبەندی بازرگانی کۆمەڵ'}
            </h1>
          </div>
        </div>

        {/* Left side in RTL: Refresh button + Database status button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* دوگمەی سکانکردنی QR کۆدی پسووڵە */}
          {onOpenQRScanner && (
            <button
              type="button"
              onClick={onOpenQRScanner}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              title="گەڕانی پسووڵە بە کامێرا یان QR کۆد"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline text-xs font-bold text-slate-200">گەڕانی پسووڵە</span>
            </button>
          )}

          {/* دوگمەی بچووکی ڕیفرێشکردنەوەی پەڕە */}
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center justify-center p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            title="نوێکردنەوەی پەڕە (ڕیفرێش)"
            aria-label="نوێکردنەوەی پەڕە"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : 'text-slate-200'}`} />
          </button>

          <button
            type="button"
            onClick={onOpenDatabaseModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isOnline !== false
                ? 'bg-slate-800/90 border-slate-700 text-emerald-400 hover:bg-slate-800'
                : 'bg-amber-950/50 border-amber-800/70 text-amber-400'
            }`}
            title="دۆخی داتابەیس و پاشەکەوت"
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : isOnline !== false ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline text-white font-bold">داتابەیس</span>
          </button>
        </div>
      </div>
    </header>
  );
};

interface RightSidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onOpenDatabaseModal: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onOpenDatabaseModal,
}) => {
  const { canAccessTab, logout } = useAuth();

  const navItems: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'main', label: 'سەرەکی', icon: Store },
    { id: 'pos', label: 'خاڵی فرۆشتن', icon: ShoppingCart },
    { id: 'inventory', label: 'کاڵاکان', icon: Package },
    { id: 'debts', label: 'قەرزەکان', icon: CreditCard },
    { id: 'profit_loss', label: 'قازانج', icon: TrendingUp },
    { id: 'expenses', label: 'خەرجییەکان', icon: DollarSign },
    { id: 'closed', label: 'پسووڵەکان', icon: Receipt },
    { id: 'capital', label: 'سەرمایە', icon: Coins },
    { id: 'accounts', label: 'هەژمارەکان', icon: Users },
    { id: 'commission', label: 'خاوەن کاڵاکان', icon: FileCheck },
    { id: 'charts', label: 'داشبۆرد و ئامار', icon: BarChart3 },
    { id: 'settings', label: 'ڕێکخستن', icon: Settings },
  ];

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-[57px] right-0 z-50 lg:z-30 h-[100dvh] lg:h-[calc(100vh-57px)] w-64 bg-slate-900 border-l border-slate-800 p-3 pb-8 lg:pb-3 flex flex-col transition-transform duration-300 ease-in-out overflow-y-auto ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header inside drawer */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 lg:hidden">
          <span className="font-black text-white text-sm">بەشەکانی سیستەم</span>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 cursor-pointer"
            title="داخستن"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto scrollbar-thin pr-0.5">
          {navItems.map((item) => {
            if (canAccessTab && !canAccessTab(item.id)) return null;
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black shadow-lg shadow-emerald-500/25 border border-emerald-400/30'
                    : 'text-slate-100 hover:text-white hover:bg-slate-800 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                <span className="truncate text-white font-bold">{item.label}</span>
              </button>
            );
          })}

          {/* دوگمەی دەرچوون لە هەژمار لە ژێر بەشەکانەوە لە ناو مینوو */}
          <div className="pt-2 mt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 hover:border-rose-700 transition-all cursor-pointer shadow-sm"
            >
              <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
              <span>دەرچوون لە هەژمار</span>
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};

export const Header = TopHeader;
