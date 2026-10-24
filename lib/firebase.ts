import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { markFirestoreQuotaExhausted } from '../utils/firestoreQuota';
import config from '../../firebase-applet-config.json';

// Silence and handle noisy Firestore backend quota exhaustion & offline connectivity logs
if (typeof window !== 'undefined') {
  const origConsoleError = console.error;
  console.error = (...args: any[]) => {
    const text = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a || ''))).join(' ');
    if (
      text.includes('resource-exhausted') ||
      text.includes('Free daily write units') ||
      text.includes('Using maximum backoff delay') ||
      text.includes('Quota limit exceeded') ||
      text.includes('firestore.googleapis.com') ||
      text.includes('Could not reach Cloud Firestore backend') ||
      text.includes('code=unavailable') ||
      text.includes('offline mode')
    ) {
      if (text.includes('resource-exhausted') || text.includes('Quota limit exceeded')) {
        markFirestoreQuotaExhausted(24);
      }
      return;
    }
    origConsoleError.apply(console, args);
  };
}

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

export const app = initializeApp(firebaseConfig);

// Use custom database ID if available
export const db = config.firestoreDatabaseId
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

export const storage = getStorage(app);
export const auth = getAuth(app);

// Ensure Firebase Auth session is active
onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch((err) => {
      console.warn('Anonymous auth auto-signin notice:', err);
    });
  }
});

/**
 * فانکشنی گشتی بۆ هێنانی لیستەکان لەگەڵ فلتەری بەروار
 */
export const fetchColByDate = async (
  collectionName: string, 
  dateField: string, 
  targetDateStr: string, // بۆ نموونە '2026-09-18'
  maxLimit: number = 500
) => {
  try {
    const colRef = collection(db, collectionName);
    
    // پشتیوانیکردنی جۆرەکانی YYYY-MM-DD و ISO String
    const q = query(
      colRef,
      where(dateField, '>=', targetDateStr),
      where(dateField, '<=', targetDateStr + '\uf8ff'),
      limit(maxLimit)
    );

    const snap = await getDocs(q);
    
    if (!snap.empty) {
      return snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  } catch (error) {
    console.warn(`Notice fetching ${collectionName} by date:`, error);
  }
  return [];
};

/**
 * بانگهێشتکردنی داتاکان بۆ بەرواری دیاریکراو (بۆ نموونە 2026-09-18)
 */
export async function loadDashboardDataForDate(selectedDate: string) {
  const [sales, debtTransactions] = await Promise.all([
    fetchColByDate('sales', 'date', selectedDate, 500),
    fetchColByDate('debtTransactions', 'date', selectedDate, 500)
  ]);

  return { sales, debtTransactions };
}
