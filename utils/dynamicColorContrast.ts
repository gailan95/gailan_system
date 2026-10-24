/**
 * Dynamic Color Contrast Engine
 * دیاریکردنی دینامیکی ڕەنگی نووسین بەپێی ڕووناکی و تۆخی پاشبنەما
 * Calculate luminance and dynamically provide high-contrast text color
 * (Dark background -> White text, Light background -> Black/Charcoal text)
 */

export interface ContrastResult {
  isDark: boolean;
  theme: 'dark' | 'light';
  textColor: string;
  textSecondary: string;
  textMuted: string;
  surfaceBg: string;
  borderColor: string;
}

/**
 * Parses Hex (#fff, #ffffff, #ffffff80) to RGB
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number; a?: number } | null => {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  if (cleaned.length === 6 || cleaned.length === 8) {
    const num = parseInt(cleaned, 16);
    return {
      r: (num >> (cleaned.length === 8 ? 24 : 16)) & 255,
      g: (num >> (cleaned.length === 8 ? 16 : 8)) & 255,
      b: (num >> (cleaned.length === 8 ? 8 : 0)) & 255,
      a: cleaned.length === 8 ? (num & 255) / 255 : 1,
    };
  }
  return null;
};

/**
 * Parses CSS color strings (hex, rgb, rgba) into RGB values
 */
export const parseCssColor = (colorStr: string): { r: number; g: number; b: number; a: number } => {
  const fallback = { r: 15, g: 23, b: 42, a: 1 }; // default dark
  if (!colorStr || typeof colorStr !== 'string') return fallback;

  const trimmed = colorStr.trim().toLowerCase();

  // Hex color
  if (trimmed.startsWith('#')) {
    const rgb = hexToRgb(trimmed);
    return rgb ? { r: rgb.r, g: rgb.g, b: rgb.b, a: rgb.a ?? 1 } : fallback;
  }

  // RGB / RGBA color
  const rgbaMatch = trimmed.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch) {
    return {
      r: Math.min(255, Math.max(0, parseInt(rgbaMatch[1], 10))),
      g: Math.min(255, Math.max(0, parseInt(rgbaMatch[2], 10))),
      b: Math.min(255, Math.max(0, parseInt(rgbaMatch[3], 10))),
      a: rgbaMatch[4] !== undefined ? Math.min(1, Math.max(0, parseFloat(rgbaMatch[4]))) : 1,
    };
  }

  // Common color keywords
  if (trimmed === 'black' || trimmed === 'transparent') return { r: 0, g: 0, b: 0, a: 1 };
  if (trimmed === 'white') return { r: 255, g: 255, b: 255, a: 1 };

  return fallback;
};

/**
 * Standard W3C Relative Luminance Formula
 * Calculates relative luminance from 0 (darkest black) to 1 (brightest white)
 */
export const calculateRelativeLuminance = (r: number, g: number, b: number): number => {
  const sRGB = [r, g, b].map((val) => {
    const v = val / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
};

/**
 * Checks if a given background color is dark (returns true if dark, false if light)
 */
export const isColorDark = (colorStr: string): boolean => {
  const { r, g, b } = parseCssColor(colorStr);
  const luminance = calculateRelativeLuminance(r, g, b);
  // Luminance <= 0.45 is dark background requiring white text
  return luminance <= 0.45;
};

/**
 * Returns dynamic high-contrast text color and palette based on background color
 */
export const getDynamicContrast = (
  bgColorStr: string,
  options?: { darkText?: string; lightText?: string }
): ContrastResult => {
  const isDark = isColorDark(bgColorStr);
  const darkText = options?.darkText || '#0F172A';
  const lightText = options?.lightText || '#FFFFFF';

  if (isDark) {
    return {
      isDark: true,
      theme: 'dark',
      textColor: lightText,
      textSecondary: '#CBD5E1', // slate-300
      textMuted: '#94A3B8',     // slate-400
      surfaceBg: 'rgba(15, 23, 42, 0.75)',
      borderColor: 'rgba(255, 255, 255, 0.15)',
    };
  } else {
    return {
      isDark: false,
      theme: 'light',
      textColor: darkText,
      textSecondary: '#334155', // slate-700
      textMuted: '#64748B',     // slate-500
      surfaceBg: 'rgba(255, 255, 255, 0.90)',
      borderColor: 'rgba(0, 0, 0, 0.12)',
    };
  }
};

/**
 * Analyzes an image URL or Base64 data URL to determine its average perceived brightness
 * Useful for custom user wallpapers
 */
export const detectImageBrightness = (imageUrl: string): Promise<'dark' | 'light'> => {
  return new Promise((resolve) => {
    if (!imageUrl || typeof window === 'undefined') {
      resolve('dark');
      return;
    }

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          // Scale down to tiny sample size for instant sampling
          canvas.width = 40;
          canvas.height = 40;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('dark');
            return;
          }

          ctx.drawImage(img, 0, 0, 40, 40);
          const imageData = ctx.getImageData(0, 0, 40, 40);
          const data = imageData.data;

          let totalLuminance = 0;
          let count = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3] / 255;
            if (a > 0.3) {
              const lum = calculateRelativeLuminance(r, g, b);
              totalLuminance += lum;
              count++;
            }
          }

          const avgLum = count > 0 ? totalLuminance / count : 0.2;
          resolve(avgLum > 0.45 ? 'light' : 'dark');
        } catch {
          resolve('dark');
        }
      };

      img.onerror = () => {
        resolve('dark');
      };

      img.src = imageUrl;
    } catch {
      resolve('dark');
    }
  });
};

/**
 * Synchronizes global CSS variables across the document for dynamic contrast
 */
export const syncGlobalContrastVariables = (theme: 'dark' | 'light'): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (theme === 'light') {
    root.style.setProperty('--dynamic-text-primary', '#0F172A');
    root.style.setProperty('--dynamic-text-secondary', '#334155');
    root.style.setProperty('--dynamic-text-muted', '#64748B');
    root.style.setProperty('--dynamic-surface-bg', 'rgba(255, 255, 255, 0.90)');
    root.style.setProperty('--dynamic-border-color', 'rgba(0, 0, 0, 0.12)');
    root.setAttribute('data-theme', 'light');
    document.body.classList.remove('dark-mode');
  } else {
    root.style.setProperty('--dynamic-text-primary', '#FFFFFF');
    root.style.setProperty('--dynamic-text-secondary', '#CBD5E1');
    root.style.setProperty('--dynamic-text-muted', '#94A3B8');
    root.style.setProperty('--dynamic-surface-bg', 'rgba(15, 23, 42, 0.75)');
    root.style.setProperty('--dynamic-border-color', 'rgba(255, 255, 255, 0.15)');
    root.setAttribute('data-theme', 'dark');
    document.body.classList.add('dark-mode');
  }
};
