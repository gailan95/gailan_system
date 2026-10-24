import jsQR from 'jsqr';

export interface ScannedInvoiceResult {
  saleId?: string;
  invoiceNumber?: string;
  raw: string;
}

/**
 * Generate a direct scannable URL or identifier for an invoice.
 * When scanned by phone camera or system scanner, it directs straight to this invoice.
 */
export const getInvoiceDirectUrl = (saleId: string, invoiceNumber?: string): string => {
  if (typeof window === 'undefined') {
    return `https://pos.system/invoice/${saleId}`;
  }
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const cleanInv = invoiceNumber ? `&inv=${encodeURIComponent(invoiceNumber)}` : '';
  return `${origin}${pathname}?invoiceId=${encodeURIComponent(saleId)}${cleanInv}`;
};

/**
 * Parse any scanned string (URL, JSON, prefix INV:, or raw code) to resolve invoice identifiers.
 */
export const parseScannedInvoiceData = (scannedText: string): ScannedInvoiceResult => {
  const trimmed = (scannedText || '').trim();
  if (!trimmed) {
    return { raw: '' };
  }

  // 1. JSON payload
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.id || parsed.invoiceId || parsed.invoiceNumber) {
        return {
          saleId: parsed.id || parsed.invoiceId,
          invoiceNumber: parsed.invoiceNumber,
          raw: trimmed,
        };
      }
    } catch {}
  }

  // 2. URL parsing with query parameters or hash
  try {
    if (trimmed.includes('invoiceId=') || trimmed.includes('#invoice=')) {
      const testUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
      const url = new URL(testUrl);
      const invoiceId = url.searchParams.get('invoiceId') || url.hash.replace(/^#invoice=/, '') || undefined;
      const invNum = url.searchParams.get('inv') || undefined;
      if (invoiceId || invNum) {
        return {
          saleId: invoiceId,
          invoiceNumber: invNum,
          raw: trimmed,
        };
      }
    }
  } catch {}

  // 3. Prefix matching (e.g. INV:sale123)
  if (trimmed.toUpperCase().startsWith('INV:')) {
    const code = trimmed.substring(4).trim();
    return {
      saleId: code,
      invoiceNumber: code,
      raw: trimmed,
    };
  }

  // 4. Fallback to raw code
  return {
    saleId: trimmed,
    invoiceNumber: trimmed,
    raw: trimmed,
  };
};

/**
 * Play a pleasant audio chime upon successful scan
 */
export const playScanSuccessSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12); // High A6

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
};

/**
 * Scan QR code from HTMLImageElement using jsQR with zero dependencies
 */
export const scanQRCodeFromImageElement = (img: HTMLImageElement): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      if (canvas.width === 0 || canvas.height === 0) {
        return resolve(null);
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: 'attemptBoth',
      });
      resolve(code ? code.data : null);
    } catch {
      resolve(null);
    }
  });
};
