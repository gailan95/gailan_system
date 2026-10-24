import React, { useState, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Settings,
  Save,
  CheckCircle2,
  Globe,
  Palette,
  Store,
  Lock,
  ArrowLeft,
  ChevronLeft,
  Eye,
  EyeOff,
  Key,
  Trash2,
  X,
  Building2,
  User,
  Users,
  Phone,
  MapPin,
  DollarSign,
  Shield,
  FileText,
  Image as ImageIcon,
  Upload,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  PRESET_WALLPAPERS,
  compressWallpaperImage,
  setSavedWallpaper,
  getSavedWallpaperId,
} from '../utils/wallpaperPresets';
import {
  compressLogoImage,
  getSavedReceiptLogoUrl,
  getSavedShowReceiptLogo,
  saveReceiptLogoSettings,
  removeCustomReceiptLogo,
} from '../utils/receiptLogoUtils';

import { DataMaintenanceView } from './DataMaintenanceView';

const PRESET_COLORS = [
  {
    id: 'deep_blue',
    name: 'شینی قووڵ',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #38bdf8 100%)',
    glow: 'rgba(37, 99, 235, 0.45)',
    border: '#3b82f6',
  },
  {
    id: 'ios_nebula',
    name: 'مۆر',
    gradient: 'linear-gradient(135deg, #6b21a8 0%, #9333ea 50%, #d946ef 100%)',
    glow: 'rgba(168, 85, 247, 0.45)',
    border: '#a855f7',
  },
  {
    id: 'emerald_mesh',
    name: 'سەوز',
    gradient: 'linear-gradient(135deg, #047857 0%, #10b981 50%, #34d399 100%)',
    glow: 'rgba(16, 185, 129, 0.45)',
    border: '#10b981',
  },
  {
    id: 'ruby_crimson',
    name: 'سور',
    gradient: 'linear-gradient(135deg, #be123c 0%, #f43f5e 50%, #fb7185 100%)',
    glow: 'rgba(244, 63, 94, 0.45)',
    border: '#f43f5e',
  },
  {
    id: 'sunset_aura',
    name: 'خۆرئاوابوون',
    gradient: 'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #f59e0b 100%)',
    glow: 'rgba(234, 88, 12, 0.45)',
    border: '#f97316',
  },
  {
    id: 'cyber_cyan',
    name: 'پیرۆزەیی',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 50%, #38bdf8 100%)',
    glow: 'rgba(6, 182, 212, 0.45)',
    border: '#06b6d4',
  },
  {
    id: 'rose_gold',
    name: 'پەمەیی مرواری',
    gradient: 'linear-gradient(135deg, #be185d 0%, #ec4899 50%, #f472b6 100%)',
    glow: 'rgba(236, 72, 153, 0.45)',
    border: '#ec4899',
  },
  {
    id: 'gold_amber',
    name: 'ئاڵتونی شاهانە',
    gradient: 'linear-gradient(135deg, #a16207 0%, #eab308 50%, #fde047 100%)',
    glow: 'rgba(234, 179, 8, 0.45)',
    border: '#eab308',
  },
  {
    id: 'oled_black',
    name: 'تاریکی تەواو',
    gradient: 'linear-gradient(135deg, #030712 0%, #1e293b 50%, #000000 100%)',
    glow: 'rgba(148, 163, 184, 0.3)',
    border: '#64748b',
  },
  {
    id: 'default',
    name: 'زیوی ڕووناک',
    gradient: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 50%, #cbd5e1 100%)',
    glow: 'rgba(255, 255, 255, 0.6)',
    border: '#ffffff',
  },
];

export const BackgroundSettingsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeWallpaperId, setActiveWallpaperId] = useState<string>(() => getSavedWallpaperId());

  const handleSelectColorPreset = async (preset: typeof PRESET_COLORS[0]) => {
    try {
      setActiveWallpaperId(preset.id);
      await setSavedWallpaper(preset.id, '');
      localStorage.removeItem('app_background_color');
      localStorage.removeItem('main_view_wallpaper_custom_url');
      localStorage.removeItem('app_background_image');
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('wallpaperChange', { detail: { type: 'main', presetId: preset.id } }));
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (e) {
      console.error('Error saving color preset:', e);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressWallpaperImage(file);
      await setSavedWallpaper('custom_image', compressedBase64);
      localStorage.removeItem('app_background_color');
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('wallpaperChange', { detail: { type: 'main', presetId: 'custom_image', customUrl: compressedBase64 } }));
      window.location.reload();
    } catch (err) {
      console.error('Error saving image wallpaper:', err);
      alert('قەبارەی وێنەکە زۆر گەورەیە یان هەڵەیەک ڕویدا! تکایە وێنەیەکی دیکە هەڵبژێرە.');
    } finally {
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl text-right space-y-6" dir="rtl">
      <div>
        <label className="group relative flex items-center justify-between sm:justify-center gap-3 w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400 text-slate-950 font-black text-sm cursor-pointer shadow-lg shadow-emerald-950/40 hover:shadow-emerald-500/30 transition-all duration-200 active:scale-[0.99] border border-emerald-300/40 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950/15 backdrop-blur-xs flex items-center justify-center text-slate-950 shadow-inner group-hover:scale-110 transition-transform">
              <ImageIcon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="text-right">
              <span className="block text-sm sm:text-base font-black tracking-wide leading-tight">
                هەڵبژاردنی وێنە
              </span>
              <span className="block text-[10px] font-bold text-slate-900/80 leading-tight">
                دانانی وێنەی تایبەت بۆ باکگراوند لە ئامێرەوە
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900/90 bg-white/35 backdrop-blur-xs px-3 py-1.5 rounded-xl shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
            <span>باکگراوند</span>
          </div>

          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>

        {activeWallpaperId === 'custom_image' && (
          <div className="mt-2.5 flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            <span className="flex items-center gap-1.5 font-bold">
              <Check className="w-4 h-4 text-emerald-400" />
              وێنەی تایبەت لە باکگراونددا چالاکە
            </span>
            <button
              type="button"
              onClick={async () => {
                setActiveWallpaperId('default');
                await setSavedWallpaper('default', '');
                localStorage.removeItem('app_background_color');
                localStorage.removeItem('main_view_wallpaper_custom_url');
                localStorage.removeItem('app_background_image');
                window.dispatchEvent(new Event('storage'));
                window.dispatchEvent(new CustomEvent('wallpaperChange', { detail: { type: 'main', presetId: 'default' } }));
                window.location.reload();
              }}
              className="text-[11px] text-rose-300 hover:text-rose-200 underline cursor-pointer"
            >
              لابردنی وێنە
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 pt-4">
        <h3 className="text-xs font-bold text-slate-900 mb-3">١٠ ڕەنگی ئامادەکراوی باکگراوند:</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PRESET_COLORS.map((preset) => {
            const isSelected = activeWallpaperId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectColorPreset(preset)}
                className={`flex flex-col items-center gap-2.5 p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'bg-slate-950 border-amber-400 ring-2 ring-amber-400/40 shadow-xl'
                    : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* ڕەنگی دیار و ڕووناک */}
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-lg border-2 transition-transform group-hover:scale-105 flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: preset.gradient,
                    borderColor: isSelected ? '#ffffff' : preset.border,
                    boxShadow: `0 4px 16px ${preset.glow}`,
                  }}
                >
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-black/65 backdrop-blur-xs flex items-center justify-center text-white shadow-sm border border-white/50">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center">
                  <span
                    className={`text-xs font-black truncate max-w-full text-center ${
                      isSelected ? 'text-amber-300' : 'text-slate-900 group-hover:text-white'
                    }`}
                  >
                    {preset.name}
                  </span>
                  {isSelected && (
                    <span className="text-[9px] font-bold text-amber-400 mt-0.5">
                      (چالاکە)
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white font-bold text-xs hover:bg-slate-700 cursor-pointer transition-colors"
        >
          گەڕانەوە بۆ ڕێکخستنەکان
        </button>
      </div>
    </div>
  );
};

interface SettingsViewProps {
  onOpenDatabaseModal?: () => void;
  onBackToMain?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenDatabaseModal, onBackToMain }) => {
  const { settings, setSettings, updateSettings } = useDatabase();
  const cleanVal = (val?: string, forbidden: string[] = []) => {
    if (!val) return '';
    for (const f of forbidden) {
      if (val.includes(f)) return '';
    }
    return val;
  };

  const [storeName, setStoreName] = useState(settings.storeName || '');
  const [officeNumber, setOfficeNumber] = useState(settings.officeNumber || '');
  const [marketSubtitle, setMarketSubtitle] = useState(settings.marketSubtitle || '');
  const [managementLabel, setManagementLabel] = useState(settings.managementLabel || '');
  const [managerNames, setManagerNames] = useState(cleanVal(settings.managerNames, ['سلام', 'عباس']));
  const [phoneOwner1, setPhoneOwner1] = useState(cleanVal(settings.phoneOwner1, ['سلام']));
  const [phone, setPhone] = useState(cleanVal(settings.phone, ['07829219207']));
  const [phoneOwner2, setPhoneOwner2] = useState(cleanVal(settings.phoneOwner2, ['عباس']));
  const [phone2, setPhone2] = useState(cleanVal(settings.phone2, ['0770 987 6543']));
  const [address, setAddress] = useState(settings.address || '');
  const [usdToIqdRate, setUsdToIqdRate] = useState<number | string>(settings.usdToIqdRate ?? 1530);
  const [invoiceFooterMessage, setInvoiceFooterMessage] = useState(settings.invoiceFooterMessage || '');
  const [receiptLogoUrl, setReceiptLogoUrl] = useState<string>(
    () => settings.receiptLogoUrl || (typeof window !== 'undefined' ? getSavedReceiptLogoUrl() : '') || ''
  );
  const [showReceiptLogo, setShowReceiptLogo] = useState<boolean>(
    () => (settings.showReceiptLogo !== undefined ? settings.showReceiptLogo : (typeof window !== 'undefined' ? getSavedShowReceiptLogo() : true))
  );
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);

  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [showNewPasscode, setShowNewPasscode] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [activeSubView, setActiveSubView] = useState<'main' | 'store' | 'security' | 'appearance' | 'maintenance'>('main');

  useEffect(() => {
    setStoreName(settings.storeName || '');
    setOfficeNumber(settings.officeNumber || '');
    setMarketSubtitle(settings.marketSubtitle || '');
    setManagementLabel(settings.managementLabel || '');
    setManagerNames(cleanVal(settings.managerNames, ['سلام', 'عباس']));
    setPhoneOwner1(cleanVal(settings.phoneOwner1, ['سلام']));
    setPhone(cleanVal(settings.phone, ['07829219207']));
    setPhoneOwner2(cleanVal(settings.phoneOwner2, ['عباس']));
    setPhone2(cleanVal(settings.phone2, ['0770 987 6543']));
    setAddress(settings.address || '');
    setUsdToIqdRate(settings.usdToIqdRate ?? 1530);
    setInvoiceFooterMessage(settings.invoiceFooterMessage || '');
    setReceiptLogoUrl(settings.receiptLogoUrl || (typeof window !== 'undefined' ? getSavedReceiptLogoUrl() : '') || '');
    if (settings.showReceiptLogo !== undefined) {
      setShowReceiptLogo(settings.showReceiptLogo);
    }
  }, [settings]);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const compressed = await compressLogoImage(file, 350);
      setReceiptLogoUrl(compressed);
      setShowReceiptLogo(true);
      saveReceiptLogoSettings(compressed, true);
      updateSettings({ receiptLogoUrl: compressed, showReceiptLogo: true });
      setFeedbackMsg('وێنەی لۆگۆی پسووڵە بە سەرکەوتوویی بارکرا!');
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error('Error compressing logo:', err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          setReceiptLogoUrl(dataUrl);
          setShowReceiptLogo(true);
          saveReceiptLogoSettings(dataUrl, true);
          updateSettings({ receiptLogoUrl: dataUrl, showReceiptLogo: true });
          setFeedbackMsg('وێنەی لۆگۆی پسووڵە بە سەرکەوتوویی بارکرا!');
          setTimeout(() => setFeedbackMsg(null), 3000);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingLogo(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setReceiptLogoUrl('');
    removeCustomReceiptLogo();
    updateSettings({ receiptLogoUrl: '' });
    saveReceiptLogoSettings('', showReceiptLogo);
    setFeedbackMsg('لۆگۆی پسووڵە بە سەرکەوتوویی سڕایەوە');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleToggleShowLogo = () => {
    const nextVal = !showReceiptLogo;
    setShowReceiptLogo(nextVal);
    saveReceiptLogoSettings(receiptLogoUrl, nextVal);
    updateSettings({ showReceiptLogo: nextVal });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName,
      officeNumber,
      marketSubtitle,
      managementLabel,
      managerNames,
      phoneOwner1,
      phone,
      phoneOwner2,
      phone2,
      address,
      usdToIqdRate: Number(usdToIqdRate) || 1530,
      invoiceFooterMessage,
      receiptLogoUrl,
      showReceiptLogo,
    });
    saveReceiptLogoSettings(receiptLogoUrl, showReceiptLogo);
    setSuccessMsg(true);
    setFeedbackMsg('زانیارییەکانی کۆگا و پسوڵە بە سەرکەوتوویی پاشەکەوت کران!');
    setTimeout(() => {
      setSuccessMsg(false);
      setFeedbackMsg(null);
    }, 3500);
  };

  const handleSaveNewPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      securityPasscode: newPasscode,
    });
    setIsChangeModalOpen(false);
    setFeedbackMsg('ژمارەی نهێنی بە سەرکەوتوویی گۆڕدرا');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleDeletePasscode = () => {
    updateSettings({
      securityPasscode: '',
    });
    setFeedbackMsg('ژمارەی نهێنی بە سەرکەوتوویی سڕایەوە');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24 animate-fadeIn">
      <div className="flex items-center justify-between px-1 mb-2">
        <button
          type="button"
          onClick={() => {
            if (activeSubView !== 'main') {
              setActiveSubView('main');
            } else if (onBackToMain) {
              onBackToMain();
            }
          }}
          className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2 rounded-2xl shadow-sm border border-white/10 flex items-center gap-2 transition-all cursor-pointer text-xs sm:text-sm"
        >
          <span>{activeSubView !== 'main' ? 'گەڕانەوە' : 'سەرەکی'}</span>
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
          <span>ڕێکخستنەکان</span>
          <Settings className="w-6 h-6 text-emerald-400" />
        </h1>
      </div>

      {(successMsg || feedbackMsg) && (
        <div className="bg-emerald-950/80 border border-emerald-700 p-4 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs font-bold shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{feedbackMsg || 'گۆڕانکارییەکان بە سەرکەوتوویی پاشەکەوت کران!'}</span>
        </div>
      )}

      {activeSubView === 'main' ? (
        <div className="space-y-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm sm:text-base">زمان (Language)</h3>
                <p className="text-slate-600 text-xs mt-0.5">کوردی (Sorani)</p>
              </div>
            </div>
            <div className="bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-3.5 py-1.5 rounded-xl font-bold text-xs">
              کوردی
            </div>
          </div>



          <div
            onClick={() => setActiveSubView('appearance')}
            className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex items-center justify-between cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Palette className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm sm:text-base">باکگراوند</h3>
                <p className="text-slate-600 text-xs mt-0.5">هەڵبژاردنی 10 ڕەنگی ئامادە یاخود هەڵبژاردنی وێنە</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </div>

          <div
            onClick={() => setActiveSubView('store')}
            className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex items-center justify-between cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm sm:text-base">زانیاری کۆگا و پسوڵە</h3>
                <p className="text-slate-600 text-xs mt-0.5">ناوی نووسینگە، وەسفی بازرگانی، تەلەفۆن و سەرپەڕەی پسووڵە</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </div>

          <div
            onClick={() => setActiveSubView('security')}
            className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex items-center justify-between cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm sm:text-base">ژمارەی نهێنی گۆڕانکاری</h3>
                <p className="text-slate-600 text-xs mt-0.5">پاراستنی زانیاری و سڕینەوە</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-xl text-xs font-bold">
                پارێزراوە
              </span>
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </div>
          </div>

          <div
            onClick={() => setActiveSubView('maintenance')}
            className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex items-center justify-between cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm sm:text-base">بەڕێوەبردنی داتا</h3>
                <p className="text-slate-600 text-xs mt-0.5">سڕینەوەی داتاکان بەپێی مانگ و ساڵ</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </div>
        </div>
      ) : activeSubView === 'store' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl text-right space-y-6" dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-inner">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span>زانیاری کۆگا و پسوڵە</span>
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  ناوی مەکتەب، وەسفی بازرگانی، تەلەفۆن و زانیارییەکانی سەرپەڕەی پسووڵە
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubView('main')}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 border border-slate-700/60 cursor-pointer shadow-sm"
            >
              <span>گەڕانەوە</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* بەشی: لۆگۆ و وێنەی پسووڵە */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-inner">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoFileChange}
                className="hidden"
                id="receipt-logo-file-input"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-950/40 disabled:opacity-50"
                >
                  <Upload className="w-5 h-5" />
                  <span>
                    {isUploadingLogo ? 'لە بارکردندایە...' : 'هەڵبژاردنی وێنەی لۆگۆ'}
                  </span>
                </button>

                {receiptLogoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="p-3.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-600 hover:text-rose-400 border border-slate-800 transition-all cursor-pointer shrink-0"
                    title="سڕینەوەی لۆگۆ"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* بەشی ١: زانیاری سەرەکی مەکتەب و پسووڵە */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-black text-blue-400">
                <Building2 className="w-4 h-4" />
                <span>زانیاری سەرەکی نووسینگە و پسووڵە</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Store Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-900 font-bold mb-1.5">
                    ناوی نووسینگە / مەڵبەندی بازرگانی:
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder=""
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-600 transition-all shadow-inner"
                  />
                </div>

                {/* Office Number */}
                <div>
                  <label className="block text-xs text-slate-900 font-bold mb-1.5">
                    ژمارەی مەکتەب / نووسینگە (لە سەرەوەی پسووڵە):
                  </label>
                  <input
                    type="text"
                    value={officeNumber}
                    onChange={(e) => setOfficeNumber(e.target.value)}
                    placeholder="مەکتەبی ژمارە ( ٤٩ )"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-600 transition-all shadow-inner"
                  />
                </div>

                {/* Market Subtitle */}
                <div>
                  <label className="block text-xs text-slate-900 font-bold mb-1.5">
                    وەسفی بازرگانی پسووڵە (ژێرنووسی بازاڕ):
                  </label>
                  <input
                    type="text"
                    value={marketSubtitle}
                    onChange={(e) => setMarketSubtitle(e.target.value)}
                    placeholder="بۆ بازرگانی میوە و سەوزە و وشکەبار بە کۆمەڵ"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-600 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* بەشی ٢: بەڕێوەبردن و سەرپەرشتیاری */}
            <div className="space-y-3.5 pt-2 border-t border-slate-800/60">
              <div className="flex items-center gap-2 text-xs font-black text-amber-400">
                <Shield className="w-4 h-4" />
                <span>سەرپەرشتیاری و خاوەنکارەکان لە پسووڵە</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs text-slate-900 font-bold mb-1.5">
                    سەردێڕی بەڕێوەبردن:
                  </label>
                  <input
                    type="text"
                    value={managementLabel}
                    onChange={(e) => setManagementLabel(e.target.value)}
                    placeholder=""
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 placeholder:text-slate-600 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-900 font-bold mb-1.5">
                    ناوی بەڕێوەبەران / خاوەنکار لە پسووڵە:
                  </label>
                  <input
                    type="text"
                    value={managerNames}
                    onChange={(e) => setManagerNames(e.target.value)}
                    placeholder=""
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 placeholder:text-slate-600 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* بەشی ٣: ژمارەکانی مۆبایل و خاوەنەکانیان (٢ کەس) */}
            <div className="space-y-3.5 pt-2 border-t border-slate-800/60">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
                <Phone className="w-4 h-4" />
                <span>ژمارەی مۆبایل و ناوی خاوەنەکان (٢ کەس)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* کەسی یەکەم */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-bold text-emerald-400">
                    <User className="w-4 h-4" />
                    <span>کەسی یەکەم (خاوەنی ژمارەی سەرەکی)</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      ناوی خاوەنی مۆبایل (کەسی ۱):
                    </label>
                    <input
                      type="text"
                      value={phoneOwner1}
                      onChange={(e) => setPhoneOwner1(e.target.value)}
                      placeholder=""
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      ژمارەی مۆبایل (کەسی ۱):
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder=""
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* کەسی دووەم */}
                <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-bold text-blue-400">
                    <User className="w-4 h-4" />
                    <span>کەسی دووەم</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      ناوی خاوەنی مۆبایل (کەسی ۲):
                    </label>
                    <input
                      type="text"
                      value={phoneOwner2}
                      onChange={(e) => setPhoneOwner2(e.target.value)}
                      placeholder=""
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      ژمارەی مۆبایل (کەسی ۲):
                    </label>
                    <input
                      type="text"
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value)}
                      placeholder=""
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 placeholder:text-slate-600 font-mono"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* بەشی ٤: ناونیشان و نرخی دۆلار و پەیامی ژێرەوە */}
            <div className="space-y-3.5 pt-2 border-t border-slate-800/60">
              <div className="flex items-center gap-2 text-xs font-black text-cyan-400">
                <MapPin className="w-4 h-4" />
                <span>ناونیشان و پەیامی پسووڵە</span>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                <div>
                  <label className="block text-xs text-slate-900 font-bold mb-1.5">
                    ناونیشانی شوێن / کۆگا:
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="عەلوەی سەوزە و میوە - سلێمانی"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 placeholder:text-slate-600 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-900 font-bold mb-1.5">
                    پەیامی ژێرەوەی پسووڵە:
                  </label>
                  <textarea
                    rows={2}
                    value={invoiceFooterMessage}
                    onChange={(e) => setInvoiceFooterMessage(e.target.value)}
                    placeholder="سوپاس بۆ سەردانەکەتان، کاڵای فرۆشراو بە مەرجی هێنانەوەی پسووڵە دەگۆڕدرێتەوە"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 placeholder:text-slate-600 transition-all resize-none shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* دوگمەکانی پاشەکەوت و گەڕانەوە */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveSubView('main')}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>گەڕانەوە بۆ ڕێکخستنەکان</span>
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm transition-all cursor-pointer shadow-lg hover:shadow-blue-500/25 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>پاشەکەوتکردنی زانیارییەکان</span>
              </button>
            </div>
          </form>
        </div>
      ) : activeSubView === 'security' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-right space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <span>ژمارەی نهێنی</span>
            </h2>
          </div>

          {/* تەنها ٢ دوگمە: گۆڕینی ژمارەی نهێنی و سڕینەوەی ژمارەی نهێنی (خانەی نووسین لابرا) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setNewPasscode(settings.securityPasscode || '');
                setIsChangeModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>گۆڕینی ژمارەی نهێنی</span>
            </button>

            <button
              type="button"
              onClick={handleDeletePasscode}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>سڕینەوەی ژمارەی نهێنی</span>
            </button>
          </div>

          <div className="pt-2 flex justify-end border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveSubView('main')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer"
            >
              گەڕانەوە
            </button>
          </div>
        </div>
      ) : activeSubView === 'maintenance' ? (
        <DataMaintenanceView onBack={() => setActiveSubView('main')} />
      ) : (
        <BackgroundSettingsView onBack={() => setActiveSubView('main')} />
      )}

      {/* مۆداڵی گۆڕینی ژمارەی نهێنی */}
      {isChangeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-right space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setIsChangeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>گۆڕینی ژمارەی نهێنی</span>
                <Key className="w-5 h-5 text-emerald-400" />
              </h3>
            </div>

            <form onSubmit={handleSaveNewPasscode} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 block">ژمارەی نهێنی نوێ</label>
                <div className="relative">
                  <input
                    type={showNewPasscode ? 'text' : 'password'}
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value)}
                    placeholder="ژمارەی نهێنی نوێ بنووسە..."
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-white text-sm font-mono tracking-wider pl-12 focus:outline-none transition-all shadow-inner text-right"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPasscode(!showNewPasscode)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                    title={showNewPasscode ? 'شاردنەوەی ژمارەی نهێنی' : 'پیشاندانی ژمارەی نهێنی'}
                  >
                    {showNewPasscode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsChangeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-emerald-950/40"
                >
                  پاشەکەوتکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
