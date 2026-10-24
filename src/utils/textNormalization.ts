
/**
 * Normalizes Kurdish/Arabic/Farsi text for consistent comparison and search.
 * Focuses on characters that look identical but have different Unicode points.
 */
export function normalizeKurdishText(text: string): string {
  if (!text) return '';
  
  return text
    .trim()
    // 0. Remove control characters and ZWNJ that are common in Kurdish/Arabic keyboards
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '')
    // 1. Normalize Yeh variations (Ye, Arabic Yeh, Alef Maksura, Yeh with Hamza)
    .replace(/[\u064A\u0649\u0626\u06CC]/g, 'ی') 
    // 2. Normalize Kaf variations (Arabic Kaf, Persian/Kurdish Kaf)
    .replace(/[\u0643\u06A9]/g, 'ک')
    // 3. Normalize Kurdish/Arabic H and e variations (aggresive for name matching)
    .replace(/[\u0647\u06BE\u06D5]/g, 'ە') // Normalize Arabic Heh, Kurdish Heh, and Kurdish e to 'ە'
    // 4. Normalize Waw variations
    .replace(/[\u0648\u06C5]/g, 'و') // Arabic Waw, Kurdish Waw
    // 5. Normalize special Kurdish letters (often typed as base letters)
    .replace(/[\u0644\u06FB]/g, 'ل') // Lam vs Kurdish Lam
    .replace(/[\u0631\u0695]/g, 'ر') // Re vs Kurdish Re
    // 6. Clean spaces
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Checks if two customer/debtor names or phones match, taking into account
 * Kurdish/Arabic character variants and phone format variations.
 */
export function isSameCustomerOrDebtor(
  name1?: string,
  name2?: string,
  phone1?: string,
  phone2?: string
): boolean {
  const n1 = normalizeKurdishText(name1 || '');
  const n2 = normalizeKurdishText(name2 || '');
  if (n1 && n2) {
    if (n1 === n2) return true;
    const isGeneric = (n: string) => n === 'کڕیار' || n === 'کریار' || n === 'مشتەری';
    if (!isGeneric(n1) && !isGeneric(n2) && n1.length >= 4 && n2.length >= 4) {
      if (n1.startsWith(n2) || n2.startsWith(n1) || n1.includes(n2) || n2.includes(n1)) {
        return true;
      }
    }
  }

  const cleanPhone = (p?: string) => (p || '').replace(/\D/g, '');
  const p1 = cleanPhone(phone1);
  const p2 = cleanPhone(phone2);
  if (p1.length >= 7 && p2.length >= 7) {
    if (p1 === p2 || p1.slice(-10) === p2.slice(-10) || p1.endsWith(p2) || p2.endsWith(p1)) {
      return true;
    }
  }
  return false;
}

/**
 * Safely parses any debt value (number, string with commas, etc.) into a valid numeric float.
 */
export function parseNumericDebt(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}
