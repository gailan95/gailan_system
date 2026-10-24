import React, { useState, useEffect } from 'react';
import { 
  Search,
  X
} from 'lucide-react';
import { 
  Box3DIcon, 
  Users3DIcon, 
  Trending3DIcon, 
  ShoppingCart3DIcon, 
  Account3DIcon, 
  Commission3DIcon, 
  Capital3DIcon, 
  Expense3DIcon, 
  Settings3DIcon, 
  Dashboard3DIcon,
  Overdue3DIcon,
  DebtCoin3DIcon,
  Receipt3DIcon
} from './ThreeDIcons';
import { ActiveTab } from '../types';
import { 
  PRESET_WALLPAPERS, 
  getSavedWallpaperId, 
  getSavedCustomImageUrl
} from '../utils/wallpaperPresets';
import { loadFromIndexedDB } from '../utils/indexedDB';

interface MainViewProps {
  onNavigateTab: (tab: ActiveTab) => void;
}

export const MainView: React.FC<MainViewProps> = ({ onNavigateTab }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Background Customization State (Synchronized with Settings & IndexedDB)
  const [selectedWallpaperId, setSelectedWallpaperId] = useState<string>(getSavedWallpaperId);
  const [customImageUrl, setCustomImageUrl] = useState<string>(getSavedCustomImageUrl);

  // Sync wallpaper when modified from SettingsView or restored from IndexedDB
  useEffect(() => {
    const syncWallpaper = async () => {
      const currentId = getSavedWallpaperId();
      let currentUrl = getSavedCustomImageUrl();

      if (!currentUrl && currentId === 'custom_image') {
        const idbUrl = await loadFromIndexedDB<string>('main_view_wallpaper_custom_url') || await loadFromIndexedDB<string>('app_background_image');
        if (idbUrl) {
          currentUrl = idbUrl;
          try { 
            localStorage.setItem('main_view_wallpaper_custom_url', idbUrl); 
            localStorage.setItem('app_background_image', idbUrl);
          } catch {}
        }
      }

      setSelectedWallpaperId(currentId);
      setCustomImageUrl(currentUrl);
    };

    syncWallpaper();

    const handleStorageChange = () => {
      syncWallpaper();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('wallpaperChange', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('wallpaperChange', handleStorageChange);
    };
  }, []);

  // Get active background style
  const activePreset = PRESET_WALLPAPERS.find(p => p.id === selectedWallpaperId) || PRESET_WALLPAPERS[0];
  const activeBackgroundStyle: React.CSSProperties = selectedWallpaperId === 'custom_image' && customImageUrl
    ? {
        backgroundImage: `url(${customImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }
    : activePreset.style;

  // 10 Core Apps defined with 3D Icons and individual Vivid Glassmorphism color styling
  const coreApps = [
    {
      id: 'profit_loss' as ActiveTab,
      name: 'قازانج',
      Icon3D: Trending3DIcon,
      glassClass: 'bg-gradient-to-b from-purple-500/30 via-purple-600/40 to-fuchsia-900/60 border-purple-300/60 shadow-[0_10px_25px_-3px_rgba(168,85,247,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.7)]',
    },
    {
      id: 'debts' as ActiveTab,
      name: 'قەرزەکان',
      Icon3D: Users3DIcon,
      glassClass: 'bg-gradient-to-b from-amber-500/30 via-orange-500/40 to-orange-900/60 border-orange-300/60 shadow-[0_10px_25px_-3px_rgba(249,115,22,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.7)]',
    },
    {
      id: 'inventory' as ActiveTab,
      name: 'کاڵاکان',
      Icon3D: Box3DIcon,
      glassClass: 'bg-gradient-to-b from-emerald-500/30 via-green-600/40 to-emerald-900/60 border-emerald-300/60 shadow-[0_10px_25px_-3px_rgba(34,197,94,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.7)]',
    },
    {
      id: 'pos' as ActiveTab,
      name: 'خاڵی فرۆشتن',
      Icon3D: ShoppingCart3DIcon,
      glassClass: 'bg-gradient-to-b from-sky-500/30 via-blue-600/40 to-indigo-900/60 border-sky-300/60 shadow-[0_10px_25px_-3px_rgba(59,130,246,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.7)]',
    },
    {
      id: 'accounts' as ActiveTab,
      name: 'هەژمارەکان',
      Icon3D: Account3DIcon,
      glassClass: 'bg-gradient-to-b from-indigo-500/30 via-indigo-600/40 to-violet-900/60 border-indigo-300/60 shadow-[0_10px_25px_-3px_rgba(99,102,241,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.7)]',
    },
    {
      id: 'commission' as ActiveTab,
      name: 'خاوەن کاڵاکان',
      Icon3D: Commission3DIcon,
      glassClass: 'bg-gradient-to-b from-yellow-400/30 via-amber-500/40 to-yellow-800/60 border-yellow-200/60 shadow-[0_10px_25px_-3px_rgba(234,179,8,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.7)]',
    },
    {
      id: 'capital' as ActiveTab,
      name: 'سەرمایە',
      Icon3D: Capital3DIcon,
      glassClass: 'bg-gradient-to-b from-cyan-500/30 via-teal-600/40 to-blue-900/60 border-cyan-300/60 shadow-[0_10px_25px_-3px_rgba(6,182,212,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.7)]',
    },
    {
      id: 'expenses' as ActiveTab,
      name: 'خەرجییەکان',
      Icon3D: Expense3DIcon,
      glassClass: 'bg-gradient-to-b from-rose-500/30 via-red-600/40 to-red-900/60 border-rose-300/60 shadow-[0_10px_25px_-3px_rgba(239,68,68,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.7)]',
    },
    {
      id: 'settings' as ActiveTab,
      name: 'ڕێکخستن',
      Icon3D: Settings3DIcon,
      glassClass: 'bg-gradient-to-b from-slate-400/30 via-slate-600/45 to-slate-900/70 border-slate-300/60 shadow-[0_10px_25px_-3px_rgba(100,116,139,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.7)]',
    },
    {
      id: 'charts' as ActiveTab,
      name: 'داشبۆرد',
      Icon3D: Dashboard3DIcon,
      glassClass: 'bg-gradient-to-b from-blue-400/30 via-blue-500/40 to-blue-900/60 border-blue-300/60 shadow-[0_10px_25px_-3px_rgba(37,99,235,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.7)]',
    },
    {
      id: 'closed' as ActiveTab,
      name: 'پسوڵەکان',
      Icon3D: Receipt3DIcon,
      glassClass: 'bg-gradient-to-b from-emerald-600/30 via-teal-700/40 to-emerald-950/60 border-emerald-400/60 shadow-[0_10px_25px_-3px_rgba(16,185,129,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.7)]',
    },
    {
      id: 'storage' as ActiveTab,
      name: 'داتابەیس',
      Icon3D: DebtCoin3DIcon,
      glassClass: 'bg-gradient-to-b from-violet-500/30 via-purple-700/40 to-indigo-950/60 border-violet-400/60 shadow-[0_10px_25px_-3px_rgba(139,92,246,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.7)]',
    },
  ];

  // Filter apps when search query is typed
  const filteredApps = coreApps.filter(app =>
    !searchQuery.trim() || app.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div 
      className="relative w-full flex-1 min-h-[calc(100vh-62px)] flex flex-col justify-between p-3 sm:p-5 lg:p-8 transition-all duration-500 overflow-x-hidden"
      style={activeBackgroundStyle}
    >
      <div 
        className="relative z-10 w-full max-w-lg sm:max-w-xl md:max-w-2xl mx-auto flex-1 flex flex-col justify-between select-none font-['Vazirmatn',sans-serif] antialiased my-auto" 
        dir="rtl"
      >
        {/* Main 4-Column 3D App Grid */}
        <div className="flex-1 flex items-center justify-center my-auto py-1 sm:py-2">
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4.5 w-full mx-auto">
            {filteredApps.map((app) => {
              const IconComponent = app.Icon3D;
              return (
                <button
                  key={app.id}
                  onClick={() => onNavigateTab(app.id)}
                  className={`group relative flex flex-col items-center justify-center p-2.5 sm:p-3.5 md:p-4 rounded-[20px] sm:rounded-[26px] backdrop-blur-xl border transition-all duration-300 active:scale-95 cursor-pointer overflow-hidden ${app.glassClass}`}
                >
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-t-[20px] sm:rounded-t-[26px] pointer-events-none" />
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center mb-1.5 transition-transform duration-300 group-hover:scale-110 relative z-10">
                    <IconComponent className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)]" />
                  </div>
                  <span className="text-[11px] sm:text-xs md:text-sm font-black text-white tracking-tight drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)] [text-shadow:_0_1.5px_4px_rgba(0,0,0,0.9)] relative z-10 select-none text-center truncate max-w-full px-0.5">
                    {app.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Search Bar */}
        <div className="w-full mt-4 sm:mt-6 flex items-center justify-center pb-2">
          {isSearchOpen ? (
            <div className="flex items-center gap-2 bg-slate-950/95 backdrop-blur-2xl border border-white/40 rounded-full px-4 py-2 shadow-2xl max-w-xs w-full animate-fadeIn text-white">
              <Search className="w-4 h-4 text-emerald-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="گەڕان بەناو ئەپەکاندا..."
                autoFocus
                className="bg-transparent text-xs font-black text-white outline-none w-full placeholder:text-slate-400"
              />
              <button 
                onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                className="text-slate-300 hover:text-white transition-colors p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 bg-slate-950/90 hover:bg-slate-900 text-white text-xs font-black px-5 py-2.5 rounded-full shadow-lg border border-white/20 transition-all active:scale-95 cursor-pointer tracking-wide backdrop-blur-xl"
            >
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-white font-bold">گەڕان</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
