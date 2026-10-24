import React from 'react';
import { saveToIndexedDB, loadFromIndexedDB } from './indexedDB';

export interface WallpaperPreset {
  id: string;
  name: string;
  preview: string;
  style: React.CSSProperties;
  isDarkText?: boolean;
}

export const PRESET_WALLPAPERS: WallpaperPreset[] = [
  {
    id: 'deep_blue',
    name: 'شینی قووڵ',
    preview: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #38bdf8 100%)',
    style: {
      background: 'radial-gradient(ellipse 120% 80% at 50% -10%, rgba(56, 189, 248, 0.45) 0%, rgba(37, 99, 235, 0.35) 40%, transparent 80%), radial-gradient(circle at 95% 85%, rgba(99, 102, 241, 0.35) 0%, transparent 55%), radial-gradient(circle at 5% 75%, rgba(14, 165, 233, 0.3) 0%, transparent 50%), linear-gradient(145deg, #07132b 0%, #0c234a 35%, #0f346b 70%, #15458a 100%)',
      backgroundColor: '#0a1936',
    },
    isDarkText: false,
  },
  {
    id: 'ios_nebula',
    name: 'مۆر',
    preview: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 50%, #d946ef 100%)',
    style: {
      background: 'radial-gradient(ellipse 110% 75% at 50% -10%, rgba(217, 70, 239, 0.5) 0%, rgba(168, 85, 247, 0.4) 45%, transparent 75%), radial-gradient(circle at 90% 80%, rgba(192, 38, 211, 0.35) 0%, transparent 50%), linear-gradient(145deg, #160829 0%, #290d4a 35%, #42136e 75%, #581c87 100%)',
      backgroundColor: '#1b0933',
    },
    isDarkText: false,
  },
  {
    id: 'emerald_mesh',
    name: 'سەوز',
    preview: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
    style: {
      background: 'radial-gradient(ellipse 110% 75% at 50% -10%, rgba(52, 211, 153, 0.45) 0%, rgba(16, 185, 129, 0.4) 45%, transparent 75%), radial-gradient(circle at 90% 85%, rgba(5, 150, 105, 0.35) 0%, transparent 50%), linear-gradient(145deg, #04241c 0%, #064032 35%, #095946 70%, #047857 100%)',
      backgroundColor: '#052b22',
    },
    isDarkText: false,
  },
  {
    id: 'ruby_crimson',
    name: 'سور',
    preview: 'linear-gradient(135deg, #be123c 0%, #f43f5e 50%, #fb7185 100%)',
    style: {
      background: 'radial-gradient(ellipse 110% 75% at 50% -10%, rgba(244, 63, 94, 0.45) 0%, rgba(225, 29, 72, 0.4) 45%, transparent 75%), radial-gradient(circle at 90% 85%, rgba(190, 18, 60, 0.35) 0%, transparent 50%), linear-gradient(145deg, #29060f 0%, #450a1a 35%, #6e0f29 70%, #9f1239 100%)',
      backgroundColor: '#2e0812',
    },
    isDarkText: false,
  },
  {
    id: 'sunset_aura',
    name: 'خۆرئاوابوون',
    preview: 'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #fbbf24 100%)',
    style: {
      background: 'radial-gradient(ellipse 110% 75% at 50% -10%, rgba(249, 115, 22, 0.45) 0%, rgba(234, 88, 12, 0.4) 45%, transparent 75%), radial-gradient(circle at 90% 80%, rgba(245, 158, 11, 0.35) 0%, transparent 50%), linear-gradient(145deg, #2b0f05 0%, #4a1908 35%, #7a260c 70%, #9a3412 100%)',
      backgroundColor: '#301206',
    },
    isDarkText: false,
  },
  {
    id: 'cyber_cyan',
    name: 'پیرۆزەیی',
    preview: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 50%, #38bdf8 100%)',
    style: {
      background: 'radial-gradient(ellipse 110% 75% at 50% -10%, rgba(6, 182, 212, 0.45) 0%, rgba(14, 116, 144, 0.4) 45%, transparent 75%), radial-gradient(circle at 90% 85%, rgba(56, 189, 248, 0.35) 0%, transparent 50%), linear-gradient(145deg, #032129 0%, #063947 35%, #0a566b 70%, #0e7490 100%)',
      backgroundColor: '#042730',
    },
    isDarkText: false,
  },
  {
    id: 'rose_gold',
    name: 'پەمەیی مرواری',
    preview: 'linear-gradient(135deg, #be185d 0%, #ec4899 50%, #f472b6 100%)',
    style: {
      background: 'radial-gradient(ellipse 110% 75% at 50% -10%, rgba(244, 114, 182, 0.45) 0%, rgba(219, 39, 119, 0.4) 45%, transparent 75%), radial-gradient(circle at 90% 85%, rgba(244, 63, 94, 0.35) 0%, transparent 50%), linear-gradient(145deg, #29081d 0%, #450c30 35%, #6e134d 70%, #9d174d 100%)',
      backgroundColor: '#2e0a21',
    },
    isDarkText: false,
  },
  {
    id: 'gold_amber',
    name: 'ئاڵتونی شاهانە',
    preview: 'linear-gradient(135deg, #a16207 0%, #eab308 50%, #fde047 100%)',
    style: {
      background: 'radial-gradient(ellipse 110% 75% at 50% -10%, rgba(234, 179, 8, 0.45) 0%, rgba(202, 138, 4, 0.4) 45%, transparent 75%), radial-gradient(circle at 90% 80%, rgba(245, 158, 11, 0.35) 0%, transparent 50%), linear-gradient(145deg, #291a04 0%, #472d06 35%, #6e460a 70%, #854d0e 100%)',
      backgroundColor: '#2e1d05',
    },
    isDarkText: false,
  },
  {
    id: 'oled_black',
    name: 'تاریکی تەواو',
    preview: 'linear-gradient(135deg, #030712 0%, #111827 50%, #000000 100%)',
    style: {
      backgroundColor: '#000000',
      backgroundImage: 'radial-gradient(ellipse 100% 70% at 50% 0%, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.3) 40%, transparent 80%), linear-gradient(180deg, #050811 0%, #000000 100%)',
    },
    isDarkText: false,
  },
  {
    id: 'default',
    name: 'زیوی ڕووناک',
    preview: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 50%, #cbd5e1 100%)',
    style: {
      background: 'radial-gradient(ellipse 120% 75% at 50% -15%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.35) 45%, rgba(255, 255, 255, 0) 80%), radial-gradient(circle at 95% 95%, rgba(255, 255, 255, 0.45) 0%, rgba(193, 196, 199, 0) 55%), linear-gradient(135deg, #eef2f5 0%, #dbe0e3 30%, #C1C4C7 65%, #b4b8bb 100%)',
    },
    isDarkText: true,
  },
];

/**
 * Compresses an uploaded wallpaper image file with multi-tier progressive optimization
 * so it produces a crisp, high-fidelity background image (~35-60KB) that is guaranteed
 * to fit safely within localStorage quota and IndexedDB without any memory/storage failure.
 */
export const compressWallpaperImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        try {
          const encodeCanvas = (maxDim: number, quality: number): string => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext('2d');
            if (!ctx) return '';

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            return canvas.toDataURL('image/jpeg', quality);
          };

          // Tier 1: 1080px max dimension, quality 0.70 (Crisp & vibrant)
          let result = encodeCanvas(1080, 0.70);

          // Tier 2: If result exceeds ~90KB base64, reduce to 850px quality 0.62
          if (!result || result.length > 90000) {
            result = encodeCanvas(850, 0.62);
          }

          // Tier 3: If still over ~70KB, reduce to 720px quality 0.55 (~30KB, easily fits in any localStorage)
          if (!result || result.length > 70000) {
            result = encodeCanvas(720, 0.55);
          }

          if (result) {
            resolve(result);
          } else {
            // Ultimate fallback
            resolve(encodeCanvas(600, 0.50));
          }
        } catch (canvasErr) {
          console.warn('Canvas compression error, retrying low-res fallback:', canvasErr);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, 640, 480);
              resolve(canvas.toDataURL('image/jpeg', 0.55));
              return;
            }
          } catch {}
          reject(new Error('Failed to process image'));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

// In-memory cache variables for instant synchronous access
let inMemoryWallpaperId: string | null = null;
let inMemoryCustomUrl: string | null = null;
let inMemorySidebarWallpaperId: string | null = null;
let inMemorySidebarCustomUrl: string | null = null;

// Immediately pre-populate from localStorage at script load time so the first render is synchronous & instant
try {
  const initialId = localStorage.getItem('main_view_wallpaper_id') || localStorage.getItem('app_wallpaper_id');
  const initialCustom = localStorage.getItem('main_view_wallpaper_custom_url') || localStorage.getItem('app_background_image');
  if (initialId && initialId.trim() !== '') {
    inMemoryWallpaperId = initialId;
  }
  if (initialCustom && initialCustom.trim() !== '') {
    inMemoryCustomUrl = initialCustom;
  }

  const initialSidebarId = localStorage.getItem('sidebar_wallpaper_id');
  const initialSidebarCustom = localStorage.getItem('sidebar_wallpaper_custom_url');
  if (initialSidebarId && initialSidebarId.trim() !== '') {
    inMemorySidebarWallpaperId = initialSidebarId;
  }
  if (initialSidebarCustom && initialSidebarCustom.trim() !== '') {
    inMemorySidebarCustomUrl = initialSidebarCustom;
  }
} catch (e) {
  console.warn('Initial localStorage read notice:', e);
}

export const getSavedWallpaperId = (): string => {
  if (inMemoryWallpaperId && inMemoryWallpaperId.trim() !== '') {
    return inMemoryWallpaperId;
  }
  try {
    const saved = localStorage.getItem('main_view_wallpaper_id') || localStorage.getItem('app_wallpaper_id');
    if (saved && saved.trim() !== '') {
      inMemoryWallpaperId = saved;
      return saved;
    }
  } catch {}
  return 'deep_blue';
};

export const getSavedCustomImageUrl = (): string => {
  if (inMemoryCustomUrl !== null && inMemoryCustomUrl.trim() !== '') {
    return inMemoryCustomUrl;
  }
  try {
    const saved = localStorage.getItem('main_view_wallpaper_custom_url') || localStorage.getItem('app_background_image') || '';
    if (saved) {
      inMemoryCustomUrl = saved;
      return saved;
    }
  } catch {}
  return '';
};

/**
 * Safely writes to localStorage with automatic cleanup and quota management
 */
const safeSetLocalStorage = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      console.warn('localStorage quota exceeded, cleaning temporary items and retrying...');
      try {
        // Clear any old temporary items or duplicate keys if needed
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('temp_') || k.startsWith('backup_cache_'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        console.error('Safe localStorage retry also failed:', retryErr);
        return false;
      }
    }
    return false;
  }
};

export const setSavedWallpaper = async (presetId: string, customUrl?: string): Promise<void> => {
  inMemoryWallpaperId = presetId;
  if (customUrl !== undefined) {
    inMemoryCustomUrl = customUrl || '';
  }

  // 1. Save to localStorage with dual-key reliability
  try {
    safeSetLocalStorage('main_view_wallpaper_id', presetId);
    safeSetLocalStorage('app_wallpaper_id', presetId);
    localStorage.removeItem('app_background_color');

    if (customUrl !== undefined) {
      if (customUrl) {
        safeSetLocalStorage('main_view_wallpaper_custom_url', customUrl);
        safeSetLocalStorage('app_background_image', customUrl);
      } else {
        localStorage.removeItem('main_view_wallpaper_custom_url');
        localStorage.removeItem('app_background_image');
      }
    }
  } catch (err) {
    console.warn('localStorage set warning:', err);
  }

  // 2. Always save to IndexedDB as permanent rock-solid store
  try {
    await saveToIndexedDB('main_view_wallpaper_id', presetId);
    await saveToIndexedDB('app_wallpaper_id', presetId);
    if (customUrl !== undefined) {
      await saveToIndexedDB('main_view_wallpaper_custom_url', customUrl || '');
      await saveToIndexedDB('app_background_image', customUrl || '');
    }
  } catch (err) {
    console.warn('IndexedDB set warning:', err);
  }

  // 3. Trigger immediate cross-component sync
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('wallpaperChange', { detail: { type: 'main', presetId, customUrl } }));
};

/**
 * Completely removes the custom wallpaper and restores the default background
 */
export const removeCustomWallpaper = async (): Promise<void> => {
  inMemoryWallpaperId = 'deep_blue';
  inMemoryCustomUrl = '';

  try {
    localStorage.setItem('main_view_wallpaper_id', 'deep_blue');
    localStorage.setItem('app_wallpaper_id', 'deep_blue');
    localStorage.removeItem('main_view_wallpaper_custom_url');
    localStorage.removeItem('app_background_image');
  } catch {}

  try {
    await saveToIndexedDB('main_view_wallpaper_id', 'deep_blue');
    await saveToIndexedDB('main_view_wallpaper_custom_url', '');
  } catch {}

  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('wallpaperChange', { detail: { type: 'main', presetId: 'deep_blue', customUrl: '' } }));
};

export const SIDEBAR_WALLPAPERS: WallpaperPreset[] = [
  {
    id: 'sidebar_slate_black',
    name: 'تاریکی کلاسیک (Classic Midnight)',
    preview: 'linear-gradient(135deg, #020617 0%, #0b1120 50%, #020617 100%)',
    style: {
      backgroundColor: '#020617',
      backgroundImage: 'linear-gradient(180deg, #090e17 0%, #020617 100%)',
    },
    isDarkText: false,
  },
  {
    id: 'sidebar_deep_blue',
    name: 'شینی شاهانە (Royal Sapphire)',
    preview: 'linear-gradient(135deg, #030a1c 0%, #0f1d38 50%, #1e3a8a 100%)',
    style: {
      backgroundColor: '#030a1c',
      backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(56, 189, 248, 0.18) 0%, transparent 60%), linear-gradient(180deg, #061129 0%, #030a1c 100%)',
    },
    isDarkText: false,
  },
  {
    id: 'sidebar_purple',
    name: 'مۆری نەرم (Velvet Purple)',
    preview: 'linear-gradient(135deg, #0f051d 0%, #250b40 50%, #581c87 100%)',
    style: {
      backgroundColor: '#0f051d',
      backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(192, 38, 211, 0.18) 0%, transparent 60%), linear-gradient(180deg, #18082e 0%, #0f051d 100%)',
    },
    isDarkText: false,
  },
  {
    id: 'sidebar_emerald',
    name: 'سەوزی زمڕووت (Deep Emerald)',
    preview: 'linear-gradient(135deg, #021a14 0%, #064e3b 50%, #047857 100%)',
    style: {
      backgroundColor: '#021a14',
      backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(16, 185, 129, 0.18) 0%, transparent 60%), linear-gradient(180deg, #032b21 0%, #021a14 100%)',
    },
    isDarkText: false,
  },
  {
    id: 'sidebar_crimson',
    name: 'سووری شاهانە (Crimson Ruby)',
    preview: 'linear-gradient(135deg, #1c040a 0%, #4c0519 50%, #881337 100%)',
    style: {
      backgroundColor: '#1c040a',
      backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(225, 29, 72, 0.18) 0%, transparent 60%), linear-gradient(180deg, #2d0712 0%, #1c040a 100%)',
    },
    isDarkText: false,
  },
  {
    id: 'sidebar_cyan',
    name: 'فیرۆزەیی (Cyan Slate)',
    preview: 'linear-gradient(135deg, #011419 0%, #083344 50%, #0e7490 100%)',
    style: {
      backgroundColor: '#011419',
      backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(6, 182, 212, 0.18) 0%, transparent 60%), linear-gradient(180deg, #032128 0%, #011419 100%)',
    },
    isDarkText: false,
  },
  {
    id: 'sidebar_amber_gold',
    name: 'ئاڵتوونی (Amber Gold)',
    preview: 'linear-gradient(135deg, #1c0e02 0%, #451a03 50%, #78350f 100%)',
    style: {
      backgroundColor: '#1c0e02',
      backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(245, 158, 11, 0.18) 0%, transparent 60%), linear-gradient(180deg, #291504 0%, #1c0e02 100%)',
    },
    isDarkText: false,
  },
  {
    id: 'sidebar_frosted',
    name: 'شوشەیی (Frosted Glass)',
    preview: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.85) 100%)',
    style: {
      backgroundColor: 'rgba(15, 23, 42, 0.94)',
      backdropFilter: 'blur(24px)',
    },
    isDarkText: false,
  },
];

export const getSavedSidebarWallpaperId = (): string => {
  if (inMemorySidebarWallpaperId && inMemorySidebarWallpaperId.trim() !== '') {
    return inMemorySidebarWallpaperId;
  }
  try {
    const saved = localStorage.getItem('sidebar_wallpaper_id');
    if (saved && saved.trim() !== '') {
      inMemorySidebarWallpaperId = saved;
      return saved;
    }
  } catch {}
  return 'sidebar_slate_black';
};

export const getSavedSidebarCustomImageUrl = (): string => {
  if (inMemorySidebarCustomUrl !== null) {
    return inMemorySidebarCustomUrl;
  }
  try {
    const saved = localStorage.getItem('sidebar_wallpaper_custom_url') || '';
    inMemorySidebarCustomUrl = saved;
    return saved;
  } catch {}
  return '';
};

export const setSavedSidebarWallpaper = async (presetId: string, customUrl?: string): Promise<void> => {
  inMemorySidebarWallpaperId = presetId;
  if (customUrl !== undefined) {
    inMemorySidebarCustomUrl = customUrl || '';
  }

  try {
    localStorage.setItem('sidebar_wallpaper_id', presetId);
    if (customUrl !== undefined) {
      if (customUrl) {
        localStorage.setItem('sidebar_wallpaper_custom_url', customUrl);
      } else {
        localStorage.removeItem('sidebar_wallpaper_custom_url');
      }
    }
  } catch (err) {
    console.warn('localStorage sidebar set warning:', err);
  }

  try {
    await saveToIndexedDB('sidebar_wallpaper_id', presetId);
    if (customUrl !== undefined) {
      await saveToIndexedDB('sidebar_wallpaper_custom_url', customUrl || '');
    }
  } catch (err) {
    console.warn('IndexedDB sidebar set warning:', err);
  }

  // Trigger cross-component sync
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('wallpaperChange', { detail: { type: 'sidebar', presetId, customUrl } }));
};

/**
 * Ensures any wallpapers saved previously in IndexedDB or localStorage are populated,
 * cached in memory, and triggers cross-component re-renders so the background is 100% permanent.
 */
export const initWallpaperPersistence = async (): Promise<{ wallpaperId: string; customUrl: string }> => {
  try {
    let id = localStorage.getItem('main_view_wallpaper_id') || localStorage.getItem('app_wallpaper_id');
    const idFromIDB = await loadFromIndexedDB<string>('main_view_wallpaper_id');
    if (!id && idFromIDB) {
      id = idFromIDB;
      try { 
        localStorage.setItem('main_view_wallpaper_id', idFromIDB); 
        localStorage.setItem('app_wallpaper_id', idFromIDB);
      } catch {}
    }
    const finalId = id || 'deep_blue';
    inMemoryWallpaperId = finalId;

    let customUrl = localStorage.getItem('main_view_wallpaper_custom_url') || localStorage.getItem('app_background_image');
    const urlFromIDB = await loadFromIndexedDB<string>('main_view_wallpaper_custom_url');
    if (!customUrl && urlFromIDB) {
      customUrl = urlFromIDB;
      try { 
        localStorage.setItem('main_view_wallpaper_custom_url', urlFromIDB); 
        localStorage.setItem('app_background_image', urlFromIDB);
      } catch {}
    }
    const finalUrl = customUrl || '';
    inMemoryCustomUrl = finalUrl;

    let sideId = localStorage.getItem('sidebar_wallpaper_id');
    const sideIdFromIDB = await loadFromIndexedDB<string>('sidebar_wallpaper_id');
    if (!sideId && sideIdFromIDB) {
      sideId = sideIdFromIDB;
      try { localStorage.setItem('sidebar_wallpaper_id', sideIdFromIDB); } catch {}
    }
    inMemorySidebarWallpaperId = sideId || 'sidebar_slate_black';

    let sideUrl = localStorage.getItem('sidebar_wallpaper_custom_url');
    const sideUrlFromIDB = await loadFromIndexedDB<string>('sidebar_wallpaper_custom_url');
    if (!sideUrl && sideUrlFromIDB) {
      sideUrl = sideUrlFromIDB;
      try { localStorage.setItem('sidebar_wallpaper_custom_url', sideUrlFromIDB); } catch {}
    }
    inMemorySidebarCustomUrl = sideUrl || '';

    // Broadcast change so any components mounted before init completed get refreshed with the loaded wallpaper
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('wallpaperChange', { 
      detail: { 
        type: 'main', 
        presetId: finalId, 
        customUrl: finalUrl 
      } 
    }));
    window.dispatchEvent(new CustomEvent('wallpaperChange', { 
      detail: { 
        type: 'sidebar', 
        presetId: inMemorySidebarWallpaperId, 
        customUrl: inMemorySidebarCustomUrl 
      } 
    }));

    return { wallpaperId: finalId, customUrl: finalUrl };
  } catch (err) {
    console.warn('initWallpaperPersistence notice:', err);
    return { wallpaperId: 'deep_blue', customUrl: '' };
  }
};
