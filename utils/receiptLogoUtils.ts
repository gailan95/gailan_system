/**
 * Utility functions for Receipt Logo management and local storage persistence.
 */

export const RECEIPT_LOGO_STORAGE_KEYS = {
  LOGO_URL: 'kurd_receipt_logo_url',
  SHOW_LOGO: 'kurd_show_receipt_logo',
};

/**
 * Retrieves the saved custom receipt logo image data URL from localStorage.
 */
export const getSavedReceiptLogoUrl = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(RECEIPT_LOGO_STORAGE_KEYS.LOGO_URL) || '';
};

/**
 * Retrieves the saved receipt logo visibility preference from localStorage.
 * Defaults to true if not set.
 */
export const getSavedShowReceiptLogo = (): boolean => {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(RECEIPT_LOGO_STORAGE_KEYS.SHOW_LOGO);
  return val !== 'false';
};

/**
 * Saves receipt logo settings to localStorage and dispatches window events.
 */
export const saveReceiptLogoSettings = (logoUrl: string, showLogo: boolean): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(RECEIPT_LOGO_STORAGE_KEYS.LOGO_URL, logoUrl);
  localStorage.setItem(RECEIPT_LOGO_STORAGE_KEYS.SHOW_LOGO, String(showLogo));
  
  window.dispatchEvent(new Event('receiptLogoChange'));
  window.dispatchEvent(new Event('storage'));
};

/**
 * Clears custom receipt logo from localStorage and resets to default icon logo.
 */
export const removeCustomReceiptLogo = (): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(RECEIPT_LOGO_STORAGE_KEYS.LOGO_URL);
  window.dispatchEvent(new Event('receiptLogoChange'));
  window.dispatchEvent(new Event('storage'));
};

/**
 * Compresses an uploaded logo image file using Canvas to optimize size for localStorage.
 */
export const compressLogoImage = (file: File, maxDimension = 350): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, 0.9);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};
