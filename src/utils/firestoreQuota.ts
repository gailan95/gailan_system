/**
 * Firestore Quota & Offline Resilience Management
 * بەڕێوەبردنی کلاود و سنووری پشکی بەکارهێنانی ڕۆژانەی بێبەرامبەر (Firestore Free Tier Quota)
 */

declare global {
  interface Window {
    __FIRESTORE_QUOTA_BLOCKED_UNTIL__?: number;
  }
}

const STORAGE_QUOTA_KEY = 'kurd_firestore_quota_until';

/**
 * پشکنینی ئەوەی کە ئایا پشکی کلاود بەسەرچووە یاخود بلۆک کراوە
 */
export const isFirestoreQuotaBlocked = (): boolean => {
  try {
    const now = Date.now();

    // Check memory cache first
    if (typeof window !== 'undefined' && window.__FIRESTORE_QUOTA_BLOCKED_UNTIL__) {
      if (now < window.__FIRESTORE_QUOTA_BLOCKED_UNTIL__) {
        return true;
      }
    }

    // Check persistent localStorage
    if (typeof localStorage !== 'undefined') {
      const untilStr = localStorage.getItem(STORAGE_QUOTA_KEY);
      if (untilStr) {
        const until = parseInt(untilStr, 10);
        if (!isNaN(until) && now < until) {
          if (typeof window !== 'undefined') {
            window.__FIRESTORE_QUOTA_BLOCKED_UNTIL__ = until;
          }
          return true;
        }
      }
    }
  } catch {}
  return false;
};

/**
 * تۆمارکردنی بەسەرچوونی پشکی ڕۆژانە و وەستاندنی کاتی بۆ ناردنی نووسین بۆ کلاود
 */
export const markFirestoreQuotaExhausted = (hours: number = 24): void => {
  try {
    const until = Date.now() + hours * 60 * 60 * 1000;
    if (typeof window !== 'undefined') {
      window.__FIRESTORE_QUOTA_BLOCKED_UNTIL__ = until;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_QUOTA_KEY, String(until));
    }
  } catch {}
};

/**
 * پێناسەکردنی هەڵەی Quota و گەڕاندنەوەی وەڵامی گونجاو بێ تێکدانی بەرنامەکە
 */
export const handleFirestoreError = (err: any, contextStr: string = 'Firestore Operation'): boolean => {
  if (!err) return false;
  const errMsg = String(err?.message || err || '');
  const errCode = String(err?.code || '');

  if (
    errCode === 'resource-exhausted' ||
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('Free daily write units') ||
    errMsg.includes('quota metric') ||
    errMsg.includes('maximum backoff delay')
  ) {
    markFirestoreQuotaExhausted(24);
    console.info(
      `[Offline-First Cloud Mode] Daily cloud write quota limit reached during ${contextStr}. All data is safely stored in local IndexedDB and server database.`
    );
    return true;
  }

  // Permission denied or offline network drops
  if (errCode === 'permission-denied' || errMsg.includes('permission-denied') || errMsg.includes('insufficient permissions')) {
    console.warn(`[Firestore Permissions Notice] ${contextStr}:`, err);
    return true;
  }

  console.warn(`[Firestore Notice] (${contextStr}):`, err);
  return false;
};

/**
 * جێبەجێکردنی پارێزراوی هەر کرداریكی نووسین لە Firestore بەبێ شکاندنی بەرنامە لە کاتی تەواوبوونی پشک
 */
export async function safeFirestoreWrite<T>(
  operation: () => Promise<T>,
  contextName: string = 'Cloud Write',
  fallbackValue?: T
): Promise<T | undefined> {
  if (isFirestoreQuotaBlocked()) {
    return fallbackValue;
  }

  try {
    return await operation();
  } catch (err) {
    handleFirestoreError(err, contextName);
    return fallbackValue;
  }
}
