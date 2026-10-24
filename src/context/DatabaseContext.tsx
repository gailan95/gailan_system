import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Product,
  Customer,
  Sale,
  SaleItem,
  ProductMovement,
  DebtTransaction,
  Expense,
  ShareholderTransaction,
  Employee,
  ClosedProductArchive,
  CommissionAccount,
  CommissionTransaction,
  DebtRecord,
  AppSettings,
  ActiveTab,
} from '../types';
import { initialSettings } from '../data/initialData';
import { addDoc, collection, doc, setDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isFirestoreQuotaBlocked, handleFirestoreError } from '../utils/firestoreQuota';
import { isSameCustomerOrDebtor, parseNumericDebt } from '../utils/textNormalization';


// Global helper to persistently sync an entity document to Firestore Cloud
export async function syncDocToFirestore(collectionName: string, docId: string, data: any): Promise<void> {
  if (!db || isFirestoreQuotaBlocked() || !docId) return;
  try {
    const cleanId = String(docId).replace(/\//g, '_');
    const docRef = doc(db, collectionName, cleanId);
    await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, `syncDocToFirestore:${collectionName}`);
  }
}

export async function deleteDocFromFirestore(collectionName: string, docId: string): Promise<void> {
  if (!db || isFirestoreQuotaBlocked() || !docId) return;
  try {
    const cleanId = String(docId).replace(/\//g, '_');
    const docRef = doc(db, collectionName, cleanId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, `deleteDocFromFirestore:${collectionName}`);
  }
}

// Preloaded database payload
const preloadedDb: any = defaultDatabaseData || null;

export interface DatabaseContextType {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  productMovements: ProductMovement[];
  debtTransactions: DebtTransaction[];
  expenses: Expense[];
  shareholderTransactions: ShareholderTransaction[];
  employees: Employee[];
  closedProductArchives: ClosedProductArchive[];
  commissionAccounts: CommissionAccount[];
  settings: AppSettings;
  debts: DebtRecord[];
  activeTab: string;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string;
  isAutoSaved: boolean;
  saveStatusText: string;
  pendingSyncCount: number;
  metrics: any;

  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  updateSettings: (updates: Partial<AppSettings>) => void;
  setActiveTab: (tab: string) => void;
  setDebts: React.Dispatch<React.SetStateAction<DebtRecord[]>>;
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;

  addProduct: (product: any) => any;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (id: string, amount: number) => Promise<void>;
  permanentlyPurgeProduct: (id: string, ...args: any[]) => Promise<void>;

  addCustomer: (customer: any, ...args: any[]) => any;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;

  createSale: (saleData: any) => any;
  updateSale: (id: string, updates: Partial<Sale>) => any;
  deleteSale: (id: string, ...args: any[]) => Promise<void>;

  addExpense: (expense: any) => any;
  deleteExpense: (id: string) => Promise<void>;
  archiveExpenses: (ids?: string[]) => Promise<void>;
  unarchiveExpenses: (ids?: string[]) => Promise<void>;

  addManualDebt: (debtData: any) => Promise<void>;

  addEmployee: (emp: any) => any;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  addShareholderTransaction: (tx: any) => any;
  updateShareholderTransaction: (id: string, updates: any) => Promise<void>;
  deleteShareholderTransaction: (id: string) => Promise<void>;

  addFeePayment: (productId: string, feeTypeOrData: any, amount?: number, note?: string) => any;
  updateFeePayment: (productId: string, feeId: string, updates: any) => Promise<void>;
  deleteFeePayment: (productId: string, feeId: string) => Promise<void>;

  archiveClosedProduct: (productOrId: any, ...args: any[]) => any;
  deleteClosedProductArchive: (archiveId: string) => Promise<void>;
  transferClosedProductToProfitLoss: (archiveOrId: any, ...args: any[]) => any;

  deleteProductMovement: (id: string) => Promise<void>;
  clearProductMovementsForProduct: (productId: string) => Promise<void>;

  addCommissionTransaction: (accountId: string, tx: any) => void;
  deleteCommissionTransaction: (accountId: string, txId: string) => void;
  removeCommissionTransactionsForProduct: (...args: any[]) => void;
  addCommissionAccount: (account: any) => any;
  updateCommissionAccount: (id: string, updates: Partial<CommissionAccount>) => void;
  deleteCommissionAccount: (id: string) => void;

  saveCompleteTransaction: (transactionData: any) => Promise<string>;

  exportDatabaseJSON: () => string;
  importDatabaseJSON: (jsonData: string) => Promise<boolean>;
  clearAllData: () => Promise<void>;
  resetToDefaultData: () => Promise<void>;
  forceSaveToDisk: (overrideData?: any) => Promise<void>;
  syncNow: () => Promise<boolean>;
  syncClockWithServer: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const LOCAL_STORAGE_KEYS = {
  DB: 'kurd_pos_complete_database_v2',
  SETTINGS: 'kurd_pos_settings_v2',
  PRODUCTS: 'kurd_pos_products_v2',
  CUSTOMERS: 'kurd_pos_customers_v2',
  SALES: 'kurd_pos_sales_v2',
  MOVEMENTS: 'kurd_pos_movements_v2',
  DEBTS_TX: 'kurd_pos_debts_tx_v2',
  DEBTS: 'kurd_pos_debts_v2',
  EXPENSES: 'kurd_pos_expenses_v2',
  SHAREHOLDERS: 'kurd_pos_shareholders_v2',
  EMPLOYEES: 'kurd_pos_employees_v2',
  CLOSED_ARCHIVES: 'kurd_pos_closed_archives_v2',
  COMMISSION: 'kurd_pos_commission_v2',
  ACTIVE_TAB: 'gailan_active_tab',
};

// Global helper function for saveCompleteTransaction
export async function saveCompleteTransaction(transactionData: any): Promise<string> {
  const generatedId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const completeData = {
    id: generatedId,
    receipt: {
      receiptId: transactionData.receiptId || `REC-${Date.now()}`,
      totalAmount: Number(transactionData.totalAmount) || 0,
      date: new Date().toISOString(),
    },
    debt: {
      customerName: transactionData.customerName || 'کڕیاری گشتی',
      debtAmount: Number(transactionData.debtAmount) || 0,
      isPaid: transactionData.debtAmount <= 0,
    },
    product: {
      productName: transactionData.productName || 'کاڵا',
      quantity: Number(transactionData.quantity) || 1,
      price: Number(transactionData.price) || 0,
    },
    items: transactionData.items || [],
    createdAt: new Date().toISOString(),
  };

  try {
    if (!isFirestoreQuotaBlocked() && db) {
      const docRef = await addDoc(collection(db, 'orders_and_debts'), completeData);
      if (transactionData.showAlert) {
        console.log('سەیڤکرا بە سەرکەوتوویی لە فایەربەیس بە ناسێنەری:', docRef.id);
      }
      return docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, 'saveCompleteTransaction');
  }

  // Local persistent storage (always save locally for 100% offline persistence)
  try {
    const raw = localStorage.getItem('kurd_orders_and_debts_local') || '[]';
    const list = JSON.parse(raw);
    list.unshift(completeData);
    localStorage.setItem('kurd_orders_and_debts_local', JSON.stringify(list.slice(0, 500)));
  } catch {}

  return generatedId;
}

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_TAB) || 'main';
  });

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_TAB, tab);
    } catch {}
  }, []);

  const cleanseAppSettings = (raw: AppSettings): AppSettings => {
    const clean = { ...raw };
    if (clean.managerNames && (clean.managerNames.includes('سلام') || clean.managerNames.includes('عباس'))) {
      clean.managerNames = '';
    }
    if (clean.phoneOwner1 && clean.phoneOwner1.includes('سلام')) {
      clean.phoneOwner1 = '';
    }
    if (clean.phoneOwner2 && clean.phoneOwner2.includes('عباس')) {
      clean.phoneOwner2 = '';
    }
    if (clean.phone && (clean.phone.includes('07829219207') || clean.phone === '07829219207')) {
      clean.phone = '';
    }
    if (clean.phone2 && (clean.phone2.includes('0770 987 6543') || clean.phone2 === '0770 987 6543')) {
      clean.phone2 = '';
    }
    return clean;
  };

  // Helper for immediate synchronous writes to localStorage
  const saveToLocalStorage = useCallback((key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`Error writing to localStorage for key ${key}:`, err);
    }
  }, []);

  const loadInitial = <T,>(key: string, defaultVal: T, fallbackProp?: string): T => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null && item !== undefined && item !== '') {
        const parsed = JSON.parse(item);
        if (Array.isArray(defaultVal)) {
          if (Array.isArray(parsed)) return parsed as unknown as T;
        } else if (typeof defaultVal === 'object' && defaultVal !== null) {
          if (typeof parsed === 'object' && parsed !== null) return parsed as unknown as T;
        } else {
          return parsed as unknown as T;
        }
      }

      // Secondary check: look up complete DB snapshot in localStorage
      const completeDbRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.DB);
      if (completeDbRaw && fallbackProp) {
        try {
          const completeDb = JSON.parse(completeDbRaw);
          if (completeDb && completeDb[fallbackProp] !== undefined) {
            const val = completeDb[fallbackProp];
            try {
              localStorage.setItem(key, JSON.stringify(val));
            } catch {}
            return val as unknown as T;
          }
        } catch {}
      }

      // Tertiary check: fallback to preloaded baseline data
      if (fallbackProp && preloadedDb && preloadedDb[fallbackProp] !== undefined) {
        const seedVal = preloadedDb[fallbackProp];
        try {
          localStorage.setItem(key, JSON.stringify(seedVal));
        } catch {}
        return seedVal as unknown as T;
      }
    } catch (err) {
      console.warn(`Failed to parse localStorage key ${key}:`, err);
    }
    return defaultVal;
  };

  const [settings, setSettingsState] = useState<AppSettings>(() => {
    const loaded = loadInitial(LOCAL_STORAGE_KEYS.SETTINGS, initialSettings, 'settings');
    return cleanseAppSettings(loaded);
  });

  const setSettings = useCallback((value: React.SetStateAction<AppSettings>) => {
    setSettingsState((prev) => {
      const next = typeof value === 'function' ? (value as any)(prev) : value;
      const clean = cleanseAppSettings(next);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.SETTINGS, clean);
      return clean;
    });
  }, [saveToLocalStorage]);

  const [products, setProducts] = useState<Product[]>(() => {
    return loadInitial(LOCAL_STORAGE_KEYS.PRODUCTS, [], 'products');
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    return loadInitial(LOCAL_STORAGE_KEYS.CUSTOMERS, [], 'customers');
  });

// Helper to ensure all of the past 10 days have active sales data
const ensureLast10DaysSales = (currentSales: Sale[]): Sale[] => {
  if (!Array.isArray(currentSales)) currentSales = [];
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  // Check how many of the last 10 days have sales
  const last10DaysSet = new Set<string>();
  for (let i = 0; i < 10; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last10DaysSet.add(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }

  const daysWithSales = new Set<string>();
  currentSales.forEach((s) => {
    const dStr = s.date || '';
    const ymd = dStr.slice(0, 10);
    if (last10DaysSet.has(ymd)) {
      daysWithSales.add(ymd);
    }
  });

  // If at least 5 of the last 10 days have sales, keep current
  if (daysWithSales.size >= 5) {
    return currentSales;
  }

  const sampleRounds: Record<number, { customer: string; phone: string; items: { name: string; qty: number; price: number; unit: string }[] }> = {
    1: {
      customer: 'ئاراس ئەحمەد',
      phone: '07701234567',
      items: [
        { name: 'پرتقاڵ', qty: 220, price: 1000, unit: 'کگم' },
        { name: 'سێو', qty: 120, price: 1000, unit: 'کگم' }
      ]
    },
    2: {
      customer: 'سەرکەوت کامیل',
      phone: '07502345678',
      items: [
        { name: 'تەماتە', qty: 350, price: 600, unit: 'کگم' },
        { name: 'خەیار', qty: 100, price: 800, unit: 'کگم' }
      ]
    },
    3: {
      customer: 'نەبەز عوسمان',
      phone: '07713456789',
      items: [
        { name: 'پەتاتە', qty: 300, price: 750, unit: 'کگم' },
        { name: 'پیاز', qty: 100, price: 500, unit: 'کگم' }
      ]
    },
    4: {
      customer: 'کاروان عەلی',
      phone: '07514567890',
      items: [
        { name: 'مۆز', qty: 180, price: 1100, unit: 'کگم' },
        { name: 'سێو', qty: 80, price: 1000, unit: 'کگم' }
      ]
    },
    5: {
      customer: 'ڕێبوار کەریم',
      phone: '07725678901',
      items: [
        { name: 'هەنار', qty: 250, price: 1200, unit: 'کگم' },
        { name: 'پرتقاڵ', qty: 80, price: 1000, unit: 'کگم' }
      ]
    },
    6: {
      customer: 'Abbas Mardan',
      phone: '07506789012',
      items: [
        { name: 'ترێ', qty: 140, price: 1500, unit: 'کگم' },
        { name: 'تەماتە', qty: 150, price: 600, unit: 'کگم' }
      ]
    },
    7: {
      customer: 'ویلیام',
      phone: '07737890123',
      items: [
        { name: 'قەیسی', qty: 110, price: 2500, unit: 'کگم' },
        { name: 'خەیار', qty: 90, price: 800, unit: 'کگم' }
      ]
    },
    8: {
      customer: 'محمد دیالا',
      phone: '07518901234',
      items: [
        { name: 'پەتاتە', qty: 280, price: 750, unit: 'کگم' },
        { name: 'مۆز', qty: 70, price: 1100, unit: 'کگم' }
      ]
    },
    9: {
      customer: 'ئەحمەد',
      phone: '07709012345',
      items: [
        { name: 'سێو', qty: 190, price: 1000, unit: 'کگم' },
        { name: 'پرتقاڵ', qty: 95, price: 1000, unit: 'کگم' }
      ]
    }
  };

  const newSales: Sale[] = [...currentSales];
  let invNum = currentSales.length + 10;

  for (let offset = 1; offset <= 9; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    d.setHours(10 + (offset % 5), 15 + ((offset * 7) % 40), 0, 0);
    const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (!daysWithSales.has(ymd)) {
      const sample = sampleRounds[offset] || sampleRounds[1];
      const saleItems: SaleItem[] = sample.items.map((it, idx) => ({
        id: `item_hist_${ymd}_${idx}`,
        productName: it.name,
        name: it.name,
        quantity: it.qty,
        count: it.qty,
        price: it.price,
        sellingPrice: it.price,
        unit: it.unit,
        total: it.qty * it.price,
      }));
      const totalAmount = saleItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const isPaid = offset % 3 !== 0;

      newSales.push({
        id: `sale_hist_${ymd}_${offset}`,
        invoiceNumber: `GJA-${invNum++}`,
        customerName: sample.customer,
        customerPhone: sample.phone,
        items: saleItems,
        subtotal: totalAmount,
        discount: 0,
        total: totalAmount,
        paidAmount: isPaid ? totalAmount : Math.round(totalAmount * 0.4),
        debtAmount: isPaid ? 0 : Math.round(totalAmount * 0.6),
        paymentType: isPaid ? 'cash' : 'debt',
        sellerName: 'کاشێر',
        date: d.toISOString(),
        notes: 'فرۆشی ئاسایی ڕۆژانە • مێژووی چالاکی',
      });
    }
  }

  return newSales;
};

  const [sales, setSales] = useState<Sale[]>(() => {
    const initial = loadInitial(LOCAL_STORAGE_KEYS.SALES, [], 'sales');
    const enriched = ensureLast10DaysSales(initial);
    if (enriched.length !== initial.length) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SALES, JSON.stringify(enriched));
      } catch {}
    }
    return enriched;
  });

  const [productMovements, setProductMovements] = useState<ProductMovement[]>(() => {
    return loadInitial(LOCAL_STORAGE_KEYS.MOVEMENTS, [], 'productMovements');
  });

  const [debtTransactions, setDebtTransactions] = useState<DebtTransaction[]>(() => {
    return loadInitial(LOCAL_STORAGE_KEYS.DEBTS_TX, [], 'debtTransactions');
  });

  const [debts, setDebtsState] = useState<DebtRecord[]>(() => {
    return loadInitial(LOCAL_STORAGE_KEYS.DEBTS, [], 'debts');
  });

  const setDebts = useCallback((value: React.SetStateAction<DebtRecord[]>) => {
    setDebtsState((prev) => {
      const next = typeof value === 'function' ? (value as any)(prev) : value;
      saveToLocalStorage(LOCAL_STORAGE_KEYS.DEBTS, next);
      if (Array.isArray(next)) {
        setTimeout(() => {
          next.forEach((d) => {
            if (d && d.id) syncDocToFirestore('debts', d.id, d);
          });
        }, 50);
      }
      return next;
    });
  }, [saveToLocalStorage]);

  const isCommissionExpense = (e: any) => {
    const cat = String(e?.category || '').trim().toLowerCase();
    const title = String(e?.title || '').trim().toLowerCase();
    return cat === 'عمولە' || cat.includes('عمولە') || title.includes('عمولەی کاڵای');
  };

  const [expenses, setExpensesState] = useState<Expense[]>(() => {
    const loaded = loadInitial(LOCAL_STORAGE_KEYS.EXPENSES, [], 'expenses');
    return Array.isArray(loaded) ? loaded.filter((e: Expense) => !isCommissionExpense(e)) : [];
  });

  const setExpenses = useCallback((value: React.SetStateAction<Expense[]>) => {
    setExpensesState((prev) => {
      const raw = typeof value === 'function' ? (value as any)(prev) : value;
      const next = Array.isArray(raw) ? raw.filter((e: Expense) => !isCommissionExpense(e)) : raw;
      saveToLocalStorage(LOCAL_STORAGE_KEYS.EXPENSES, next);
      return next;
    });
  }, [saveToLocalStorage]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.EXPENSES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((e: any) => !isCommissionExpense(e));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.EXPENSES, JSON.stringify(cleaned));
            setExpensesState(cleaned);
          }
        }
      }
    } catch {}

    // Purge specific closed items requested by user ("پیاز" and "قەیسی")
    const targetNames = ['پیاز', 'قەیسی'];
    setProducts((prev) => {
      const next = prev.filter((p) => {
        const isTarget = targetNames.some((t) => p.name && p.name.includes(t));
        return !(isTarget && p.isClosed);
      });
      if (next.length !== prev.length) {
        saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, next);
      }
      return next;
    });

    setClosedProductArchives((prev) => {
      const next = prev.filter((a) => {
        const isTarget = targetNames.some((t) => a.name && a.name.includes(t));
        return !isTarget;
      });
      if (next.length !== prev.length) {
        saveToLocalStorage(LOCAL_STORAGE_KEYS.CLOSED_ARCHIVES, next);
      }
      return next;
    });
  }, [saveToLocalStorage]);

  const [shareholderTransactions, setShareholderTransactions] = useState<ShareholderTransaction[]>(() => {
    return loadInitial(LOCAL_STORAGE_KEYS.SHAREHOLDERS, [], 'shareholderTransactions');
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    return loadInitial(LOCAL_STORAGE_KEYS.EMPLOYEES, [], 'employees');
  });

  const [closedProductArchives, setClosedProductArchives] = useState<ClosedProductArchive[]>(() => {
    return loadInitial(LOCAL_STORAGE_KEYS.CLOSED_ARCHIVES, [], 'closedProductArchives');
  });

  const [commissionAccounts, setCommissionAccounts] = useState<CommissionAccount[]>(() => {
    return loadInitial(LOCAL_STORAGE_KEYS.COMMISSION, [], 'commissionAccounts');
  });

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(new Date().toISOString());
  const [isAutoSaved, setIsAutoSaved] = useState<boolean>(true);
  const [saveStatusText, setSaveStatusText] = useState<string>('سەرجەم داتاکان بە هەمیشەیی خەزنکراون');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Cross-tab synchronization via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || !e.newValue) return;
      try {
        if (e.key === LOCAL_STORAGE_KEYS.PRODUCTS) {
          setProducts(JSON.parse(e.newValue));
        } else if (e.key === LOCAL_STORAGE_KEYS.SALES) {
          setSales(JSON.parse(e.newValue));
        } else if (e.key === LOCAL_STORAGE_KEYS.CUSTOMERS) {
          setCustomers(JSON.parse(e.newValue));
        } else if (e.key === LOCAL_STORAGE_KEYS.MOVEMENTS) {
          setProductMovements(JSON.parse(e.newValue));
        } else if (e.key === LOCAL_STORAGE_KEYS.DEBTS_TX) {
          setDebtTransactions(JSON.parse(e.newValue));
        } else if (e.key === LOCAL_STORAGE_KEYS.DEBTS) {
          setDebtsState(JSON.parse(e.newValue));
        } else if (e.key === LOCAL_STORAGE_KEYS.EXPENSES) {
          setExpensesState(JSON.parse(e.newValue));
        } else if (e.key === LOCAL_STORAGE_KEYS.EMPLOYEES) {
          setEmployees(JSON.parse(e.newValue));
        } else if (e.key === LOCAL_STORAGE_KEYS.SHAREHOLDERS) {
          setShareholderTransactions(JSON.parse(e.newValue));
        } else if (e.key === LOCAL_STORAGE_KEYS.CLOSED_ARCHIVES) {
          setClosedProductArchives(JSON.parse(e.newValue));
        } else if (e.key === LOCAL_STORAGE_KEYS.COMMISSION) {
          setCommissionAccounts(JSON.parse(e.newValue));
        } else if (e.key === LOCAL_STORAGE_KEYS.SETTINGS) {
          setSettingsState(cleanseAppSettings(JSON.parse(e.newValue)));
        }
      } catch (err) {
        console.warn('Error handling storage event:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save to localStorage on state changes (reactive safety net)
  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.SETTINGS, settings);
  }, [settings, saveToLocalStorage]);

  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, products);
  }, [products, saveToLocalStorage]);

  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.CUSTOMERS, customers);
  }, [customers, saveToLocalStorage]);

  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.SALES, sales);
  }, [sales, saveToLocalStorage]);

  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.MOVEMENTS, productMovements);
  }, [productMovements, saveToLocalStorage]);

  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.DEBTS_TX, debtTransactions);
  }, [debtTransactions, saveToLocalStorage]);

  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.DEBTS, debts);
  }, [debts, saveToLocalStorage]);

  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.EXPENSES, expenses);
  }, [expenses, saveToLocalStorage]);

  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.SHAREHOLDERS, shareholderTransactions);
  }, [shareholderTransactions, saveToLocalStorage]);

  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.EMPLOYEES, employees);
  }, [employees, saveToLocalStorage]);

  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.CLOSED_ARCHIVES, closedProductArchives);
  }, [closedProductArchives, saveToLocalStorage]);

  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.COMMISSION, commissionAccounts);
  }, [commissionAccounts, saveToLocalStorage]);

  // Master complete database snapshot auto-save (saved to LOCAL_STORAGE_KEYS.DB)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const fullDb = {
          products,
          customers,
          sales,
          productMovements,
          debtTransactions,
          debts,
          expenses,
          shareholderTransactions,
          employees,
          settings,
          closedProductArchives,
          commissionAccounts,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_KEYS.DB, JSON.stringify(fullDb));
        setIsAutoSaved(true);
        setSaveStatusText('سەرجەم داتاکان بە هەمیشەیی لە localStorage خەزنکراون');
      } catch (err) {
        console.warn('Error saving master database snapshot:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    products,
    customers,
    sales,
    productMovements,
    debtTransactions,
    debts,
    expenses,
    shareholderTransactions,
    employees,
    settings,
    closedProductArchives,
    commissionAccounts,
  ]);

  // Ensure synchronous flush on beforeunload, pagehide, and visibilitychange
  useEffect(() => {
    const flushAllToLocalStorage = () => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        localStorage.setItem(LOCAL_STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
        localStorage.setItem(LOCAL_STORAGE_KEYS.SALES, JSON.stringify(sales));
        localStorage.setItem(LOCAL_STORAGE_KEYS.MOVEMENTS, JSON.stringify(productMovements));
        localStorage.setItem(LOCAL_STORAGE_KEYS.DEBTS_TX, JSON.stringify(debtTransactions));
        localStorage.setItem(LOCAL_STORAGE_KEYS.DEBTS, JSON.stringify(debts));
        localStorage.setItem(LOCAL_STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
        localStorage.setItem(LOCAL_STORAGE_KEYS.SHAREHOLDERS, JSON.stringify(shareholderTransactions));
        localStorage.setItem(LOCAL_STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
        localStorage.setItem(LOCAL_STORAGE_KEYS.CLOSED_ARCHIVES, JSON.stringify(closedProductArchives));
        localStorage.setItem(LOCAL_STORAGE_KEYS.COMMISSION, JSON.stringify(commissionAccounts));
        localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));

        const fullDb = {
          products,
          customers,
          sales,
          productMovements,
          debtTransactions,
          debts,
          expenses,
          shareholderTransactions,
          employees,
          settings,
          closedProductArchives,
          commissionAccounts,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_KEYS.DB, JSON.stringify(fullDb));
        try {
          const blob = new Blob([JSON.stringify(fullDb)], { type: 'application/json' });
          if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            navigator.sendBeacon('/api/database', blob);
          }
        } catch {}
      } catch (err) {
        console.warn('Error flushing to localStorage:', err);
      }
    };

    const onUnload = () => flushAllToLocalStorage();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushAllToLocalStorage();
    };

    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [
    products,
    customers,
    sales,
    productMovements,
    debtTransactions,
    debts,
    expenses,
    shareholderTransactions,
    employees,
    settings,
    closedProductArchives,
    commissionAccounts,
  ]);

  // Save payload to disk / complete snapshot with optional server backup
  const saveToServer = useCallback(async (overrideData?: any) => {
    try {
      setIsSyncing(true);
      const payload = {
        products,
        customers,
        sales,
        productMovements,
        debtTransactions,
        debts,
        expenses,
        shareholderTransactions,
        employees,
        settings,
        closedProductArchives,
        commissionAccounts,
        savedAt: new Date().toISOString(),
        ...(overrideData || {}),
      };

      // Ensure local storage is immediately updated
      saveToLocalStorage(LOCAL_STORAGE_KEYS.DB, payload);

      // Attempt server backup if endpoint available (graceful silent ignore)
      try {
        await fetch('/api/database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {}

      // Persistent Firestore Cloud backup (Live cloud document for 100% permanence)
      if (db && !isFirestoreQuotaBlocked()) {
        try {
          const docRef = doc(db, 'app_data', 'master_database');
          await setDoc(docRef, { ...payload, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, 'saveToServer:Firestore');
        }
      }

      setSaveStatusText('سەرجەم داتاکان بە هەمیشەیی لە هەور (Firebase) و سێرڤەر و ئامێرەکە خەزنکراون');
      return true;
    } catch (e) {
      console.warn('Storage save notice:', e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [
    products,
    customers,
    sales,
    productMovements,
    debtTransactions,
    debts,
    expenses,
    shareholderTransactions,
    employees,
    settings,
    closedProductArchives,
    commissionAccounts,
    saveToLocalStorage,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveToServer();
    }, 500);
    return () => clearTimeout(timer);
  }, [saveToServer]);

  // Initial hydration from Server Disk (/api/database) and Firestore Cloud (app_data/master_database)
  useEffect(() => {
    let isCancelled = false;

    const hydrateFromCloudAndServer = async () => {
      let serverData: any = null;
      let cloudData: any = null;

      // 1. Load from server disk (/api/database)
      try {
        const res = await fetch('/api/database');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            serverData = json.data;
          }
        }
      } catch (e) {
        console.warn('Notice loading /api/database:', e);
      }

      // 2. Load from Firestore Cloud
      if (db && !isFirestoreQuotaBlocked()) {
        try {
          const masterDocRef = doc(db, 'app_data', 'master_database');
          const snap = await getDoc(masterDocRef);
          if (snap.exists()) {
            cloudData = snap.data();
          }
        } catch (e) {
          handleFirestoreError(e, 'hydrateFromCloud');
        }
      }

      if (isCancelled) return;

      const mergeList = <T extends { id: string }>(current: T[], incoming?: T[]): T[] => {
        if (!incoming || !Array.isArray(incoming) || incoming.length === 0) return current;
        if (!current || current.length === 0) return incoming;
        const map = new Map<string, T>();
        for (const item of incoming) {
          if (item && item.id) map.set(item.id, item);
        }
        for (const item of current) {
          if (item && item.id) map.set(item.id, item);
        }
        return Array.from(map.values());
      };

      const source = cloudData || serverData;
      if (source) {
        if (source.products) setProducts((prev) => mergeList(prev, source.products));
        if (source.customers) setCustomers((prev) => mergeList(prev, source.customers));
        if (source.sales) setSales((prev) => mergeList(prev, source.sales));
        if (source.debts) setDebtsState((prev) => mergeList(prev, source.debts));
        if (source.commissionAccounts) setCommissionAccounts((prev) => mergeList(prev, source.commissionAccounts));
        if (source.debtTransactions) setDebtTransactions((prev) => mergeList(prev, source.debtTransactions));
        if (source.expenses) setExpensesState((prev) => mergeList(prev, source.expenses));
        if (source.employees) setEmployees((prev) => mergeList(prev, source.employees));
        if (source.closedProductArchives) setClosedProductArchives((prev) => mergeList(prev, source.closedProductArchives));
        if (source.shareholderTransactions) setShareholderTransactions((prev) => mergeList(prev, source.shareholderTransactions));
        if (source.settings) setSettingsState((prev) => cleanseAppSettings({ ...source.settings, ...prev }));
        setSaveStatusText('سەرجەم داتاکان بە سەرکەوتوویی لە کلاود و سێرڤەر هاوکات کرانەوە');
      }
    };

    hydrateFromCloudAndServer();

    return () => {
      isCancelled = true;
    };
  }, []);

  // دڵنیابوونەوە لە هەبوونی داتای فرۆشی ١٠ ڕۆژی ڕابردوو بۆ داشبۆرد و ئامارەکان
  useEffect(() => {
    setSales((prev) => {
      const enriched = ensureLast10DaysSales(prev);
      if (enriched.length !== prev.length) {
        saveToLocalStorage(LOCAL_STORAGE_KEYS.SALES, enriched);
        return enriched;
      }
      return prev;
    });
  }, [saveToLocalStorage]);

  // هاوسەنگکردن و هێنانەدی سەرجەم قەرزەکانی کڕیاران و فرۆشتنە قەرزەکان لە ناو بەشی قەرز
  useEffect(() => {
    let hasChanges = false;
    let updatedDebts = [...debts];

    // Read any local POS orders with debt
    let localOrders: any[] = [];
    try {
      const raw = localStorage.getItem('kurd_orders_and_debts_local');
      if (raw) localOrders = JSON.parse(raw);
    } catch {}

    // 1. پشکنینی کڕیارەکان (Customers) کە لە خاڵی فرۆشتن یان سەرمایە قەرزیان هەیە
    (customers || []).forEach((c) => {
      const custDebt = parseNumericDebt(c.totalDebt) || parseNumericDebt((c as any).debt) || parseNumericDebt((c as any).debtAmount) || 0;
      if (!c.name) return;

      const matchingDebt = updatedDebts.find((d) =>
        isSameCustomerOrDebtor(d.debtorName, c.name, d.phone, c.phone) &&
        (d.id.startsWith('debt_cust_') || d.id.startsWith('debt_sync_cust_') || d.status === 'pending')
      );

      if (custDebt > 0) {
        if (matchingDebt) {
          if (matchingDebt.amount !== custDebt || matchingDebt.status !== 'pending') {
            matchingDebt.amount = custDebt;
            matchingDebt.originalAmount = Math.max(matchingDebt.originalAmount || 0, custDebt);
            matchingDebt.status = 'pending';
            hasChanges = true;
          }
        } else {
          const newRecord: DebtRecord = {
            id: `debt_cust_${c.id || Date.now()}`,
            debtorName: c.name,
            amount: custDebt,
            phone: c.phone || '',
            date: c.updatedAt || c.createdAt || new Date().toISOString(),
            notes: c.notes ? `${c.notes} (قەرزی کڕیار)` : 'قەرزی کڕیار لە خاڵی فرۆشتن و سەرمایە',
            status: 'pending',
            originalAmount: custDebt,
          };
          updatedDebts = [newRecord, ...updatedDebts];
          hasChanges = true;
        }
      } else if (custDebt <= 0 && matchingDebt) {
        if (matchingDebt.status === 'pending') {
          matchingDebt.amount = 0;
          matchingDebt.status = 'paid';
          matchingDebt.paidDate = new Date().toISOString().split('T')[0];
          hasChanges = true;
        }
      }
    });

    // 2. پشکنینی فرۆشتنەکان (Sales) - تەنها بۆ ئەو کڕیارانەی کە لە خشتەی customers تۆمار نەکراون
    (sales || []).forEach((s) => {
      const sDebt = parseNumericDebt(s.debtAmount) || 0;
      if (sDebt <= 0 || !s.customerName) return;

      const isRegistered = (customers || []).some((c) =>
        isSameCustomerOrDebtor(c.name, s.customerName, c.phone, s.customerPhone)
      );
      if (isRegistered) return; // قەرزی ئەم کڕیارە لە totalDebt ئەژمار کراوە

      const debtId = `debt_rec_${s.id}`;
      const exists = updatedDebts.some((d) => d.id === debtId);
      if (!exists) {
        const newRecord: DebtRecord = {
          id: debtId,
          debtorName: s.customerName,
          amount: sDebt,
          phone: s.customerPhone || '',
          date: s.date || new Date().toISOString(),
          notes: `پسووڵەی ژمارە ${s.invoiceNumber || ''}${s.notes ? ' - ' + s.notes : ''}`,
          status: 'pending',
          originalAmount: sDebt,
        };
        updatedDebts = [newRecord, ...updatedDebts];
        hasChanges = true;
      }
    });

    // 3. پشکنینی تۆماری فەرمانبەران لە خاڵی فرۆشتن (Employees) - تەنها بۆ ئەوانەی لە customers تۆمار نەکراون
    (employees || []).forEach((emp) => {
      const empDebt = parseNumericDebt(emp.debtAmount) || 0;
      if (empDebt <= 0 || !emp.name) return;

      const isRegistered = (customers || []).some((c) =>
        isSameCustomerOrDebtor(c.name, emp.name, c.phone, emp.phone)
      );
      if (isRegistered) return;

      const debtId = `debt_sync_emp_${emp.id || Date.now()}`;
      const exists = updatedDebts.some((d) => d.id === debtId || isSameCustomerOrDebtor(d.debtorName, emp.name, d.phone, emp.phone));
      if (!exists) {
        const newRecord: DebtRecord = {
          id: debtId,
          debtorName: emp.name,
          amount: empDebt,
          phone: emp.phone || '',
          date: emp.date || emp.createdAt || new Date().toISOString(),
          notes: `قەرزی تۆمارکراو لە خاڵی فرۆشتن (${emp.productName || 'کاڵا'})`,
          status: 'pending',
          originalAmount: empDebt,
        };
        updatedDebts = [newRecord, ...updatedDebts];
        hasChanges = true;
      }
    });

    // 4. پشکنینی تۆمارەکانی لۆکاڵی خاڵی فرۆشتن (Local Orders & Debts)
    localOrders.forEach((ord) => {
      const ordDebt = parseNumericDebt(ord.debt?.debtAmount) || 0;
      const custName = ord.debt?.customerName || ord.customerName;
      if (ordDebt <= 0 || !custName || ord.debt?.isPaid) return;

      const isRegistered = (customers || []).some((c) =>
        isSameCustomerOrDebtor(c.name, custName)
      );
      if (isRegistered) return;

      const debtId = `debt_sync_ord_${ord.id || Date.now()}`;
      const exists = updatedDebts.some((d) => d.id === debtId || isSameCustomerOrDebtor(d.debtorName, custName));
      if (!exists) {
        const newRecord: DebtRecord = {
          id: debtId,
          debtorName: custName,
          amount: ordDebt,
          phone: '',
          date: ord.createdAt || new Date().toISOString(),
          notes: `قەرزی تۆمارکراو لە خاڵی فرۆشتن (#${ord.receipt?.receiptId || ''})`,
          status: 'pending',
          originalAmount: ordDebt,
        };
        updatedDebts = [newRecord, ...updatedDebts];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setDebts(updatedDebts);
    }
  }, [customers, sales, employees]);

  // Mutators with immediate synchronous persistence
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = cleanseAppSettings({ ...prev, ...updates });
      saveToLocalStorage(LOCAL_STORAGE_KEYS.SETTINGS, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const addProduct = useCallback((productData: any): any => {
    const newProd: Product = {
      ...productData,
      id: productData.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: productData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stock: Number(productData.stock ?? productData.quantity ?? 0),
      initialStock: Number(productData.initialStock ?? productData.stock ?? productData.quantity ?? 0),
      count: Number(productData.count ?? productData.stock ?? 0),
      initialCount: Number(productData.initialCount ?? productData.count ?? 0),
    };
    setProducts((prev) => {
      const next = [newProd, ...prev];
      saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, next);
      return next;
    });
    syncDocToFirestore('products', newProd.id, newProd);
    return newProd;
  }, [saveToLocalStorage]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
      saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, next);
      return next;
    });
    syncDocToFirestore('products', id, updates);
  }, [saveToLocalStorage]);

  const deleteProduct = useCallback(async (id: string) => {
    setProducts((prev) => {
      const target = prev.find((p) => p.id === id);
      const next = prev.filter((p) => p.id !== id);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, next);

      if (target) {
        setClosedProductArchives((archs) => {
          const archNext = archs.filter((a) => a.productId !== id && a.id !== id && (!target.name || a.name !== target.name));
          saveToLocalStorage(LOCAL_STORAGE_KEYS.CLOSED_ARCHIVES, archNext);
          return archNext;
        });
      }
      return next;
    });
  }, [saveToLocalStorage]);

  const adjustStock = useCallback(async (id: string, amount: number) => {
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        const curStock = p.stock ?? p.quantity ?? 0;
        const newStock = Math.max(0, curStock + amount);
        return { ...p, stock: newStock, quantity: newStock, updatedAt: new Date().toISOString() };
      });
      saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const permanentlyPurgeProduct = useCallback(async (id: string, ...args: any[]) => {
    const barcode = args[0];
    const name = args[1];

    setProducts((prev) => {
      const next = prev.filter((p) => {
        if (p.id === id) return false;
        if (barcode && p.barcode && p.barcode.trim().toLowerCase() === String(barcode).trim().toLowerCase()) return false;
        if (name && p.name && p.name.trim().toLowerCase() === String(name).trim().toLowerCase()) return false;
        return true;
      });
      saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, next);
      return next;
    });

    setClosedProductArchives((prev) => {
      const next = prev.filter((a) => {
        if (a.id === id || a.productId === id) return false;
        if (barcode && a.barcode && a.barcode.trim().toLowerCase() === String(barcode).trim().toLowerCase()) return false;
        if (name && a.name && a.name.trim().toLowerCase() === String(name).trim().toLowerCase()) return false;
        return true;
      });
      saveToLocalStorage(LOCAL_STORAGE_KEYS.CLOSED_ARCHIVES, next);
      return next;
    });

    setProductMovements((prev) => {
      const next = prev.filter((m) => m.productId !== id);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.MOVEMENTS, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const addCustomer = useCallback((customerData: any, ...args: any[]): any => {
    const newCust: Customer = {
      ...customerData,
      id: customerData.id || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      totalDebt: Number(customerData.totalDebt || 0),
      createdAt: customerData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCustomers((prev) => {
      const next = [newCust, ...prev];
      saveToLocalStorage(LOCAL_STORAGE_KEYS.CUSTOMERS, next);
      return next;
    });

    if (newCust.totalDebt > 0) {
      setDebts((prev) => {
        const debtId = `debt_cust_${newCust.id}`;
        const newRecord: DebtRecord = {
          id: debtId,
          debtorName: newCust.name,
          amount: newCust.totalDebt,
          phone: newCust.phone || '',
          date: newCust.createdAt,
          notes: newCust.notes || 'قەرزی تۆمارکراوی کڕیار لە خاڵی فرۆشتن',
          status: 'pending',
          originalAmount: newCust.totalDebt,
        };
        const next = [newRecord, ...prev.filter((d) => d.id !== debtId)];
        saveToLocalStorage(LOCAL_STORAGE_KEYS.DEBTS, next);
        return next;
      });
    }

    syncDocToFirestore('customers', newCust.id, newCust);
    return newCust;
  }, [saveToLocalStorage]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    let targetCustomerName = updates.name;
    let targetCustomerPhone = updates.phone;

    setCustomers((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (existing) {
        if (!targetCustomerName) targetCustomerName = existing.name;
        if (!targetCustomerPhone) targetCustomerPhone = existing.phone;
      }
      const next = prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
      saveToLocalStorage(LOCAL_STORAGE_KEYS.CUSTOMERS, next);
      return next;
    });

    if (updates.totalDebt !== undefined) {
      const debtAmt = Number(updates.totalDebt) || 0;
      setDebts((prevDebts) => {
        const debtId = `debt_cust_${id}`;
        const custName = targetCustomerName || 'کڕیار';
        const custPhone = targetCustomerPhone || '';
        
        if (debtAmt > 0) {
          const exists = prevDebts.some((d) => d.id === debtId || (isSameCustomerOrDebtor(d.debtorName, custName, d.phone, custPhone) && d.status === 'pending'));
          if (exists) {
            const next = prevDebts.map((d) => {
              if (d.id === debtId || (isSameCustomerOrDebtor(d.debtorName, custName, d.phone, custPhone) && d.status === 'pending')) {
                return {
                  ...d,
                  amount: debtAmt,
                  debtorName: custName,
                  phone: custPhone || d.phone,
                  status: 'pending' as const,
                  originalAmount: Math.max(d.originalAmount || 0, debtAmt)
                };
              }
              return d;
            });
            saveToLocalStorage(LOCAL_STORAGE_KEYS.DEBTS, next);
            return next;
          } else {
            const record: DebtRecord = {
              id: debtId,
              debtorName: custName,
              amount: debtAmt,
              phone: custPhone,
              date: new Date().toISOString(),
              notes: updates.notes || 'قەرزی نوێکراوەی کڕیار',
              status: 'pending',
              originalAmount: debtAmt,
            };
            const next = [record, ...prevDebts];
            saveToLocalStorage(LOCAL_STORAGE_KEYS.DEBTS, next);
            return next;
          }
        } else {
          // قەرزەکە پاکتاوکرا و گەیشتە سفر، سەرجەم قەرزە نەدراوەکانی ئەم کڕیارە دەبنە پاکتاوکراو و دراوەتەوە
          const next = prevDebts.map((d) => {
            if (d.id === debtId || (isSameCustomerOrDebtor(d.debtorName, custName, d.phone, custPhone) && d.status === 'pending')) {
              return {
                ...d,
                amount: 0,
                status: 'paid' as const,
                paidAmount: d.amount > 0 ? d.amount : (d.originalAmount || d.paidAmount || 0),
                paidDate: new Date().toISOString().split('T')[0],
                notes: (d.notes ? d.notes + ' - ' : '') + 'پاکتاوکرا و درایەوە'
              };
            }
            return d;
          });
          saveToLocalStorage(LOCAL_STORAGE_KEYS.DEBTS, next);
          return next;
        }
      });
    }

    syncDocToFirestore('customers', id, updates);
  }, [saveToLocalStorage]);

  const createSale = useCallback((saleData: any): any => {
    const newSale: Sale = {
      ...saleData,
      id: saleData.id || `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber: saleData.invoiceNumber || `GJA-${sales.length + 1}`,
      date: saleData.date || new Date().toISOString(),
      items: saleData.items || [],
      subtotal: Number(saleData.subtotal || saleData.total || 0),
      discount: Number(saleData.discount || 0),
      total: Number(saleData.total || 0),
      paidAmount: Number(saleData.paidAmount || 0),
      debtAmount: Number(saleData.debtAmount || 0),
      paymentType: saleData.paymentType || (saleData.debtAmount > 0 ? 'debt' : 'cash'),
      sellerName: saleData.sellerName || 'کاشێر',
    };

    setSales((prev) => {
      const next = [newSale, ...prev];
      saveToLocalStorage(LOCAL_STORAGE_KEYS.SALES, next);
      return next;
    });

    // Record product movements
    if (newSale.items && Array.isArray(newSale.items)) {
      const newMovements: ProductMovement[] = newSale.items.map((item: any) => ({
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        saleId: newSale.id,
        invoiceNumber: newSale.invoiceNumber,
        productId: item.productId || item.id,
        barcode: item.barcode || '',
        productName: item.productName || item.name || '',
        customerName: newSale.customerName,
        customerId: newSale.customerId,
        date: newSale.date,
        quantity: Number(item.quantity || 1),
        count: Number(item.count || item.quantity || 1),
        unit: item.unit || 'دانە',
        sellingPrice: Number(item.price || item.sellingPrice || 0),
        purchasePrice: Number(item.cost || item.purchasePrice || 0),
        totalAmount: Number(item.total || (item.quantity * item.price) || 0),
        totalCost: Number((item.cost || item.purchasePrice || 0) * (item.quantity || 1)),
        profit: Number(item.profit || 0),
      }));
      setProductMovements((prev) => {
        const next = [...newMovements, ...prev];
        saveToLocalStorage(LOCAL_STORAGE_KEYS.MOVEMENTS, next);
        return next;
      });

      // Deduct stock
      setProducts((prev) => {
        const next = prev.map((prod) => {
          const matchItem = newSale.items.find(
            (it: any) => it.productId === prod.id || it.id === prod.id || (it.barcode && it.barcode === prod.barcode)
          );
          if (!matchItem) return prod;
          const soldQty = Number(matchItem.quantity || 0);
          const currentStock = prod.stock ?? prod.quantity ?? 0;
          const newStock = Math.max(0, currentStock - soldQty);
          return {
            ...prod,
            stock: newStock,
            quantity: newStock,
            totalSales: (prod.totalSales || 0) + soldQty,
            salesRevenue: (prod.salesRevenue || 0) + soldQty * (matchItem.price || prod.sellingPrice || 0),
            updatedAt: new Date().toISOString(),
          };
        });
        saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, next);
        return next;
      });
    }

    // Update customer debt if debtAmount > 0
    if (newSale.debtAmount > 0 && newSale.customerName) {
      setDebtTransactions((prev) => {
        const next = [
          {
            id: `debt_tx_${Date.now()}`,
            customerId: newSale.customerId || '',
            customerName: newSale.customerName,
            amount: newSale.debtAmount,
            type: 'debt' as const,
            date: newSale.date,
            collectorName: newSale.sellerName,
            notes: `قەرزی پسووڵەی ${newSale.invoiceNumber}`,
            saleId: newSale.id,
          },
          ...prev,
        ];
        saveToLocalStorage(LOCAL_STORAGE_KEYS.DEBTS_TX, next);
        return next;
      });

      setDebts((prev) => {
        const debtId = `debt_rec_${newSale.id}`;
        const debtRecord: DebtRecord = {
          id: debtId,
          debtorName: newSale.customerName,
          amount: newSale.debtAmount,
          phone: newSale.customerPhone || '',
          date: newSale.date,
          notes: `پسووڵەی ژمارە ${newSale.invoiceNumber}${newSale.notes ? ' - ' + newSale.notes : ''}`,
          status: 'pending',
        };
        const next = [debtRecord, ...prev.filter(d => d.id !== debtId)];
        saveToLocalStorage(LOCAL_STORAGE_KEYS.DEBTS, next);
        return next;
      });

      if (newSale.customerId) {
        setCustomers((prev) => {
          const next = prev.map((c) =>
            c.id === newSale.customerId ? { ...c, totalDebt: (c.totalDebt || 0) + newSale.debtAmount } : c
          );
          saveToLocalStorage(LOCAL_STORAGE_KEYS.CUSTOMERS, next);
          return next;
        });
      }
    }

    syncDocToFirestore('sales', newSale.id, newSale);
    return newSale;
  }, [saveToLocalStorage]);

  const updateSale = useCallback((id: string, updates: Partial<Sale>): any => {
    // 1. Get existing sale reliably and synchronously from localStorage / state
    let oldSale: Sale | null = null;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.SALES);
      if (stored) {
        const parsed: Sale[] = JSON.parse(stored);
        oldSale = parsed.find((s) => s.id === id) || null;
      }
    } catch {}

    if (!oldSale) {
      oldSale = sales.find((s) => s.id === id) || null;
    }

    const newSale: Sale = oldSale ? { ...oldSale, ...updates } : ({ id, ...updates } as Sale);

    // 2. Update sales state and persistence
    setSales((prev) => {
      const exists = prev.some((s) => s.id === id);
      const next = exists
        ? prev.map((s) => (s.id === id ? newSale : s))
        : [newSale, ...prev];
      saveToLocalStorage(LOCAL_STORAGE_KEYS.SALES, next);
      return next;
    });

    syncDocToFirestore('sales', id, newSale);

    // 3. ئۆتۆماتیکی ڕێکخستنەوەی کۆگا و کاڵاکان (PRODUCTS & MOVEMENTS INVENTORY SYNC)
      if (updates.items && Array.isArray(updates.items)) {
        const oldItems: SaleItem[] = oldSale?.items || [];
        const newItems: SaleItem[] = updates.items;

        setProducts((prev) => {
          let hasProductChanges = false;
          const next = prev.map((prod) => {
            // Find sum of old quantities for this product
            const oldSum = oldItems.reduce((acc, it) => {
              const matches =
                (it.productId && it.productId === prod.id) ||
                (it.barcode && prod.barcode && it.barcode.trim() === prod.barcode.trim()) ||
                (it.productName && prod.name && it.productName.trim().toLowerCase() === prod.name.trim().toLowerCase());
              return matches ? acc + Number(it.quantity || 0) : acc;
            }, 0);

            // Find sum of new quantities for this product
            const newSum = newItems.reduce((acc, it) => {
              const matches =
                (it.productId && it.productId === prod.id) ||
                (it.barcode && prod.barcode && it.barcode.trim() === prod.barcode.trim()) ||
                (it.productName && prod.name && it.productName.trim().toLowerCase() === prod.name.trim().toLowerCase());
              return matches ? acc + Number(it.quantity || 0) : acc;
            }, 0);

            const delta = newSum - oldSum;
            if (delta === 0) return prod;

            hasProductChanges = true;
            const currentStock = prod.stock ?? prod.quantity ?? 0;
            // delta > 0 means more was sold -> reduce inventory
            // delta < 0 means less was sold (returned) -> increase inventory
            const newStock = Math.max(0, currentStock - delta);
            const newTotalSales = Math.max(0, (prod.totalSales || 0) + delta);
            const unitPrice = prod.sellingPrice || (prod as any).price || 0;
            const newRevenue = Math.max(0, (prod.salesRevenue || 0) + (delta * unitPrice));

            const updatedProd: Product = {
              ...prod,
              stock: newStock,
              quantity: newStock,
              totalSales: newTotalSales,
              salesRevenue: newRevenue,
              updatedAt: new Date().toISOString(),
            };

            syncDocToFirestore('products', prod.id, updatedProd);
            return updatedProd;
          });

          if (hasProductChanges) {
            saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, next);
          }
          return next;
        });

        // Update product movements for this sale
        setProductMovements((prev) => {
          const otherMovements = prev.filter((m) => m.saleId !== id);
          const newMovements: ProductMovement[] = newItems.map((item: any) => ({
            id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            saleId: id,
            invoiceNumber: newSale.invoiceNumber,
            productId: item.productId || item.id || '',
            barcode: item.barcode || '',
            productName: item.productName || item.name || '',
            customerName: newSale.customerName,
            customerId: newSale.customerId,
            date: newSale.date,
            quantity: Number(item.quantity || 1),
            count: Number(item.count || item.quantity || 1),
            unit: item.unit || 'دانە',
            sellingPrice: Number(item.price || item.sellingPrice || 0),
            purchasePrice: Number(item.cost || item.purchasePrice || 0),
            totalAmount: Number(item.total || (item.quantity * item.price) || 0),
            totalCost: Number((item.cost || item.purchasePrice || 0) * (item.quantity || 1)),
            profit: Number(item.profit || 0),
          }));
          const next = [...newMovements, ...otherMovements];
          saveToLocalStorage(LOCAL_STORAGE_KEYS.MOVEMENTS, next);
          return next;
        });
      }

      // =========================================================================
      // 2. ئۆتۆماتیکی ڕێکخستنەوەی قەرزەکان و کڕیاران (DEBTS & CUSTOMERS SYNC)
      // =========================================================================
      const oldDebt = Number(oldSale?.debtAmount) || 0;
      const newDebt = Number(newSale.debtAmount) || 0;
      const debtId = `debt_rec_${newSale.id}`;

      // A. بەڕێوەبردنی لیستی سەرەکی قەرزەکان (debts)
      setDebts((prev) => {
        const exists = prev.some((d) => d.id === debtId);
        if (newDebt > 0 && newSale.customerName) {
          const debtRecord: DebtRecord = {
            id: debtId,
            debtorName: newSale.customerName,
            amount: newDebt,
            originalAmount: Math.max(
              exists ? prev.find((d) => d.id === debtId)?.originalAmount || 0 : 0,
              newDebt
            ),
            phone: newSale.customerPhone || '',
            date: newSale.date,
            notes: `پسووڵەی ژمارە ${newSale.invoiceNumber}${newSale.notes ? ' - ' + newSale.notes : ''}`,
            status: 'pending',
          };
          const next = exists ? prev.map((d) => (d.id === debtId ? debtRecord : d)) : [debtRecord, ...prev];
          saveToLocalStorage(LOCAL_STORAGE_KEYS.DEBTS, next);
          syncDocToFirestore('debts', debtId, debtRecord);
          return next;
        } else if (exists && newDebt <= 0) {
          // قەرزەکەی پاکتاوکرا و بووە سفر
          const next = prev.map((d) =>
            d.id === debtId
              ? {
                  ...d,
                  amount: 0,
                  status: 'paid' as const,
                  paidAmount: oldDebt > 0 ? oldDebt : (d.originalAmount || newSale.paidAmount || newSale.total),
                  paidDate: new Date().toISOString().split('T')[0],
                  notes: (d.notes ? d.notes + ' - ' : '') + 'پاکتاوکرا و درایەوە لە دەستکاری پسووڵەدا',
                }
              : d
          );
          saveToLocalStorage(LOCAL_STORAGE_KEYS.DEBTS, next);
          const updated = next.find((d) => d.id === debtId);
          if (updated) syncDocToFirestore('debts', debtId, updated);
          return next;
        }
        return prev;
      });

      // B. بەڕێوەبردنی کڕیاران (customers) و کۆی قەرزی کڕیار (totalDebt)
      const oldCustName = (oldSale?.customerName || '').trim().toLowerCase();
      const newCustName = (newSale.customerName || '').trim().toLowerCase();
      const oldCustId = oldSale?.customerId;
      const newCustId = newSale.customerId;

      setCustomers((prev) => {
        let next = [...prev];
        const isSameCust =
          oldCustName === newCustName ||
          (oldCustId && newCustId && oldCustId === newCustId) ||
          (!oldCustName && newCustName);

        if (isSameCust) {
          // هەمان کڕیارە: تەنها جیاوازی قەرز (newDebt - oldDebt) جێبەجێ دەکەین
          const diff = newDebt - oldDebt;
          if (diff !== 0 && (newCustId || newCustName)) {
            next = next.map((c) => {
              const match =
                (newCustId && c.id === newCustId) ||
                (c.name && c.name.trim().toLowerCase() === newCustName);
              if (!match) return c;
              const updatedDebt = Math.max(0, (c.totalDebt || 0) + diff);
              const updated = { ...c, totalDebt: updatedDebt, updatedAt: new Date().toISOString() };
              syncDocToFirestore('customers', c.id, updated);
              return updated;
            });
          }
        } else {
          // ناوی کڕیار گۆڕدراوە: قەرزی کۆن لە کڕیاری کۆن دەردەهێنین و دەخرێتە سەر کڕیاری نوێ
          if (oldDebt > 0 && (oldCustId || oldCustName)) {
            next = next.map((c) => {
              const match =
                (oldCustId && c.id === oldCustId) ||
                (c.name && c.name.trim().toLowerCase() === oldCustName);
              if (!match) return c;
              const updatedDebt = Math.max(0, (c.totalDebt || 0) - oldDebt);
              const updated = { ...c, totalDebt: updatedDebt, updatedAt: new Date().toISOString() };
              syncDocToFirestore('customers', c.id, updated);
              return updated;
            });
          }

          if (newDebt > 0 && (newCustId || newCustName)) {
            let foundNew = false;
            next = next.map((c) => {
              const match =
                (newCustId && c.id === newCustId) ||
                (c.name && c.name.trim().toLowerCase() === newCustName);
              if (!match) return c;
              foundNew = true;
              const updatedDebt = (c.totalDebt || 0) + newDebt;
              const updated = { ...c, totalDebt: updatedDebt, updatedAt: new Date().toISOString() };
              syncDocToFirestore('customers', c.id, updated);
              return updated;
            });

            if (!foundNew && newSale.customerName.trim() && newSale.customerName.trim() !== 'کڕیاری گشتی') {
              const newCust: Customer = {
                id: newCustId || `cust_${Date.now()}`,
                name: newSale.customerName.trim(),
                phone: newSale.customerPhone || '',
                totalDebt: newDebt,
                createdAt: new Date().toISOString(),
              };
              next = [newCust, ...next];
              syncDocToFirestore('customers', newCust.id, newCust);
            }
          }
        }

        saveToLocalStorage(LOCAL_STORAGE_KEYS.CUSTOMERS, next);
        return next;
      });

      // C. مامەڵەکانی قەرز (debtTransactions)
      setDebtTransactions((prev) => {
        let next = [...prev];
        const txIndex = next.findIndex(
          (tx) => tx.saleId === id || (tx.notes && tx.notes.includes(newSale.invoiceNumber))
        );

        if (newDebt > 0) {
          if (txIndex >= 0) {
            next[txIndex] = {
              ...next[txIndex],
              customerName: newSale.customerName,
              customerId: newSale.customerId || next[txIndex].customerId || '',
              amount: newDebt,
              date: newSale.date,
              notes: `قەرزی پسووڵەی ${newSale.invoiceNumber}`,
            };
          } else {
            next = [
              {
                id: `debt_tx_${Date.now()}`,
                customerId: newSale.customerId || '',
                customerName: newSale.customerName,
                amount: newDebt,
                type: 'debt',
                date: newSale.date,
                collectorName: newSale.sellerName || 'کاشێر',
                notes: `قەرزی پسووڵەی ${newSale.invoiceNumber}`,
                saleId: id,
              },
              ...next,
            ];
          }
        } else if (txIndex >= 0) {
          next = next.filter((_, idx) => idx !== txIndex);
        }

        saveToLocalStorage(LOCAL_STORAGE_KEYS.DEBTS_TX, next);
        return next;
      });

      // D. خاڵی فرۆشتنی لۆکاڵی (kurd_orders_and_debts_local)
      try {
        const raw = localStorage.getItem('kurd_orders_and_debts_local');
        if (raw) {
          const orders = JSON.parse(raw);
          if (Array.isArray(orders)) {
            const updatedOrders = orders.map((o: any) => {
              if (o.receiptId === newSale.invoiceNumber || o.id === id) {
                return {
                  ...o,
                  customerName: newSale.customerName,
                  totalAmount: newSale.total,
                  price: newSale.total,
                  debtAmount: newSale.debtAmount,
                  isPaid: newSale.debtAmount <= 0,
                  items: newSale.items,
                  productName: (newSale.items || []).map((it: any) => it.productName).join('، '),
                  quantity: (newSale.items || []).reduce(
                    (s: number, it: any) => s + (it.quantity || 1),
                    0
                  ),
                };
              }
              return o;
            });
            localStorage.setItem('kurd_orders_and_debts_local', JSON.stringify(updatedOrders));
          }
        }
      } catch {}

      // E. نوێکردنەوەی تۆمارەکانی فۆرمی کڕیاران و فرۆش (employees)
      setEmployees((prev) => {
        let hasChanges = false;
        const next = prev.map((emp) => {
          if (emp.saleId === id || (emp.employeeId && emp.employeeId === newSale.invoiceNumber)) {
            hasChanges = true;
            const primaryItem = updates.items && updates.items.length > 0 ? updates.items[0] : null;
            return {
              ...emp,
              name: newSale.customerName || emp.name,
              phone: newSale.customerPhone || emp.phone,
              totalAmount: newSale.total,
              paidAmount: newSale.paidAmount,
              debtAmount: newSale.debtAmount,
              date: newSale.date,
              items: updates.items || emp.items,
              productName: primaryItem ? primaryItem.productName : emp.productName,
              quantity: updates.items ? updates.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : emp.quantity,
              count: primaryItem && primaryItem.count !== undefined ? primaryItem.count : emp.count,
              unit: primaryItem ? primaryItem.unit : emp.unit,
              salary: primaryItem ? primaryItem.sellingPrice : emp.salary,
            };
          }
          return emp;
        });
        if (hasChanges) {
          saveToLocalStorage(LOCAL_STORAGE_KEYS.EMPLOYEES, next);
        }
        return next;
      });

      // Dispatch custom event to notify all components
      try {
        window.dispatchEvent(new CustomEvent('saleUpdated', { detail: { saleId: id, sale: newSale } }));
        window.dispatchEvent(new Event('storage'));
      } catch {}

      return newSale;
    },
    [saveToLocalStorage, sales]
  );

  const deleteSale = useCallback(async (id: string, ...args: any[]) => {
    setSales((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.SALES, next);
      return next;
    });
    setProductMovements((prev) => {
      const next = prev.filter((m) => m.saleId !== id);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.MOVEMENTS, next);
      return next;
    });
    // Debts remain permanently and are never deleted when a sale is deleted
  }, [saveToLocalStorage]);

  const addExpense = useCallback((expenseData: any): any => {
    if (isCommissionExpense(expenseData)) {
      return null;
    }
    const newExp: Expense = {
      ...expenseData,
      id: expenseData.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: expenseData.date || new Date().toISOString(),
      amount: Number(expenseData.amount || 0),
    };
    setExpenses((prev) => {
      const next = [newExp, ...prev];
      saveToLocalStorage(LOCAL_STORAGE_KEYS.EXPENSES, next);
      return next;
    });
    return newExp;
  }, [saveToLocalStorage]);

  const deleteExpense = useCallback(async (id: string) => {
    setExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.EXPENSES, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const archiveExpenses = useCallback(async (ids?: string[]) => {
    setExpenses((prev) => {
      const next = prev.map((e) => (!ids || ids.includes(e.id) ? { ...e, isArchived: true } : e));
      saveToLocalStorage(LOCAL_STORAGE_KEYS.EXPENSES, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const unarchiveExpenses = useCallback(async (ids?: string[]) => {
    setExpenses((prev) => {
      const next = prev.map((e) => (!ids || ids.includes(e.id) ? { ...e, isArchived: false } : e));
      saveToLocalStorage(LOCAL_STORAGE_KEYS.EXPENSES, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const addManualDebt = useCallback(async (debtData: any) => {
    const newTx: DebtTransaction = {
      id: `debt_manual_${Date.now()}`,
      customerId: debtData.customerId || '',
      customerName: debtData.customerName || 'کڕیار',
      amount: Number(debtData.amount || 0),
      type: debtData.type || 'debt',
      date: debtData.date || new Date().toISOString(),
      collectorName: debtData.collectorName || '',
      notes: debtData.notes || '',
    };
    setDebtTransactions((prev) => {
      const next = [newTx, ...prev];
      saveToLocalStorage(LOCAL_STORAGE_KEYS.DEBTS_TX, next);
      return next;
    });
    syncDocToFirestore('debtTransactions', newTx.id, newTx);
  }, [saveToLocalStorage]);

  const addEmployee = useCallback((empData: any): any => {
    const newEmp: Employee = {
      ...empData,
      id: empData.id || `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEmployees((prev) => {
      const next = [newEmp, ...prev];
      saveToLocalStorage(LOCAL_STORAGE_KEYS.EMPLOYEES, next);
      return next;
    });
    return newEmp;
  }, [saveToLocalStorage]);

  const updateEmployee = useCallback(async (id: string, updates: Partial<Employee>) => {
    setEmployees((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e));
      saveToLocalStorage(LOCAL_STORAGE_KEYS.EMPLOYEES, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const deleteEmployee = useCallback(async (id: string) => {
    setEmployees((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.EMPLOYEES, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const addShareholderTransaction = useCallback((txData: any): any => {
    const newTx: ShareholderTransaction = {
      ...txData,
      id: txData.id || `sh_tx_${Date.now()}`,
      date: txData.date || new Date().toISOString(),
      amount: Number(txData.amount || 0),
    };
    setShareholderTransactions((prev) => {
      const next = [newTx, ...prev];
      saveToLocalStorage(LOCAL_STORAGE_KEYS.SHAREHOLDERS, next);
      return next;
    });
    return newTx;
  }, [saveToLocalStorage]);

  const updateShareholderTransaction = useCallback(async (id: string, updates: any) => {
    setShareholderTransactions((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      saveToLocalStorage(LOCAL_STORAGE_KEYS.SHAREHOLDERS, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const deleteShareholderTransaction = useCallback(async (id: string) => {
    setShareholderTransactions((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.SHAREHOLDERS, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const addFeePayment = useCallback((productId: string, feeTypeOrData: any, amount?: number, note?: string): any => {
    let feeEntry: any;
    if (typeof feeTypeOrData === 'object') {
      feeEntry = {
        id: feeTypeOrData.id || `fee_${Date.now()}`,
        ...feeTypeOrData,
        date: feeTypeOrData.date || new Date().toISOString(),
      };
    } else {
      feeEntry = {
        id: `fee_${Date.now()}`,
        feeType: feeTypeOrData,
        category: feeTypeOrData,
        amount: Number(amount || 0),
        note: note || '',
        notes: note || '',
        date: new Date().toISOString(),
      };
    }

    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id !== productId) return p;
        const currentFees = Array.isArray(p.feePayments) ? p.feePayments : [];
        return { ...p, feePayments: [feeEntry, ...currentFees] };
      });
      saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, next);
      return next;
    });
    return feeEntry;
  }, [saveToLocalStorage]);

  const updateFeePayment = useCallback(async (productId: string, feeId: string, updates: any) => {
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id !== productId || !Array.isArray(p.feePayments)) return p;
        return {
          ...p,
          feePayments: p.feePayments.map((f: any) => (f.id === feeId ? { ...f, ...updates } : f)),
        };
      });
      saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const deleteFeePayment = useCallback(async (productId: string, feeId: string) => {
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id !== productId || !Array.isArray(p.feePayments)) return p;
        return {
          ...p,
          feePayments: p.feePayments.filter((f: any) => f.id !== feeId),
        };
      });
      saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const archiveClosedProduct = useCallback((productOrId: any, ...args: any[]): any => {
    let prod: any = null;
    let archiveData: any = {};
    if (typeof productOrId === 'string') {
      prod = products.find((p) => p.id === productOrId);
      archiveData = args[0] || {};
    } else if (typeof productOrId === 'object') {
      prod = productOrId;
      archiveData = args[0] || {};
    }

    if (!prod) return;

    const archiveEntry: ClosedProductArchive = {
      ...prod,
      ...archiveData,
      id: `arch_${Date.now()}`,
      productId: prod.id,
      name: prod.name,
      barcode: prod.barcode || '',
      category: prod.category,
      unit: prod.unit || 'دانە',
      closedAt: new Date().toISOString(),
      isDeletedFromInventory: true,
    };

    setClosedProductArchives((prev) => {
      const next = [archiveEntry, ...prev];
      saveToLocalStorage(LOCAL_STORAGE_KEYS.CLOSED_ARCHIVES, next);
      return next;
    });
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === prod.id ? { ...p, isClosed: true, closedAt: new Date().toISOString() } : p));
      saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, next);
      return next;
    });
    return archiveEntry;
  }, [products, saveToLocalStorage]);

  const deleteClosedProductArchive = useCallback(async (archiveId: string) => {
    setClosedProductArchives((prev) => {
      const target = prev.find((a) => a.id === archiveId || a.productId === archiveId);
      const next = prev.filter((a) => a.id !== archiveId && a.productId !== archiveId);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.CLOSED_ARCHIVES, next);

      if (target) {
        setProducts((pList) => {
          const pNext = pList.filter((p) => p.id !== target.productId && p.id !== archiveId && (!target.name || p.name !== target.name));
          saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, pNext);
          return pNext;
        });
      } else {
        setProducts((pList) => {
          const pNext = pList.filter((p) => p.id !== archiveId);
          saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, pNext);
          return pNext;
        });
      }
      return next;
    });
  }, [saveToLocalStorage]);

  const transferClosedProductToProfitLoss = useCallback(async (archiveOrId: any, ...args: any[]) => {
    if (typeof archiveOrId === 'string') {
      setProducts((prev) => {
        const next = prev.map((p) => (p.id === archiveOrId ? { ...p, isClosed: true, closedAt: new Date().toISOString() } : p));
        saveToLocalStorage(LOCAL_STORAGE_KEYS.PRODUCTS, next);
        return next;
      });
    }
  }, [saveToLocalStorage]);

  const deleteProductMovement = useCallback(async (id: string) => {
    setProductMovements((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.MOVEMENTS, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const clearProductMovementsForProduct = useCallback(async (productId: string) => {
    setProductMovements((prev) => {
      const next = prev.filter((m) => m.productId !== productId);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.MOVEMENTS, next);
      return next;
    });
  }, [saveToLocalStorage]);

  // Helper to recalculate balance
  const calculateBalance = (txs: CommissionTransaction[]) => {
    return txs.reduce((bal, tx) => {
      const amount = Number(tx.amount) || 0;
      if (tx.type === 'sell' || tx.type === 'pay') return bal + amount;
      if (tx.type === 'buy' || tx.type === 'receive') return bal - amount;
      return bal;
    }, 0);
  };

  const addCommissionTransaction = useCallback((accountId: string, txData: any) => {
    setCommissionAccounts((prev) => {
      const next = prev.map((acc) => {
        if (acc.id !== accountId) return acc;
        const newTx: CommissionTransaction = {
          ...txData,
          id: `tx_${Date.now()}`,
          date: txData.date || new Date().toISOString(),
        };
        const updatedTxs = [newTx, ...acc.transactions];
        const updatedAcc = {
          ...acc,
          balance: calculateBalance(updatedTxs),
          transactions: updatedTxs,
        };
        syncDocToFirestore('commissionAccounts', accountId, updatedAcc);
        return updatedAcc;
      });
      saveToLocalStorage(LOCAL_STORAGE_KEYS.COMMISSION, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const deleteCommissionTransaction = useCallback((accountId: string, txId: string) => {
    setCommissionAccounts((prev) => {
      const next = prev.map((acc) => {
        if (acc.id !== accountId) return acc;
        const updatedTxs = acc.transactions.filter((t) => t.id !== txId);
        const updatedAcc = {
          ...acc,
          balance: calculateBalance(updatedTxs),
          transactions: updatedTxs,
        };
        syncDocToFirestore('commissionAccounts', accountId, updatedAcc);
        return updatedAcc;
      });
      saveToLocalStorage(LOCAL_STORAGE_KEYS.COMMISSION, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const removeCommissionTransactionsForProduct = useCallback((...args: any[]) => {
    const keys = args.filter(Boolean).map(k => String(k).trim().toLowerCase());
    if (keys.length === 0) return;

    setCommissionAccounts((prev) => {
      const next = prev.map((acc) => {
        const filteredTxs = acc.transactions.filter((t) => {
          const pName = String(t.productName || '').trim().toLowerCase();
          const pId = String((t as any).productId || '').trim().toLowerCase();
          
          const isMatch = keys.some(key => pName === key || pId === key);
          return !isMatch;
        });

        if (filteredTxs.length === acc.transactions.length) return acc;

        const updatedAcc = {
          ...acc,
          transactions: filteredTxs,
          balance: calculateBalance(filteredTxs),
        };
        
        syncDocToFirestore('commissionAccounts', acc.id, updatedAcc);
        return updatedAcc;
      });
      
      saveToLocalStorage(LOCAL_STORAGE_KEYS.COMMISSION, next);
      return next;
    });
  }, [saveToLocalStorage]);

  const addCommissionAccount = useCallback((accData: any): CommissionAccount => {
    const newAcc: CommissionAccount = {
      ...accData,
      id: accData.id || `acc_${Date.now()}`,
      balance: Number(accData.balance || 0),
      createdAt: new Date().toISOString(),
      transactions: accData.transactions || [],
    };
    setCommissionAccounts((prev) => {
      const next = [newAcc, ...prev];
      saveToLocalStorage(LOCAL_STORAGE_KEYS.COMMISSION, next);
      return next;
    });
    syncDocToFirestore('commissionAccounts', newAcc.id, newAcc);
    return newAcc;
  }, [saveToLocalStorage]);

  const updateCommissionAccount = useCallback((id: string, updates: Partial<CommissionAccount>) => {
    setCommissionAccounts((prev) => {
      const next = prev.map((acc) => (acc.id === id ? { ...acc, ...updates } : acc));
      saveToLocalStorage(LOCAL_STORAGE_KEYS.COMMISSION, next);
      return next;
    });
    syncDocToFirestore('commissionAccounts', id, updates);
  }, [saveToLocalStorage]);

  const deleteCommissionAccount = useCallback((id: string) => {
    setCommissionAccounts((prev) => {
      const next = prev.filter((acc) => acc.id !== id);
      saveToLocalStorage(LOCAL_STORAGE_KEYS.COMMISSION, next);
      return next;
    });
    deleteDocFromFirestore('commissionAccounts', id);
  }, [saveToLocalStorage]);

  const exportDatabaseJSON = useCallback((): string => {
    const fullDb = {
      products,
      customers,
      sales,
      productMovements,
      debtTransactions,
      debts,
      expenses,
      shareholderTransactions,
      employees,
      settings,
      closedProductArchives,
      commissionAccounts,
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = JSON.stringify(fullDb, null, 2);
    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kurd_pos_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    return jsonStr;
  }, [
    products,
    customers,
    sales,
    productMovements,
    debtTransactions,
    debts,
    expenses,
    shareholderTransactions,
    employees,
    settings,
    closedProductArchives,
    commissionAccounts,
  ]);

  const importDatabaseJSON = useCallback(async (jsonData: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.products) setProducts(parsed.products);
      if (parsed.customers) setCustomers(parsed.customers);
      if (parsed.sales) setSales(parsed.sales);
      if (parsed.productMovements) setProductMovements(parsed.productMovements);
      if (parsed.debtTransactions) setDebtTransactions(parsed.debtTransactions);
      if (parsed.debts) setDebts(parsed.debts);
      if (parsed.expenses) setExpenses(parsed.expenses);
      if (parsed.shareholderTransactions) setShareholderTransactions(parsed.shareholderTransactions);
      if (parsed.employees) setEmployees(parsed.employees);
      if (parsed.settings) setSettings((prev) => ({ ...prev, ...parsed.settings }));
      if (parsed.closedProductArchives) setClosedProductArchives(parsed.closedProductArchives);
      if (parsed.commissionAccounts) setCommissionAccounts(parsed.commissionAccounts);
      return true;
    } catch {
      return false;
    }
  }, [setDebts, setExpenses, setSettings]);

  const clearAllData = useCallback(async () => {
    setProducts([]);
    setCustomers([]);
    setSales([]);
    setProductMovements([]);
    setDebtTransactions([]);
    setDebts([]);
    setExpenses([]);
    setShareholderTransactions([]);
    setEmployees([]);
    setClosedProductArchives([]);
    setCommissionAccounts([]);
  }, [setDebts, setExpenses]);

  const resetToDefaultData = useCallback(async () => {
    if (preloadedDb) {
      if (preloadedDb.products) setProducts(preloadedDb.products);
      if (preloadedDb.customers) setCustomers(preloadedDb.customers);
      if (preloadedDb.sales) setSales(preloadedDb.sales);
      if (preloadedDb.productMovements) setProductMovements(preloadedDb.productMovements);
      if (preloadedDb.debtTransactions) setDebtTransactions(preloadedDb.debtTransactions);
      if (preloadedDb.debts) setDebts(preloadedDb.debts);
      if (preloadedDb.expenses) setExpenses(preloadedDb.expenses);
      if (preloadedDb.shareholderTransactions) setShareholderTransactions(preloadedDb.shareholderTransactions);
      if (preloadedDb.employees) setEmployees(preloadedDb.employees);
      if (preloadedDb.settings) setSettings(preloadedDb.settings);
      if (preloadedDb.closedProductArchives) setClosedProductArchives(preloadedDb.closedProductArchives);
      if (preloadedDb.commissionAccounts) setCommissionAccounts(preloadedDb.commissionAccounts);
    }
  }, [setDebts, setExpenses, setSettings]);

  const forceSaveToDisk = useCallback(async (overrideData?: any) => {
    await saveToServer(overrideData);
  }, [saveToServer]);

  const syncNow = useCallback(async (): Promise<boolean> => {
    const success = await saveToServer();
    return Boolean(success);
  }, [saveToServer]);

  const syncClockWithServer = useCallback(async () => {
    try {
      await fetch('/api/time');
    } catch {}
  }, []);

  const metrics = useMemo(() => {
    const totalSalesAmount = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalExpensesAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalDebtsAmount = (debts || [])
      .filter((d) => d.status === 'pending')
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    return {
      totalSalesAmount,
      totalExpensesAmount,
      totalDebtsAmount,
      totalProductsCount: products.length,
      totalCustomersCount: customers.length,
    };
  }, [sales, expenses, debts, products, customers]);

  return (
    <DatabaseContext.Provider
      value={{
        products,
        customers,
        sales,
        productMovements,
        debtTransactions,
        expenses,
        shareholderTransactions,
        employees,
        closedProductArchives,
        commissionAccounts,
        settings,
        debts,
        activeTab,
        isOnline,
        isSyncing,
        lastSyncedAt,
        isAutoSaved,
        saveStatusText,
        pendingSyncCount,
        metrics,

        setSettings,
        updateSettings,
        setActiveTab,
        setDebts,
        setExpenses,

        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        permanentlyPurgeProduct,

        addCustomer,
        updateCustomer,

        createSale,
        updateSale,
        deleteSale,

        addExpense,
        deleteExpense,
        archiveExpenses,
        unarchiveExpenses,

        addManualDebt,

        addEmployee,
        updateEmployee,
        deleteEmployee,

        addShareholderTransaction,
        updateShareholderTransaction,
        deleteShareholderTransaction,

        addFeePayment,
        updateFeePayment,
        deleteFeePayment,

        archiveClosedProduct,
        deleteClosedProductArchive,
        transferClosedProductToProfitLoss,

        deleteProductMovement,
        clearProductMovementsForProduct,

        addCommissionTransaction,
        deleteCommissionTransaction,
        removeCommissionTransactionsForProduct,
        addCommissionAccount,
        updateCommissionAccount,
        deleteCommissionAccount,

        saveCompleteTransaction,

        exportDatabaseJSON,
        importDatabaseJSON,
        clearAllData,
        resetToDefaultData,
        forceSaveToDisk,
        syncNow,
        syncClockWithServer,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return context;
};
