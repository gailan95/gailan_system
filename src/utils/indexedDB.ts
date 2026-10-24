// IndexedDB persistence helper for permanent offline & browser storage

const DB_NAME = 'kurd_pos_db_v2';
const DB_VERSION = 1;
const STORE_NAME = 'database_store';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToIndexedDB(key: string, value: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, fallback to localStorage only:', err);
  }
}

export async function loadFromIndexedDB<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve((request.result as T) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB read failed:', err);
    return null;
  }
}

export interface AllDatabaseData {
  products?: any[];
  customers?: any[];
  sales?: any[];
  debtTransactions?: any[];
  expenses?: any[];
  employees?: any[];
  settings?: any;
  closedProductArchives?: any[];
  productMovements?: any[];
  userAccounts?: any[];
  commissionAccounts?: any[];
  shareholderTransactions?: any[];
  [key: string]: any;
}

export async function saveAllToIndexedDB(data: AllDatabaseData): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined) {
          store.put(val, key);
        }
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn('Failed to bulk save to IndexedDB:', err);
  }
}

export async function loadAllFromIndexedDB(): Promise<AllDatabaseData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const data: AllDatabaseData = {};
      const keys = [
        'products',
        'customers',
        'sales',
        'debtTransactions',
        'expenses',
        'employees',
        'settings',
        'closedProductArchives',
        'productMovements',
        'userAccounts',
        'commissionAccounts',
      ];

      let completed = 0;
      let hasData = false;

      keys.forEach((key) => {
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result !== undefined && req.result !== null) {
            (data as any)[key] = req.result;
            hasData = true;
          }
          completed++;
          if (completed === keys.length) {
            resolve(hasData ? data : null);
          }
        };
        req.onerror = () => {
          completed++;
          if (completed === keys.length) {
            resolve(hasData ? data : null);
          }
        };
      });
    });
  } catch (err) {
    console.warn('Failed to bulk load from IndexedDB:', err);
    return null;
  }
}
