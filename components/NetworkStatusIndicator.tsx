import React, { useState, useRef, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Cloud,
  ChevronDown,
  X,
  HardDrive,
  Clock,
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate } from '../utils/formatters';

interface NetworkStatusIndicatorProps {
  className?: string;
  compact?: boolean;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  className = '',
  compact = false,
}) => {
  const { isOnline, isSyncing, pendingSyncCount, lastSyncedAt, syncNow, saveStatusText, syncClockWithServer } = useDatabase();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleManualSync = async () => {
    setSyncFeedback(null);
    syncClockWithServer();
    const success = await syncNow();
    if (success) {
      setSyncFeedback(t('synced_all', 'سەرجەم داتاکان و کاتی سیستەم بە سەرکەوتوویی هاوکاتکران'));
    } else {
      setSyncFeedback(t('sync_failed', 'هاوکاتکردن سەرکەوتوو نەبوو، گۆڕانکارییەکان لە ئامێردا پارێزراون'));
    }
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={dropdownRef}>
      {/* Indicator Trigger Button */}
      <button
        type="button"
        id="network-status-indicator-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`wifi-button flex items-center gap-0.5 sm:gap-1.5 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-xl text-[9px] sm:text-xs font-bold transition-all border backdrop-blur-md cursor-pointer select-none ${
          isOpen ? 'clicked' : ''
        } ${
          !isOnline
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            : isSyncing
            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
            : pendingSyncCount > 0
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
        }`}
        title={!isOnline ? t('offline_status', 'ئۆفلاین') : t('online_status', 'سەرهێڵ')}
      >
        {/* Animated Status Icon */}
        <span className="relative flex items-center justify-center">
          {!isOnline ? (
            <WifiOff className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-400" />
          ) : isSyncing ? (
            <RefreshCw className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-cyan-300 animate-spin" />
          ) : (
            <>
              <Wifi className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
            </>
          )}
        </span>

        {/* Text Label */}
        <span className="status-text truncate text-[9px] sm:text-xs font-bold inline-block">
          {isSyncing
            ? t('syncing_status', 'هاوکاتکردن...')
            : isOnline
            ? 'Online'
            : 'Offline'}
        </span>

        {/* Pending Sync Badge */}
        {pendingSyncCount > 0 && (
          <span className="px-1 py-0 rounded-full bg-amber-400/90 text-slate-950 font-black text-[8px] sm:text-[10px] min-w-[14px] sm:min-w-[18px] text-center shadow-xs">
            {pendingSyncCount}
          </span>
        )}

        <ChevronDown className={`w-2 h-2 sm:w-3 sm:h-3 text-white/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          className="hidden-content show absolute top-full mt-2 left-0 z-50 w-[85vw] sm:w-80 max-w-[320px] max-h-[75vh] overflow-y-auto bg-slate-900/95 text-white rounded-2xl p-4 shadow-2xl border border-cyan-500/30 backdrop-blur-xl animate-scaleUp text-xs space-y-3"
          style={{
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.7), 0 0 20px rgba(6,182,212,0.15)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  !isOnline ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {!isOnline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white">
                  {!isOnline ? t('offline_status', 'ئۆفلاین (بێ ئینتەرنێت)') : t('online_status', 'سەرهێڵ (پەیوەستە)')}
                </h4>
                <p className="text-[10px] text-slate-600">
                  {t('hybrid_offline_active', 'سیستەمی هایبریدی ئۆفلاین کارایە')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-600 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Storage & Queue Info */}
          <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>پاشەکەوتی ناوخۆ (IndexedDB):</span>
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>چالاکە</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>کاتژمێری ناوەندی (Sync Clock):</span>
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>هاوکاتە</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-blue-400" />
                <span>نۆرەی هاوکاتکردن (Sync Queue):</span>
              </span>
              <span
                className={`font-black ${
                  pendingSyncCount > 0 ? 'text-amber-400' : 'text-slate-900'
                }`}
              >
                {pendingSyncCount > 0
                  ? `${pendingSyncCount} ${t('pending_sync', 'تۆمار چاوەڕوانە')}`
                  : t('synced_all', 'هەمووی نوێکراوەتەوە')}
              </span>
            </div>

            {lastSyncedAt && (
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5 text-slate-600">
                <span>{t('last_sync', 'دوایین هاوکاتکردن')}:</span>
                <span className="text-slate-900 font-mono">
                  {formatDate(lastSyncedAt)}
                </span>
              </div>
            )}
          </div>

          {/* Feedback message */}
          {syncFeedback && (
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold text-center animate-fadeIn">
              {syncFeedback}
            </div>
          )}

          {/* Status Note */}
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {!isOnline
              ? t(
                  'offline_note',
                  'هەموو فرۆشتن، خەرجی و پسووڵەکان لە ناوخۆی ئامێرەکەت پاشەکەوت دەکرێن و بە بێ کێشە کار دەکەن. کاتێک هێڵ دەگەڕێتەوە، خۆکارانە هاوکات دەکرێن.'
                )
              : pendingSyncCount > 0
              ? t(
                  'sync_pending_note',
                  'گۆڕانکاری نوێ لە نۆرەدان بۆ ناردن بۆ کلاود و سێرڤەر.'
                )
              : t(
                  'online_synced_note',
                  'پەیوەندی ئینتەرنێت جێگیرە و سەرجەم داتاکان لە کلاود و ئامێردا پارێزراون.'
                )}
          </p>

          {/* Action Buttons */}
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isSyncing || !isOnline
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? t('syncing_status', 'هاوکاتکردن...') : t('sync_now', 'هاوکاتکردنی ئێستا')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
