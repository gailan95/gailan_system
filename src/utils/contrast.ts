/**
 * Contrast & High-Legibility Utilities for Dynamic Backgrounds & Printable Elements
 */

/**
 * Calculates the relative luminance of a color string (hex or rgb).
 * Returns a value between 0 (darkest) and 1 (lightest).
 */
export function getLuminance(colorStr: string): number {
  if (!colorStr) return 1;
  let hex = colorStr.trim().replace('#', '');
  
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  let r = 0, g = 0, b = 0;
  if (hex.length >= 6) {
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  } else if (colorStr.startsWith('rgb')) {
    const parts = colorStr.match(/\d+/g);
    if (parts && parts.length >= 3) {
      r = parseInt(parts[0], 10) / 255;
      g = parseInt(parts[1], 10) / 255;
      b = parseInt(parts[2], 10) / 255;
    }
  }

  const aR = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const aG = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const aB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * aR + 0.7152 * aG + 0.0722 * aB;
}

/**
 * Returns high-contrast text color ('#0f172a' or '#ffffff') for a given background color.
 */
export function getContrastTextColor(bgColorStr: string): '#0f172a' | '#ffffff' {
  const lum = getLuminance(bgColorStr);
  return lum > 0.45 ? '#0f172a' : '#ffffff';
}

/**
 * Returns high-contrast Tailwind text class based on background mode.
 */
export function getContrastTextClass(isDarkBg: boolean): string {
  return isDarkBg ? 'text-slate-100' : 'text-slate-900';
}
