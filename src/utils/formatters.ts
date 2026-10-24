import { Currency } from '../types';
import { getSyncedNow, getSyncedIsoString } from './clockSync';

export function formatCurrency(amount: number, currency: Currency = 'IQD', exchangeRate: number = 1530): string {
  if (currency === 'USD') {
    const usdVal = amount / exchangeRate;
    return `$${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${Math.round(amount).toLocaleString('en-US')} د.ع`;
}

export function formatNumber(val: number): string {
  return val.toLocaleString('en-US');
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

export function combineDateWithCurrentTime(dateString: string | undefined): string {
  if (!dateString) return getSyncedIsoString();
  try {
    // If it's already an ISO string with time, just return it
    if (dateString.includes('T')) {
      const d = new Date(dateString);
      return isNaN(d.getTime()) ? getSyncedIsoString() : d.toISOString();
    }
    
    const now = getSyncedNow();
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        now.setFullYear(year, month - 1, day);
      }
    }
    return now.toISOString();
  } catch {
    return getSyncedIsoString();
  }
}

export function formatDateShort(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    
    return `${year}/${month}/${day}`;
  } catch {
    return isoString;
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export function generateNextInvoiceNumber(existingSalesCount: number): string {
  const nextNum = existingSalesCount + 1;
  return `GJA-${nextNum}`;
}

export function formatPhoneNumber(phone: string | undefined): string {
  if (!phone) return '—';
  
  let cleaned = phone;
  // Clean up weird multiple +964
  cleaned = cleaned.replace(/(\+?964)+/g, '+964');
  
  const hasPlus = cleaned.startsWith('+');
  const digits = cleaned.replace(/\D/g, '');
  
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    let prefix = digits.slice(0, -10);
    
    const p1 = last10.slice(0, 3);
    const p2 = last10.slice(3, 6);
    const p3 = last10.slice(6, 10);
    
    if (prefix === '0') {
      return `0${p1} ${p2} ${p3}`;
    }
    
    if (prefix === '964') {
        prefix = '+964';
    } else if (hasPlus && prefix) {
        prefix = '+' + prefix;
    }
    
    if (prefix) {
        return `${prefix} ${p1} ${p2} ${p3}`;
    }
    
    return `${p1} ${p2} ${p3}`;
  }
  
  return phone;
}

function chunkToKurdish(n: number): string {
  const ones = ['', 'یەک', 'دوو', 'سێ', 'چوار', 'پێنج', 'شەش', 'حەوت', 'هەشت', 'نۆ'];
  const teens = ['دە', 'یازدە', 'دوازدە', 'سێزدە', 'چواردە', 'پازدە', 'شازدە', 'حەڤدە', 'هەژدە', 'نۆزدە'];
  const tens = ['', '', 'بیست', 'سی', 'چل', 'پەنجا', 'شەست', 'حەفتا', 'هەشتا', 'نەوەد'];
  const hundreds = ['', 'سەد', 'دووسەد', 'سێسەد', 'چوارسەد', 'پێنجسەد', 'شەشسەد', 'حەوتسەد', 'هەشتسەد', 'نۆسەد'];

  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rem = n % 100;

  if (h > 0) {
    parts.push(hundreds[h]);
  }

  if (rem >= 10 && rem <= 19) {
    parts.push(teens[rem - 10]);
  } else {
    const t = Math.floor(rem / 10);
    const o = rem % 10;
    if (t > 0) parts.push(tens[t]);
    if (o > 0) parts.push(ones[o]);
  }

  return parts.join(' و ');
}

export function numberToKurdishWords(amount: number, currency: Currency = 'IQD'): string {
  const rounded = Math.floor(Math.abs(amount));
  if (rounded === 0) {
    return currency === 'USD' ? 'سفر دۆلاری ئەمریکی' : 'سفر دیناری عێراقی';
  }

  const scales = [
    { value: 1000000000, name: 'ملیار' },
    { value: 1000000, name: 'ملیۆن' },
    { value: 1000, name: 'هەزار' },
  ];

  let remaining = rounded;
  const resultParts: string[] = [];

  for (const scale of scales) {
    if (remaining >= scale.value) {
      const count = Math.floor(remaining / scale.value);
      remaining = remaining % scale.value;
      const countWord = chunkToKurdish(count);
      resultParts.push(`${countWord} ${scale.name}`);
    }
  }

  if (remaining > 0) {
    resultParts.push(chunkToKurdish(remaining));
  }

  const words = resultParts.join(' و ');
  const suffix = currency === 'USD' ? 'دۆلاری ئەمریکی' : 'دیناری عێراقی';
  return `${words} ${suffix}`;
}

export function formatDateOnly(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  } catch {
    return isoString;
  }
}

export function formatTimeOnly(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    return `${hours}:${minutes} ${ampm}`;
  } catch {
    return '';
  }
}

export function isSameDay(date1: string | Date | undefined | null, date2: string | Date | undefined | null): boolean {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Normalizes and formats debt transaction notes cleanly.
 * Replaces verbose phrases like "قەرزی پسووڵەی GJA-3" with "پسووڵە GJA-3",
 * "زیادکردنی قەرزی دەستی / دەرەکی" with "دەستی",
 * and handles invoice numbers cleanly.
 */
export function formatTransactionNote(notes?: string, defaultInvoiceNum?: string): string {
  if (!notes && !defaultInvoiceNum) return '';
  const trimmed = (notes || '').trim();

  // If notes reference an invoice directly (e.g. قەرزی پسووڵەی GJA-3 or پسووڵەی GJA-3)
  const invoiceMatch = trimmed.match(/(?:قەرزی\s*پسووڵەی|قەرزی\s*پسووڵە|پسووڵەی|پسووڵە|فاتورەی|فاکتۆری)\s*([A-Za-z0-9_-]+)/i);
  if (invoiceMatch && invoiceMatch[1]) {
    return `پسووڵە ${invoiceMatch[1]}`;
  }

  // If notes is just an invoice code like GJA-3 or REC-123
  if (/^[A-Za-z]+-[0-9]+$/i.test(trimmed)) {
    return `پسووڵە ${trimmed}`;
  }

  if (/^زیاد\s*کردنی\s*قەرزی\s*(دەستی\s*\/\s*دەرەکی|دەرەکی\s*\/\s*دەستی|دەستی|دەرەکی)$/i.test(trimmed)) {
    return 'دەستی';
  }
  if (/^قەرزی\s*(دەستی\s*\/\s*دەرەکی|دەرەکی\s*\/\s*دەستی)$/i.test(trimmed)) {
    return 'دەستی';
  }

  if (/^قەرزی\s*کۆن\s*\/\s*سەرەتایی(\s*\(تۆماری\s*پێشوو\))?$/i.test(trimmed) || trimmed === 'تۆماری پێشوو') {
    if (defaultInvoiceNum) {
      return defaultInvoiceNum.startsWith('پسووڵە') ? defaultInvoiceNum : `پسووڵە ${defaultInvoiceNum}`;
    }
    return 'پسووڵە GJA-3';
  }
  if (/^قەرزی\s*(کۆن|سەرەتایی)(\s*\(تۆماری\s*پێشوو\))?$/i.test(trimmed)) {
    if (defaultInvoiceNum) {
      return defaultInvoiceNum.startsWith('پسووڵە') ? defaultInvoiceNum : `پسووڵە ${defaultInvoiceNum}`;
    }
    return 'پسووڵە GJA-3';
  }

  let result = trimmed;
  result = result.replace(/زیاد\s*کردنی\s*قەرزی\s*(دەستی\s*\/\s*دەرەکی|دەرەکی\s*\/\s*دەستی)/g, 'دەستی');
  result = result.replace(/قەرزی\s*پسووڵەی\s*([A-Za-z0-9_-]+)/g, 'پسووڵە $1');
  result = result.replace(/قەرزی\s*کۆن\s*\/\s*سەرەتایی(\s*\(تۆماری\s*پێشوو\))?/g, defaultInvoiceNum ? `پسووڵە ${defaultInvoiceNum}` : 'پسووڵە GJA-3');
  return result;
}

