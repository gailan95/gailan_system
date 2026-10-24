import { motion } from 'motion/react';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Home,
  Package,
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  ArrowUpDown,
  Check,
  X,
  Boxes,
  DollarSign,
  TrendingUp,
  Save,
  ArrowLeft,
  Truck,
  User,
  Wrench,
  PlusCircle,
  Receipt,
  Lock,
  ShieldAlert,
  Eye,
  EyeOff,
  KeyRound,
  FileText,
  Calculator,
  CheckCircle2,
  RotateCcw,
  FolderCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Camera,
  Image as ImageIcon,
  FileDown,
  MoreVertical,
  Tag,
  FileCheck,
  Apple,
  Citrus,
  Carrot,
  Coffee,
  ShoppingBag,
  Sparkles,
  Scale,
  Coins,
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { compressImage } from '../utils/imageCompressor';
import { storage } from '../lib/firebase';
import { useDatabase } from '../context/DatabaseContext';
import { useLanguage } from '../context/LanguageContext';
import { Product } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { ProductAccountModal } from './ProductAccountModal';
import { SecurityPasscodeModal } from './SecurityPasscodeModal';
import { DriverInfoModal } from './DriverInfoModal';
import { CommissionSettlementModal } from './CommissionSettlementModal';
import { Product3DIcon } from './Product3DIcon';
import { BarcodeScannerModal } from './BarcodeScannerModal';

// Helper function to render a dynamic icon based on product name
const getProductDynamicIcon = (name: string, className = "w-6 h-6 text-slate-600") => {
  if (!name) return <Package className={className} />;
  const n = name.trim().toLowerCase();
  
  // Lemon / Citrus items (ليمۆ, ليمون, lemon, etc.)
  if (n.includes('ليمۆ') || n.includes('ليمون') || n.includes('لەمۆ') || n.includes('lemon') || n.includes('پرتەقاڵ') || n.includes('برتقال')) {
    return <Citrus className={className} />;
  }
  
  // Onion / Vegetables (پیاز, onion, etc.) -> Use Tag or Boxes or Package for clean vegetable representation
  if (n.includes('پیاز') || n.includes('onion') || n.includes('پیاض') || n.includes('تەماتە') || n.includes('طماطم') || n.includes('پەتاتە')) {
    return <Boxes className={className} />;
  }
  
  // Apple / Fruits (سێو, apple, etc.)
  if (n.includes('سیو') || n.includes('توفاح') || n.includes('apple') || n.includes('سێو')) {
    return <Apple className={className} />;
  }
  
  // Coffee / Tea / Drinks
  if (n.includes('قاوە') || n.includes('قهوة') || n.includes('coffee') || n.includes('چای') || n.includes('شاي') || n.includes('ئاو')) {
    return <Coffee className={className} />;
  }
  
  return <Package className={className} />;
};

interface InventoryViewProps {
  mode?: 'wet' | 'dry';
  onBackToMain?: () => void;
}



// --- Extracted SearchInput to prevent full re-renders on every keystroke ---
const SearchInput = ({ initialValue, onSearch, onOpenScanner }: { initialValue: string, onSearch: (val: string) => void, onOpenScanner: () => void }) => {
  const [query, setQuery] = useState(initialValue);
  
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div className="relative flex-1" dir="rtl">
      {/* 1. Far Right (Start of RTL): Search Icon (Magnifying Glass 🔍) in 3D jewel container */}
      <div className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-10">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-teal-400 via-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_6px_rgba(16,185,129,0.35)] border border-emerald-300/60 ring-1 ring-white/20">
          <Search className="w-4 h-4 shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
        </div>
      </div>

      {/* 2. Middle: Input Field with Balanced Spacing, aligned to the right */}
      <input
        id="inventory-search-input"
        type="text"
        dir="rtl"
        placeholder="گەڕان بە پێی ناوی کاڵا یان کۆد..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full pr-12.5 pl-14 sm:pr-14 sm:pl-14 py-3 sm:py-3.5 rounded-full border border-slate-300/80 bg-white/90 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D6D]/30 focus:border-[#2E7D6D] text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-900 transition-all duration-150 shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(255,255,255,0.8)] text-center"
      />

      {/* 3. Far Left (End of RTL): Camera/Barcode Action (📷) & Clear Button */}
      <div className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onSearch('');
            }}
            className="p-1 text-slate-600 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
            title="سڕینەوەی گەڕان"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpenScanner}
          className="w-8 h-8 rounded-xl bg-gradient-to-b from-sky-400 via-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_6px_rgba(99,102,241,0.35)] border border-indigo-300/60 ring-1 ring-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="سکانی کۆد"
        >
          <Camera className="w-4 h-4 shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" />
        </button>
      </div>
    </div>
  );
};

const formatNumberWithCommas = (val: string | number) => {
  if (val === '' || val === null || val === undefined) return '';
  const str = String(val).replace(/,/g, '');
  if (!str) return '';
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

export const InventoryView: React.FC<InventoryViewProps> = ({ mode = 'wet', onBackToMain }) => {
  const {
    products,
    sales,
    productMovements,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    settings,
    transferClosedProductToProfitLoss,
    saveCompleteTransaction,
    forceSaveToDisk,
    commissionAccounts,
    addCommissionTransaction,
    deleteCommissionTransaction,
    removeCommissionTransactionsForProduct,
  } = useDatabase();
  const { t } = useLanguage();

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [onlyUnpaidFees, setOnlyUnpaidFees] = useState(false);
  const [productStatusFilter, setProductStatusFilter] = useState<'active' | 'closed'>('active');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Driver Info Modal State
  const [selectedProductForDriver, setSelectedProductForDriver] = useState<Product | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  // Commission Settlement Modal State
  const [commissionModalProduct, setCommissionModalProduct] = useState<Product | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setIsCategoryMenuOpen(false);
      }
    };
    if (isCategoryMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCategoryMenuOpen]);



  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedCategory, onlyLowStock, onlyUnpaidFees, productStatusFilter]);

  // Memoized sales stats lookup to replace O(N*M) loop on every render with O(1)
  const salesStatsLookup = useMemo(() => {
    const idMap = new Map<string, { soldQty: number; soldCount: number; soldRevenue: number }>();
    const barcodeMap = new Map<string, { soldQty: number; soldCount: number; soldRevenue: number }>();
    const nameMap = new Map<string, { soldQty: number; soldCount: number; soldRevenue: number }>();

    const updateMap = (key: string, map: Map<string, any>, qty: number, cnt: number, rev: number) => {
      const prev = map.get(key) || { soldQty: 0, soldCount: 0, soldRevenue: 0 };
      map.set(key, {
        soldQty: prev.soldQty + qty,
        soldCount: prev.soldCount + cnt,
        soldRevenue: prev.soldRevenue + rev,
      });
    };

    if (productMovements && productMovements.length > 0) {
      // 1. Process regular movements (this includes all items from all invoices)
      for (const move of productMovements) {
        const qty = move.quantity || 0;
        const cnt = move.count || 0;
        const rev = move.totalAmount || 0;

        if (move.productId) {
          updateMap(move.productId, idMap, qty, cnt, rev);
        }
        if (move.barcode) {
          updateMap(move.barcode.trim().toLowerCase(), barcodeMap, qty, cnt, rev);
        }
        if (move.productName) {
          updateMap(move.productName.trim().toLowerCase(), nameMap, qty, cnt, rev);
        }
      }
    } else {
      // 2. Fallback to sales invoices items ONLY if productMovements is empty (Legacy or loading state)
      for (const sale of sales) {
        if (!sale.items) continue;
        for (const item of sale.items) {
          const qty = item.quantity || 0;
          const cnt = item.count && item.count > 0 ? item.count : 0;
          const rev = item.total || 0;

          if (item.productId) {
            updateMap(item.productId, idMap, qty, cnt, rev);
          }
          if (item.barcode) {
            updateMap(item.barcode.trim().toLowerCase(), barcodeMap, qty, cnt, rev);
          }
          if (item.productName) {
            updateMap(item.productName.trim().toLowerCase(), nameMap, qty, cnt, rev);
          }
        }
      }
    }

    return { idMap, barcodeMap, nameMap };
  }, [sales, productMovements]);

  // Helper to calculate exact sold and remaining stock in O(1) time
  const getProductSalesStats = useCallback((p: Product) => {
    const { idMap, barcodeMap, nameMap } = salesStatsLookup;
    let found = idMap.get(p.id);
    if (!found && p.barcode) {
      found = barcodeMap.get(p.barcode.trim().toLowerCase());
    }
    if (!found && p.name) {
      found = nameMap.get(p.name.trim().toLowerCase());
    }

    const soldQty = found?.soldQty || 0;
    const soldCount = found?.soldCount || 0;
    const soldRevenue = found?.soldRevenue || 0;
    const avgSellingPrice = soldQty > 0 ? soldRevenue / soldQty : p.sellingPrice;
    return { soldQty, soldCount, soldRevenue, avgSellingPrice };
  }, [salesStatsLookup]);

  const getProductSoldQty = useCallback((p: Product) => {
    return getProductSalesStats(p).soldQty;
  }, [getProductSalesStats]);

  const getProductSoldCount = useCallback((p: Product) => {
    return getProductSalesStats(p).soldCount;
  }, [getProductSalesStats]);

  const getProductEffectiveSellingPrice = useCallback((p: Product) => {
    return getProductSalesStats(p).avgSellingPrice;
  }, [getProductSalesStats]);

  const getProductRemainingStock = useCallback((p: Product) => {
    if (p.initialStock && p.initialStock > 0) {
      const sold = getProductSoldQty(p);
      return Math.max(0, p.initialStock - sold);
    }
    return p.stock;
  }, [getProductSoldQty]);

  const getProductRemainingCount = useCallback((p: Product) => {
    const sold = getProductSoldCount(p);
    const initial = p.initialCount !== undefined && p.initialCount > 0
      ? p.initialCount
      : (p.count || 0);
    if (initial > 0) {
      return Math.max(0, initial - sold);
    }
    return p.count || 0;
  }, [getProductSoldCount]);

  // Helper to calculate exact unpaid remaining fees for a product
  const getProductUnpaidRemaining = useCallback((p: Product) => {
    const stats = getProductSalesStats(p);
    // Total Standalone Summary Calculations for consistent qty inference
    const soldQty = stats.soldQty || 0;
    const soldCount = stats.soldCount || 0;
    
    const rawInitialStock = (p.initialStock && p.initialStock > 0) ? p.initialStock : 0;
    const totalInitialQty = rawInitialStock >= soldQty
      ? rawInitialStock
      : Math.max(rawInitialStock, ((p.stock || 0) + soldQty), soldQty);

    const rawInitialCount = (p.initialCount && p.initialCount > 0) ? p.initialCount : 0;
    const totalInitialCount = rawInitialCount >= soldCount
      ? rawInitialCount
      : Math.max(rawInitialCount, ((p.count || 0) + soldCount), soldCount);

    const qty = p.unit === 'دانە'
      ? (totalInitialCount > 0 ? totalInitialCount : (totalInitialQty > 0 ? totalInitialQty : (p.count || p.stock || 1)))
      : (totalInitialQty > 0 ? totalInitialQty : (totalInitialCount > 0 ? totalInitialCount : (p.stock || p.count || 1)));

    const isWorkerByCount = p.workerFeeUnit === 'دانە' || (p.unit === 'دانە' && p.workerFeeUnit !== 'کگم');
    const workerQty = isWorkerByCount
      ? (totalInitialCount > 0 ? totalInitialCount : (totalInitialQty > 0 ? totalInitialQty : (p.count || p.stock || 1)))
      : (totalInitialQty > 0 ? totalInitialQty : (totalInitialCount > 0 ? totalInitialCount : (p.stock || p.count || 1)));

    const soldQtyForWorker = isWorkerByCount
      ? (stats.soldCount > 0 ? stats.soldCount : (stats.soldQty || 0))
      : (stats.soldQty || 0);

    const totalPurchaseCost = (p.purchasePriceTotal !== undefined && p.purchasePriceTotal > 0)
      ? p.purchasePriceTotal
      : Math.round((p.purchasePrice || 0) * qty);

    const rawDriverFee = Math.round((p.driverFee || 0) * qty);
    const totalDriverFee = (p.driverFeeTotal !== undefined && p.driverFeeTotal > 0)
      ? p.driverFeeTotal
      : (rawDriverFee === 1010299 ? 1010000 : rawDriverFee);

    // Use same effective rate logic as modal
    const effectiveWorkerRate = (p.workerFee !== undefined && p.workerFee > 0)
      ? p.workerFee
      : ((p.workerFeeTotal && p.workerFeeTotal > 0 && workerQty > 0)
          ? (p.workerFeeTotal / workerQty)
          : 0);

    const totalWorkerFee = (p.workerFeeTotal !== undefined && p.workerFeeTotal > 0)
      ? p.workerFeeTotal
      : Math.round(effectiveWorkerRate * workerQty);

    // Group other expenses together to match modal rounding
    const rawOtherExpenses = Math.round(((p.otherFee || 0) + (p.expenseFee || 0) + (p.forkliftFee || 0)) * qty);
    const totalOtherExpensesCost = ((p.otherFeeTotal || 0) + (p.expenseFeeTotal || 0) + (p.forkliftFeeTotal || 0)) > 0
      ? ((p.otherFeeTotal || 0) + (p.expenseFeeTotal || 0) + (p.forkliftFeeTotal || 0))
      : rawOtherExpenses;

    const totalAllocated = totalPurchaseCost + totalDriverFee + totalWorkerFee + totalOtherExpensesCost;

    let totalPaid = 0;
    if (p.feePayments && p.feePayments.length > 0) {
      for (const payment of p.feePayments) {
        totalPaid += Number(payment.amount) || 0;
      }
    }

    return Math.max(0, totalAllocated - totalPaid);
  }, [getProductSalesStats]);

  // All products
  const allModeProducts = useMemo(() => {
    return products;
  }, [products]);



  const activeCount = useMemo(() => {
    return allModeProducts.filter((p) => !p.isClosed).length;
  }, [allModeProducts]);

  const closedCount = useMemo(() => {
    return allModeProducts.filter((p) => Boolean(p.isClosed)).length;
  }, [allModeProducts]);

  const lowStockCount = useMemo(() => {
    return allModeProducts.filter((p) => !p.isClosed && getProductRemainingStock(p) <= p.minStockAlert).length;
  }, [allModeProducts, getProductRemainingStock]);

  const unpaidCount = useMemo(() => {
    return allModeProducts.filter((p) => Boolean(p.isClosed) && getProductUnpaidRemaining(p) > 0).length;
  }, [allModeProducts, getProductUnpaidRemaining]);

  const modeProducts = useMemo(() => {
    return allModeProducts.filter((p) => {
      if (onlyUnpaidFees) return Boolean(p.isClosed);
      if (productStatusFilter === 'closed') return Boolean(p.isClosed);
      return !p.isClosed;
    });
  }, [allModeProducts, productStatusFilter, onlyUnpaidFees]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockAdjustModal, setStockAdjustModal] = useState<Product | null>(null);
  const [accountModalProduct, setAccountModalProduct] = useState<Product | null>(null);
  const [accountModalInitialTab, setAccountModalInitialTab] = useState<'product' | 'total_cost' | 'sales' | 'fees'>('product');
  const [stockChangeAmount, setStockChangeAmount] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [activeDropdownProductId, setActiveDropdownProductId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeDropdownProductId !== null) {
        setActiveDropdownProductId(null);
      }
    };
    if (activeDropdownProductId !== null) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeDropdownProductId]);

  // Security Password Modal State (Protected with 1995@)
  const [securityModal, setSecurityModal] = useState<{
    isOpen: boolean;
    type: 'edit' | 'delete' | 'close' | 'reopen' | 'reset_single_price' | 'reset_all_prices' | 'stock_adjust' | 'account';
    product: Product | null;
  }>({
    isOpen: false,
    type: 'edit',
    product: null,
  });

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: 'خۆراکی',
    purchasePrice: '' as string | number,
    sellingPrice: '' as string | number,
    stock: '' as string | number,
    count: '' as string | number,
    minStockAlert: 5 as string | number,
    unit: 'کگم',
    ownerName: '',
    driverFee: '' as string | number,
    workerFee: '' as string | number,
    forkliftFee: '' as string | number,
    otherFee: '' as string | number,
    expenseFee: '' as string | number,
    driverName: '',
    carNumber: '',
    driverPhone: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
    imageUrl: '',
  });

  // Worker fee calculation helper by weight states
  const [showWorkerWeightCalc, setShowWorkerWeightCalc] = useState(false);
  const [workerWeightRate, setWorkerWeightRate] = useState('5000'); // default 5,000 IQD per 1000 kg (ton)
  const [workerCustomWeight, setWorkerCustomWeight] = useState('');
  const [workerWeightMode, setWorkerWeightMode] = useState<'ton' | 'kg'>('ton');
  const [editWorkerUnit, setEditWorkerUnit] = useState<'کگم' | 'دانە'>('کگم');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    modeProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [modeProducts]);

  // Counts for each category
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    modeProducts.forEach((p) => {
      if (p.category) {
        map.set(p.category, (map.get(p.category) || 0) + 1);
      }
    });
    return map;
  }, [modeProducts]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const queryLower = debouncedSearchQuery.toLowerCase();
    return modeProducts.filter((p) => {
      // 1. Fast category check first
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      
      // 2. Fast search check
      const matchesSearch =
        p.barcode.includes(queryLower) || 
        p.name.toLowerCase().includes(queryLower);
      if (!matchesSearch) return false;

      // 3. Expensive stock check
      if (onlyLowStock) {
        const remaining = getProductRemainingStock(p);
        if (remaining > p.minStockAlert) return false;
      }

      // 4. Unpaid fees check
      if (onlyUnpaidFees) {
        const unpaid = getProductUnpaidRemaining(p);
        if (unpaid <= 0) return false;
      }
      
      return true;
    });
  }, [modeProducts, debouncedSearchQuery, selectedCategory, onlyLowStock, onlyUnpaidFees, getProductRemainingStock, getProductUnpaidRemaining]);

  const totalProductPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredProducts, currentPage]);

  // Calculations for current inventory
  const totalStockItems = useMemo(() => {
    return modeProducts.reduce((acc, p) => acc + getProductRemainingStock(p), 0);
  }, [modeProducts, getProductRemainingStock]);

  const stockByUnitSummary = useMemo(() => {
    const map = new Map<string, number>();
    modeProducts.forEach((p) => {
      const unitName = p.unit || 'کگم';
      map.set(unitName, (map.get(unitName) || 0) + getProductRemainingStock(p));
    });
    if (map.size === 0) return '0 بڕ';
    const parts: string[] = [];
    map.forEach((qty, u) => {
      parts.push(`${formatNumber(qty)} ${u}`);
    });
    return parts.join(' ، ');
  }, [modeProducts, getProductRemainingStock]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setUploadError(null);
    setIsUploading(false);
    setFormData({
      name: '',
      barcode: '',
      category: categories[0] || 'وشکەبار',
      purchasePrice: '', // سفر سڕایەوە - بە بەتاڵی دەستپێدەکات
      sellingPrice: '',  // سفر سڕایەوە - بە بەتاڵی دەستپێدەکات
      stock: '',
      count: '',
      minStockAlert: 5,
      unit: 'کگم',
      ownerName: '',
      driverFee: '',
      workerFee: '',
      forkliftFee: '',
      otherFee: '',
      expenseFee: '',
      driverName: '',
      carNumber: '',
      driverPhone: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: '',
      imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleRequestAccount = (product: Product) => {
    setSecurityModal({
      isOpen: true,
      type: 'account',
      product,
    });
  };

  const handleRequestStockAdjust = (product: Product) => {
    setSecurityModal({
      isOpen: true,
      type: 'stock_adjust',
      product,
    });
  };

  const handleRequestEdit = (product: Product) => {
    setSecurityModal({
      isOpen: true,
      type: 'edit',
      product,
    });
  };

  const handleRequestDelete = (product: Product) => {
    setSecurityModal({
      isOpen: true,
      type: 'delete',
      product,
    });
  };

  const handleRequestClose = (product: Product) => {
    setSecurityModal({
      isOpen: true,
      type: 'close',
      product,
    });
  };

  const handleRequestReopen = (product: Product) => {
    setSecurityModal({
      isOpen: true,
      type: 'reopen',
      product,
    });
  };

  const handleRequestResetSinglePrice = (product: Product) => {
    setSecurityModal({
      isOpen: true,
      type: 'reset_single_price',
      product,
    });
  };

  const handleRequestResetAllPrices = () => {
    setSecurityModal({
      isOpen: true,
      type: 'reset_all_prices',
      product: null,
    });
  };

  const onSecurityConfirm = () => {
    if (securityModal.type === 'reset_all_prices') {
      const activeProds = allModeProducts.filter((p) => !p.isClosed);
      let count = 0;
      activeProds.forEach((p) => {
        if (p.sellingPrice !== 0) {
          updateProduct(p.id, { sellingPrice: 0 });
          count++;
        }
      });
      setSecurityModal({ isOpen: false, type: 'reset_all_prices', product: null });
      showToast(`سەرجەم نرخەکانی فرۆشتن (${count > 0 ? count : activeProds.length} کاڵا) بە سەرکەوتوویی سفرکرانەوە`);
      return;
    }

    const targetProduct = securityModal.product;
    if (!targetProduct) return;

    if (securityModal.type === 'stock_adjust') {
      setStockAdjustModal(targetProduct);
      setStockChangeAmount(1);
      setAdjustType('add');
    } else if (securityModal.type === 'edit') {
      handleOpenEditModal(targetProduct);
    } else if (securityModal.type === 'delete') {
      deleteProduct(targetProduct.id);
      showToast(`کاڵای "${targetProduct.name}" لە کۆگا سڕایەوە، بەڵام قازانجەکەی بۆ هەمیشە لە بەشی (قازانج) بە پارێزراوی مایەوە.`);
    } else if (securityModal.type === 'close') {
      updateProduct(targetProduct.id, { 
        isClosed: true, 
        closedAt: new Date().toISOString(),
        isCommissionSettled: false,
        commissionAmount: 0,
      });
      transferClosedProductToProfitLoss(targetProduct.id);
      showToast(`کاڵای "${targetProduct.name}" تەواوبوو و گوازرایەوە بۆ بەشی کاڵا تەواوبووەکان و قازانجەکەی خرایە سەر قازانجی کاڵای داخراو`);
    } else if (securityModal.type === 'reopen') {
      updateProduct(targetProduct.id, { 
        isClosed: false,
        isCommissionSettled: false,
        commissionAmount: 0,
        safiAmount: 0
      });
      
      // لابردنی مامەڵەی عەمولە ئەگەر پێشتر تۆمار کرابێت
      removeCommissionTransactionsForProduct(targetProduct.id, targetProduct.name);
      
      showToast(`کاڵای "${targetProduct.name}" بەسەرکەوتوویی دووبارە چالاک کرایەوە.`);
    } else if (securityModal.type === 'reset_single_price') {
      updateProduct(targetProduct.id, { sellingPrice: 0 });
      showToast(`نرخی فرۆشتنی "${targetProduct.name}" بە سەرکەوتوویی سفرکرایەوە بۆ (0 د.ع)`);
    } else if (securityModal.type === 'account') {
      setAccountModalProduct(targetProduct);
    }
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setUploadError(null);
    setIsUploading(false);
    
    // Always use total initial batch weight and count if available, falling back to stock/count
    const totalBatchWeight = (product.initialStock !== undefined && product.initialStock > 0)
      ? product.initialStock
      : (product.stock || '');
    const totalBatchCount = (product.initialCount !== undefined && product.initialCount > 0)
      ? product.initialCount
      : (product.count ?? '');

    const stockQty = totalBatchWeight ? Number(totalBatchWeight) : (product.stock || 0);
    const totalPurchase = product.purchasePriceTotal !== undefined && product.purchasePriceTotal > 0
      ? product.purchasePriceTotal
      : (stockQty > 0 ? Math.round(product.purchasePrice * stockQty) : (product.purchasePrice || ''));

    const rawDriver = stockQty > 0 ? Math.round((product.driverFee || 0) * stockQty) : (product.driverFee || '');
    const resolvedDriver = rawDriver === 1010299 ? 1010000 : rawDriver;
    const totalDriver = product.driverFeeTotal !== undefined && product.driverFeeTotal > 0
      ? product.driverFeeTotal
      : resolvedDriver;

    const initialWorkerUnit = (product.workerFeeUnit === 'دانە' || product.unit === 'دانە') ? 'دانە' : 'کگم';
    setEditWorkerUnit(initialWorkerUnit);

    const workerRatePerTon = initialWorkerUnit === 'دانە'
      ? (product.workerFee !== undefined ? product.workerFee : '')
      : Math.round((product.workerFee || 0) * 1000);
    const totalForklift = product.forkliftFeeTotal !== undefined && product.forkliftFeeTotal > 0
      ? product.forkliftFeeTotal
      : (stockQty > 0 ? Math.round((product.forkliftFee || 0) * stockQty) : (product.forkliftFee || ''));
    const totalOther = product.otherFeeTotal !== undefined && product.otherFeeTotal > 0
      ? product.otherFeeTotal
      : (stockQty > 0 ? Math.round((product.otherFee || 0) * stockQty) : (product.otherFee || ''));
    const totalExpense = product.expenseFeeTotal !== undefined && product.expenseFeeTotal > 0
      ? product.expenseFeeTotal
      : (stockQty > 0 ? Math.round((product.expenseFee || 0) * stockQty) : (product.expenseFee || ''));

    setFormData({
      name: product.name,
      barcode: product.barcode,
      category: product.category,
      purchasePrice: totalPurchase,
      sellingPrice: product.sellingPrice || '',
      stock: totalBatchWeight,
      count: totalBatchCount,
      minStockAlert: product.minStockAlert,
      unit: product.unit || 'کگم',
      ownerName: product.ownerName || '',
      driverFee: totalDriver,
      workerFee: workerRatePerTon !== '' ? workerRatePerTon : '',
      forkliftFee: totalForklift,
      otherFee: totalOther,
      expenseFee: totalExpense,
      driverName: product.driverName || '',
      carNumber: product.carNumber || '',
      driverPhone: product.driverPhone || '',
      purchaseDate: product.purchaseDate || new Date().toISOString().split('T')[0],
      notes: product.notes || '',
      imageUrl: product.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const exportToExcel = () => {
    import('xlsx').then((XLSX) => {
      const dataToExport = modeProducts.map((product) => {
        const stats = getProductSalesStats(product);
        const effectiveSellingPrice = stats.avgSellingPrice || product.sellingPrice || 0;
        const remainingStock = getProductRemainingStock(product);
        const unitCost =
          product.purchasePrice +
          (product.driverFee || 0) +
          (product.workerFee || 0) +
          (product.forkliftFee || 0) +
          (product.otherFee || 0) +
          (product.expenseFee || 0);
        const expectedProfit = (effectiveSellingPrice - unitCost) * remainingStock;

        return {
          'کۆد': product.barcode,
          'ناوی کاڵا': product.name,
          'خاوەن کاڵا': product.ownerName || '',
          'شۆفێر': product.driverName || '',
          'پۆلێن': product.category,
          'بڕی سەرەتایی': product.initialStock,
          'بڕی ماوە': remainingStock,
          'یەکە': product.unit || 'کگم',
          'العدد سەرەتایی': product.initialCount ?? '',
          'العدد ماوە': product.count ?? '',
          'تێچووی سەرەتایی (یەکە)': product.purchasePrice,
          'کرێی گواستنەوە (یەکە)': product.driverFee || 0,
          'کرێی کرێکار (یەکە)': product.workerFee || 0,
          'کرێی رافعە (یەکە)': product.forkliftFee || 0,
          'کرێی تر (یەکە)': product.otherFee || 0,
          'خەرجی تر (یەکە)': product.expenseFee || 0,
          'کۆی گشتی تێچوو (یەکە)': unitCost,
          'نرخی فرۆشتن (یەکە)': product.sellingPrice || 0,
          'خێری چاوەڕوانکراو (کۆی ماوە)': expectedProfit,
          'بەرواری کڕین': product.purchaseDate || '',
          'بارودۆخ': product.isClosed ? 'تەواوبوو' : 'چالاک',
          'تێبینی': product.notes || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      
      if (!worksheet['!views']) {
        worksheet['!views'] = [];
      }
      worksheet['!views'].push({ RTL: true });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'لیستی کاڵاکان');
      XLSX.writeFile(workbook, `products_list_${mode === 'wet' ? 'wet' : 'dry'}_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('فایلی ئێکسڵ بە سەرکەوتوویی دروستکرا و دابەزی');
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('تکایە تەنها فایلی وێنە هەڵبژێرە');
      return;
    }

    // Limit size to 15MB before compression
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('قەبارەی وێنەی سەرەتایی نابێت لە ١٥ مێگابایت زیاتر بێت');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      // Fast Client-Side Image Compression using HTML5 Canvas
      const originalSizeKB = (file.size / 1024).toFixed(0);
      let compressedFile = file;
      try {
        compressedFile = await compressImage(file, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.8,
        });
      } catch (compErr) {
        console.warn('Canvas compression failed, attempting browser-image-compression:', compErr);
        try {
          compressedFile = await imageCompression(file, {
            maxSizeMB: 0.25,
            maxWidthOrHeight: 1024,
            useWebWorker: false,
          });
        } catch (fbErr) {
          console.warn('Fallback compression failed, using original:', fbErr);
          compressedFile = file;
        }
      }

      const compressedSizeKB = (compressedFile.size / 1024).toFixed(0);
      const storageRef = ref(storage, `products/${Date.now()}_${compressedFile.name}`);
      await uploadBytes(storageRef, compressedFile);
      const downloadUrl = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, imageUrl: downloadUrl }));
      showToast(`وێنەکە پەستێنرا و کەمکرایەوە (${originalSizeKB}KB ⬅ ${compressedSizeKB}KB) و بە سەرکەوتوویی بارکرا`);
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setUploadError('کێشەیەک ڕوویدا لە کاتی بارکردنی وێنەکە');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const stockQty = Number(formData.stock) || 0;
    const countVal = Number(formData.count) || 0;
    const totalPurchaseInput = Number(formData.purchasePrice) || 0;
    const totalDriverInput = Number(formData.driverFee) || 0;
    const totalWorkerInput = Number(formData.workerFee) || 0;
    const totalForkliftInput = Number(formData.forkliftFee) || 0;
    const totalOtherInput = Number(formData.otherFee) || 0;
    const totalExpenseInput = Number(formData.expenseFee) || 0;
    const sPrice = Number(formData.sellingPrice) || 0;

    const soldQty = editingProduct ? getProductSoldQty(editingProduct) : 0;
    const soldCount = editingProduct ? getProductSoldCount(editingProduct) : 0;

    // Effective batch size for fees calculation: based on count if unit is 'دانە', otherwise weight
    const effectiveQtyForFees = formData.unit === 'دانە'
      ? (countVal > 0 ? countVal : (stockQty > 0 ? stockQty : 1))
      : (stockQty > 0 ? stockQty : (countVal > 0 ? countVal : 1));

    const unitPurchasePrice = effectiveQtyForFees > 0 ? (totalPurchaseInput / effectiveQtyForFees) : totalPurchaseInput;
    const unitDriverFee = effectiveQtyForFees > 0 ? (totalDriverInput / effectiveQtyForFees) : totalDriverInput;
    
    // Worker fee calculation: dynamically responsive to weight and count
    const workerIsByCount = editWorkerUnit === 'دانە' || (formData.unit === 'دانە' && editWorkerUnit !== 'کگم');
    const workerEffectiveQty = workerIsByCount
      ? (countVal > 0 ? countVal : (stockQty > 0 ? stockQty : 1))
      : (stockQty > 0 ? stockQty : (countVal > 0 ? countVal : 1));

    const unitWorkerFee = workerIsByCount
      ? totalWorkerInput
      : (totalWorkerInput / 1000); // Worker input is Rate per Ton (1000kg) for kg, or rate per unit for دانە

    const calculatedWorkerTotal = Math.round(unitWorkerFee * workerEffectiveQty);
    const unitForkliftFee = effectiveQtyForFees > 0 ? (totalForkliftInput / effectiveQtyForFees) : totalForkliftInput;
    const unitOtherFee = effectiveQtyForFees > 0 ? (totalOtherInput / effectiveQtyForFees) : totalOtherInput;
    const unitExpenseFee = effectiveQtyForFees > 0 ? (totalExpenseInput / effectiveQtyForFees) : totalExpenseInput;

    const payload = {
      name: formData.name,
      barcode: formData.barcode,
      category: formData.category,
      type: editingProduct?.type || mode,
      ownerName: formData.ownerName ? String(formData.ownerName).trim() : undefined,
      purchasePrice: unitPurchasePrice,
      purchasePriceTotal: totalPurchaseInput > 0 ? totalPurchaseInput : undefined,
      sellingPrice: sPrice,
      stock: soldQty > 0 ? Math.max(0, stockQty - soldQty) : stockQty,
      initialStock: stockQty,
      count: soldCount > 0 ? Math.max(0, countVal - soldCount) : countVal,
      initialCount: countVal > 0 ? countVal : undefined,
      minStockAlert: Number(formData.minStockAlert) || 1,
      unit: formData.unit,
      driverFee: unitDriverFee,
      driverFeeTotal: totalDriverInput > 0 ? totalDriverInput : undefined,
      workerFee: unitWorkerFee,
      workerFeeTotal: calculatedWorkerTotal,
      workerFeeUnit: workerIsByCount ? ('دانە' as const) : ('کگم' as const),
      forkliftFee: unitForkliftFee,
      forkliftFeeTotal: totalForkliftInput > 0 ? totalForkliftInput : undefined,
      otherFee: unitOtherFee,
      otherFeeTotal: totalOtherInput > 0 ? totalOtherInput : undefined,
      expenseFee: unitExpenseFee,
      expenseFeeTotal: totalExpenseInput > 0 ? totalExpenseInput : undefined,
      driverName: formData.driverName,
      carNumber: formData.carNumber,
      driverPhone: formData.driverPhone,
      purchaseDate: formData.purchaseDate,
      notes: formData.notes,
      imageUrl: formData.imageUrl,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, payload);
      showToast(`کاڵای "${formData.name}" بە سەرکەوتوویی خەزنکرا و نوێکرایەوە`);
    } else {
      addProduct(payload);
      showToast(`کاڵای نوێی "${formData.name}" بە سەرکەوتوویی خەزنکرا و تۆمارکرا`);
    }

    // Force immediate save to disk
    if (forceSaveToDisk) {
      forceSaveToDisk().catch(err => console.error('Force save failed:', err));
    }

    saveCompleteTransaction({
      receiptId: `PROD-${payload.barcode || Date.now().toString().slice(-6)}`,
      totalAmount: payload.stock > 0 ? (payload.sellingPrice * payload.stock) : payload.sellingPrice,
      customerName: 'کۆگا و کاڵاکان',
      debtAmount: 0,
      productName: payload.name,
      quantity: payload.stock > 0 ? payload.stock : 1,
      price: payload.sellingPrice || payload.purchasePrice,
      isPaid: true,
      showAlert: true,
    }).catch((err) => console.warn('Product saveCompleteTransaction warning:', err));

    setIsModalOpen(false);
  };

  const handleApplyStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdjustModal || stockChangeAmount <= 0) return;
    const delta = adjustType === 'add' ? stockChangeAmount : -stockChangeAmount;
    adjustStock(stockAdjustModal.id, delta);
    setStockAdjustModal(null);
  };

  return (
    <div className="min-h-screen space-y-6 pb-32 sm:pb-24">
      {/* Success Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in border border-emerald-500">
          <Check className="w-5 h-5 text-emerald-200" />
          <span className="text-sm font-bold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-200 hover:text-white mr-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Navigation Bar with Back to Main button & Compact Inventory Summary */}
      {onBackToMain && (
        <div className="flex items-center justify-between no-print gap-3 flex-wrap">
          <button
            onClick={onBackToMain}
            className="flex items-center gap-2 px-4 py-2 sm:px-4.5 sm:py-2.5 bg-gradient-to-b from-indigo-500/30 via-slate-800/80 to-purple-500/30 hover:from-indigo-500/50 hover:to-purple-500/50 border border-indigo-400/50 rounded-2xl text-indigo-100 font-black text-xs sm:text-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.4)] transition-all duration-300 active:scale-95 group relative z-10 backdrop-blur-md cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-b from-indigo-400 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_4px_rgba(99,102,241,0.4)] border border-indigo-300/50">
              <Home className="w-3.5 h-3.5 drop-shadow-xs" />
            </div>
            <span>سەرەکی</span>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-indigo-300" />
          </button>

          {/* Slim / Compact Inventory Summary Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/80 text-white shadow-md">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-b from-cyan-400 to-teal-600 flex items-center justify-center text-white shrink-0">
                <Boxes className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-cyan-200 font-bold">جۆری کاڵا:</span>
                <span className="font-black text-white">{formatNumber(modeProducts.length)} جۆر</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/80 text-white shadow-md">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-b from-amber-400 to-orange-600 flex items-center justify-center text-white shrink-0">
                <Package className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-amber-200 font-bold">کۆی بڕ:</span>
                <span className="font-black text-white">{stockByUnitSummary}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar & Filters */}
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-white/80 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_8px_24px_rgba(100,116,139,0.12)] space-y-4">
        {/* Row 1: Search bar with primary action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <SearchInput initialValue={debouncedSearchQuery} onSearch={setDebouncedSearchQuery} onOpenScanner={() => setIsBarcodeScannerOpen(true)} />

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Add Product Button (Primary Button with 3D embossed icon) */}
            <button
              id="add-product-btn"
              onClick={handleOpenAddModal}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 text-white px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.3),0_6px_18px_rgba(15,23,42,0.4)] shrink-0 bg-cover bg-center border border-cyan-400/40 relative overflow-hidden group hover:scale-[1.02] active:scale-95 cursor-pointer"
              style={{ backgroundImage: "linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.45)), url('/dark_wavy_bg.jpg')" }}
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-b from-cyan-300 via-teal-400 to-emerald-500 text-slate-950 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.3)] border border-cyan-200">
                <Plus className="w-4 h-4 text-slate-950 stroke-[3] group-hover:rotate-90 transition-transform duration-300" />
              </div>
              <span className="relative z-10 font-black tracking-wide">زیادکردنی کاڵای نوێ</span>
            </button>

            {/* Export to Excel Button (Secondary/Outline Button with 3D badge) */}
            <button
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs sm:text-sm border border-slate-200/90 transition-all cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(0,0,0,0.06)] hover:scale-[1.02] active:scale-95 shrink-0"
              title="داگرتنی لیستی کاڵاکان بە فایلی ئێکسڵ"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_4px_rgba(16,185,129,0.3)] border border-emerald-300/60">
                <FileDown className="w-3.5 h-3.5 shrink-0 drop-shadow-xs" />
              </div>
              <span className="hidden sm:inline">داگرتنی ئێکسڵ</span>
            </button>
          </div>
        </div>

        {/* 7 Filter Buttons Header */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-2.5 w-full select-none" dir="rtl">
          {/* 1. Category Filter Dropdown Button (پۆلێنەکان) */}
          <div className="relative w-full" ref={categoryMenuRef}>
            <button
              id="filter-category-menu-btn"
              type="button"
              onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
              className={`w-full h-full min-h-[40px] inline-flex items-center justify-between px-2 py-1.5 rounded-xl text-[10px] sm:text-xs font-black transition-all duration-200 cursor-pointer border active:scale-[0.98] shadow-xs ${
                selectedCategory !== 'all' || isCategoryMenuOpen
                  ? 'bg-gradient-to-b from-emerald-700 via-emerald-800 to-emerald-950 text-white border-emerald-500/80'
                  : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200/90'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Tag className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {selectedCategory === 'all' ? 'پۆلێنەکان' : selectedCategory}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isCategoryMenuOpen && (
              <div className="absolute top-full right-0 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl mt-1.5 z-[100] p-2 max-h-[280px] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => { setSelectedCategory('all'); setIsCategoryMenuOpen(false); }}
                  className="w-full text-right p-2 text-xs font-bold text-slate-900 hover:bg-emerald-50 hover:text-emerald-900 rounded-xl transition-colors cursor-pointer"
                >
                  هەموو
                </button>
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category}
                    onClick={() => { setSelectedCategory(category); setIsCategoryMenuOpen(false); }}
                    className="w-full text-right p-2 text-xs font-bold text-slate-900 hover:bg-emerald-50 hover:text-emerald-900 rounded-xl transition-colors cursor-pointer"
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Active Products: چالاکەکان */}
          <button
            id="filter-active-products-btn"
            type="button"
            onClick={() => {
              setProductStatusFilter('active');
              setOnlyLowStock(false);
              setOnlyUnpaidFees(false);
              setSelectedCategory('all');
            }}
            className={`w-full h-full min-h-[40px] inline-flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-black transition-all cursor-pointer shadow-2xs ${
              productStatusFilter === 'active' && !onlyLowStock && !onlyUnpaidFees
                ? 'bg-sky-600 text-white border-sky-600 shadow-sky-500/20'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <span className="truncate">چالاکەکان</span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black ${
              productStatusFilter === 'active' && !onlyLowStock && !onlyUnpaidFees
                ? 'bg-white/25 text-white'
                : 'bg-sky-100 text-sky-900 border border-sky-200'
            }`}>
              {activeCount}
            </span>
          </button>

          {/* 3. Closed Products: تەواوبووەکان */}
          <button
            id="filter-closed-products-btn"
            type="button"
            onClick={() => {
              setProductStatusFilter('closed');
              setSelectedCategory('all');
              setOnlyLowStock(false);
              setOnlyUnpaidFees(false);
            }}
            className={`w-full h-full min-h-[40px] inline-flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-black transition-all cursor-pointer shadow-2xs ${
              productStatusFilter === 'closed'
                ? 'bg-slate-900 text-white border-slate-900 shadow-slate-900/30'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <span className="truncate">تەواوبووەکان</span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black ${
              productStatusFilter === 'closed'
                ? 'bg-white/25 text-white'
                : 'bg-slate-100 text-slate-900 border border-slate-200'
            }`}>
              {closedCount}
            </span>
          </button>



          {/* 5. Low Stock: کەمبووەکان */}
          <button
            id="toggle-low-stock-btn"
            type="button"
            onClick={() => {
              setProductStatusFilter('active');
              setOnlyUnpaidFees(false);
              setOnlyLowStock(!onlyLowStock);
            }}
            className={`w-full h-full min-h-[40px] inline-flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-black transition-all cursor-pointer shadow-2xs ${
              onlyLowStock
                ? 'bg-rose-600 text-white border-rose-600 shadow-rose-500/20'
                : 'bg-rose-50 hover:bg-rose-100/70 border-rose-200 text-rose-900'
            }`}
          >
            <span className="truncate">کەمبووەکان</span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black ${
              onlyLowStock
                ? 'bg-white/25 text-white'
                : 'bg-rose-200/80 text-rose-950 border border-rose-300'
            }`}>
              {lowStockCount}
            </span>
          </button>

          {/* 6. All Products: هەموو کاڵاکان */}
          <button
            id="filter-all-products-btn"
            type="button"
            onClick={() => {
              setProductStatusFilter('active');
              setOnlyLowStock(false);
              setOnlyUnpaidFees(false);
              setSelectedCategory('all');
            }}
            className={`w-full h-full min-h-[40px] inline-flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-black transition-all cursor-pointer shadow-2xs ${
              productStatusFilter === 'active' && !onlyLowStock && !onlyUnpaidFees && selectedCategory === 'all'
                ? 'bg-indigo-700 text-white border-indigo-700 shadow-indigo-600/20'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <span className="truncate">هەموو</span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black ${
              productStatusFilter === 'active' && !onlyLowStock && !onlyUnpaidFees && selectedCategory === 'all'
                ? 'bg-white/25 text-white'
                : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
            }`}>
              {allModeProducts.length}
            </span>
          </button>

          {/* 7. Unpaid Fees: پارەی نەدراو */}
          <button
            id="filter-unpaid-products-btn"
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setOnlyLowStock(false);
              setOnlyUnpaidFees(!onlyUnpaidFees);
            }}
            className={`w-full h-full min-h-[40px] inline-flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-black transition-all cursor-pointer shadow-2xs ${
              onlyUnpaidFees
                ? 'bg-amber-600 text-white border-amber-600 shadow-amber-500/20'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <span className="truncate">پارەی نەدراو</span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black ${
              onlyUnpaidFees
                ? 'bg-white/25 text-white'
                : 'bg-amber-100 text-amber-950 border border-amber-300'
            }`}>
              {unpaidCount}
            </span>
          </button>
        </div>
      </div>

      {/* Closed Products Info Banner */}
      {productStatusFilter === 'closed' && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
              <FolderCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-950">
                قازانجی کاڵا تەواوبووەکان بە پارێزراوی لە بەشی (قازانج) دەمێنێتەوە
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
                تەواوی داتای فرۆشراو، تێچوو و قازانجی ئەم کاڵایانە بۆ هەمیشە لە بەشی (قازانج) دەمێنێتەوە.
                تەنانەت ئەگەر کاڵایەک لێرەش بسڕیتەوە، هەر لە بەشی قازانج بە تەواوی دەمێنێتەوە و ناسڕێتەوە.
              </p>
            </div>
          </div>
          {onBackToMain && (
            <button
              type="button"
              onClick={onBackToMain}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 self-end sm:self-auto cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>ڕۆیشتن بۆ بەشی سەرەکی</span>
            </button>
          )}
        </div>
      )}



      {/* Inventory Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_8px_24px_rgba(100,116,139,0.12)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100 dark:bg-slate-700/90 text-slate-900 dark:text-white font-black text-xs uppercase border-b border-slate-200 dark:border-slate-600">
              <tr className="relative z-10">
                <th className="py-3.5 sm:py-4 px-2 sm:px-4 w-16 sm:w-20 text-center whitespace-nowrap">کۆد</th>
                <th className={`py-3.5 sm:py-4 px-2 sm:px-4 whitespace-nowrap text-center ${onlyUnpaidFees ? 'min-w-[135px] sm:min-w-[160px]' : 'w-28 sm:w-36'}`}>
                  {onlyUnpaidFees ? (
                    <span className="text-amber-800 dark:text-amber-300 font-black">
                      بڕی نەدراو
                    </span>
                  ) : (
                    'بەرواری کڕین'
                  )}
                </th>
                <th className="py-3.5 sm:py-4 px-3 sm:px-4">ناوی کاڵا</th>
                <th className="py-3.5 sm:py-4 px-3 sm:px-4">خاوەن کاڵا</th>
                <th className="py-3.5 sm:py-4 px-3 sm:px-4">شۆفێر</th>
                <th className="py-3.5 sm:py-4 px-2 sm:px-4 w-16 sm:w-24 text-center whitespace-nowrap">کردارەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-800 dark:text-slate-100">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shadow-2xs">
                        <Boxes className="w-8 h-8 text-slate-700 dark:text-slate-200" />
                      </div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">هیچ کاڵایەک نەدۆزراوەتەوە</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const unpaidAmount = onlyUnpaidFees ? getProductUnpaidRemaining(product) : 0;
                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="py-3 px-2 sm:px-4 font-mono text-xs sm:text-sm text-slate-950 dark:text-white font-black text-center whitespace-nowrap">
                        {product.barcode || '111'}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-center whitespace-nowrap">
                        {onlyUnpaidFees ? (
                          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-mono font-black text-amber-950 dark:text-amber-100 bg-amber-50/95 dark:bg-amber-950/60 px-3 py-1.5 rounded-2xl border border-amber-300 dark:border-amber-700 shadow-xs" dir="ltr">
                            <span className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400">{settings.currency === 'USD' ? '$' : 'د.ع'}</span>
                            <span className="text-sm sm:text-base font-black tracking-tight">{formatNumber(unpaidAmount)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-800 dark:text-slate-100 font-black text-xs sm:text-sm">
                            {product.purchaseDate || '---'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-950 dark:text-white text-sm sm:text-base">{product.name || 'لیمۆ'}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {product.notes && (
                              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{product.notes}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <div>
                          {product.ownerName ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs">
                              <User className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                              {product.ownerName}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">---</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <div>
                          {product.driverName ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                              {product.driverName}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">---</span>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {product.driverPhone && (
                              <span className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-400" dir="ltr">
                                {product.driverPhone}
                              </span>
                            )}
                            {product.carNumber && (
                              <span className="text-[10px] font-mono font-black text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1 border border-slate-200 dark:border-slate-600">
                                <Truck className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                                {product.carNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-center relative whitespace-nowrap">
                        {/* Compact Modern Actions Menu (Three Dots Ellipsis) */}
                        <div className="inline-block text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownProductId(activeDropdownProductId === product.id ? null : product.id);
                            }}
                            title="کردارەکان"
                            className="w-10 h-10 bg-gradient-to-br from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 text-slate-900 hover:text-slate-950 rounded-2xl border border-slate-300/80 shadow-xs hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center mx-auto group"
                          >
                            <MoreVertical className="w-5 h-5 group-hover:scale-110 transition-transform text-slate-900" />
                          </button>

                          {activeDropdownProductId === product.id && (
                            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-right animate-in fade-in zoom-in-95 duration-150">
                              <button
                                onClick={() => {
                                  setActiveDropdownProductId(null);
                                  handleRequestAccount(product);
                                }}
                                className="w-full px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 flex items-center gap-2.5 transition-colors"
                              >
                                <FileText className="w-4 h-4 text-purple-600" />
                                <span>هەژماری کاڵا</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveDropdownProductId(null);
                                  setCommissionModalProduct(product);
                                }}
                                className="w-full px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 transition-colors"
                              >
                                <Coins className="w-4 h-4 text-amber-600" />
                                <span>عمولە</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveDropdownProductId(null);
                                  setSelectedProductForDriver(product);
                                  setIsDriverModalOpen(true);
                                }}
                                className="w-full px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors"
                              >
                                <Truck className="w-4 h-4 text-emerald-600" />
                                <span>شۆفێر</span>
                              </button>
                              
                              {!product.isClosed ? (
                                <button
                                  onClick={() => {
                                    setActiveDropdownProductId(null);
                                    handleRequestClose(product);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 transition-colors"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                                  <span>تەواوبوون / داخستن</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setActiveDropdownProductId(null);
                                      transferClosedProductToProfitLoss(product.id);
                                      showToast(`قازانجی کاڵای "${product.name}" لە بەشی (قازانج) پارێزرا.`);
                                      if (onBackToMain) onBackToMain();
                                    }}
                                    className="w-full px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 flex items-center gap-2.5 transition-colors"
                                  >
                                    <TrendingUp className="w-4 h-4 text-purple-600" />
                                    <span>گواستنەوەی قازانج</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveDropdownProductId(null);
                                      handleRequestReopen(product);
                                    }}
                                    className="w-full px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors"
                                  >
                                    <RotateCcw className="w-4 h-4 text-emerald-600" />
                                    <span>کردنەوەی کاڵا</span>
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => {
                                  setActiveDropdownProductId(null);
                                  handleRequestStockAdjust(product);
                                }}
                                className="w-full px-4 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                              >
                                <ArrowUpDown className="w-4 h-4 text-slate-600" />
                                <span>گۆڕینی بڕی کۆگا</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveDropdownProductId(null);
                                  handleRequestEdit(product);
                                }}
                                className="w-full px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 flex items-center gap-2.5 transition-colors"
                              >
                                <Edit2 className="w-4 h-4 text-blue-600" />
                                <span>دەستکاریکردن</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveDropdownProductId(null);
                                  handleRequestDelete(product);
                                }}
                                className="w-full px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 transition-colors border-t border-slate-100"
                              >
                                <Trash2 className="w-4 h-4 text-rose-600" />
                                <span>سڕینەوە</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Product Pagination Controls */}
        {totalProductPages > 1 && (
          <div className="bg-slate-50 p-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-900 text-xs sm:text-sm font-bold no-print">
            <div className="flex items-center gap-2">
              <span className="text-slate-900">بینینی لاپەڕەی</span>
              <span className="bg-cyan-100 text-cyan-900 border border-cyan-200 px-2.5 py-0.5 rounded-lg text-xs font-black">
                {currentPage}
              </span>
              <span className="text-slate-900">لە کۆی</span>
              <span className="bg-slate-200/80 text-slate-900 px-2 py-0.5 rounded-lg text-xs">
                {totalProductPages}
              </span>
              <span className="text-slate-600 font-normal hidden md:inline">|</span>
              <span className="text-slate-900 hidden md:inline">
                (کۆی گشتی {filteredProducts.length} کاڵا)
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all font-black text-xs cursor-pointer shadow-3xs animate-colors duration-150"
              >
                یەکەمین
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-3xs flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <span className="px-2 font-black text-slate-900">
                {currentPage}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalProductPages, prev + 1))}
                disabled={currentPage === totalProductPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-3xs flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalProductPages)}
                disabled={currentPage === totalProductPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all font-black text-xs cursor-pointer shadow-3xs"
              >
                کۆتایین
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-center sm:p-4 overflow-y-auto">
          <div className="bg-white sm:rounded-2xl max-w-lg w-full p-4 sm:p-6 sm:shadow-2xl sm:border sm:border-slate-200 animate-in fade-in zoom-in duration-150 sm:my-auto min-h-screen sm:min-h-0 sm:max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 flex items-center gap-1.5 text-xs font-bold transition-colors"
                  title="گەڕانەوە بۆ لیستی کاڵاکان"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>گەڕانەوە بۆ لیست</span>
                </button>
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  {editingProduct ? 'دەستکاریکردنی کاڵا' : 'زیادکردنی کاڵای نوێ بۆ کۆگا'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-600 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                title="داخستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 pt-4 overflow-y-auto flex-1 px-0.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                    وێنەی کاڵا (Firebase Storage)
                  </label>
                  <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl bg-slate-50/50 transition-colors relative group">
                    {formData.imageUrl ? (
                      <div className="relative w-28 h-28 rounded-xl overflow-hidden shadow-md border border-slate-200">
                        <img
                          src={formData.imageUrl}
                          alt="Product Preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageUrl: '' })}
                          className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-colors"
                          title="سڕینەوەی وێنە"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2">
                        {isUploading ? (
                          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
                        ) : (
                          <Camera className="w-8 h-8 text-slate-600 group-hover:text-emerald-500 transition-colors mb-2" />
                        )}
                        <p className="text-xs font-bold text-slate-900">
                          {isUploading ? 'خەریکی بارکردنی وێنەیە...' : 'کلیک بکە یان وێنەکە ڕابکێشە ئێرە'}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-1">PNG, JPG, JPEG (تا ٢ مێگا بڵاوکراوە)</p>
                      </div>
                    )}
                    
                    {!isUploading && !formData.imageUrl && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    )}
                    
                    {uploadError && (
                      <p className="text-xs text-rose-600 font-semibold mt-1">{uploadError}</p>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    ناوی کاڵا *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm shadow-inner"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-900 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      <span>ناوی خاوەن کاڵا</span>
                    </span>
                    <span className="text-[10px] text-slate-600 font-normal">
                      (خاوەنی بەرهەم یان جووتیار)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="commission-merchants-datalist"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      placeholder="ناوی خاوەن کاڵا بنووسە یان لە لیست هەڵیبژێرە..."
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-amber-950 font-black focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm shadow-inner"
                    />
                    <datalist id="commission-merchants-datalist">
                      {(commissionAccounts || []).map((acc) => (
                        <option key={acc.id} value={acc.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    کۆد
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-mono shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    پۆلێن
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm shadow-inner"
                  >
                    <option value="">هەڵبژاردنی پۆلێن...</option>
                    {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    بەرواری کڕین
                  </label>
                  <input
                    type="date"
                    dir="ltr"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-mono shadow-inner"
                  />
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <div className="sm:col-span-3">
                    <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-emerald-600" />
                      <span>زانیاری شۆفێر و بار:</span>
                    </h4>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-900 mb-1">
                      ناوی شۆفێر
                    </label>
                    <input
                      type="text"
                      value={formData.driverName}
                      onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                      placeholder="ناوی سایق..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-900 mb-1">
                      ژمارەی ئۆتۆمبێل
                    </label>
                    <input
                      type="text"
                      value={formData.carNumber}
                      onChange={(e) => setFormData({ ...formData, carNumber: e.target.value })}
                      placeholder="ژمارەی سەیارە..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-mono shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-900 mb-1">
                      ژ.مۆبایل شۆفێر
                    </label>
                    <input
                      type="text"
                      value={formData.driverPhone}
                      onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                      placeholder="٠٧٥٠..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-mono shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    تێچووی کڕینی کاڵا (سەرجەم کێش، دانە و کارتۆنەکان) (د.ع)
                  </label>
                  <input
                    type="text"
                    placeholder="تێچووی سەرجەمی بارەکە بنووسە..."
                    value={formatNumberWithCommas(formData.purchasePrice)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, '');
                      if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                        setFormData({ ...formData, purchasePrice: raw });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-black font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm shadow-inner"
                  />
                  <p className="text-[11px] text-slate-900 mt-0.5">
                    * تێچووی کڕین بریتییە لە تێچووی سەرجەم بڕ و کێشەکە پێکەوە
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-900">
                      نرخی فرۆشتن بە کڕیار (دیناری عێراقی - د.ع)
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, sellingPrice: '0' })}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>سفرکردنەوە (0)</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="نرخی فرۆشتن بنووسە..."
                    value={formatNumberWithCommas(formData.sellingPrice)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, '');
                      if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                        setFormData({ ...formData, sellingPrice: raw });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-black font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    کێشی کاڵا (کۆی کێش)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="کێش / بڕ بنووسە..."
                      value={formatNumberWithCommas(formData.stock)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/,/g, '');
                        if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                          setFormData({ ...formData, stock: raw });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-black font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm shadow-inner"
                    />
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-bold text-slate-900 bg-white shrink-0 shadow-inner"
                    >
                      <option value="کگم">کگم</option>
                      <option value="دانە">دانە</option>
                      <option value="کارتۆن">کارتۆن</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    کۆی بڕی بەرهەم
                  </label>
                  <input
                    type="text"
                    placeholder="ژمارەی بڕی بەرهەم بنووسە (وەک: 10، 50)..."
                    value={formatNumberWithCommas(formData.stock)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, '');
                      if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                        setFormData({ ...formData, stock: raw });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-black font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm shadow-inner"
                  />
                  <p className="text-[11px] text-slate-900 mt-0.5">
                    * کاتێک لە بەشی فرۆشتن بڕەکە داخڵ دەکەیت، ئۆتۆماتیکی لەم بڕە کەم دەبێتەوە.
                  </p>
                </div>

                {/* بەشی کرێکان و خەرجییەکان */}
                <div className="sm:col-span-2 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span>کرێ و خەرجییەکانی گواستنەوە و بەرهەم (د.ع):</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* کرێی گواستنەوە */}
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-slate-900" />
                        <span>کرێی گواستنەوە</span>
                      </label>
                      <input
                        type="text"
                        placeholder="0"
                        value={formatNumberWithCommas(formData.driverFee)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/,/g, '');
                          if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                            setFormData({ ...formData, driverFee: raw });
                          }
                        }}
                        style={{ color: '#0f172a' }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder:!text-slate-600 placeholder:!opacity-100"
                      />
                    </div>

                    {/* نرخ و کرێی کرێکار */}
                    <div className="sm:col-span-2 bg-sky-50/40 p-3 rounded-2xl border border-sky-100">
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-sky-600" />
                            <span>نرخی کرێکار {editWorkerUnit === 'دانە' ? 'بۆ هەر ١ دانە' : 'بۆ هەر تەن (١,٠٠٠ کگم)'}</span>
                          </label>
                          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-sky-200">
                            <button
                              type="button"
                              onClick={() => setEditWorkerUnit('کگم')}
                              className={`px-2 py-0.5 rounded text-[10px] font-black transition-colors cursor-pointer ${
                                editWorkerUnit === 'کگم' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 hover:text-sky-900'
                              }`}
                            >
                              کگم / تەن
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditWorkerUnit('دانە')}
                              className={`px-2 py-0.5 rounded text-[10px] font-black transition-colors cursor-pointer ${
                                editWorkerUnit === 'دانە' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 hover:text-sky-900'
                              }`}
                            >
                              دانە
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowWorkerWeightCalc(!showWorkerWeightCalc)}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer border ${
                            showWorkerWeightCalc
                              ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                              : 'bg-white text-sky-700 hover:bg-sky-100/80 border-sky-300'
                          }`}
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>{showWorkerWeightCalc ? 'داخستنی حیسابکەر ✕' : 'حیسابکردنی نرخ بەپێی کێش ⚖️'}</span>
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          placeholder={editWorkerUnit === 'دانە' ? "بۆ نموونە: 250 (نرخ بۆ هەر دانە)" : "بۆ نموونە: 5000 (نرخ بۆ هەر تەن)"}
                          value={formatNumberWithCommas(formData.workerFee)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/,/g, '');
                            if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                              setFormData({ ...formData, workerFee: raw });
                            }
                          }}
                          className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-sky-200 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm font-mono font-bold text-slate-900"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-900">
                          {editWorkerUnit === 'دانە' ? 'د.ع / دانە' : 'د.ع / تەن'}
                        </span>
                      </div>

                      {/* Live Calculation Preview when editing weight or count */}
                      {(() => {
                        const stockVal = Number(formData.stock) || 0;
                        const countVal = Number(formData.count) || 0;
                        const inputRate = Number(formData.workerFee) || 0;
                        const isCount = editWorkerUnit === 'دانە';

                        // Total by weight (rate per ton / 1000 * kg)
                        const totalByWeight = stockVal > 0 && inputRate > 0 ? Math.round((inputRate / 1000) * stockVal) : 0;
                        // Total by count (rate per unit * count)
                        const totalByCount = countVal > 0 && inputRate > 0 ? Math.round(inputRate * countVal) : 0;

                        const activeTotal = isCount
                          ? (totalByCount > 0 ? totalByCount : totalByWeight)
                          : (totalByWeight > 0 ? totalByWeight : totalByCount);
                        const activeQty = isCount ? (countVal > 0 ? countVal : stockVal) : (stockVal > 0 ? stockVal : countVal);
                        const activeRate = isCount ? inputRate : (inputRate / 1000);

                        if (activeTotal > 0 || totalByWeight > 0 || totalByCount > 0) {
                          return (
                            <div className="mt-2.5 space-y-2">
                              {/* Main Active Total */}
                              <div className="p-3 bg-gradient-to-r from-sky-100/90 via-sky-50 to-white rounded-2xl border-2 border-sky-400 flex items-center justify-between text-xs shadow-xs">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-sky-600 animate-pulse"></span>
                                    <span className="text-sky-950 font-black text-xs sm:text-sm">
                                      کۆی گشتی کرێی کرێکار:
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-sky-800 font-bold block mt-0.5">
                                    حیسابکراو بەپێی {isCount ? 'دانە (العدد)' : 'کێش (تەن/کگم)'}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono font-black text-sky-950 text-base sm:text-lg">
                                    {formatNumber(activeTotal)} د.ع
                                  </span>
                                  <span className="block text-[10px] font-mono text-sky-800 font-semibold">
                                    ({formatNumber(activeQty)} {isCount ? 'دانە' : 'کگم'} × {formatNumber(activeRate)} د.ع)
                                  </span>
                                </div>
                              </div>

                              {/* Interactive Dual Breakdown if both Weight and Count are entered */}
                              {stockVal > 0 && countVal > 0 && inputRate > 0 && (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => setEditWorkerUnit('کگم')}
                                    className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                                      !isCount
                                        ? 'bg-sky-600 text-white border-sky-700 shadow-xs ring-2 ring-sky-300'
                                        : 'bg-white text-slate-900 border-sky-200 hover:bg-sky-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="font-black text-[11px]">بەپێی کێش:</span>
                                      {!isCount && <span className="text-[9px] bg-white/20 px-1 py-0.2 rounded font-black">چالاکە ✓</span>}
                                    </div>
                                    <div className="font-mono font-black text-sm">
                                      {formatNumber(totalByWeight)} د.ع
                                    </div>
                                    <span className={`text-[10px] font-mono block ${!isCount ? 'text-sky-100' : 'text-slate-900'}`}>
                                      {formatNumber(stockVal)} کگم × {formatNumber(inputRate / 1000)} د.ع
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setEditWorkerUnit('دانە')}
                                    className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                                      isCount
                                        ? 'bg-sky-600 text-white border-sky-700 shadow-xs ring-2 ring-sky-300'
                                        : 'bg-white text-slate-900 border-sky-200 hover:bg-sky-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="font-black text-[11px]">بەپێی دانە:</span>
                                      {isCount && <span className="text-[9px] bg-white/20 px-1 py-0.2 rounded font-black">چالاکە ✓</span>}
                                    </div>
                                    <div className="font-mono font-black text-sm">
                                      {formatNumber(totalByCount)} د.ع
                                    </div>
                                    <span className={`text-[10px] font-mono block ${isCount ? 'text-sky-100' : 'text-slate-900'}`}>
                                      {formatNumber(countVal)} دانە × {formatNumber(inputRate)} د.ع
                                    </span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Weight-Based Worker Fee Calculator Panel */}
                      {showWorkerWeightCalc && (() => {
                        const effectiveWeight = Number(workerCustomWeight) || Number(formData.stock) || 0;
                        const rateNum = Number(workerWeightRate) || 0;
                        const calculatedFee =
                          workerWeightMode === 'ton'
                            ? Math.round((effectiveWeight / 1000) * rateNum)
                            : Math.round(effectiveWeight * rateNum);

                        return (
                          <div className="mt-2.5 p-3.5 bg-white rounded-2xl border border-sky-200 shadow-xs space-y-3 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between border-b border-sky-100 pb-2">
                              <div className="flex items-center gap-1.5 text-xs font-black text-sky-900">
                                <Scale className="w-4 h-4 text-sky-600" />
                                <span>حیسابکەری کرێی کرێکار بەپێی کێش</span>
                              </div>
                              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                                <button
                                  type="button"
                                  onClick={() => setWorkerWeightMode('ton')}
                                  className={`px-2 py-0.5 rounded-md font-black transition-colors cursor-pointer ${
                                    workerWeightMode === 'ton' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-800 hover:text-sky-900'
                                  }`}
                                >
                                  بۆ هەر ١,٠٠٠ کگم (تەن)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWorkerWeightMode('kg')}
                                  className={`px-2 py-0.5 rounded-md font-black transition-colors cursor-pointer ${
                                    workerWeightMode === 'kg' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-800 hover:text-sky-900'
                                  }`}
                                >
                                  بۆ هەر ١ کگم
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Weight Input */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-900 mb-1">
                                  کێشی دیاریکراو (کگم):
                                </label>
                                <input
                                  type="number"
                                  value={workerCustomWeight !== '' ? workerCustomWeight : formData.stock}
                                  onChange={(e) => setWorkerCustomWeight(e.target.value)}
                                  placeholder={String(formData.stock || 1000)}
                                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                />
                                <span className="text-[10px] text-slate-800 font-semibold block mt-0.5">
                                  {formData.stock ? `(کێشی بڕی لە کۆگا: ${formatNumber(Number(formData.stock))} کگم)` : 'کێشی بار بە کگم'}
                                </span>
                              </div>

                              {/* Rate Input */}
                              <div>
                                <label className="block text-[11px] font-bold text-slate-900 mb-1">
                                  {workerWeightMode === 'ton'
                                    ? 'بڕی پارە بۆ هەر ١,٠٠٠ کگم (تەن):'
                                    : 'بڕی پارە بۆ هەر ١ کگم:'}
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={workerWeightRate}
                                    onChange={(e) => setWorkerWeightRate(e.target.value)}
                                    placeholder="5000"
                                    className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                                  />
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-800">
                                    د.ع
                                  </span>
                                </div>

                                {/* Quick Rate Presets */}
                                {workerWeightMode === 'ton' && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {['3000', '5000', '6000', '7500', '10000'].map((val) => (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() => setWorkerWeightRate(val)}
                                        className={`text-[10px] px-2 py-0.5 rounded-md font-black transition-all border cursor-pointer ${
                                          workerWeightRate === val
                                            ? 'bg-sky-100 text-sky-950 border-sky-300 shadow-2xs'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300'
                                        }`}
                                      >
                                        {formatNumber(Number(val))} د.ع
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Calculation Formula Result Box */}
                            <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="text-xs text-sky-950 font-bold">
                                <span className="font-black text-slate-950">حیسابکردن: </span>
                                {workerWeightMode === 'ton' ? (
                                  <span>
                                    ({formatNumber(effectiveWeight)} کگم ÷ ١,٠٠٠) × {formatNumber(rateNum)} د.ع ={' '}
                                    <strong className="text-sky-950 font-black text-sm">
                                      {formatNumber(calculatedFee)} د.ع
                                    </strong>
                                  </span>
                                ) : (
                                  <span>
                                    {formatNumber(effectiveWeight)} کگم × {formatNumber(rateNum)} د.ع ={' '}
                                    <strong className="text-sky-950 font-black text-sm">
                                      {formatNumber(calculatedFee)} د.ع
                                    </strong>
                                  </span>
                                )}
                              </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const rateToSet = workerWeightMode === 'ton' ? workerWeightRate : String(Number(workerWeightRate) * 1000);
                                    setFormData({ ...formData, workerFee: rateToSet });
                                    setShowWorkerWeightCalc(false);
                                  }}
                                  className="bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>دانانی ئەم نرخە ({formatNumber(workerWeightMode === 'ton' ? Number(workerWeightRate) : Number(workerWeightRate) * 1000)} د.ع)</span>
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-800 font-semibold">
                              * تێبینی: دەتوانیت بڕی پارەکە لە هەر کاتێکدا بە ئارەزوومەندانە بە دەستیش بنووسیت یان دەستکاری بکەیت.
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* کرێی رافعە */}
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5 text-amber-600" />
                        <span>کرێی رافعە</span>
                      </label>
                      <input
                        type="text"
                        placeholder="0"
                        value={formatNumberWithCommas(formData.forkliftFee)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/,/g, '');
                          if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                            setFormData({ ...formData, forkliftFee: raw });
                          }
                        }}
                        style={{ color: '#0f172a' }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder:!text-slate-400 placeholder:!opacity-100"
                      />
                    </div>

                    {/* کرێی تر */}
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1 flex items-center gap-1">
                        <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                        <span>کرێی تر</span>
                      </label>
                      <input
                        type="text"
                        placeholder="0"
                        value={formatNumberWithCommas(formData.otherFee)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/,/g, '');
                          if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                            setFormData({ ...formData, otherFee: raw });
                          }
                        }}
                        style={{ color: '#0f172a' }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder:!text-slate-400 placeholder:!opacity-100"
                      />
                    </div>

                    {/* بەشی مصرف (مەسروف) */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-900 mb-1 flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        <span>مەسروف / خەرجی تری بەرهەم</span>
                      </label>
                      <input
                        type="text"
                        placeholder="0 د.ع"
                        value={formatNumberWithCommas(formData.expenseFee)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/,/g, '');
                          if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                            setFormData({ ...formData, expenseFee: raw });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder:!text-slate-600 placeholder:!opacity-100"
                        style={{ color: '#0f172a' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Total cost card */}
                {(() => {
                  const pCost = Number(formData.purchasePrice) || 0;
                  const stockQty = Number(formData.stock) || 0;
                  const extraTotal =
                    (Number(formData.driverFee) || 0) +
                    (Number(formData.workerFee) || 0) +
                    (Number(formData.forkliftFee) || 0) +
                    (Number(formData.otherFee) || 0) +
                    (Number(formData.expenseFee) || 0);
                  const totalCombined = pCost + extraTotal;
                  const sellingP = Number(formData.sellingPrice) || 0;

                  if (totalCombined <= 0 && stockQty <= 0) return null;

                  const unitCostOnly = stockQty > 0 ? pCost / stockQty : pCost;
                  const unitTotalCost = stockQty > 0 ? totalCombined / stockQty : totalCombined;
                  const unitProfit = sellingP > 0 ? sellingP - unitTotalCost : 0;

                  return (
                    <div className="sm:col-span-2 bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 text-xs font-bold text-emerald-900 space-y-2">
                      <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                        <span>کۆی تێچووی سەرجەم بارەکە (کڕین + کرێکان + مەسروف):</span>
                        <span className="text-sm font-extrabold text-emerald-700 font-mono">
                          {formatCurrency(totalCombined, settings.currency, settings.usdToIqdRate)}
                        </span>
                      </div>

                      {stockQty > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-bold text-emerald-950 pt-1">
                          <div className="bg-white/95 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                            <span className="text-slate-800 font-bold block text-[11px] mb-0.5">تێچووی کڕین بۆ ۱ {formData.unit}:</span>
                            <span className="text-emerald-950 font-black font-mono text-sm">
                              {formatCurrency(unitCostOnly, settings.currency, settings.usdToIqdRate)}
                            </span>
                          </div>
                          <div className="bg-white/95 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                            <span className="text-slate-800 font-bold block text-[11px] mb-0.5">تێچووی گشتی ۱ {formData.unit} (بە کرێ و مەسروف):</span>
                            <span className="text-emerald-950 font-black font-mono text-sm">
                              {formatCurrency(unitTotalCost, settings.currency, settings.usdToIqdRate)}
                            </span>
                          </div>
                          {sellingP > 0 && (
                            <div className="sm:col-span-2 bg-emerald-100 p-2.5 rounded-lg border border-emerald-300 flex items-center justify-between shadow-2xs">
                              <span className="text-emerald-950 font-black text-xs">خێری صافی چاوەڕوانکراو بۆ ۱ {formData.unit}:</span>
                              <span className={`font-black font-mono text-xs sm:text-sm ${unitProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                                {unitProfit >= 0 ? '+' : ''}{formatCurrency(unitProfit, settings.currency, settings.usdToIqdRate)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {extraTotal > 0 && (
                        <div className="text-[11px] font-bold text-emerald-950 flex flex-wrap gap-2 pt-1.5 border-t border-emerald-300">
                          <span>کڕین: {formatNumber(pCost)}</span>
                          {Boolean(Number(formData.driverFee)) && <span>| سایق: {formatNumber(Number(formData.driverFee))}</span>}
                          {Boolean(Number(formData.workerFee)) && <span>| کرێکار: {formatNumber(Number(formData.workerFee))}</span>}
                          {Boolean(Number(formData.forkliftFee)) && <span>| رافعە: {formatNumber(Number(formData.forkliftFee))}</span>}
                          {Boolean(Number(formData.otherFee)) && <span>| کرێی تر: {formatNumber(Number(formData.otherFee))}</span>}
                          {Boolean(Number(formData.expenseFee)) && <span>| مەسروف: {formatNumber(Number(formData.expenseFee))}</span>}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Shortcut to Fee Settlement in Product Account */}
                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setAccountModalProduct(editingProduct);
                      setAccountModalInitialTab('fees');
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-950 transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center font-bold">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className="text-right">
                        <span className="block font-black text-xs">حیساب و واصڵکردنی کرێکان و مەسرەف</span>
                        <span className="text-[10px] text-amber-800">تۆمارکردنی پارەی دراو (واصڵ) و ماوە (باقی) بەپێی بەروار</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-black bg-white text-amber-900 px-3 py-1 rounded-xl border border-amber-300 shadow-2xs">
                      کردنەوە ⬅
                    </span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-5 pt-5 border-t border-slate-100 shrink-0">
                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (editingProduct) {
                      setIsModalOpen(false);
                      handleRequestDelete(editingProduct);
                    }
                  }}
                  disabled={!editingProduct}
                  className={`flex flex-col items-center justify-center gap-2.5 transition-all active:scale-95 group ${!editingProduct && 'opacity-50 cursor-not-allowed'}`}
                >
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-sm border ${editingProduct ? 'bg-[#ffe8d6] border-[#f4a261] text-[#b05d1d] group-hover:bg-[#ffddc1]' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    <Trash2 className="w-7 h-7" />
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-extrabold shadow-sm ${editingProduct ? 'bg-[#ffedcc] text-[#a06b12]' : 'bg-slate-100 text-slate-600'}`}>
                    سڕینەوە
                  </div>
                </button>

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex flex-col items-center justify-center gap-2.5 transition-all active:scale-95 group cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-3xl bg-[#dbeafe] border border-[#93c5fd] text-[#1d4ed8] flex items-center justify-center shadow-sm group-hover:bg-[#bfdbfe]">
                    <Edit2 className="w-7 h-7" />
                  </div>
                  <div className="px-4 py-1.5 rounded-full text-xs font-extrabold shadow-sm bg-[#e0f2fe] text-[#0284c7]">
                    دەستکاری
                  </div>
                </button>

                {/* Save Button */}
                <button
                  id="save-product-btn"
                  type="submit"
                  className="flex flex-col items-center justify-center gap-2.5 transition-all active:scale-95 group cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-3xl bg-[#dcfce7] border border-[#86efac] text-[#15803d] flex items-center justify-center shadow-sm group-hover:bg-[#bbf7d0]">
                    <Save className="w-7 h-7" />
                  </div>
                  <div className="px-4 py-1.5 rounded-full text-xs font-extrabold shadow-sm bg-[#d1fae5] text-[#047857]">
                    خەزنکردن
                  </div>
                </button>

                {/* Reset Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('دڵنیایت لە سفرکردنەوەی فۆڕمەکە؟')) {
                      setFormData({
                        name: '',
                        ownerName: '',
                        barcode: '',
                        category: 'خۆراکی',
                        purchasePrice: 0,
                        sellingPrice: 0,
                        stock: 0,
                        count: 0,
                        minStockAlert: 5,
                        unit: 'کگم',
                        driverFee: 0,
                        workerFee: 0,
                        forkliftFee: 0,
                        otherFee: 0,
                        expenseFee: 0,
                        driverName: '',
                        carNumber: '',
                        driverPhone: '',
                        purchaseDate: new Date().toISOString().split('T')[0],
                        notes: '',
                        imageUrl: ''
                      });
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-2.5 transition-all active:scale-95 group cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-3xl bg-[#fce7f3] border border-[#f9a8d4] text-[#be185d] flex items-center justify-center shadow-sm group-hover:bg-[#fbcfe8]">
                    <RotateCcw className="w-7 h-7" />
                  </div>
                  <div className="px-4 py-1.5 rounded-full text-xs font-extrabold shadow-sm bg-[#ffe4e6] text-[#be123c]">
                    سفرکردنەوە
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {stockAdjustModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-lg text-slate-900 mb-1">
              گۆڕینی بڕی کۆگا
            </h3>
            <p className="text-xs text-slate-900 mb-4">
              کاڵا: <span className="font-bold text-slate-900">{stockAdjustModal.name}</span> (بڕی ئێستا: {stockAdjustModal.stock} {stockAdjustModal.unit})
            </p>

            <form onSubmit={handleApplyStockAdjust} className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    adjustType === 'add'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-slate-200 text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  زیادکردن (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('subtract')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    adjustType === 'subtract'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'border-slate-200 text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  کەمکردن (-)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  چەند {stockAdjustModal.unit} {adjustType === 'add' ? 'زیاد بکرێت؟' : 'کەم بکرێت؟'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={stockChangeAmount}
                  onChange={(e) => setStockChangeAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-bold text-center"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStockAdjustModal(null)}
                  className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  داخستن
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                >
                  جێبەجێکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive Bottom Sheet Modal for Actions in 2-Column Grid */}
      {activeDropdownProductId && (
        <div className="fixed inset-0 z-50 flex justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-300 overflow-y-auto no-print">
          <div
            className="fixed inset-0"
            onClick={() => setActiveDropdownProductId(null)}
          ></div>
          <div className="relative w-full sm:max-w-lg bg-white sm:rounded-[40px] shadow-2xl overflow-hidden sm:my-auto min-h-screen sm:min-h-0 animate-in slide-in-from-bottom-10 duration-500 text-right flex flex-col border-none sm:border sm:border-slate-200">
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0"></div>
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-50 shrink-0">
              <button
                onClick={() => setActiveDropdownProductId(null)}
                className="w-9 h-9 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-900 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                title="داخستن"
              >
                <X className="w-4.5 h-4.5" />
              </button>
              <span className="font-black text-slate-900 text-base sm:text-lg tracking-tight">کردارەکانی کاڵا</span>
            </div>

            <div className="px-4 py-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/60 via-white to-slate-50/70">
              {(() => {
                const product = paginatedProducts.find((p) => p.id === activeDropdownProductId);
                if (!product) return null;
                const displayName = product.barcode === '1111' || product.name === 'پرتەقاڵ' || product.name === 'پَرتەقاڵ' || product.name === 'برتقال' ? 'پرتقاڵ' : product.name;
                return (
                  <div className="space-y-4 sm:space-y-5">
                    {/* Ultra Modern High-End Product Header Card with 3D Icon & Refined Compact Typography */}
                    <div className="p-3 sm:p-3.5 bg-gradient-to-l from-slate-50 via-white to-amber-50/20 rounded-[24px] flex items-center justify-between border border-slate-200/90 shadow-[0_8px_25px_-5px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(255,255,255,0.9)] shrink-0 transition-all">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="font-['Vazirmatn',sans-serif] font-black text-lg sm:text-xl text-slate-950 tracking-tight leading-snug truncate">
                          {displayName}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-extrabold text-slate-900 font-['Vazirmatn',sans-serif]">کۆدی کاڵا:</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-black font-mono bg-white text-slate-950 border border-slate-300 shadow-2xs">
                            {product.barcode || '---'}
                          </span>
                          {product.category && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold font-['Vazirmatn',sans-serif] bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                              {product.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {product.imageUrl ? (
                        <div className="relative group p-1 bg-white rounded-[20px] border border-slate-200/90 shadow-md shrink-0">
                          <img src={product.imageUrl} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-[16px] object-cover shrink-0" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] bg-gradient-to-br from-white via-slate-50 to-slate-100/90 border border-slate-200/90 flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08),inset_0_2px_4px_rgba(255,255,255,0.9)] shrink-0 p-1.5 relative overflow-hidden group">
                          <div className="absolute inset-0 bg-radial from-amber-400/10 via-transparent to-transparent opacity-60 pointer-events-none"></div>
                          <Product3DIcon name={displayName} category={product.category} className="w-11 h-11 sm:w-13 sm:h-13 relative z-10 transition-transform duration-300 group-hover:scale-110" />
                        </div>
                      )}
                    </div>

                    {/* Action Cards Grid - Ultra-Modern Glassmorphic & Compact */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
                      {/* 1. Product Account (هەژماری کاڵا) */}
                      <button
                        onClick={() => {
                          setActiveDropdownProductId(null);
                          handleRequestAccount(product);
                        }}
                        className="relative p-3.5 sm:p-4 rounded-[26px] bg-gradient-to-b from-white/90 via-white/80 to-slate-50/85 backdrop-blur-xl border border-white/80 hover:border-blue-300/80 ring-1 ring-slate-900/5 flex flex-col items-center justify-center text-center gap-2.5 sm:gap-3 transition-all duration-300 active:scale-95 cursor-pointer group shadow-[0_4px_16px_-2px_rgba(0,0,0,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(59,130,246,0.18),inset_0_2px_3px_rgba(255,255,255,1)] hover:-translate-y-0.5 overflow-hidden"
                      >
                        {/* Glass Reflections & Ambient Glow */}
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 via-white/20 to-transparent rounded-t-[26px] pointer-events-none" />
                        <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/25 transition-all pointer-events-none" />

                        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-[20px] bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-[0_8px_18px_-2px_rgba(59,130,246,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(30,58,138,0.3)] border border-white/35 group-hover:scale-108 transition-transform duration-300 relative overflow-hidden shrink-0">
                          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 via-white/10 to-transparent rounded-t-[20px] pointer-events-none" />
                          <FileText className="w-6.5 h-6.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)] relative z-10" />
                        </div>
                        <span className="font-['Vazirmatn',sans-serif] font-black text-[11px] sm:text-xs text-slate-950 group-hover:text-blue-950 tracking-tight leading-none relative z-10">
                          هەژماری کاڵا
                        </span>
                      </button>

                      {/* 2. Commission Settlement (عمولە) */}
                      <button
                        onClick={() => {
                          setActiveDropdownProductId(null);
                          setCommissionModalProduct(product);
                        }}
                        className="relative p-3.5 sm:p-4 rounded-[26px] bg-gradient-to-b from-white/90 via-white/80 to-amber-50/40 backdrop-blur-xl border border-white/80 hover:border-amber-300/80 ring-1 ring-slate-900/5 flex flex-col items-center justify-center text-center gap-2.5 sm:gap-3 transition-all duration-300 active:scale-95 cursor-pointer group shadow-[0_4px_16px_-2px_rgba(0,0,0,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(245,158,11,0.2),inset_0_2px_3px_rgba(255,255,255,1)] hover:-translate-y-0.5 overflow-hidden"
                      >
                        {/* Glass Reflections & Ambient Glow */}
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 via-white/20 to-transparent rounded-t-[26px] pointer-events-none" />
                        <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/25 transition-all pointer-events-none" />

                        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-[20px] bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-white flex items-center justify-center shadow-[0_8px_18px_-2px_rgba(245,158,11,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(180,83,9,0.3)] border border-white/35 group-hover:scale-108 transition-transform duration-300 relative overflow-hidden shrink-0">
                          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 via-white/10 to-transparent rounded-t-[20px] pointer-events-none" />
                          <Coins className="w-6.5 h-6.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)] relative z-10" />
                        </div>
                        <span className="font-['Vazirmatn',sans-serif] font-black text-[11px] sm:text-xs text-slate-950 group-hover:text-amber-950 tracking-tight leading-none relative z-10">
                          عمولە
                        </span>
                      </button>

                      {/* 3. Stock Adjustment (گۆڕینی بڕی کۆگا) */}
                      <button
                        onClick={() => {
                          setActiveDropdownProductId(null);
                          handleRequestStockAdjust(product);
                        }}
                        className="relative p-3.5 sm:p-4 rounded-[26px] bg-gradient-to-b from-white/90 via-white/80 to-teal-50/40 backdrop-blur-xl border border-white/80 hover:border-teal-300/80 ring-1 ring-slate-900/5 flex flex-col items-center justify-center text-center gap-2.5 sm:gap-3 transition-all duration-300 active:scale-95 cursor-pointer group shadow-[0_4px_16px_-2px_rgba(0,0,0,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(20,184,166,0.2),inset_0_2px_3px_rgba(255,255,255,1)] hover:-translate-y-0.5 overflow-hidden"
                      >
                        {/* Glass Reflections & Ambient Glow */}
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 via-white/20 to-transparent rounded-t-[26px] pointer-events-none" />
                        <div className="absolute -top-6 -right-6 w-20 h-20 bg-teal-500/10 rounded-full blur-xl group-hover:bg-teal-500/25 transition-all pointer-events-none" />

                        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-[20px] bg-gradient-to-br from-cyan-400 via-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-[0_8px_18px_-2px_rgba(20,184,166,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(15,118,110,0.3)] border border-white/35 group-hover:scale-108 transition-transform duration-300 relative overflow-hidden shrink-0">
                          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 via-white/10 to-transparent rounded-t-[20px] pointer-events-none" />
                          <ArrowUpDown className="w-6.5 h-6.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)] relative z-10" />
                        </div>
                        <span className="font-['Vazirmatn',sans-serif] font-black text-[11px] sm:text-xs text-slate-950 group-hover:text-teal-950 tracking-tight leading-none relative z-10">
                          گۆڕینی بڕی کۆگا
                        </span>
                      </button>

                      {/* 4. Edit Product (دەستکاریکردن) */}
                      <button
                        onClick={() => {
                          setActiveDropdownProductId(null);
                          handleRequestEdit(product);
                        }}
                        className="relative p-3.5 sm:p-4 rounded-[26px] bg-gradient-to-b from-white/90 via-white/80 to-purple-50/40 backdrop-blur-xl border border-white/80 hover:border-purple-300/80 ring-1 ring-slate-900/5 flex flex-col items-center justify-center text-center gap-2.5 sm:gap-3 transition-all duration-300 active:scale-95 cursor-pointer group shadow-[0_4px_16px_-2px_rgba(0,0,0,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(147,51,234,0.2),inset_0_2px_3px_rgba(255,255,255,1)] hover:-translate-y-0.5 overflow-hidden"
                      >
                        {/* Glass Reflections & Ambient Glow */}
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 via-white/20 to-transparent rounded-t-[26px] pointer-events-none" />
                        <div className="absolute -top-6 -right-6 w-20 h-20 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/25 transition-all pointer-events-none" />

                        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-[20px] bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-[0_8px_18px_-2px_rgba(147,51,234,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(107,33,168,0.3)] border border-white/35 group-hover:scale-108 transition-transform duration-300 relative overflow-hidden shrink-0">
                          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 via-white/10 to-transparent rounded-t-[20px] pointer-events-none" />
                          <Edit2 className="w-6.5 h-6.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)] relative z-10" />
                        </div>
                        <span className="font-['Vazirmatn',sans-serif] font-black text-[11px] sm:text-xs text-slate-950 group-hover:text-purple-950 tracking-tight leading-none relative z-10">
                          دەستکاریکردن
                        </span>
                      </button>

                      {/* 5. Close / Reopen Product (تەواوبوون / داخستن یان کردنەوەی کاڵا) */}
                      {!product.isClosed ? (
                        <button
                          onClick={() => {
                            setActiveDropdownProductId(null);
                            handleRequestClose(product);
                          }}
                          className="relative p-3.5 sm:p-4 rounded-[26px] bg-gradient-to-b from-white/90 via-white/80 to-amber-50/40 backdrop-blur-xl border border-white/80 hover:border-orange-300/80 ring-1 ring-slate-900/5 flex flex-col items-center justify-center text-center gap-2.5 sm:gap-3 transition-all duration-300 active:scale-95 cursor-pointer group shadow-[0_4px_16px_-2px_rgba(0,0,0,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(249,115,22,0.2),inset_0_2px_3px_rgba(255,255,255,1)] hover:-translate-y-0.5 overflow-hidden"
                        >
                          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 via-white/20 to-transparent rounded-t-[26px] pointer-events-none" />
                          <div className="absolute -top-6 -right-6 w-20 h-20 bg-orange-500/10 rounded-full blur-xl group-hover:bg-orange-500/25 transition-all pointer-events-none" />

                          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-[20px] bg-gradient-to-br from-orange-400 via-amber-500 to-orange-600 text-white flex items-center justify-center shadow-[0_8px_18px_-2px_rgba(249,115,22,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(194,65,12,0.3)] border border-white/35 group-hover:scale-108 transition-transform duration-300 relative overflow-hidden shrink-0">
                            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 via-white/10 to-transparent rounded-t-[20px] pointer-events-none" />
                            <CheckCircle2 className="w-6.5 h-6.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)] relative z-10" />
                          </div>
                          <span className="font-['Vazirmatn',sans-serif] font-black text-[11px] sm:text-xs text-slate-950 group-hover:text-orange-950 tracking-tight leading-none relative z-10">
                            تەواوبوون / داخستن
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveDropdownProductId(null);
                            handleRequestReopen(product);
                          }}
                          className="relative p-3.5 sm:p-4 rounded-[26px] bg-gradient-to-b from-white/90 via-white/80 to-emerald-50/40 backdrop-blur-xl border border-white/80 hover:border-emerald-300/80 ring-1 ring-slate-900/5 flex flex-col items-center justify-center text-center gap-2.5 sm:gap-3 transition-all duration-300 active:scale-95 cursor-pointer group shadow-[0_4px_16px_-2px_rgba(0,0,0,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(16,185,129,0.2),inset_0_2px_3px_rgba(255,255,255,1)] hover:-translate-y-0.5 overflow-hidden"
                        >
                          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 via-white/20 to-transparent rounded-t-[26px] pointer-events-none" />
                          <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/25 transition-all pointer-events-none" />

                          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-[20px] bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-[0_8px_18px_-2px_rgba(16,185,129,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(4,120,87,0.3)] border border-white/35 group-hover:scale-108 transition-transform duration-300 relative overflow-hidden shrink-0">
                            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 via-white/10 to-transparent rounded-t-[20px] pointer-events-none" />
                            <RotateCcw className="w-6.5 h-6.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)] relative z-10" />
                          </div>
                          <span className="font-['Vazirmatn',sans-serif] font-black text-[11px] sm:text-xs text-slate-950 group-hover:text-emerald-950 tracking-tight leading-none relative z-10">
                            کردنەوەی کاڵا
                          </span>
                        </button>
                      )}

                      {/* 6. Delete Product (سڕینەوەی کاڵا لە کۆگا) */}
                      <button
                        onClick={() => {
                          setActiveDropdownProductId(null);
                          handleRequestDelete(product);
                        }}
                        className="relative p-3.5 sm:p-4 rounded-[26px] bg-gradient-to-b from-white/90 via-white/80 to-rose-50/40 backdrop-blur-xl border border-white/80 hover:border-rose-300/80 ring-1 ring-slate-900/5 flex flex-col items-center justify-center text-center gap-2.5 sm:gap-3 transition-all duration-300 active:scale-95 cursor-pointer group shadow-[0_4px_16px_-2px_rgba(0,0,0,0.05),inset_0_1.5px_2px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(244,63,94,0.2),inset_0_2px_3px_rgba(255,255,255,1)] hover:-translate-y-0.5 overflow-hidden"
                      >
                        {/* Glass Reflections & Ambient Glow */}
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/70 via-white/20 to-transparent rounded-t-[26px] pointer-events-none" />
                        <div className="absolute -top-6 -right-6 w-20 h-20 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/25 transition-all pointer-events-none" />

                        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-[20px] bg-gradient-to-br from-rose-500 via-red-500 to-rose-700 text-white flex items-center justify-center shadow-[0_8px_18px_-2px_rgba(244,63,94,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(159,18,57,0.3)] border border-white/35 group-hover:scale-108 transition-transform duration-300 relative overflow-hidden shrink-0">
                          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 via-white/10 to-transparent rounded-t-[20px] pointer-events-none" />
                          <Trash2 className="w-6.5 h-6.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)] relative z-10" />
                        </div>
                        <span className="font-['Vazirmatn',sans-serif] font-black text-[11px] sm:text-xs text-rose-950 group-hover:text-rose-950 tracking-tight leading-none relative z-10">
                          سڕینەوەی کاڵا
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Standalone Product Account Modal */}
      {accountModalProduct && (
        <ProductAccountModal
          product={accountModalProduct}
          initialTab={accountModalInitialTab}
          onClose={() => setAccountModalProduct(null)}
        />
      )}

      {/* Driver Info Modal */}
      {selectedProductForDriver && (
        <DriverInfoModal
          product={selectedProductForDriver}
          isOpen={isDriverModalOpen}
          onClose={() => {
            setIsDriverModalOpen(false);
            setSelectedProductForDriver(null);
          }}
        />
      )}

      {/* Commission Settlement Modal (تەواوبوونی عمولە) */}
      {commissionModalProduct && (
        <CommissionSettlementModal
          product={commissionModalProduct}
          onClose={() => setCommissionModalProduct(null)}
          onCloseProduct={(prod) => {
            setCommissionModalProduct(null);
            showToast(`کاڵای "${prod.name}" بە سەرکەوتوویی گوازرایەوە بۆ بەشی (عمولەی تەواوبوو) و عمولەکەی خرایە سەر (قازانجی عمولە)`);
          }}
        />
      )}

      {/* Security Passcode Modal */}
      <SecurityPasscodeModal
        isOpen={securityModal.isOpen}
        onClose={() => setSecurityModal({ ...securityModal, isOpen: false })}
        onConfirm={onSecurityConfirm}
        title={
          securityModal.type === 'delete' ? 'سڕینەوەی کاڵا' :
          securityModal.type === 'edit' ? 'دەستکاریکردنی کاڵا' :
          securityModal.type === 'close' ? 'داخستنی کاڵا' :
          securityModal.type === 'reopen' ? 'کردنەوەی کاڵا' :
          securityModal.type === 'stock_adjust' ? 'گۆڕینی بڕی کۆگا' :
          securityModal.type === 'account' ? 'هەژماری کاڵا' :
          securityModal.type === 'reset_all_prices' ? 'سفرکردنەوەی هەموو نرخەکان' :
          'سفرکردنەوەی نرخ'
        }
        description={
          securityModal.type === 'delete' ? 'دڵنیایت لە سڕینەوەی ئەم کاڵایە؟' :
          securityModal.type === 'edit' ? 'دڵنیایت لە دەستکاریکردنی ئەم کاڵایە؟' :
          securityModal.type === 'close' ? 'دڵنیایت لە تەواوبوون و داخستنی ئەم کاڵایە؟' :
          securityModal.type === 'reopen' ? 'دڵنیایت لە دووبارە کردنەوەی ئەم کاڵایە؟' :
          securityModal.type === 'stock_adjust' ? 'دڵنیایت لە گۆڕینی بڕی ئەم کاڵایە لە کۆگا؟' :
          securityModal.type === 'account' ? 'دڵنیایت لە بینینی هەژماری ئەم کاڵایە؟' :
          securityModal.type === 'reset_all_prices' ? 'دڵنیایت لە سفرکردنەوەی نرخی سەرجەم کاڵاکان؟' :
          'دڵنیایت لە سفرکردنەوەی نرخی ئەم کاڵایە؟'
        }
        actionLabel="پشکنین"
        danger={securityModal.type === 'delete' || securityModal.type === 'close' || securityModal.type === 'reset_all_prices'}
      />

      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScan={(code) => setDebouncedSearchQuery(code)}
      />
    </div>
  );
};

export default InventoryView;
