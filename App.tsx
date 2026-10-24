import React, { useState, useEffect } from 'react';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Header, TopHeader, RightSidebar } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { PullToRefresh } from './components/PullToRefresh';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ActiveTab, Sale } from './types';

import { SalesPOSView } from './components/SalesPOSView';
import { InventoryView } from './components/InventoryView';
import { SalesHistoryView } from './components/SalesHistoryView';
import { DebtsView } from './components/DebtsView';
import { ProfitLossView } from './components/ProfitLossView';
import { ExpensesView } from './components/ExpensesView';
import { CapitalView } from './components/CapitalView';
import { AccountsView } from './components/AccountsView';
import { FirebaseStorageView } from './components/FirebaseStorageView';
import { ChartsView } from './components/ChartsView';
import { SettingsView } from './components/SettingsView';
import { CommissionView } from './components/CommissionView';
import { MainView } from './components/MainView';
import { InvoiceModal } from './components/InvoiceModal';
import { InvoiceScannerModal } from './components/InvoiceScannerModal';
import { DatabaseBackupModal } from './components/DatabaseBackupModal';
import { initWallpaperPersistence, getSavedWallpaperId, getSavedCustomImageUrl, PRESET_WALLPAPERS } from './utils/wallpaperPresets';
import { detectImageBrightness, syncGlobalContrastVariables, isColorDark } from './utils/dynamicColorContrast';

const TAB_LABELS: Record<ActiveTab, string> = {
  main: 'سەرەکی',
  pos: 'خاڵی فرۆشتن',
  inventory: 'کاڵاکان',
  inventory_dry: 'وشکەبار',
  debts: 'قەرزەکان',
  profit_loss: 'قازانج',
  expenses: 'خەرجییەکان',
  closed: 'پسووڵەکان',
  capital: 'سەرمایە',
  accounts: 'هەژمار',
  storage: 'بیرگە',
  charts: 'داشبۆرد',
  settings: 'ڕێکخستن',
  commission: 'خاوەن کاڵاکان',
};

function MainContent() {
  const { isAuthenticated, currentUser, canAccessTab } = useAuth();
  const { dir, isRtl } = useLanguage();

  const getDefaultHomeTab = (): ActiveTab => {
    if (!currentUser) return 'main';
    const role = currentUser.role;
    if (role === 'admin' || role === 'manager') return 'main';
    if (role === 'cashier') return 'pos';
    if (role === 'owner') return 'capital';
    if (role === 'accountant') return 'inventory';
    return 'main';
  };

  const defaultHome = getDefaultHomeTab();

  const [tabHistory, setTabHistory] = useState<ActiveTab[]>(() => {
    try {
      const saved = localStorage.getItem('gailan_active_tab');
      if (saved && ['main', 'pos', 'inventory', 'inventory_dry', 'debts', 'profit_loss', 'expenses', 'closed', 'capital', 'accounts', 'storage', 'charts', 'settings', 'commission'].includes(saved)) {
        return [saved as ActiveTab];
      }
    } catch {}
    return [defaultHome];
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [appWallpaperId, setAppWallpaperId] = useState<string>(getSavedWallpaperId);
  const [appCustomImageUrl, setAppCustomImageUrl] = useState<string>(getSavedCustomImageUrl);
  const [appCustomBgColor, setAppCustomBgColor] = useState<string>(() => {
    try {
      const bg = localStorage.getItem('app_background_color') || '';
      if (bg && (bg.startsWith('#0') || bg.startsWith('#1'))) {
        localStorage.removeItem('app_background_color');
        return '';
      }
      return bg;
    } catch {
      return '';
    }
  });

  useEffect(() => {
    initWallpaperPersistence();
    
    // Apply theme on startup
    const savedTheme = localStorage.getItem('theme') || localStorage.getItem('kurd_app_theme_mode') || 'dark';
    const isDark = savedTheme === 'dark';
    if (isDark) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark');
    }

    const handleWallpaperSync = () => {
      setAppWallpaperId(getSavedWallpaperId());
      setAppCustomImageUrl(getSavedCustomImageUrl());
      try {
        const bg = localStorage.getItem('app_background_color') || '';
        if (bg && (bg.startsWith('#0') || bg.startsWith('#1'))) {
          localStorage.removeItem('app_background_color');
          setAppCustomBgColor('');
        } else {
          setAppCustomBgColor(bg);
        }
      } catch {}
    };

    window.addEventListener('storage', handleWallpaperSync);
    window.addEventListener('wallpaperChange', handleWallpaperSync);
    return () => {
      window.removeEventListener('storage', handleWallpaperSync);
      window.removeEventListener('wallpaperChange', handleWallpaperSync);
    };
  }, []);

  useEffect(() => {
    try {
      const currentTab = tabHistory[tabHistory.length - 1] || defaultHome;
      localStorage.setItem('gailan_active_tab', currentTab);
    } catch {}
  }, [tabHistory, defaultHome]);
  
  // Enforce role-based allowed tabs using canAccessTab
  const rawActiveTab = tabHistory[tabHistory.length - 1] || defaultHome;
  const activeTab: ActiveTab = canAccessTab && !canAccessTab(rawActiveTab) ? defaultHome : rawActiveTab;

  const { sales } = useDatabase();
  const [activeInvoice, setActiveInvoice] = useState<Sale | null>(null);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState<boolean>(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState<boolean>(false);

  // Auto-open invoice if deep linked via QR code URL (?invoiceId=... or #invoice=...)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const invoiceId = urlParams.get('invoiceId') || window.location.hash.replace(/^#invoice=/, '');
      const invNum = urlParams.get('inv');
      if ((invoiceId || invNum) && sales.length > 0) {
        const found = sales.find(
          (s) =>
            (invoiceId && (s.id === invoiceId || s.invoiceNumber === invoiceId)) ||
            (invNum && s.invoiceNumber === invNum)
        );
        if (found) {
          setActiveInvoice(found);
        }
      }
    } catch {}
  }, [sales]);

  // دۆزینەوەی ستایڵی پرێسێتی هەڵبژێردراو
  const currentPreset = PRESET_WALLPAPERS.find(p => p.id === appWallpaperId);
  const [isDynamicLightBg, setIsDynamicLightBg] = useState<boolean>(() => {
    return currentPreset?.isDarkText === true;
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);

  useEffect(() => {
    if (appWallpaperId === 'custom_image' && appCustomImageUrl) {
      detectImageBrightness(appCustomImageUrl).then((detected) => {
        const isLight = detected === 'light';
        setIsDynamicLightBg(isLight);
        syncGlobalContrastVariables(isLight ? 'light' : 'dark');
      });
    } else {
      const isLight = currentPreset?.isDarkText === true || (currentPreset?.style?.backgroundColor ? !isColorDark(String(currentPreset.style.backgroundColor)) : false);
      setIsDynamicLightBg(isLight);
      syncGlobalContrastVariables(isLight ? 'light' : 'dark');
    }
  }, [appWallpaperId, appCustomImageUrl, currentPreset]);

  // If not authenticated, show the Sign In / Sign Up gateway screen
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const handleNavigateTab = (tab: ActiveTab) => {
    setTabHistory((prev) => [...prev, tab]);
  };

  const handleSaleComplete = (sale: Sale) => {
    setActiveInvoice(sale);
  };

  const isDarkText = isDynamicLightBg;

  // Determine root background style dynamically from localStorage / presets
  const rootStyle = appWallpaperId === 'custom_image' && appCustomImageUrl
    ? {
        backgroundImage: `url(${appCustomImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }
    : appCustomBgColor
    ? {
        backgroundColor: appCustomBgColor,
      }
    : currentPreset?.style || {
        backgroundColor: '#040812',
      };

  return (
    <div 
      id="main-scroll-container"
      dir={dir} 
      data-theme={isDarkText ? 'light' : 'dark'}
      className={`h-dvh overflow-y-auto ${isDarkText ? 'text-[#0F172A] light-surface' : 'text-slate-100 dark-glass-root'} flex flex-col font-['Vazirmatn',sans-serif] ${isRtl ? 'dir-rtl' : 'dir-ltr'} transition-all duration-300`}
      style={rootStyle}
    >
      {/* 1. TOP HEADER BAR (Full width across top) */}
      <TopHeader
        activeTab={activeTab}
        onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onOpenQRScanner={() => setIsQRScannerOpen(true)}
      />

      {/* 2. BODY LAYOUT: Right Sidebar + Left Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0 min-h-0">
        {/* Right Sidebar Navigation Menu Bar (In RTL dir="rtl", first flex-row item aligns to RIGHT) */}
        <RightSidebar
          activeTab={activeTab}
          setActiveTab={handleNavigateTab}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
        />

        {/* Main Content Area (Left side in RTL) */}
        <main className="flex-1 overflow-y-auto min-w-0 p-3 sm:p-6 pb-24 lg:pb-8">
          <ErrorBoundary>
            {activeTab === 'main' && <MainView onNavigateTab={handleNavigateTab} />}
            {activeTab === 'pos' && (
              <SalesPOSView
                onSaleComplete={handleSaleComplete}
                onGoToDebts={() => handleNavigateTab('debts')}
              />
            )}
            {activeTab === 'debts' && <DebtsView onViewInvoice={setActiveInvoice} onBackToMain={() => handleNavigateTab(defaultHome)} />}
            {activeTab === 'inventory' && (
              <InventoryView onBackToMain={() => handleNavigateTab(defaultHome)} />
            )}
            {activeTab === 'inventory_dry' && (
              <InventoryView mode="dry" onBackToMain={() => handleNavigateTab(defaultHome)} />
            )}
            {activeTab === 'profit_loss' && (
              <ProfitLossView 
                onGoToExpenses={() => handleNavigateTab('expenses')} 
                onBackToMain={() => handleNavigateTab(defaultHome)} 
              />
            )}
            {activeTab === 'expenses' && (
              <ExpensesView onBackToMain={() => handleNavigateTab(defaultHome)} />
            )}
            {activeTab === 'closed' && <SalesHistoryView onViewInvoice={setActiveInvoice} />}
            {activeTab === 'capital' && <CapitalView onBackToMain={() => handleNavigateTab(defaultHome)} />}
            {activeTab === 'accounts' && <AccountsView onBackToMain={() => handleNavigateTab(defaultHome)} />}
            {activeTab === 'storage' && <FirebaseStorageView />}
            {activeTab === 'charts' && (
              <ChartsView 
                onBackToMain={() => handleNavigateTab(defaultHome)} 
                onGoToExpenses={() => handleNavigateTab('expenses')}
              />
            )}
            {activeTab === 'commission' && <CommissionView onBackToMain={() => handleNavigateTab(defaultHome)} />}
            {activeTab === 'settings' && (
              <SettingsView 
                onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)} 
                onBackToMain={() => handleNavigateTab(defaultHome)}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Invoice / Receipt Preview Modal */}
      {activeInvoice && (
        <InvoiceModal
          sale={activeInvoice}
          onClose={() => setActiveInvoice(null)}
        />
      )}

      {/* Global Invoice QR Scanner Modal */}
      <InvoiceScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onSelectInvoice={(sale) => setActiveInvoice(sale)}
      />

      {/* Global Database Backup & Restore Modal */}
      <DatabaseBackupModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <DatabaseProvider>
            <MainContent />
          </DatabaseProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
