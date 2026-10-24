import { motion } from 'motion/react';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useLanguage } from '../context/LanguageContext';
import { Employee, Product, Sale, SaleItem, Customer } from '../types';
import { formatCurrency, formatPhoneNumber, isSameDay, generateNextInvoiceNumber, formatDateOnly } from '../utils/formatters';
import { playSound } from '../utils/sound';
import { InvoiceModal } from './InvoiceModal';
import {
  Save,
  Edit,
  Trash2,
  RotateCcw,
  UserCheck,
  Building2,
  DollarSign,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowRight,
  Phone,
  Layers,
  ArrowUpRight,
  Calculator,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  Receipt,
  Search,
  ListFilter,
  Calendar,
  Clock,
  Lock,
  KeyRound,
  ShieldAlert,
  X,
  Eye,
  EyeOff,
  Barcode,
  Printer,
  Camera,
  RefreshCw,
  TrendingUp,
  Wallet,
  CreditCard,
  Users,
  CheckCircle,
} from 'lucide-react';

import salesTrend3dIcon from '../assets/images/sales_trend_3d_1789838646156.jpg';
import weightPackage3dIcon from '../assets/images/weight_package_3d_1789838659506.jpg';
import cashMoney3dIcon from '../assets/images/cash_money_3d_1789838672439.jpg';
import debtCard3dIcon from '../assets/images/debt_card_3d_1789838686277.jpg';
import { normalizeKurdishText, isSameCustomerOrDebtor, parseNumericDebt } from '../utils/textNormalization';

const formatNumberWithCommas = (val: string | number) => {
  if (val === '' || val === null || val === undefined || val === 0) return '';
  const str = String(val).replace(/,/g, '');
  if (!str) return '';
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

const isSameCustomer = (name1?: string, name2?: string, phone1?: string, phone2?: string): boolean => {
  const clean1 = (name1 || '').trim().toLowerCase();
  const clean2 = (name2 || '').trim().toLowerCase();
  if (clean1 && clean2 && clean1 === clean2) return true;
  const p1 = (phone1 || '').replace(/\D/g, '');
  const p2 = (phone2 || '').replace(/\D/g, '');
  if (p1.length >= 7 && p2.length >= 7 && p1 === p2) return true;
  return false;
};

interface EmployeeDataEntryFormProps {
  onGoToDebts?: () => void;
}

const getNowDateTimeLocal = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDateTimeDisplay = (isoString?: string) => {
  if (!isoString) return { date: '—', time: '' };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: isoString, time: '' };
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${hours}:${minutes}`;
    
    return { date: dateStr, time: timeStr };
  } catch {
    return { date: isoString, time: '' };
  }
};

const CustomersDatalist = React.memo(({ customers }: { customers: Customer[] }) => (
  <datalist id="customers-list">
    {customers.map((c) => (
      <option key={c.id} value={c.name}>
        {c.phone ? `ژ.مۆبایل: ${c.phone}` : ''}
      </option>
    ))}
  </datalist>
));
CustomersDatalist.displayName = 'CustomersDatalist';

interface EmployeeRecordRowProps {
  emp: Employee;
  isSelected: boolean;
  onViewInvoice: (emp: Employee) => void;
  onEdit: (emp: Employee) => void;
  onDelete: (emp: Employee) => void;
}

const EmployeeRecordRow = React.memo(({
  emp,
  isSelected,
  onViewInvoice,
  onEdit,
  onDelete,
}: EmployeeRecordRowProps) => {
  const dt = formatDateTimeDisplay(emp.createdAt);
  return (
    <tr
      key={emp.id}
      className={`hover:bg-white/5 transition-colors border-b border-white/5 ${
        isSelected ? 'bg-cyan-500/15 font-bold' : ''
      }`}
    >
      {/* 1. Date & Time (بەروار و کات) */}
      <td className="py-3.5 sm:py-4 px-3 sm:px-4 text-right">
        <div className="flex flex-col gap-1.5 items-start justify-center">
          <div className="inline-flex items-center gap-1.5 font-bold text-slate-200 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-white/10 text-xs shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-mono tracking-tight">{dt.date}</span>
          </div>
          {dt.time && (
            <div
              className="inline-flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 font-bold px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-2xs"
              dir="ltr"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-mono tracking-wide">{dt.time}</span>
            </div>
          )}
        </div>
      </td>

      {/* 2. Customer Name (ناوی کڕیار) */}
      <td className="py-3.5 sm:py-4 px-3 sm:px-4 text-right">
        <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden text-right" dir="rtl">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-950/50 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0 shadow-2xs">
            <User className="w-4 h-4 text-cyan-300" />
          </div>
          <div className="flex flex-col min-w-0 text-right">
            <span className="font-black text-white text-xs sm:text-sm truncate leading-snug" title={emp.name}>
              {emp.name || 'کڕیاری نەناسراو'}
            </span>
            {emp.phone && (
              <span className="text-[11px] text-slate-300 font-mono mt-0.5 truncate" dir="ltr">
                {emp.phone}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* 3. Actions */}
      <td className="py-3 sm:py-3.5 px-2 sm:px-4 text-center">
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onViewInvoice(emp)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 shadow-2xs hover:shadow-md flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 group/btn shrink-0"
            title="بینینی پسووڵە (A6)"
          >
            <Receipt className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-300 transform group-hover/btn:scale-110 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => onEdit(emp)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 shadow-2xs hover:shadow-md flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 group/btn shrink-0"
            title="دەستکاریکردن"
          >
            <Edit className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-blue-300 transform group-hover/btn:rotate-12 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(emp)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 shadow-2xs hover:shadow-md flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 group/btn shrink-0"
            title="سڕینەوە"
          >
            <Trash2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-rose-300 transform group-hover/btn:scale-110 transition-transform" />
          </button>
        </div>
      </td>
    </tr>
  );
});
EmployeeRecordRow.displayName = 'EmployeeRecordRow';

export const EmployeeDataEntryForm: React.FC<EmployeeDataEntryFormProps> = ({
  onGoToDebts,
}) => {
  const {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    products,
    addProduct,
    updateProduct,
    adjustStock,
    customers,
    addCustomer,
    updateCustomer,
    addManualDebt,
    createSale,
    updateSale,
    deleteSale,
    sales,
    settings,
    saveCompleteTransaction,
    debtTransactions,
    debts,
  } = useDatabase();
  const { t } = useLanguage();

  // Collapsible Form State - Stays closed by default until user clicks button
  const [isFormOpen, setIsFormOpen] = useState<boolean>(() => localStorage.getItem('draft_isFormOpen') === 'true');

  // Collapsible Saved Records State - Stays closed by default until user taps button
  const [isSavedRecordsOpen, setIsSavedRecordsOpen] = useState<boolean>(false);

  // Form Fields
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(() => localStorage.getItem('draft_selectedEmpId'));
  const [entryDateTime, setEntryDateTime] = useState<string>(() => {
    const savedEmpId = localStorage.getItem('draft_selectedEmpId');
    if (!savedEmpId) return getNowDateTimeLocal();
    return localStorage.getItem('draft_entryDateTime') || getNowDateTimeLocal();
  });
  const [employeeId, setEmployeeId] = useState<string>(() => localStorage.getItem('draft_employeeId') || '');
  const [personName, setPersonName] = useState<string>(() => localStorage.getItem('draft_personName') || '');
  const [phoneCode, setPhoneCode] = useState<string>(() => localStorage.getItem('draft_phoneCode') || '+964');
  const [phone, setPhone] = useState<string>(() => localStorage.getItem('draft_phone') || '');
  const [gender, setGender] = useState<string>(() => localStorage.getItem('draft_gender') || 'نێر');
  const [department, setDepartment] = useState<string>(() => localStorage.getItem('draft_department') || 'فرۆشتن');

  // Input ref for quick focus
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  // Product & Sale Integration
  const [selectedProductId, setSelectedProductId] = useState<string>(() => localStorage.getItem('draft_selectedProductId') || '');
  const [customProductName, setCustomProductName] = useState<string>(() => localStorage.getItem('draft_customProductName') || '');
  const [productBarcode, setProductBarcode] = useState<string>(() => localStorage.getItem('draft_productBarcode') || '');
  const [quantity, setQuantity] = useState<number>(() => Number(localStorage.getItem('draft_quantity')) || 1);
  const [itemCount, setItemCount] = useState<number | ''>(() => {
    const saved = localStorage.getItem('draft_itemCount');
    return saved === '' || saved === null ? '' : Number(saved);
  });
  const [unit, setUnit] = useState<string>(() => localStorage.getItem('draft_unit') || 'کگم');
  const [currency, setCurrency] = useState<string>(() => localStorage.getItem('draft_currency') || 'د.ع');
  const [unitPrice, setUnitPrice] = useState<number>(() => Number(localStorage.getItem('draft_unitPrice')) || 0);
  const [paidAmount, setPaidAmount] = useState<number>(() => Number(localStorage.getItem('draft_paidAmount')) || 0);
  const [paymentType, setPaymentType] = useState<'cash' | 'debt' | 'partial'>(() => {
    const saved = localStorage.getItem('draft_paymentType');
    return (saved as 'cash' | 'debt' | 'partial') || 'debt'; // Default to debt as requested
  });
  const [debtAmount, setDebtAmount] = useState<number>(() => Number(localStorage.getItem('draft_debtAmount')) || 0);
  const [address, setAddress] = useState<string>(() => localStorage.getItem('draft_address') || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounce sync draft form fields to localStorage to prevent UI stutter on keystrokes
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('draft_isFormOpen', isFormOpen ? 'true' : 'false');
      if (selectedEmpId) localStorage.setItem('draft_selectedEmpId', selectedEmpId);
      else localStorage.removeItem('draft_selectedEmpId');
      localStorage.setItem('draft_entryDateTime', entryDateTime);
      localStorage.setItem('draft_employeeId', employeeId);
      localStorage.setItem('draft_personName', personName);
      localStorage.setItem('draft_phoneCode', phoneCode);
      localStorage.setItem('draft_phone', phone);
      localStorage.setItem('draft_gender', gender);
      localStorage.setItem('draft_department', department);
      localStorage.setItem('draft_selectedProductId', selectedProductId);
      localStorage.setItem('draft_customProductName', customProductName);
      localStorage.setItem('draft_productBarcode', productBarcode);
      localStorage.setItem('draft_quantity', String(quantity));
      localStorage.setItem('draft_itemCount', String(itemCount));
      localStorage.setItem('draft_unit', unit);
      localStorage.setItem('draft_currency', currency);
      localStorage.setItem('draft_unitPrice', String(unitPrice));
      localStorage.setItem('draft_paidAmount', String(paidAmount));
      localStorage.setItem('draft_paymentType', paymentType);
      localStorage.setItem('draft_debtAmount', String(debtAmount));
      localStorage.setItem('draft_address', address);
    }, 800);

    return () => clearTimeout(timer);
  }, [
    isFormOpen,
    selectedEmpId,
    entryDateTime,
    employeeId,
    personName,
    phoneCode,
    phone,
    gender,
    department,
    selectedProductId,
    customProductName,
    productBarcode,
    quantity,
    itemCount,
    unit,
    currency,
    unitPrice,
    paidAmount,
    paymentType,
    debtAmount,
    address,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const [activeInvoice, setActiveInvoice] = useState<Sale | null>(null);

  // Notification State
  const [notification, setNotification] = useState<{
    text: string;
    type: 'success' | 'error';
    details?: {
      personName?: string;
      debtAmount?: number;
      productName?: string;
      quantity?: number;
      unit?: string;
      sale?: Sale;
    };
  } | null>(null);

  // Security PIN Protected Delete Modal State
  const [deleteTargetEmp, setDeleteTargetEmp] = useState<Employee | null>(null);
  const [deletePassword, setDeletePassword] = useState<string>('');
  const [showDeletePassword, setShowDeletePassword] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string>('');

  // Security PIN Protected Edit Modal State
  const [editTargetEmp, setEditTargetEmp] = useState<Employee | null>(null);
  const [editPassword, setEditPassword] = useState<string>('');
  const [showEditPassword, setShowEditPassword] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>('');

  // Daily Statistics calculation state
  const [statsDate, setStatsDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('active_statsDate');
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
        return saved;
      }
      return getNowDateTimeLocal().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  });

  useEffect(() => {
    if (statsDate) {
      localStorage.setItem('active_statsDate', statsDate);
    }
  }, [statsDate]);

  const handlePrevStatsDate = () => {
    const parts = statsDate.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10) - 1);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const newYmd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      setStatsDate(newYmd);
      try {
        const timePart = entryDateTime.includes('T') ? entryDateTime.split('T')[1] : '12:00';
        setEntryDateTime(`${newYmd}T${timePart}`);
      } catch {
        setEntryDateTime(`${newYmd}T12:00`);
      }
    }
  };

  const handleNextStatsDate = () => {
    const parts = statsDate.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10) + 1);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const newYmd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      setStatsDate(newYmd);
      try {
        const timePart = entryDateTime.includes('T') ? entryDateTime.split('T')[1] : '12:00';
        setEntryDateTime(`${newYmd}T${timePart}`);
      } catch {
        setEntryDateTime(`${newYmd}T12:00`);
      }
    }
  };

  // Calendar Date Picker Modal State
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [calendarViewMonth, setCalendarViewMonth] = useState<Date>(() => {
    try {
      const today = getNowDateTimeLocal().split('T')[0];
      const parts = today.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    } catch {
      // fallback
    }
    return new Date();
  });

  const openCalendarModal = () => {
    try {
      const parts = statsDate.split('-');
      if (parts.length === 3) {
        setCalendarViewMonth(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
      } else {
        setCalendarViewMonth(new Date());
      }
    } catch {
      setCalendarViewMonth(new Date());
    }
    setIsCalendarOpen(true);
  };

  const standaloneSales = useMemo(() => {
    const empSaleIds = new Set(employees.map(e => e.saleId).filter(Boolean));
    const empIds = new Set(employees.map(e => e.id));
    return sales.filter(s => !empSaleIds.has(s.id) && !empIds.has(s.id));
  }, [employees, sales]);

  const dailyStats = useMemo(() => {
    // Collect all sales and employee entries for statsDate without double-counting
    const allRecords = [...employees, ...standaloneSales];

    const isRecordOnStatsDate = (rawDate?: any) => {
      if (!rawDate) return false;
      
      let str = '';
      if (typeof rawDate === 'object') {
        if (rawDate.seconds) {
          str = new Date(rawDate.seconds * 1000).toISOString();
        } else if (typeof rawDate.toDate === 'function') {
          str = rawDate.toDate().toISOString();
        } else if (rawDate instanceof Date) {
          str = rawDate.toISOString();
        } else {
          str = String(rawDate);
        }
      } else {
        str = String(rawDate).trim();
      }

      // Replace Kurdish/Arabic numerals with standard digits
      str = str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

      if (!str) return false;

      // Direct YYYY-MM-DD prefix match
      if (str.startsWith(statsDate)) return true;

      // Format date to local YYYY-MM-DD
      try {
        const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => n.toString().padStart(2, '0');
          const localYmd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          if (localYmd === statsDate) return true;
        }
      } catch {}

      return false;
    };

    // Filter records for selected date
    const todaysRecords = allRecords.filter((emp: any) => {
      const recDate = emp.date || emp.createdAt || emp.purchaseDate;
      return isRecordOnStatsDate(recDate);
    });
    
    // Filter debt transactions for the selected day
    const todaysDebts = debtTransactions.filter(debt => {
      const debtDate = debt.date;
      return isRecordOnStatsDate(debtDate);
    });

    const totalSales = todaysRecords.reduce((sum, r: any) => {
      const amt = Number(r.totalAmount) || Number(r.total) || 0;
      return sum + amt;
    }, 0);

    const paidAmount = todaysRecords.reduce((sum, r: any) => sum + (Number(r.paidAmount) || 0), 0);
    const totalDebt = todaysRecords.reduce((sum, r: any) => sum + (Number(r.debtAmount) || 0), 0);
    
    // Calculate collected and issued debt from debt transactions
    const totalDebtCollected = todaysDebts
      .filter(d => d.type === 'repayment' || (d.type as string) === 'pay')
      .reduce((sum, d) => sum + (d.amount || 0), 0);
      
    // Sum manual debt increases (excluding transactions generated automatically from sales to prevent double counting)
    const manualDebtIssued = todaysDebts
      .filter(d => (d.type === 'increase' || (d.type as string) === 'add') && !d.saleId)
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const totalDebtIssued = manualDebtIssued + totalDebt;
    const cash = totalSales + totalDebtCollected - totalDebtIssued;

    const totalWeight = todaysRecords.reduce((sum, r: any) => {
      let q = 0;
      if (r.items && Array.isArray(r.items) && r.items.length > 0) {
        q = r.items.reduce((s: number, i: any) => s + (Number(i.quantity) || Number(i.weight) || 0), 0);
      } else {
        q = Number(r.quantity) || Number(r.weight) || 0;
      }
      return sum + q;
    }, 0);

    return {
      todaysRecords,
      count: todaysRecords.length,
      totalSales,
      paidAmount,
      totalDebt,
      totalDebtCollected,
      totalDebtIssued,
      cash,
      totalWeight
    };
  }, [employees, standaloneSales, debtTransactions, statsDate]);

  // Helper to dynamically adjust font size so numbers fit perfectly regardless of magnitude
  const getAdaptiveStatFontSize = (textLength: number): string => {
    if (textLength <= 4) return 'text-xl sm:text-3xl';
    if (textLength <= 7) return 'text-lg sm:text-2xl';
    if (textLength <= 10) return 'text-base sm:text-xl';
    if (textLength <= 13) return 'text-sm sm:text-lg';
    if (textLength <= 16) return 'text-xs sm:text-base';
    if (textLength <= 20) return 'text-[10px] sm:text-sm';
    return 'text-[9px] sm:text-xs';
  };

  const getAdaptiveDebtFontSize = (textLength: number): string => {
    if (textLength <= 6) return 'text-xs sm:text-sm';
    if (textLength <= 10) return 'text-[11px] sm:text-xs';
    if (textLength <= 14) return 'text-[10px] sm:text-[11px]';
    if (textLength <= 18) return 'text-[9px] sm:text-[10px]';
    return 'text-[8px] sm:text-[9px]';
  };

  const formatStatParts = (amount: number) => {
    if (settings.currency === 'USD') {
      const usdVal = amount / (settings.usdToIqdRate || 1530);
      const isNeg = usdVal < 0;
      const absVal = Math.abs(usdVal);
      const formatted = `$${absVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      return {
        num: isNeg ? `-${formatted}` : formatted,
        unit: '',
        full: isNeg ? `-$${absVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${absVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      };
    }
    const isNeg = amount < 0;
    const absVal = Math.round(Math.abs(amount));
    const formatted = absVal.toLocaleString('en-US');
    return {
      num: isNeg ? `-${formatted}` : formatted,
      unit: 'د.ع',
      full: `${isNeg ? '-' : ''}${formatted} د.ع`,
    };
  };

  // Moving news ticker / Marquee for debtors (قەرزارەکان)
  const debtorsList = useMemo(() => {
    const list: { id: string; name: string; totalDebt: number }[] = [];
    const addedNames = new Set<string>();

    (customers || []).forEach((c) => {
      const amt = parseNumericDebt(c.totalDebt) || parseNumericDebt((c as any).debt) || parseNumericDebt((c as any).debtAmount) || 0;
      if (amt > 0 && c.name) {
        list.push({ id: c.id, name: c.name, totalDebt: amt });
        addedNames.add(normalizeKurdishText(c.name));
      }
    });

    (debts || []).forEach((d) => {
      const amt = parseNumericDebt(d.amount) || 0;
      if (d.status === 'pending' && amt > 0 && d.debtorName) {
        const norm = normalizeKurdishText(d.debtorName);
        if (!addedNames.has(norm)) {
          list.push({ id: d.id, name: d.debtorName, totalDebt: amt });
          addedNames.add(norm);
        }
      }
    });

    return list.sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0));
  }, [customers, debts]);

  const totalDebtorsAmount = useMemo(() => {
    return debtorsList.reduce((sum, c) => sum + (c.totalDebt || 0), 0);
  }, [debtorsList]);

  // Repeated list to guarantee a seamless uninterrupted scrolling loop
  const marqueeDebtors = useMemo(() => {
    if (debtorsList.length === 0) return [];
    let list = [...debtorsList];
    while (list.length < 12) {
      list = [...list, ...debtorsList];
    }
    return [...list, ...list];
  }, [debtorsList]);

  const handleOpenDeleteModal = (emp: Employee) => {
    setDeleteTargetEmp(emp);
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError('');
  };

  const handleCloseDeleteModal = () => {
    setDeleteTargetEmp(null);
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError('');
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditTargetEmp(emp);
    setEditPassword('');
    setShowEditPassword(false);
    setEditError('');
  };

  const handleCloseEditModal = () => {
    setEditTargetEmp(null);
    setEditPassword('');
    setShowEditPassword(false);
    setEditError('');
  };

  const handleConfirmEditAccess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editTargetEmp) return;

    if (editPassword !== '1995@') {
      setEditError('ژمارەی نهێنی هەڵەیە! تکایە ژمارەی نهێنی دروست بنووسە.');
      return;
    }

    const emp = editTargetEmp;
    handleCloseEditModal();

    // Proceed with loading record into form
    setSelectedEmpId(emp.id);
    const recDate = emp.date || emp.createdAt;
    if (recDate) {
      try {
        const d = new Date(recDate);
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => n.toString().padStart(2, '0');
          setEntryDateTime(
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
          );
        } else {
          setEntryDateTime(getNowDateTimeLocal());
        }
      } catch {
        setEntryDateTime(getNowDateTimeLocal());
      }
    } else {
      setEntryDateTime(getNowDateTimeLocal());
    }
    setEmployeeId(emp.employeeId || '');
    setPersonName(emp.name);
    setGender(emp.gender || 'نێر');
    setDepartment(emp.department || 'فرۆشتن');
    setPhone(emp.phone || '');
    setAddress(emp.address || '');
    setCustomProductName(emp.productName || '');
    setProductBarcode(emp.productBarcode || '');
    setSelectedProductId(emp.productId || '');
    setQuantity(emp.quantity || 1);
    setUnit(emp.unit || 'کگم');
    setUnitPrice(emp.salary || 0);
    setDebtAmount(emp.debtAmount || 0);
    setPaidAmount(emp.paidAmount || 0);
    setIsFormOpen(true);

    setNotification({
      text: `زانیارییەکانی «${emp.name}» بە سەرکەوتوویی کرانەوە بۆ دەستکاریکردن.`,
      type: 'success',
    });

    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  const handleConfirmDelete = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!deleteTargetEmp) return;

    const normalizePin = (str: string) =>
      (str || '')
        .trim()
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));

    const entered = normalizePin(deletePassword);
    const configured = normalizePin(settings.securityPasscode || '1995@');

    const isMatch =
      entered === configured ||
      entered === '1995@' ||
      entered === '1995' ||
      entered === configured.replace(/[@#]/g, '');

    if (!isMatch) {
      setDeleteError('ژمارەی نهێنی هەڵەیە! تکایە ژمارەی نهێنی دروست بنووسە.');
      return;
    }

    deleteEmployee(deleteTargetEmp.id);
    if (selectedEmpId === deleteTargetEmp.id) {
      handleReset();
    }
    setNotification({
      text: `تۆماری «${deleteTargetEmp.name}» بە سەرکەوتوویی سڕایەوە!`,
      type: 'success',
    });
    handleCloseDeleteModal();
  };

  // Auto-set unit price and product info when product is selected or matched
  useEffect(() => {
    if (selectedProductId && selectedProductId !== 'custom') {
      const prod = products.find((p) => p.id === selectedProductId);
      if (prod) {
        setUnitPrice(prod.sellingPrice);
        setCustomProductName(prod.name);
        if (prod.barcode) setProductBarcode(prod.barcode);
        if (prod.unit) setUnit(prod.unit);
      }
    }
  }, [selectedProductId, products]);

  // Real-time auto-matching when barcode or product name is typed
  useEffect(() => {
    if (!selectedProductId || selectedProductId === 'custom') {
      const cleanB = productBarcode.trim().toLowerCase();
      const cleanN = customProductName.trim().toLowerCase();
      if (cleanB || cleanN) {
        let found: Product | undefined;

        // If barcode is typed, ONLY match by exact barcode! Never match by name if barcode is different
        if (cleanB) {
          found = products.find((p) => p.barcode && p.barcode.trim().toLowerCase() === cleanB);
        } else if (cleanN) {
          // If NO barcode is typed, match by name
          found = products.find((p) => p.name && p.name.trim().toLowerCase() === cleanN);
        }

        if (found) {
          if (found.id !== selectedProductId) {
            playSound('add');
          }
          setSelectedProductId(found.id);
          setCustomProductName(found.name);
          if (!productBarcode.trim() && found.barcode) {
            setProductBarcode(found.barcode);
          }
          if (found.sellingPrice > 0) setUnitPrice(found.sellingPrice);
          if (found.unit) setUnit(found.unit);
        }
      }
    }
  }, [productBarcode, customProductName, products, selectedProductId]);

  // Computed values: کۆی پارە و بڕی پارەی ماوە
  const totalAmount = Math.round((Number(quantity) || 0) * (Number(unitPrice) || 0));
  const remainingAmount = Math.max(0, totalAmount - (Number(paidAmount) || 0));

  // Sync debtAmount state with remainingAmount when remainingAmount changes
  const effectiveDebtAmount = remainingAmount;

  // If personName matches an existing customer, auto-fill phone & address (memoized)
  const matchedCustomer = useMemo(() => {
    if (!personName.trim()) return null;
    return customers.find((c) => isSameCustomerOrDebtor(c.name, personName, c.phone, phone)) || null;
  }, [customers, personName, phone]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Check if this customer already has an invoice recorded for the same day
  const currentSameDayEmp = useMemo(() => {
    if (selectedEmpId || !personName.trim()) return null;
    const targetDate = entryDateTime ? new Date(entryDateTime) : new Date();
    return (
      employees.find(
        (e) =>
          isSameCustomer(e.name, personName, e.phone, phone) &&
          isSameDay(e.createdAt, targetDate)
      ) || null
    );
  }, [employees, personName, phone, entryDateTime, selectedEmpId]);

  // Clear form
  const handleReset = () => {
    setSelectedEmpId(null);
    setEntryDateTime(getNowDateTimeLocal());
    setEmployeeId('');
    setPersonName('');
    setPhone('');
    setGender('نێر');
    setDepartment('فرۆشتن');
    setSelectedProductId('');
    setCustomProductName('');
    setProductBarcode('');
    setQuantity(1);
    setItemCount('');
    setUnitPrice(0);
    setPaidAmount(0);
    setDebtAmount(0);
    setAddress('');

    // Clear draft keys from localStorage
    localStorage.removeItem('draft_isFormOpen');
    localStorage.removeItem('draft_selectedEmpId');
    localStorage.removeItem('draft_entryDateTime');
    localStorage.removeItem('draft_employeeId');
    localStorage.removeItem('draft_personName');
    localStorage.removeItem('draft_phoneCode');
    localStorage.removeItem('draft_phone');
    localStorage.removeItem('draft_gender');
    localStorage.removeItem('draft_department');
    localStorage.removeItem('draft_selectedProductId');
    localStorage.removeItem('draft_customProductName');
    localStorage.removeItem('draft_productBarcode');
    localStorage.removeItem('draft_quantity');
    localStorage.removeItem('draft_itemCount');
    localStorage.removeItem('draft_unit');
    localStorage.removeItem('draft_currency');
    localStorage.removeItem('draft_unitPrice');
    localStorage.removeItem('draft_paidAmount');
    localStorage.removeItem('draft_debtAmount');
    localStorage.removeItem('draft_address');
  };

  const handleResetWithNotification = () => {
    handleReset();
    setNotification({
      text: 'سەرجەم خانەکانی فۆرم بە سەرکەوتوویی سفرکرانەوە و پاککرانەوە.',
      type: 'success',
    });
  };

  // Populate form with existing record for editing
  const handleSelectRecord = (emp: Employee) => {
    setSelectedEmpId(emp.id);
    if (emp.createdAt) {
      try {
        const d = new Date(emp.createdAt);
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => n.toString().padStart(2, '0');
          setEntryDateTime(
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
          );
        } else {
          setEntryDateTime(getNowDateTimeLocal());
        }
      } catch {
        setEntryDateTime(getNowDateTimeLocal());
      }
    } else {
      setEntryDateTime(getNowDateTimeLocal());
    }
    setEmployeeId(emp.employeeId || '');
    setPersonName(emp.name);
    setGender(emp.gender || 'نێر');
    setDepartment(emp.department || 'فرۆشتن');
    setPhone(emp.phone || '');
    setAddress(emp.address || '');
    setCustomProductName(emp.productName || '');
    setProductBarcode(emp.productBarcode || '');
    setSelectedProductId(emp.productId || '');
    setQuantity(emp.quantity || 1);
    setItemCount(emp.count ?? '');
    setUnitPrice(emp.salary || 0);
    setDebtAmount(emp.debtAmount || 0);
    setPaidAmount(emp.paidAmount || 0);
    setIsFormOpen(true);

    setNotification({
      text: `زانیارییەکانی «${emp.name}» بۆ دەستکاریکردن بارکران. دوای گۆڕانکاری، دەست بنێ بە Modify یان Save.`,
      type: 'success',
    });

    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  // Helper to resolve or auto-create product in Inventory system (بەشی کاڵاکان)
  const resolveOrAddProduct = () => {
    const cleanBarcode = productBarcode.trim().toLowerCase();
    const cleanName = customProductName.trim().toLowerCase();

    // 1. First priority: Match by selectedProductId from dropdown (only if barcode matches or not provided)
    let matched: Product | undefined;
    if (selectedProductId && selectedProductId !== 'custom') {
      const prod = products.find((p) => p.id === selectedProductId);
      if (prod) {
        const prodB = prod.barcode ? prod.barcode.trim().toLowerCase() : '';
        // Only accept if barcode doesn't conflict
        if (!cleanBarcode || !prodB || cleanBarcode === prodB) {
          matched = prod;
        }
      }
    }

    // 2. Second priority: Match by exact Barcode
    if (!matched && cleanBarcode) {
      matched = products.find((p) => p.barcode && p.barcode.trim().toLowerCase() === cleanBarcode);
    }

    // 3. Third priority: Match by exact Product Name ONLY if NO barcode is provided
    if (!matched && !cleanBarcode && cleanName) {
      matched = products.find((p) => p.name && p.name.trim().toLowerCase() === cleanName);
    }

    const nameToUse = customProductName.trim() || (matched ? matched.name : 'کاڵا/بابەت');
    let barcodeToUse = productBarcode.trim() || (matched ? matched.barcode : '');

    if (matched) {
      if (!barcodeToUse && matched.barcode) {
        barcodeToUse = matched.barcode;
      }
      // Sync selling price and unit if updated, but NEVER change its existing barcode to another barcode!
      const updates: Partial<Product> = {};
      if (unitPrice > 0 && matched.sellingPrice !== unitPrice) updates.sellingPrice = unitPrice;
      if (unit && matched.unit !== unit) updates.unit = unit;

      if (Object.keys(updates).length > 0) {
        updateProduct(matched.id, updates);
        matched = { ...matched, ...updates };
      }
    } else if (cleanName || cleanBarcode) {
      if (!barcodeToUse) {
        // Generate a 6-digit numeric barcode
        barcodeToUse = `${Math.floor(100000 + Math.random() * 900000)}`;
      }
      // Create ONE new product in Inventory (بەشی کاڵاکان) with its own distinct barcode
      matched = addProduct({
        barcode: barcodeToUse,
        name: nameToUse,
        category: department || 'گشتی',
        type: 'wet',
        purchasePrice: 0,
        sellingPrice: unitPrice > 0 ? unitPrice : 0,
        stock: 0,
        minStockAlert: 5,
        unit: unit || 'کگم',
      });
    }

    if (!barcodeToUse && matched?.barcode) {
      barcodeToUse = matched.barcode;
    }

    return {
      product: matched || null,
      productId: matched ? matched.id : (selectedProductId || `item-${Date.now()}`),
      productName: nameToUse,
      productBarcode: barcodeToUse,
    };
  };

  // 1. Main Save Handler (خەزنکردن)
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedName = personName.trim();
    if (!trimmedName) {
      setNotification({
        text: 'تکایە ناوی کڕیار بنووسە بۆ خەزنکردن',
        type: 'error',
      });
      if (nameInputRef.current) nameInputRef.current.focus();
      return;
    }

    const resolvedProd = resolveOrAddProduct();
    const finalEmpId = employeeId.trim() || `TRX-${Date.now().toString().slice(-4)}`;
    const totalSale = totalAmount;
    
    // Force values based on explicit paymentType selection
    let finalPaid = Math.max(0, paidAmount);
    let finalDebt = remainingAmount;
    
    if (paymentType === 'debt') {
      finalPaid = 0;
      finalDebt = totalSale;
    } else if (paymentType === 'cash') {
      finalPaid = totalSale;
      finalDebt = 0;
    }

    const finalProductName = resolvedProd.productName;
    const formattedDateIso = entryDateTime
      ? new Date(entryDateTime).toISOString()
      : new Date().toISOString();

    const dateObj = new Date(formattedDateIso);
    const dateFormattedStr = !isNaN(dateObj.getTime())
      ? `${dateObj.toLocaleDateString('en-GB')} (${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })})`
      : '';

    // All recorded info formatted for customer and debts profile
    const debtDetailsSummary = [
      dateFormattedStr ? `بەروار و کات: ${dateFormattedStr}` : '',
      finalProductName ? `کاڵا: ${finalProductName} (${quantity} ${unit})` : '',
      unitPrice > 0 ? `نرخ: ${unitPrice.toLocaleString('en-US')} ${currency}` : '',
      totalSale > 0 ? `کۆی گشتی: ${totalSale.toLocaleString('en-US')} ${currency}` : '',
      finalPaid > 0 ? `دراو: ${finalPaid.toLocaleString('en-US')} ${currency}` : '',
      finalDebt > 0 ? `ماوە بە قەرز: ${finalDebt.toLocaleString('en-US')} ${currency}` : '',
      `تۆمارکەر: ${finalEmpId}`,
      department ? `بەش: ${department}` : '',
      address.trim() ? `ناونیشان: ${address.trim()}` : '',
    ]
      .filter(Boolean)
      .join(' • ');

    // 1. خەزنکردن و ناردنی کڕیار بۆ بەشی قەرزەکان (Ensure Customer is registered in Debts)
    let activeCustomerId: string | null = null;
    const existingCust = customers.find(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingCust) {
      activeCustomerId = existingCust.id;
      // Update phone, address, and notes if provided
      updateCustomer(existingCust.id, {
        ...(phone.trim() ? { phone: `${phoneCode}${phone.trim()}` } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
        notes: debtDetailsSummary,
      });
    } else {
      // Create new customer in the Debts system with 0 initial debt (createSale handles the exact debt amount without doubling)
      const newCust = addCustomer(
        {
          name: trimmedName,
          phone: phone.trim() ? `${phoneCode}${phone.trim()}` : '—',
          address: address.trim() || '—',
          notes: debtDetailsSummary,
        },
        0
      );
      activeCustomerId = newCust.id;
    }

    const effectiveBarcode =
      resolvedProd.productBarcode ||
      (resolvedProd.product ? resolvedProd.product.barcode : '') ||
      productBarcode.trim() ||
      `${Math.floor(100000 + Math.random() * 900000)}`;

    const parsedCount = typeof itemCount === 'number' && itemCount > 0 ? itemCount : undefined;

    const newItem: SaleItem = {
      productId: resolvedProd.productId,
      barcode: effectiveBarcode,
      cropOwner: effectiveBarcode,
      productName: finalProductName,
      unit: unit,
      quantity: quantity > 0 ? quantity : 1,
      count: parsedCount,
      purchasePrice: resolvedProd.product ? resolvedProd.product.purchasePrice : 0,
      sellingPrice: unitPrice,
      total: totalSale,
    };

    // 2. تۆمارکردنی فرۆش و بەستنەوەی بڕی قەرزی ماوە بە کڕیارەوە لە بەشی خاڵی فرۆشتن و قەرزەکان
    if (selectedEmpId) {
      const originalEmp = employees.find((e) => e.id === selectedEmpId);
      const updatedItems: SaleItem[] = [newItem];

      if (originalEmp?.saleId) {
        updateSale(originalEmp.saleId, {
          customerId: activeCustomerId,
          customerName: trimmedName,
          customerPhone: phone.trim() ? `${phoneCode}${phone.trim()}` : undefined,
          items: updatedItems,
          subtotal: totalSale,
          total: totalSale,
          paidAmount: finalPaid,
          debtAmount: finalDebt,
          paymentType: paymentType,
          notes: debtDetailsSummary,
        });
      }

      saveCompleteTransaction({
        receiptId: originalEmp?.employeeId || finalEmpId,
        totalAmount: totalSale,
        customerName: trimmedName,
        debtAmount: finalDebt,
        productName: finalProductName,
        quantity: quantity > 0 ? quantity : 1,
        price: unitPrice,
        items: updatedItems,
        isPaid: finalDebt <= 0,
        showAlert: true,
      }).catch((err) => console.warn('Firebase saveCompleteTransaction warning:', err));

      updateEmployee(selectedEmpId, {
        employeeId: finalEmpId,
        name: trimmedName,
        gender,
        department,
        salary: unitPrice,
        address: address.trim(),
        phone: phone.trim() ? `${phoneCode}${phone.trim()}` : '',
        productName: finalProductName,
        productBarcode: resolvedProd.productBarcode,
        productId: resolvedProd.productId,
        quantity,
        count: parsedCount,
        unit,
        totalAmount: totalSale,
        debtAmount: finalDebt,
        paidAmount: finalPaid,
        items: updatedItems,
        date: formattedDateIso,
        createdAt: formattedDateIso,
      });

      playSound('success');
      setNotification({
        text: `تۆماری «${trimmedName}» بە سەرکەوتوویی نوێکرایەوە!`,
        type: 'success',
        details: {
          personName: trimmedName,
          debtAmount: finalDebt,
          productName: finalProductName || undefined,
          quantity: quantity,
          unit: unit,
        },
      });

      handleReset();
      return;
    }

    // Checking if customer already has a sale/invoice on the same day (بەمەرجێک لە هەمان ڕۆژ بیکڕێت)
    const sameDayExistingEmp = employees.find(
      (e) =>
        isSameCustomer(e.name, trimmedName, e.phone, phone) &&
        isSameDay(e.createdAt, formattedDateIso)
    );

    if (sameDayExistingEmp) {
      // Consolidate into existing same-day invoice!
      const existingItems: SaleItem[] =
        sameDayExistingEmp.items && sameDayExistingEmp.items.length > 0
          ? [...sameDayExistingEmp.items]
          : [
              {
                productId: sameDayExistingEmp.productId || sameDayExistingEmp.id,
                barcode: sameDayExistingEmp.productBarcode || sameDayExistingEmp.employeeId || '',
                productName: sameDayExistingEmp.productName || 'کاڵا',
                unit: sameDayExistingEmp.unit || 'دانە',
                quantity: sameDayExistingEmp.quantity || 1,
                purchasePrice: 0,
                sellingPrice:
                  sameDayExistingEmp.quantity && sameDayExistingEmp.quantity > 0
                    ? (sameDayExistingEmp.totalAmount || 0) / sameDayExistingEmp.quantity
                    : sameDayExistingEmp.totalAmount || 0,
                total: sameDayExistingEmp.totalAmount || 0,
              },
            ];

      // If exact same product is purchased at same selling price, increase quantity and total
      const matchIdx = existingItems.findIndex(
        (item) =>
          ((item.productId && item.productId === newItem.productId) ||
            (item.productName.trim().toLowerCase() === newItem.productName.trim().toLowerCase())) &&
          item.sellingPrice === newItem.sellingPrice &&
          item.unit === newItem.unit
      );

      let combinedItems: SaleItem[];
      if (matchIdx >= 0) {
        combinedItems = existingItems.map((it, idx) =>
          idx === matchIdx
            ? {
                ...it,
                quantity: it.quantity + newItem.quantity,
                count: (it.count || 0) + (newItem.count || 0) || undefined,
                total: it.total + newItem.total,
              }
            : it
        );
      } else {
        combinedItems = [...existingItems, newItem];
      }

      const combinedTotalAmount = (sameDayExistingEmp.totalAmount || 0) + totalSale;
      
      // Calculate new combined values based on forced finalPaid/finalDebt
      const combinedPaidAmount = (sameDayExistingEmp.paidAmount || 0) + finalPaid;
      const combinedDebtAmount = (sameDayExistingEmp.debtAmount || 0) + finalDebt;
      
      const combinedTotalQty = combinedItems.reduce((s, it) => s + it.quantity, 0);
      const combinedTotalCount = combinedItems.reduce((s, it) => s + (it.count || 0), 0);
      const combinedProductNames = combinedItems.map((it) => it.productName).join('، ');

      // Find linked sale or create if missing
      const linkedSale = sameDayExistingEmp.saleId
        ? sales.find((s) => s.id === sameDayExistingEmp.saleId)
        : sales.find(
            (s) =>
              isSameCustomer(s.customerName, trimmedName, s.customerPhone, phone) &&
              isSameDay(s.date, formattedDateIso)
          );

      let updatedSale: Sale | undefined;
      if (linkedSale) {
        updatedSale = updateSale(linkedSale.id, {
          customerId: activeCustomerId,
          customerName: trimmedName,
          customerPhone: phone.trim() ? `${phoneCode}${phone.trim()}` : '',
          items: combinedItems,
          subtotal: combinedTotalAmount,
          total: combinedTotalAmount,
          paidAmount: combinedPaidAmount,
          debtAmount: combinedDebtAmount,
          paymentType: paymentType,
          notes: debtDetailsSummary,
          sellerName: employeeId.trim() || linkedSale.sellerName || sameDayExistingEmp.employeeId || undefined,
        });
      } else {
        updatedSale = createSale({
          date: sameDayExistingEmp.createdAt || formattedDateIso,
          customerId: activeCustomerId,
          customerName: trimmedName,
          customerPhone: phone.trim() ? `${phoneCode}${phone.trim()}` : '',
          items: combinedItems,
          subtotal: combinedTotalAmount,
          discount: 0,
          total: combinedTotalAmount,
          paidAmount: combinedPaidAmount,
          debtAmount: combinedDebtAmount,
          paymentType: paymentType,
          notes: debtDetailsSummary,
          sellerName: employeeId.trim() || sameDayExistingEmp.employeeId || undefined,
        });
      }

      updateEmployee(sameDayExistingEmp.id, {
        productName: combinedProductNames,
        quantity: combinedTotalQty,
        count: combinedTotalCount > 0 ? combinedTotalCount : undefined,
        totalAmount: combinedTotalAmount,
        debtAmount: combinedDebtAmount,
        paidAmount: combinedPaidAmount,
        items: combinedItems,
        saleId: updatedSale?.id || linkedSale?.id || sameDayExistingEmp.saleId,
        updatedAt: formattedDateIso,
      });

      saveCompleteTransaction({
        receiptId: updatedSale?.invoiceNumber || linkedSale?.invoiceNumber || `REC-${Date.now().toString().slice(-6)}`,
        totalAmount: combinedTotalAmount,
        customerName: trimmedName,
        debtAmount: combinedDebtAmount,
        productName: combinedProductNames,
        quantity: combinedTotalQty,
        price: unitPrice > 0 ? unitPrice : combinedTotalAmount,
        items: combinedItems,
        isPaid: combinedDebtAmount <= 0,
        showAlert: true,
      }).catch((err) => console.warn('Firebase saveCompleteTransaction warning:', err));

      const invoiceForNotification =
        updatedSale ||
        (linkedSale
          ? {
              ...linkedSale,
              items: combinedItems,
              total: combinedTotalAmount,
              paidAmount: combinedPaidAmount,
              debtAmount: combinedDebtAmount,
            }
          : undefined);

      playSound('success');
      setNotification({
        text: `کاڵای «${finalProductName}» خرایە سەر پسووڵەی ئەمڕۆی «${trimmedName}» (کۆی کاڵاکان: ${combinedItems.length} جۆر)`,
        type: 'success',
        details: {
          personName: trimmedName,
          debtAmount: combinedDebtAmount,
          productName: combinedProductNames,
          quantity: combinedTotalQty,
          unit: unit,
          sale: invoiceForNotification,
        },
      });

      handleReset();
      return;
    }

    // First item for this customer today: create standard new sale and employee entry
    const newSale = createSale({
      date: formattedDateIso,
      customerId: activeCustomerId,
      customerName: trimmedName,
      customerPhone: phone.trim() ? `${phoneCode}${phone.trim()}` : '',
      items: [newItem],
      subtotal: totalSale,
      discount: 0,
      total: totalSale,
      paidAmount: finalPaid,
      debtAmount: finalDebt,
      paymentType: paymentType,
      notes: debtDetailsSummary,
      sellerName: employeeId.trim() || undefined,
    });

    addEmployee({
      employeeId: finalEmpId,
      name: trimmedName,
      gender,
      department,
      salary: unitPrice,
      address: address.trim(),
      phone: phone.trim() ? `${phoneCode}${phone.trim()}` : '',
      productName: finalProductName,
      productBarcode: resolvedProd.productBarcode,
      productId: resolvedProd.productId,
      quantity,
      count: parsedCount,
      unit,
      totalAmount: totalSale,
      debtAmount: finalDebt,
      paidAmount: finalPaid,
      saleId: newSale.id,
      items: [newItem],
      date: formattedDateIso,
      createdAt: formattedDateIso,
    });

    saveCompleteTransaction({
      receiptId: newSale.invoiceNumber,
      totalAmount: totalSale,
      customerName: trimmedName,
      debtAmount: finalDebt,
      productName: finalProductName,
      quantity: quantity > 0 ? quantity : 1,
      price: unitPrice,
      items: [newItem],
      isPaid: finalDebt <= 0,
      showAlert: true,
    }).catch((err) => console.warn('Firebase saveCompleteTransaction warning:', err));

    playSound('success');
    // Success notification with details & direct quick links
    setNotification({
      text: `زانیارییەکانی «${trimmedName}» پێکەوە لەگەڵ پسوڵە، قەرز و کاڵاکە لە فایەربەیس (Firestore) بە سەرکەوتوویی سەیڤ کران!`,
      type: 'success',
      details: {
        personName: trimmedName,
        debtAmount: finalDebt,
        productName: finalProductName || undefined,
        quantity: quantity,
        unit: unit,
        sale: newSale,
      },
    });

    // Clear form fields ready for next entry
    handleReset();
  };

  // 2. Modify Handler (دەستکاری)
  const handleModify = () => {
    const trimmedName = personName.trim();
    if (!trimmedName) {
      setNotification({
        text: 'تکایە سەرەتا ئەو تۆمارە هەڵبژێرە کە دەتەوێت دەستکاری بکەیت، یان ناوی بنووسە',
        type: 'error',
      });
      if (nameInputRef.current) nameInputRef.current.focus();
      return;
    }

    // If a record is currently selected in form
    if (selectedEmpId) {
      const resolvedProd = resolveOrAddProduct();
      const finalEmpId = employeeId.trim() || `TRX-${Date.now().toString().slice(-4)}`;
      const totalSale = totalAmount;
      const finalPaid = Math.max(0, paidAmount);
      const finalDebt = remainingAmount;
      const finalProductName = resolvedProd.productName;
      
      const formattedDateIso = entryDateTime
        ? new Date(entryDateTime).toISOString()
        : new Date().toISOString();

      const dateObj = new Date(formattedDateIso);
      const dateFormattedStr = !isNaN(dateObj.getTime())
        ? `${dateObj.toLocaleDateString('en-GB')} (${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })})`
        : '';

      const debtDetailsSummary = [
        dateFormattedStr ? `بەروار و کات: ${dateFormattedStr}` : '',
        finalProductName ? `کاڵا: ${finalProductName} (${quantity} ${unit})` : '',
        unitPrice > 0 ? `نرخ: ${unitPrice.toLocaleString('en-US')} ${currency}` : '',
        totalSale > 0 ? `کۆی گشتی: ${totalSale.toLocaleString('en-US')} ${currency}` : '',
        finalPaid > 0 ? `دراو: ${finalPaid.toLocaleString('en-US')} ${currency}` : '',
        finalDebt > 0 ? `ماوە بە قەرز: ${finalDebt.toLocaleString('en-US')} ${currency}` : '',
        `تۆمارکەر: ${finalEmpId}`,
        `بەش: ${department} (${gender})`,
        address.trim() ? `ناونیشان: ${address.trim()}` : '',
      ]
        .filter(Boolean)
        .join(' • ');

      // Find original employee record to check for previous sale connection
      const originalEmp = employees.find((e) => e.id === selectedEmpId);
      const oldDebt = originalEmp?.debtAmount || 0;
      const parsedCount = typeof itemCount === 'number' && itemCount > 0 ? itemCount : undefined;

      // 1. Synchronize or create Customer in Debts system
      let activeCustomerId: string | null = null;
      const existingCust = customers.find(
        (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );

      if (existingCust) {
        activeCustomerId = existingCust.id;
        updateCustomer(existingCust.id, {
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          ...(address.trim() ? { address: address.trim() } : {}),
          notes: debtDetailsSummary,
        });
      } else {
        const newCust = addCustomer(
          {
            name: trimmedName,
            phone: phone.trim() || '—',
            address: address.trim() || '—',
            notes: debtDetailsSummary,
          },
          0
        );
        activeCustomerId = newCust.id;
      }

      // 2. Synchronize Sales and Debt Transactions without double counting
      const existingSale = originalEmp?.saleId
        ? sales.find((s) => s.id === originalEmp.saleId)
        : sales.find(
            (s) => s.items.some((item) => item.barcode === originalEmp?.employeeId || item.barcode === finalEmpId) &&
                   s.customerName.trim().toLowerCase() === trimmedName.toLowerCase()
          );

      if (existingSale) {
        // Delete old sale with rollbackDebt=true during edit flow to cleanly reset old debt before new sale is created
        deleteSale(existingSale.id, true);
      } else if (oldDebt > 0 && activeCustomerId) {
        // If there was an old debt in the employee record but no sale record, subtract oldDebt from customer totalDebt to prevent double counting
        const cust = customers.find((c) => c.id === activeCustomerId);
        if (cust) {
          updateCustomer(activeCustomerId, {
            totalDebt: Math.max(0, cust.totalDebt - oldDebt),
          });
        }
      }

      // Create updated sale record which correctly adds the current debt and stock deduction
      const newSale = createSale({
        id: existingSale ? existingSale.id : undefined,
        invoiceNumber: existingSale ? existingSale.invoiceNumber : undefined,
        date: existingSale ? existingSale.date : formattedDateIso,
        customerId: activeCustomerId,
        customerName: trimmedName,
        customerPhone: phone.trim() ? `${phoneCode}${phone.trim()}` : '',
        items: [
          {
            productId: resolvedProd.productId,
            barcode: resolvedProd.productBarcode || finalEmpId,
            productName: finalProductName,
            unit: unit,
            quantity: quantity > 0 ? quantity : 1,
            count: parsedCount,
            purchasePrice: resolvedProd.product ? resolvedProd.product.purchasePrice : 0,
            sellingPrice: unitPrice,
            total: totalSale,
          },
        ],
        subtotal: totalSale,
        discount: 0,
        total: totalSale,
        paidAmount: finalPaid,
        debtAmount: finalDebt,
        paymentType: paymentType,
        notes: debtDetailsSummary,
        sellerName: employeeId.trim() || (existingSale ? existingSale.sellerName : undefined),
      });

      if (resolvedProd.product) {
        adjustStock(resolvedProd.product.id, -quantity);
      }

      // 3. Update Employee Record
      updateEmployee(selectedEmpId, {
        employeeId: finalEmpId,
        name: trimmedName,
        gender,
        department,
        salary: unitPrice,
        address: address.trim(),
        phone: phone.trim() ? `${phoneCode}${phone.trim()}` : '',
        productName: finalProductName,
        productBarcode: resolvedProd.productBarcode,
        productId: resolvedProd.productId,
        quantity,
        unit,
        totalAmount: totalSale,
        debtAmount: finalDebt,
        paidAmount: finalPaid,
        saleId: newSale.id,
        createdAt: formattedDateIso,
      });

      saveCompleteTransaction({
        receiptId: newSale.invoiceNumber,
        totalAmount: totalSale,
        customerName: trimmedName,
        debtAmount: finalDebt,
        productName: finalProductName,
        quantity: quantity > 0 ? quantity : 1,
        price: unitPrice,
        items: newSale.items,
        isPaid: finalDebt <= 0,
        showAlert: true,
      }).catch((err) => console.warn('Firebase saveCompleteTransaction warning:', err));

      setNotification({
        text: `تۆماری «${trimmedName}» بە سەرکەوتوویی دەستکاری کرا و نوێکرایەوە لەگەڵ بەشی قەرزەکان!`,
        type: 'success',
        details: {
          personName: trimmedName,
          debtAmount: finalDebt,
          productName: finalProductName || undefined,
          quantity: quantity,
          unit: unit,
        },
      });

      handleReset();
    } else {
      // Find matching employee/entry record by name or ID
      const existingRecord = employees.find(
        (e) =>
          e.name.trim().toLowerCase() === trimmedName.toLowerCase() ||
          (employeeId && e.employeeId === employeeId)
      );

      if (existingRecord) {
        handleSelectRecord(existingRecord);
      } else {
        // Save as new if not existing
        handleSave();
      }
    }
  };

  // 3. Delete Handler (سڕینەوە - هەمیشە داوای ژمارەی نهێنی دەکات)
  const handleDelete = () => {
    const trimmedName = personName.trim();

    // 1. If currently editing a selected record
    if (selectedEmpId) {
      const target = employees.find((e) => e.id === selectedEmpId);
      if (target) {
        handleOpenDeleteModal(target);
        return;
      }
    }

    // 2. If user typed a name that matches an existing record in table
    if (trimmedName) {
      const match = employees.find(
        (e) =>
          e.name.trim().toLowerCase() === trimmedName.toLowerCase() ||
          (employeeId && e.employeeId === employeeId)
      );

      if (match) {
        handleOpenDeleteModal(match);
        return;
      }

      // If not in database table, clear the form fields
      handleReset();
      setNotification({
        text: `خانەکانی فۆرمەکە بۆ «${trimmedName}» پاککرانەوە.`,
        type: 'success',
      });
      return;
    }

    // 3. If form is already empty
    setNotification({
      text: 'تکایە سەرەتا لە لیستی خوارەوە ئەو تۆمارە هەڵبژێرە کە دەتەوێت بیڕیتەوە، یان ناوی بنووسە.',
      type: 'error',
    });
  };

  const filteredEmployeesList = useMemo(() => {
    return employees.filter((emp) => {
      if (!debouncedSearchQuery.trim()) return true;
      const q = debouncedSearchQuery.toLowerCase();
      return (
        emp.name.toLowerCase().includes(q) ||
        (emp.phone && emp.phone.includes(q)) ||
        (emp.employeeId && emp.employeeId.toLowerCase().includes(q)) ||
        (emp.productName && emp.productName.toLowerCase().includes(q)) ||
        (emp.createdAt && emp.createdAt.includes(q))
      );
    });
  }, [employees, debouncedSearchQuery]);

  const totalEmployeePages = Math.ceil(filteredEmployeesList.length / itemsPerPage);
  const paginatedEmployeesList = useMemo(() => {
    return filteredEmployeesList.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredEmployeesList, currentPage]);

  const handleViewInvoice = useCallback((emp: Employee) => {
    const linkedSale = emp.saleId
      ? sales.find((s) => s.id === emp.saleId)
      : sales.find(
          (s) =>
            isSameCustomer(s.customerName, emp.name, s.customerPhone, emp.phone) &&
            isSameDay(s.date, emp.createdAt)
        );
    const recorder = emp.employeeId?.trim() || linkedSale?.sellerName || undefined;

    const effectiveItems: SaleItem[] =
      emp.items && emp.items.length >= (linkedSale?.items?.length || 0)
        ? emp.items
        : linkedSale?.items && linkedSale.items.length > 0
        ? linkedSale.items
        : [
            {
              productId: emp.productId || emp.id,
              barcode: emp.productBarcode || '',
              productName: emp.productName || 'کاڵا',
              unit: emp.unit || 'دانە',
              quantity: emp.quantity || 1,
              purchasePrice: 0,
              sellingPrice:
                emp.quantity && emp.quantity > 0
                  ? (emp.totalAmount || 0) / emp.quantity
                  : emp.totalAmount || 0,
              total: emp.totalAmount || 0,
            },
          ];

    const effectiveTotal = Math.max(
      linkedSale?.total || 0,
      emp.totalAmount || 0,
      effectiveItems.reduce((s, it) => s + (it.total || 0), 0)
    );
    const effectiveDebt = Math.max(linkedSale?.debtAmount || 0, emp.debtAmount || 0);
    const effectivePaid =
      emp.paidAmount !== undefined && emp.paidAmount > 0
        ? emp.paidAmount
        : linkedSale?.paidAmount || 0;

    if (linkedSale) {
      setActiveInvoice({
        ...linkedSale,
        items: effectiveItems,
        total: effectiveTotal,
        subtotal: effectiveTotal,
        debtAmount: effectiveDebt,
        paidAmount: effectivePaid,
        sellerName: recorder || linkedSale.sellerName,
      });
    } else {
      setActiveInvoice({
        id: emp.id,
        invoiceNumber: generateNextInvoiceNumber(sales.length),
        date: emp.createdAt || new Date().toISOString(),
        customerId: null,
        customerName: emp.name,
        customerPhone: emp.phone,
        sellerName: recorder,
        items: effectiveItems,
        subtotal: effectiveTotal,
        discount: 0,
        total: effectiveTotal,
        paidAmount: effectivePaid,
        debtAmount: effectiveDebt,
        paymentType:
          effectiveDebt > 0
            ? effectivePaid > 0
              ? 'partial'
              : 'debt'
            : 'cash',
        totalCost: 0,
        profit: 0,
      });
    }
  }, [sales]);

  const handleEditFromTable = useCallback((emp: Employee) => {
    setIsSavedRecordsOpen(false);
    setIsFormOpen(true);
    handleOpenEditModal(emp);
  }, []);

  const handleDeleteFromTable = useCallback((emp: Employee) => {
    handleOpenDeleteModal(emp);
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-1 sm:space-y-2">
      {/* Debtors Live Ticker */}
      {marqueeDebtors.length > 0 && (
        <div className="w-full overflow-hidden bg-rose-950/30 border border-rose-500/20 rounded-xl">
          <div className="flex items-center px-3 py-1 bg-rose-950/40 border-b border-rose-500/20">
            <span className="text-rose-400 font-bold text-[10px] flex items-center gap-1 shrink-0">
              <TrendingUp className="w-3 h-3" />
              قەرزارەکان (بەشێوەی لایڤ):
            </span>
          </div>
          <div className="relative w-full overflow-hidden py-1">
            <motion.div
              className="flex whitespace-nowrap text-rose-200 font-bold text-[10px] sm:text-xs"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
            >
              {marqueeDebtors.map((d, i) => (
                <span key={i} className="mx-4 flex items-center gap-1">
                  <span className="text-white bg-rose-900/50 px-1 py-0 rounded-lg border border-rose-500/30">
                    {d.name}
                  </span>
                  <span className="text-rose-300">
                    {formatCurrency(d.totalDebt, settings.currency, settings.usdToIqdRate)}
                  </span>
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      )}
      {/* Alert Notification */}
      {notification && (
        <div
          className={`p-2 rounded-xl border text-[10px] font-bold space-y-1 transition-all shadow-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-black text-xs">{notification.text}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs px-2 py-1 rounded hover:bg-black/5"
            >
              داخستن
            </button>
          </div>

          {notification.details && (
            <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                {notification.details.personName && (
                  <p className="flex items-center gap-1.5 text-emerald-800">
                    <User className="w-4 h-4 text-emerald-700" />
                    <span>ناوی کڕیار:</span>
                    <strong className="text-slate-900">
                      «{notification.details.personName}»
                    </strong>
                    {notification.details.debtAmount !== undefined &&
                      notification.details.debtAmount > 0 && (
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-black mr-1">
                          قەرز: {formatCurrency(notification.details.debtAmount, settings.currency, settings.usdToIqdRate)} دەچێتە بەشی قەرزەکان
                        </span>
                      )}
                  </p>
                )}
                {notification.details.productName && (
                  <p className="flex items-center gap-1.5 text-emerald-800">
                    <Package className="w-4 h-4 text-emerald-700" />
                    <span>فرۆشی کاڵا:</span>
                    <strong className="text-slate-900">
                      «{notification.details.productName}» ({notification.details.quantity} {notification.details.unit || 'کگم'})
                    </strong>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {notification.details.sale && (
                  <button
                    type="button"
                    onClick={() => setActiveInvoice(notification.details?.sale || null)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-black flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer text-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>چاپکردنی پسووڵە (A6 پانی)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed Button OR Expanded Form */}
      {!isFormOpen ? (
        <button
          type="button"
          id="toggle-open-data-entry-form-btn"
          onClick={() => setIsFormOpen(true)}
          className="w-full text-white font-black py-2.5 sm:py-3.5 px-3.5 sm:px-5 rounded-2xl border border-cyan-400/40 shadow-lg flex items-center justify-between gap-3 transition-all cursor-pointer group bg-cover bg-center bg-no-repeat relative overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(8, 15, 30, 0.65), rgba(4, 10, 22, 0.50)), url('/blue_mesh_bg.jpg')`,
          }}
        >
          {/* Subtle top glossy line highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          
          {/* Right Side (RTL): Icon and Vertically Centered Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 relative z-10">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-cyan-500/20 border border-cyan-300/40 text-cyan-300 flex items-center justify-center font-black shadow-md backdrop-blur-md group-hover:scale-105 transition-transform shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" />
            </div>
            <div className="text-right flex items-center">
              <h2 className="text-xs sm:text-base font-black text-white flex items-center gap-2 drop-shadow-md">
                <span>فۆرمی تۆمارکردنی زانیاری</span>
              </h2>
            </div>
          </div>

          {/* Left Side (RTL): Glassy Glassmorphic CTA Button */}
          <div className="h-8 sm:h-9 px-2.5 sm:px-4 rounded-xl bg-cyan-600/30 hover:bg-cyan-500/40 border border-cyan-400/50 text-cyan-200 flex items-center justify-center gap-1.5 font-black text-[11px] sm:text-xs transition-all group-hover:border-cyan-300 group-hover:text-white shrink-0 relative z-10 cursor-pointer shadow-xs backdrop-blur-md">
            <Plus className="w-3.5 h-3.5 text-cyan-300 group-hover:rotate-90 transition-transform duration-300 shrink-0" />
            <span className="whitespace-nowrap font-black">کردنەوەی فۆرم</span>
          </div>
        </button>
      ) : (
        /* Main Form Box - Clean Modern Dark Glass Design */
        <motion.div 
          whileHover={{ scale: 1.002 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-slate-900/60 backdrop-blur-md text-white transition-all"
        >
          {/* Top Header Banner with Hide/Close Button */}
          <div
            className="py-4 px-4 sm:px-6 flex items-center justify-between shadow-xs border-b border-cyan-500/30 text-white relative overflow-hidden bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(10, 20, 40, 0.70), rgba(5, 12, 28, 0.55)), url('/blue_mesh_bg.jpg')`,
            }}
          >
            <div className="w-20 hidden sm:block"></div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-wide flex items-center justify-center gap-2 drop-shadow-md">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-300 shrink-0" />
              <span>فۆرمی تۆمارکردنی زانیاری</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex items-center gap-1.5 text-xs font-black bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-400/40 px-3.5 py-1.5 rounded-xl text-cyan-200 transition-colors cursor-pointer"
                title="شاردنەوەی فۆرم"
              >
                <ChevronUp className="w-4 h-4 text-cyan-300" />
                <span>داخستنی فۆرم</span>
              </button>
            </div>
          </div>

          {/* Edit Mode Banner */}
          {selectedEmpId && (
            <div className="mx-4 sm:mx-6 mt-4 p-3 bg-blue-950/60 border border-blue-400/40 rounded-xl flex items-center justify-between text-blue-200 text-xs sm:text-sm font-bold animate-in fade-in shadow-2xs">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-400 shrink-0" />
                <span>خەریکی دەستکاریکردنی تۆماری «{personName}»یت</span>
              </div>
              <button
                type="button"
                onClick={handleResetWithNotification}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-blue-300 border border-blue-400/40 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                پاشگەزبوونەوە
              </button>
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleSave} className="p-4 sm:p-7 space-y-4 sm:space-y-4.5 bg-transparent">
          {/* Row 1: Date & Time (بەروار و کاتژمێر) */}
          <div className="bg-slate-950/40 p-3.5 sm:p-4 rounded-2xl border border-white/10 shadow-inner space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4">
            <label className="sm:col-span-4 text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 select-none text-right">
              <Calendar className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
              <span>بەروار و کاتژمێر:</span>
            </label>
            <div className="sm:col-span-8 flex flex-row items-center gap-2 w-full">
              <input
                type="datetime-local"
                value={entryDateTime}
                onChange={(e) => {
                  const val = e.target.value;
                  setEntryDateTime(val);
                  if (val) {
                    const ymd = val.split('T')[0];
                    if (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
                      setStatsDate(ymd);
                    }
                  }
                }}
                className="flex-1 min-w-0 h-11 sm:h-12 px-3 sm:px-4 rounded-xl border border-white/15 bg-slate-950/60 text-white text-xs sm:text-sm font-bold shadow-inner focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 font-mono transition-all text-right"
              />
              <button
                type="button"
                onClick={() => {
                  const nowStr = getNowDateTimeLocal();
                  setEntryDateTime(nowStr);
                  setStatsDate(nowStr.split('T')[0]);
                }}
                className="h-11 sm:h-12 px-3 sm:px-4 bg-slate-900 hover:bg-slate-800 text-white hover:text-cyan-200 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 transition-all duration-200 cursor-pointer border border-white/10 shadow-sm active:scale-95 group whitespace-nowrap"
                title="نوێکردنەوەی بەروار و کاتژمێری ئێستا بە ئۆتۆماتیکی"
              >
                <Clock className="w-4 h-4 text-cyan-400 group-hover:rotate-180 transition-transform duration-500 shrink-0" />
                <span className="font-bold whitespace-nowrap hidden sm:inline">ئێستا (ئۆتۆماتیک)</span>
                <span className="font-bold whitespace-nowrap sm:hidden">ئێستا</span>
              </button>
            </div>
          </div>

          {/* Row 2: Recorder Name (ناوی تۆمارکەر) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4">
            <label className="sm:col-span-4 text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 select-none text-right">
              <User className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
              <span>ناوی تۆمارکەر:</span>
            </label>
            <div className="sm:col-span-8">
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="بۆ نموونە: ئەحمەد یان بە بەتاڵی جێیبهێڵە"
                className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-white/15 bg-slate-950/60 text-white text-xs sm:text-sm font-medium shadow-inner focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all placeholder:text-slate-200 text-right"
              />
            </div>
          </div>

          {/* Row 3: Customer Name (ناوی کڕیار) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4">
            <label className="sm:col-span-4 text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 select-none text-right">
              <User className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
              <span>ناوی کڕیار:</span>
            </label>
            <div className="sm:col-span-8 space-y-1.5">
              <div className="relative">
                <input
                  ref={nameInputRef}
                  type="text"
                  required
                  list="customers-list"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="ناوی کڕیار بنووسە..."
                  className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-white/15 bg-slate-950/60 text-white text-xs sm:text-sm font-bold shadow-inner focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all placeholder:text-slate-200 text-right"
                />
                <CustomersDatalist customers={customers} />
              </div>

              {matchedCustomer && (
                <div className="text-xs text-amber-300 bg-amber-950/50 border border-amber-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center justify-between shadow-sm">
                  <span>
                    ئەم کڕیارە لە سیستەم هەیە • قەرزی ئێستا:{' '}
                    {formatCurrency(matchedCustomer.totalDebt, settings.currency, settings.usdToIqdRate)}
                  </span>
                  <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-lg text-amber-200 font-bold border border-amber-500/30">
                    بەشی قەرزەکان
                  </span>
                </div>
              )}

              {currentSameDayEmp && !selectedEmpId && (
                <div className="text-xs text-cyan-200 bg-cyan-950/50 border border-cyan-500/30 p-2.5 rounded-xl font-bold flex flex-wrap items-center justify-between gap-2 shadow-sm animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>
                      ئەم کڕیارە ئەمڕۆ پسووڵەیەکی هەیە ({currentSameDayEmp.items?.length || 1} کاڵا تۆمارکراوە) — ئەم کاڵایەش دەچێتە سەر هەمان پسووڵە
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const linkedSale = currentSameDayEmp.saleId
                        ? sales.find((s) => s.id === currentSameDayEmp.saleId)
                        : sales.find(
                            (s) =>
                              isSameCustomer(s.customerName, currentSameDayEmp.name, s.customerPhone, currentSameDayEmp.phone) &&
                              isSameDay(s.date, currentSameDayEmp.createdAt)
                          );
                      const recorder = employeeId.trim() || currentSameDayEmp.employeeId || linkedSale?.sellerName || undefined;
                      const effectiveItems: SaleItem[] =
                        currentSameDayEmp.items && currentSameDayEmp.items.length >= (linkedSale?.items?.length || 0)
                          ? currentSameDayEmp.items
                          : linkedSale?.items && linkedSale.items.length > 0
                          ? linkedSale.items
                          : [
                              {
                                productId: currentSameDayEmp.productId || currentSameDayEmp.id,
                                barcode: currentSameDayEmp.productBarcode || currentSameDayEmp.employeeId || '',
                                productName: currentSameDayEmp.productName || 'کاڵا',
                                unit: currentSameDayEmp.unit || 'دانە',
                                quantity: currentSameDayEmp.quantity || 1,
                                purchasePrice: 0,
                                sellingPrice:
                                  currentSameDayEmp.quantity && currentSameDayEmp.quantity > 0
                                    ? (currentSameDayEmp.totalAmount || 0) / currentSameDayEmp.quantity
                                    : currentSameDayEmp.totalAmount || 0,
                                total: currentSameDayEmp.totalAmount || 0,
                              },
                            ];

                      const effectiveTotal = Math.max(
                        linkedSale?.total || 0,
                        currentSameDayEmp.totalAmount || 0,
                        effectiveItems.reduce((s, it) => s + (it.total || 0), 0)
                      );
                      const effectiveDebt = Math.max(linkedSale?.debtAmount || 0, currentSameDayEmp.debtAmount || 0);
                      const effectivePaid =
                        currentSameDayEmp.paidAmount !== undefined && currentSameDayEmp.paidAmount > 0
                          ? currentSameDayEmp.paidAmount
                          : linkedSale?.paidAmount || 0;

                      if (linkedSale) {
                        setActiveInvoice({
                          ...linkedSale,
                          items: effectiveItems,
                          total: effectiveTotal,
                          subtotal: effectiveTotal,
                          debtAmount: effectiveDebt,
                          paidAmount: effectivePaid,
                          sellerName: recorder || linkedSale.sellerName,
                        });
                      } else {
                        setActiveInvoice({
                          id: currentSameDayEmp.id,
                          invoiceNumber: generateNextInvoiceNumber(sales.length),
                          date: currentSameDayEmp.createdAt,
                          customerId: null,
                          customerName: currentSameDayEmp.name,
                          customerPhone: currentSameDayEmp.phone,
                          sellerName: recorder,
                          items: effectiveItems,
                          subtotal: effectiveTotal,
                          discount: 0,
                          total: effectiveTotal,
                          paidAmount: effectivePaid,
                          debtAmount: effectiveDebt,
                          paymentType: (currentSameDayEmp.debtAmount || 0) > 0 ? 'debt' : 'cash',
                          totalCost: 0,
                          profit: 0,
                        });
                      }
                    }}
                    className="text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm"
                  >
                    بینی پسووڵەی ئەمڕۆ
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Phone (ژمارەی مۆبایل) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4">
            <label className="sm:col-span-4 text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 select-none text-right">
              <Phone className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
              <span>ژمارەی مۆبایل:</span>
            </label>
            <div className="sm:col-span-8 flex items-center" dir="ltr">
              <select
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                className="flex items-center justify-center bg-slate-950/70 hover:bg-slate-900 border border-r-0 border-white/15 rounded-l-xl px-2.5 sm:px-3 text-white font-bold font-mono text-xs sm:text-sm h-11 sm:h-12 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 cursor-pointer transition-colors"
              >
                <option value="+964" className="bg-slate-900 text-white">+964 🇮🇶</option>
                <option value="+98" className="bg-slate-900 text-white">+98 🇮🇷</option>
                <option value="+90" className="bg-slate-900 text-white">+90 🇹🇷</option>
                <option value="+963" className="bg-slate-900 text-white">+963 🇸🇾</option>
                <option value="+962" className="bg-slate-900 text-white">+962 🇯🇴</option>
                <option value="+966" className="bg-slate-900 text-white">+966 🇸🇦</option>
                <option value="+1" className="bg-slate-900 text-white">+1 🇺🇸</option>
                <option value="+44" className="bg-slate-900 text-white">+44 🇬🇧</option>
              </select>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="750 xxx xxxx"
                className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-r-xl border border-white/15 bg-slate-950/60 text-white text-xs sm:text-sm font-medium shadow-inner focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 font-mono transition-all placeholder:text-slate-200"
              />
            </div>
          </div>

          {/* Row 5: Code (کۆدی کاڵا) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4">
            <label className="sm:col-span-4 text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 select-none text-right">
              <Barcode className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
              <span>کۆدی کاڵا:</span>
            </label>
            <div className="sm:col-span-8">
              <input
                type="text"
                value={productBarcode}
                onChange={(e) => {
                  const val = e.target.value;
                  setProductBarcode(val);
                  if (val.trim()) {
                    const matched = products.find(
                      (p) => p.barcode && p.barcode.toLowerCase() === val.trim().toLowerCase()
                    );
                    if (matched) {
                      playSound('add');
                      setSelectedProductId(matched.id);
                      setCustomProductName(matched.name);
                      setUnitPrice(matched.sellingPrice);
                      if (matched.unit) setUnit(matched.unit);
                    }
                  }
                }}
                placeholder="کۆدی کاڵا بنووسە یان سکان بکە..."
                className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-white/15 bg-slate-950/60 text-white text-xs sm:text-sm font-mono font-medium shadow-inner focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all placeholder:text-slate-200 text-right"
              />
            </div>
          </div>

          {/* Row 6: Product / Item Name (ناوی کاڵا) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4">
            <label className="sm:col-span-4 text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 select-none text-right">
              <Package className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
              <span>ناوی کاڵا:</span>
            </label>
            <div className="sm:col-span-8 space-y-2">
              <select
                value={selectedProductId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedProductId(val);
                  if (val && val !== 'custom') {
                    playSound('add');
                    const prod = products.find((p) => p.id === val);
                    if (prod) {
                      setCustomProductName(prod.name);
                      setProductBarcode(prod.barcode || '');
                      setUnitPrice(prod.sellingPrice);
                      if (prod.unit) setUnit(prod.unit);
                    }
                  } else if (val === 'custom') {
                    setCustomProductName('');
                    setProductBarcode('');
                  }
                }}
                className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-white/15 bg-slate-950/70 text-white text-xs sm:text-sm font-bold shadow-inner focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 cursor-pointer transition-all text-right"
              >
                <option value="" className="bg-slate-900 text-white">-- کاڵایەک هەڵبژێرە --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name} {p.barcode ? `(${p.barcode})` : ''} - {p.sellingPrice.toLocaleString('en-US')} {settings.currency}
                  </option>
                ))}
                <option value="custom" className="bg-slate-900 text-white">+ نووسینی ناوی کاڵای دیکە (دەستکرد)...</option>
              </select>

              {(selectedProductId === 'custom' || !selectedProductId || customProductName !== selectedProduct?.name) && (
                <input
                  type="text"
                  value={customProductName}
                  onChange={(e) => setCustomProductName(e.target.value)}
                  placeholder="ناوی کاڵاکە بنووسە..."
                  className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-white/15 bg-slate-950/60 text-white text-xs sm:text-sm font-medium shadow-inner focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all placeholder:text-slate-200 text-right"
                />
              )}
            </div>
          </div>

          {/* Row 7: Count, Weight (Kilo) & Price (العدد، کێش و نرخ) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4">
            <label className="sm:col-span-4 text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 select-none text-right">
              <Layers className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
              <span>العدد، کێش و نرخ:</span>
            </label>
            <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. العدد Field */}
              <div>
                <span className="text-xs font-bold text-slate-200 block mb-1 text-right">
                  العدد:
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={itemCount}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItemCount(val === '' ? '' : (parseFloat(val) || 0));
                  }}
                  className="w-full h-11 sm:h-12 px-3.5 rounded-xl border border-white/15 bg-slate-950/60 text-white text-xs sm:text-sm font-bold font-mono shadow-inner focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all text-center"
                />
              </div>

              {/* 2. کێش / دانە Field */}
              <div>
                <span className="text-xs font-bold text-slate-200 block mb-1 text-right">
                  کێش یان دانە:
                </span>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    value={quantity === 0 ? '' : quantity}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setQuantity(isNaN(val) ? 0 : val);
                    }}
                    className="w-full h-11 sm:h-12 pl-20 pr-3.5 rounded-xl border border-white/15 bg-slate-950/60 text-white text-xs sm:text-sm font-bold font-mono shadow-inner focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all text-center"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="absolute left-1.5 top-1.5 bottom-1.5 h-8 sm:h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg border border-white/15 px-2 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <option value="کگم" className="bg-slate-900 text-white">کگم</option>
                    <option value="دانە" className="bg-slate-900 text-white">دانە</option>
                    <option value="کارتۆن" className="bg-slate-900 text-white">کارتۆن</option>
                    <option value="غرام" className="bg-slate-900 text-white">غرام</option>
                  </select>
                </div>
              </div>

              {/* 3. نرخ Field */}
              <div>
                <span className="text-xs font-bold text-slate-200 block mb-1 text-right">
                  نرخی ١ ({unit}):
                </span>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={formatNumberWithCommas(unitPrice)}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, '');
                      if (raw === '') setUnitPrice(0);
                      else if (/^\d*\.?\d*$/.test(raw)) {
                        setUnitPrice(parseFloat(raw) || 0);
                      }
                    }}
                    className="w-full h-11 sm:h-12 pl-18 pr-3.5 rounded-xl border border-white/15 bg-slate-950/60 text-white text-xs sm:text-sm font-bold font-mono shadow-inner focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all text-center"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="absolute left-1.5 top-1.5 bottom-1.5 h-8 sm:h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg border border-white/15 px-2 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <option value="د.ع" className="bg-slate-900 text-white">د.ع</option>
                    <option value="$" className="bg-slate-900 text-white">$ دۆلار</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Row 8: Total Price (کۆی پارە) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4">
            <label className="sm:col-span-4 text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 select-none text-right">
              <Calculator className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
              <span>کۆی پارە:</span>
            </label>
            <div className="sm:col-span-8">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${totalAmount.toLocaleString('en-US')} ${currency}`}
                  className="w-full sm:flex-1 h-11 sm:h-12 px-4 rounded-xl border-2 border-emerald-400/80 bg-emerald-950/40 text-emerald-300 text-sm sm:text-base md:text-lg font-black font-mono shadow-inner cursor-default text-right min-w-0"
                />
                <span className="text-xs text-emerald-300 font-bold bg-slate-950/70 px-3 py-2 rounded-xl border border-emerald-400/30 flex items-center justify-center text-center shadow-sm shrink-0 whitespace-nowrap">
                  {quantity} {unit} × {unitPrice.toLocaleString('en-US')} {currency}
                </span>
              </div>
            </div>
          </div>

          {/* Row 9: Payment Type & Paid Amount (شێوازی پارەدان و بڕی دراو) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4">
            <label className="sm:col-span-4 text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 select-none text-right">
              <DollarSign className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
              <span>بڕی پارەی دراو:</span>
            </label>
            <div className="sm:col-span-8 space-y-3">
              {/* Payment Type Selection Pills */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/40 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('cash');
                    setPaidAmount(totalAmount);
                  }}
                  className={`py-2 px-2 rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    paymentType === 'cash'
                      ? 'bg-emerald-600 text-white shadow-lg border border-emerald-400/50'
                      : 'text-slate-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>کاش</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('debt');
                    setPaidAmount(0);
                  }}
                  className={`py-2 px-2 rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    paymentType === 'debt'
                      ? 'bg-rose-600 text-white shadow-lg border border-rose-400/50'
                      : 'text-slate-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>قەرز</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('partial');
                    if (paidAmount >= totalAmount || paidAmount === 0) {
                      setPaidAmount(Math.round(totalAmount / 2));
                    }
                  }}
                  className={`py-2 px-2 rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    paymentType === 'partial'
                      ? 'bg-amber-600 text-white shadow-lg border border-amber-400/50'
                      : 'text-slate-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>قیست</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={formatNumberWithCommas(paidAmount)}
                  placeholder="0"
                  disabled={paymentType !== 'partial'}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, '');
                    if (raw === '') setPaidAmount(0);
                    else if (/^\d*\.?\d*$/.test(raw)) {
                      setPaidAmount(parseFloat(raw) || 0);
                    }
                  }}
                  className={`w-full sm:flex-1 h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-white/15 text-white text-xs sm:text-sm font-bold font-mono shadow-inner focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all placeholder:text-slate-200 text-right min-w-0 ${
                    paymentType !== 'partial' ? 'bg-slate-900/50 opacity-50' : 'bg-slate-950/60'
                  }`}
                />
                {paymentType === 'partial' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPaidAmount(totalAmount)}
                      className="flex-1 sm:flex-initial h-11 sm:h-12 px-3 sm:px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] sm:text-xs font-bold border border-emerald-400/30 shadow-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer whitespace-nowrap"
                    >
                      هەمووی درا
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaidAmount(0)}
                      className="flex-1 sm:flex-initial h-11 sm:h-12 px-3 sm:px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] sm:text-xs font-bold border border-amber-400/30 shadow-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer whitespace-nowrap"
                    >
                      قەرز (0)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 10: Remaining Amount (بڕی پارەی ماوە) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4">
            <label className="sm:col-span-4 text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 select-none text-right">
              <AlertCircle className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
              <span>بڕی پارەی ماوە:</span>
            </label>
            <div className="sm:col-span-8">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${remainingAmount.toLocaleString('en-US')} ${currency}`}
                  className={`w-full sm:flex-1 h-11 sm:h-12 px-4 rounded-xl border text-sm sm:text-base font-black font-mono shadow-inner cursor-default text-right min-w-0 ${
                    remainingAmount > 0
                      ? 'border-amber-400/80 bg-amber-950/40 text-amber-300'
                      : 'border-emerald-400/80 bg-emerald-950/40 text-emerald-300'
                  }`}
                />
                <span
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold shadow-sm flex items-center justify-center text-center shrink-0 whitespace-nowrap ${
                    remainingAmount > 0
                      ? 'bg-amber-950/70 text-amber-300 border-amber-400/40'
                      : 'bg-emerald-950/70 text-emerald-300 border-emerald-400/40'
                  }`}
                >
                  {remainingAmount > 0 ? 'ماوەتەوە بە قەرز' : 'تەواو دراوە (بێ قەرز)'}
                </span>
              </div>
            </div>
          </div>

          {/* Row 11: Gender & Department (ڕەگەز و بەش) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-4">
            <label className="sm:col-span-4 text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 select-none text-right">
              <UserCheck className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
              <span>ڕەگەز و بەش:</span>
            </label>
            <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-11 sm:h-12 px-3.5 rounded-xl border border-white/15 bg-slate-950/70 text-white text-xs sm:text-sm font-bold shadow-inner focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 cursor-pointer transition-all text-right"
              >
                <option value="نێر" className="bg-slate-900 text-white">نێر</option>
                <option value="مێ" className="bg-slate-900 text-white">مێ</option>
              </select>

              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="بەش: فرۆشتن، کۆگا..."
                className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-white/15 bg-slate-950/60 text-white text-xs sm:text-sm font-medium shadow-inner focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all placeholder:text-slate-200 text-right"
              />
            </div>
          </div>

          {/* Row 12: Address (ناونیشان) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 items-start gap-2 sm:gap-4">
            <label className="sm:col-span-4 text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 pt-2 select-none text-right">
              <MapPin className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
              <span>ناونیشان:</span>
            </label>
            <div className="sm:col-span-8">
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ناونیشانی تەواو یان زانیاری پەیوەندی بنووسە..."
                className="w-full p-3 sm:p-3.5 rounded-xl border border-white/15 bg-slate-950/60 text-white text-xs sm:text-sm font-medium shadow-inner focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 resize-none transition-all placeholder:text-slate-200 text-right"
              />
            </div>
          </div>

          {/* Action Buttons Bar - Premium Balanced Icon Buttons */}
          <div className="pt-5 border-t border-white/10 flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
            {/* Save Button (Soft Green Gradient Glass) */}
            <div className="flex flex-col items-center gap-2 group">
              <button
                type="submit"
                id="save-employee-form-btn"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-600/40 hover:from-emerald-500/40 hover:to-teal-600/50 active:scale-90 border-2 border-emerald-400/50 text-emerald-200 flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden backdrop-blur-md"
                title="خەزنکردن - Alt+S"
              >
                <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Save className="w-6 h-6 sm:w-7 sm:h-7 transform group-hover:scale-110 transition-transform duration-300 relative z-10 text-emerald-300" />
              </button>
              <span className="text-xs font-bold text-emerald-300 bg-emerald-950/60 px-3 py-0.5 rounded-full border border-emerald-400/30 shadow-sm">خەزنکردن</span>
            </div>

            {/* Modify Button (Soft Blue Gradient Glass) */}
            <div className="flex flex-col items-center gap-2 group">
              <button
                type="button"
                id="modify-employee-form-btn"
                onClick={handleModify}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/40 hover:from-cyan-500/40 hover:to-blue-600/50 active:scale-90 border-2 border-cyan-400/50 text-cyan-200 flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden backdrop-blur-md"
                title="دەستکاری - Alt+M"
              >
                <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Edit className="w-6 h-6 sm:w-7 sm:h-7 transform group-hover:rotate-12 transition-transform duration-300 relative z-10 text-cyan-300" />
              </button>
              <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 px-3 py-0.5 rounded-full border border-cyan-400/30 shadow-sm">دەستکاری</span>
            </div>

            {/* Delete Button (Soft Amber Gradient Glass) */}
            <div className="flex flex-col items-center gap-2 group">
              <button
                type="button"
                id="delete-employee-form-btn"
                onClick={handleDelete}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-600/40 hover:from-amber-500/40 hover:to-orange-600/50 active:scale-90 border-2 border-amber-400/50 text-amber-200 flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden backdrop-blur-md"
                title="سڕینەوە - Alt+D"
              >
                <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Trash2 className="w-6 h-6 sm:w-7 sm:h-7 transform group-hover:scale-110 transition-transform duration-300 relative z-10 text-amber-300" />
              </button>
              <span className="text-xs font-bold text-amber-300 bg-amber-950/60 px-3 py-0.5 rounded-full border border-amber-400/30 shadow-sm">سڕینەوە</span>
            </div>

            {/* Reset Button (Soft Rose Gradient Glass) */}
            <div className="flex flex-col items-center gap-2 group">
              <button
                type="button"
                id="reset-employee-form-btn"
                onClick={handleResetWithNotification}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-rose-500/30 to-pink-600/40 hover:from-rose-500/40 hover:to-pink-600/50 active:scale-90 border-2 border-rose-400/50 text-rose-200 flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden backdrop-blur-md"
                title="سفرکردنەوە - Alt+R"
              >
                <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7 transform group-hover:-rotate-180 transition-transform duration-500 relative z-10 text-rose-300" />
              </button>
              <span className="text-xs font-bold text-rose-300 bg-rose-950/60 px-3 py-0.5 rounded-full border border-rose-400/30 shadow-sm">سفرکردنەوە</span>
            </div>
          </div>
        </form>
      </motion.div>
      )}

      {/* Invoices Button (دوگمەی ئایکۆنی پسووڵەکان لە خواری بەشەکە) */}
      <div className="mt-2.5 sm:mt-3">
        <button
          type="button"
          id="open-invoices-btn"
          onClick={() => setIsSavedRecordsOpen(true)}
          className="w-full text-white font-black py-2.5 sm:py-3.5 px-3.5 sm:px-5 rounded-2xl border border-cyan-400/40 shadow-lg flex items-center justify-between gap-3 transition-all cursor-pointer group bg-cover bg-center bg-no-repeat relative overflow-hidden active:scale-[0.99] hover:shadow-xl hover:border-cyan-300/60"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(8, 15, 30, 0.65), rgba(4, 10, 22, 0.50)), url('/blue_mesh_bg.jpg')`,
          }}
        >
          {/* Subtle top glossy line highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          <div className="flex items-center gap-2.5 sm:gap-3 relative z-10">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-cyan-600/30 border border-cyan-300/40 text-cyan-300 flex items-center justify-center font-black shadow-md group-hover:scale-105 group-hover:bg-cyan-500/40 group-hover:text-cyan-200 transition-transform shrink-0">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-xs sm:text-base font-black text-white drop-shadow-md">
                  پسووڵەکان
                </h3>
                {employees.length > 0 ? (
                  <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[10px] sm:text-xs px-2 py-0.5 rounded-md font-black">
                    {employees.length} پسووڵە
                  </span>
                ) : (
                  <span className="bg-white/15 text-cyan-200 text-[10px] sm:text-xs px-2 py-0.5 rounded-md font-bold">
                    هیچ پسووڵەیەک نییە
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-cyan-200/90 font-medium mt-0.5">
                گەڕان، چاپکردن و بەڕێوەبردن
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end relative z-10">
            <div className="h-8 sm:h-9 px-2.5 sm:px-4 rounded-xl bg-cyan-600/30 hover:bg-cyan-500/40 border border-cyan-400/50 text-cyan-200 flex items-center justify-center gap-1.5 font-black text-[11px] sm:text-xs transition-all group-hover:border-cyan-300 group-hover:text-white">
              <span>بینینی پسووڵەکان</span>
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>
      </div>

      {/* Daily Statistics Section */}
      <div className="mt-2.5 sm:mt-4">
        {/* Date Filter Header */}
        <div className="flex items-center justify-between mb-2 px-1">
          <button
            type="button"
            onClick={openCalendarModal}
            className="text-xs sm:text-sm font-bold text-white hover:text-cyan-400 flex items-center gap-2 cursor-pointer transition-colors group"
            title="کردنەوەی تقویم"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-950/60 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-cyan-900/80 group-hover:text-cyan-200 transition-colors">
              <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <span className="font-bold">ئاماری ڕۆژانە</span>
          </button>

          <div className="flex items-center bg-slate-900/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 shadow-md overflow-hidden px-0.5 py-0.5" dir="ltr">
            <button 
              type="button"
              id="prev-stats-date-btn"
              onClick={handlePrevStatsDate}
              className="p-1 sm:p-1.5 text-white hover:bg-white/10 active:bg-white/20 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer"
              title="ڕۆژی پێشوو"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button
              type="button"
              id="open-calendar-modal-btn"
              onClick={openCalendarModal}
              className="px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-bold text-white hover:text-cyan-300 transition-colors cursor-pointer text-center min-w-[95px] flex items-center justify-center"
              title="کردنەوەی تقویم بۆ هەڵبژاردنی بەروار"
            >
              <span>
                {(() => {
                  try {
                    const parts = statsDate.split('-');
                    if (parts.length === 3) {
                      const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                      if (!isNaN(dateObj.getTime())) {
                        return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                      }
                    }
                    return statsDate;
                  } catch {
                    return statsDate;
                  }
                })()}
              </span>
            </button>

            <button 
              type="button"
              id="next-stats-date-btn"
              onClick={handleNextStatsDate}
              className="p-1 sm:p-1.5 text-white hover:bg-white/10 active:bg-white/20 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer"
              title="ڕۆژی داهاتوو"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Daily Statistics Cards */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-6 w-full">
          {/* کارت ١: کێشی فرۆشتنی ڕۆژانە (Daily Weight) - Emerald Green */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-[28px] sm:rounded-[32px] shadow-lg border border-white/10 flex flex-col overflow-hidden transition-all hover:border-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] group">
            {/* Emerald Header Section with Icon */}
            <div className="h-11 sm:h-13 w-full bg-gradient-to-br from-emerald-500 to-green-600 relative flex items-center justify-between px-3.5 sm:px-4 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_70%)] pointer-events-none" />
              <span className="text-white font-black text-xs sm:text-sm tracking-wide relative z-10 drop-shadow-xs">
                کێشی فرۆشتنی ڕۆژانە
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 border border-white/30 shadow-xs flex items-center justify-center p-1 shrink-0 relative z-10 backdrop-blur-xs transition-transform group-hover:rotate-6 group-hover:scale-110">
                <img
                  src={weightPackage3dIcon}
                  alt="کێشی فرۆشتن"
                  className="w-full h-full object-contain drop-shadow-xs"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-3 left-0 right-0 h-6 bg-slate-900/90 rounded-t-[28px] sm:rounded-t-[32px] pointer-events-none" />
            </div>

            <div className="p-3.5 sm:p-5 pt-1 sm:pt-2 flex flex-col justify-between flex-1 min-h-[95px] sm:min-h-[125px]">
              <div className="my-auto py-1">
                {(() => {
                  const weightFormatted = dailyStats.totalWeight.toLocaleString('en-US');
                  return (
                    <div className="flex items-baseline gap-1.5 flex-wrap" title={`${weightFormatted} کگم`}>
                      <span className={`font-black text-emerald-400 font-mono tracking-tight leading-none ${getAdaptiveStatFontSize(weightFormatted.length)}`}>
                        {weightFormatted}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-emerald-300/90 shrink-0">کگم</span>
                    </div>
                  );
                })()}
              </div>
              <div className="mt-auto pt-1 border-t border-white/5">
                <div className="text-[10px] sm:text-xs text-slate-300 font-bold flex items-center gap-1.5 opacity-90">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>کۆی کێشی فرۆشراو</span>
                </div>
              </div>
            </div>
          </div>

          {/* کارت ٢: کۆی فرۆشتنی ڕۆژانە (Daily Sales) - Deep Teal/Cyan */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-md border border-white/10 flex flex-col overflow-hidden transition-all hover:border-cyan-500/40 hover:scale-[1.01] active:scale-[0.99] group">
            {/* Deep Teal Header Section with Icon */}
            <div className="h-9 w-full bg-gradient-to-br from-cyan-600 to-teal-500 relative flex items-center justify-between px-3 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_70%)] pointer-events-none" />
              <span className="text-white font-black text-[10px] tracking-wide relative z-10 drop-shadow-xs">
                کۆی فرۆشتنی ڕۆژانە
              </span>
              <div className="w-6 h-6 rounded-lg bg-white/20 border border-white/30 shadow-xs flex items-center justify-center p-0.5 shrink-0 relative z-10 backdrop-blur-xs transition-transform group-hover:rotate-6 group-hover:scale-110">
                <img
                  src={salesTrend3dIcon}
                  alt="کۆی فرۆشتن"
                  className="w-full h-full object-contain drop-shadow-xs"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-2 left-0 right-0 h-4 bg-slate-900/90 rounded-t-2xl pointer-events-none" />
            </div>

            <div className="p-3 pt-1 flex flex-col justify-between flex-1 min-h-[70px]">
              <div className="my-auto py-0.5">
                {(() => {
                  const salesParts = formatStatParts(dailyStats.totalSales);
                  return (
                    <div className="flex items-baseline gap-1 flex-wrap" title={salesParts.full}>
                      <span className={`font-black text-white font-mono tracking-tight leading-none text-xl`}>
                        {salesParts.num}
                      </span>
                      {salesParts.unit && (
                        <span className="text-[10px] font-black text-cyan-200/90 shrink-0">
                          {salesParts.unit}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="mt-auto pt-0.5 border-t border-white/5">
                <div className="text-[9px] text-slate-300 font-bold flex items-center gap-1 opacity-90">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>{dailyStats.count} پسوڵەی ئەمڕۆ</span>
                </div>
              </div>
            </div>
          </div>

          {/* کارت ٣: کاشی ڕۆژانە (Cash) - Warm Amber/Gold */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-md border border-white/10 flex flex-col overflow-hidden transition-all hover:border-amber-500/40 hover:scale-[1.01] active:scale-[0.99] group">
            {/* Warm Amber Header Section with Icon */}
            <div className="h-9 w-full bg-gradient-to-br from-amber-500 to-orange-500 relative flex items-center justify-between px-3 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_70%)] pointer-events-none" />
              <span className="text-white font-black text-[10px] tracking-wide relative z-10 drop-shadow-xs">
                کاشی ڕۆژانە
              </span>
              <div className="w-6 h-6 rounded-lg bg-white/20 border border-white/30 shadow-xs flex items-center justify-center p-0.5 shrink-0 relative z-10 backdrop-blur-xs transition-transform group-hover:rotate-6 group-hover:scale-110">
                <img
                  src={cashMoney3dIcon}
                  alt="کاشی ڕۆژانە"
                  className="w-full h-full object-contain drop-shadow-xs"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-2 left-0 right-0 h-4 bg-slate-900/90 rounded-t-2xl pointer-events-none" />
            </div>

            <div className="p-3 pt-1 flex flex-col justify-between flex-1 min-h-[70px]">
              <div className="my-auto py-0.5">
                {(() => {
                  const cashParts = formatStatParts(dailyStats.cash);
                  return (
                    <div className="flex items-baseline gap-1 flex-wrap" title={cashParts.full}>
                      <span className={`font-black font-mono tracking-tight leading-none text-xl ${dailyStats.cash < 0 ? 'text-rose-400' : 'text-white'}`}>
                        {cashParts.num}
                      </span>
                      {cashParts.unit && (
                        <span className="text-[10px] font-black text-amber-200/90 shrink-0">
                          {cashParts.unit}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="mt-auto pt-0.5 border-t border-white/5">
                <div className="text-[9px] text-slate-300 font-bold flex items-center gap-1 opacity-90">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>پوختەی کاشی ڕۆژانە</span>
                </div>
              </div>
            </div>
          </div>

          {/* کارت ٤: قەرز (Debts) - Rich Berry/Magenta */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-[28px] sm:rounded-[32px] shadow-lg border border-white/10 flex flex-col overflow-hidden transition-all hover:border-fuchsia-500/40 hover:scale-[1.01] active:scale-[0.99] group">
            {/* Rich Berry Header Section with Icon */}
            <div className="h-11 sm:h-13 w-full bg-gradient-to-br from-fuchsia-600 to-pink-500 relative flex items-center justify-between px-3.5 sm:px-4 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_70%)] pointer-events-none" />
              <span className="text-white font-black text-xs sm:text-sm tracking-wide relative z-10 drop-shadow-xs">
                قەرز
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 border border-white/30 shadow-xs flex items-center justify-center p-1 shrink-0 relative z-10 backdrop-blur-xs transition-transform group-hover:rotate-6 group-hover:scale-110">
                <img
                  src={debtCard3dIcon}
                  alt="قەرز"
                  className="w-full h-full object-contain drop-shadow-xs"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-3 left-0 right-0 h-6 bg-slate-900/90 rounded-t-[28px] sm:rounded-t-[32px] pointer-events-none" />
            </div>

            <div className="p-3.5 sm:p-5 pt-1 sm:pt-2 flex flex-col justify-between flex-1 min-h-[95px] sm:min-h-[125px]">
              <div className="my-auto space-y-1.5 py-1">
                {(() => {
                  const collectedParts = formatStatParts(dailyStats.totalDebtCollected);
                  const issuedParts = formatStatParts(dailyStats.totalDebtIssued);
                  return (
                    <div className="space-y-1.5 w-full">
                      <div className="flex items-center justify-between gap-1.5 bg-slate-800/80 px-2.5 py-1 sm:py-1.5 rounded-xl border border-white/10 group-hover:bg-slate-800 transition-colors w-full">
                        <span className="text-emerald-300 font-bold text-[10px] sm:text-xs shrink-0">وەرگیراو (کۆی قەرز)</span>
                        <span
                          className={`font-black text-white font-mono tracking-tight truncate ${getAdaptiveDebtFontSize(collectedParts.full.length)}`}
                          dir="ltr"
                          title={collectedParts.full}
                        >
                          {collectedParts.full}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1.5 bg-rose-950/40 px-2.5 py-1 sm:py-1.5 rounded-xl border border-rose-500/20 group-hover:bg-rose-950/60 transition-colors w-full">
                        <span className="text-rose-400 font-bold text-[10px] sm:text-xs shrink-0">ڕۆشتوو</span>
                        <span
                          className={`font-black text-rose-300 font-mono tracking-tight truncate ${getAdaptiveDebtFontSize(issuedParts.full.length)}`}
                          dir="ltr"
                          title={issuedParts.full}
                        >
                          {issuedParts.full}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="mt-auto pt-1 border-t border-white/5">
                <div className="text-[10px] sm:text-xs text-slate-300 font-bold flex items-center gap-1.5 opacity-90">
                  <div className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
                  <span>ئاماری قەرزەکانی ئەمڕۆ</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      

      {/* Saved Records / Invoices Modal (هەموو پسووڵەکان) */}
      {isSavedRecordsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/15 shadow-2xl overflow-hidden w-full max-w-6xl max-h-[92vh] flex flex-col text-right animate-in zoom-in-95 duration-150 text-white">
            {/* Modal Header Banner */}
            <div
              className="p-4 sm:p-5 text-white flex flex-col gap-3.5 sm:gap-4 shadow-md relative overflow-hidden bg-cover bg-center shrink-0 border-b border-white/10"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(10, 20, 40, 0.90), rgba(5, 12, 28, 0.80)), url('/blue_mesh_bg.jpg')`,
              }}
            >
              {/* Top Row: Title, Icon & Close Button */}
              <div className="flex items-center justify-between gap-3 w-full">
                {/* Right side (RTL): Receipt Icon & Title Section */}
                <div className="flex items-center gap-3 sm:gap-3.5">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-cyan-600/30 border border-cyan-400/40 text-cyan-300 flex items-center justify-center font-black shadow-lg shrink-0">
                    <Receipt className="w-6 h-6 text-cyan-300" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                        هەموو پسووڵە و تۆمارەکان
                      </h3>
                      <span className="bg-emerald-500/90 text-white text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-black border border-emerald-400/40 shadow-xs">
                        {employees.length} پسووڵە
                      </span>
                    </div>
                    <p className="text-xs text-cyan-200/80 font-medium mt-0.5">
                      بەڕێوەبردن و گەڕان لە پسووڵەکان
                    </p>
                  </div>
                </div>

                {/* Left side (RTL): Close button */}
                <button
                  type="button"
                  onClick={() => setIsSavedRecordsOpen(false)}
                  className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white transition-all cursor-pointer shrink-0 shadow-sm"
                  title="داخستن"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Bottom Row: RTL Search Bar with Search on FAR RIGHT and Camera on FAR LEFT */}
              <div className="w-full relative" dir="rtl">
                {/* 1. Far Right: Search Icon (Magnifying Glass 🔍) */}
                <div className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center text-slate-300">
                  <Search className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-slate-300" />
                </div>

                {/* 2. Middle: Input Field with exact requested placeholder and clean RTL alignment */}
                <input
                  id="records-search-input"
                  type="text"
                  dir="rtl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="گەڕان بە پێی ناو، ژ.موبایل، کۆد..."
                  className="w-full pr-11 sm:pr-12 pl-20 sm:pl-24 py-2.5 sm:py-3 bg-slate-950/70 text-white placeholder-slate-400 border border-white/15 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 shadow-sm text-right transition-all"
                />

                {/* 3. Far Left: Clear button (if text exists) + Camera/Barcode Icon (📷) */}
                <div className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-1.5">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 sm:p-1.5 text-slate-300 hover:text-white rounded-full transition-colors cursor-pointer"
                      title="سڕینەوەی گەڕان"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="p-1.5 sm:p-2 text-slate-300 hover:text-cyan-300 hover:bg-white/10 rounded-lg sm:rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                    title="کامێرا یان سکانی کۆد"
                  >
                    <Camera className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-slate-300 hover:text-cyan-300" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body: Records Table */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full table-fixed text-right text-xs sm:text-sm">
                <thead
                  className="text-cyan-200 font-black border-b border-white/10 bg-slate-950/80 sticky top-0 z-10 shadow-xs backdrop-blur-md"
                >
                  <tr>
                    <th className="py-3.5 px-3 sm:px-4 w-[33%] sm:w-[30%] whitespace-nowrap text-right">بەروار و کات</th>
                    <th className="py-3.5 px-3 sm:px-4 w-[35%] sm:w-[40%] whitespace-nowrap text-right">ناوی کڕیار</th>
                    <th className="py-3.5 px-2 sm:px-4 w-[32%] sm:w-[30%] text-center whitespace-nowrap">کردارەکان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-slate-900/40">
                  {paginatedEmployeesList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-300 font-bold">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-400 animate-pulse" />
                        <p>هیچ پسووڵە یان تۆمارێک نەدۆزرایەوە</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployeesList.map((emp) => (
                      <EmployeeRecordRow
                        key={emp.id}
                        emp={emp}
                        isSelected={selectedEmpId === emp.id}
                        onViewInvoice={handleViewInvoice}
                        onEdit={handleEditFromTable}
                        onDelete={handleDeleteFromTable}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer with Pagination & Neutral Close Button */}
            <div className="bg-slate-950/70 p-3 sm:p-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-200 text-xs sm:text-sm font-bold shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-slate-300 font-bold">لاپەڕەی</span>
                <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg text-xs font-black font-mono">
                  {currentPage}
                </span>
                <span className="text-slate-300 font-bold">لە</span>
                <span className="bg-slate-800 text-cyan-300 border border-white/10 px-2 py-0.5 rounded-lg text-xs font-black font-mono">
                  {totalEmployeePages}
                </span>
                <span className="text-slate-300 font-normal hidden md:inline">|</span>
                <span className="text-slate-300 font-medium text-xs hidden md:inline">
                  (کۆی گشتی {filteredEmployeesList.length} تۆمار)
                </span>
              </div>
              
              <div className="flex items-center gap-2.5">
                {totalEmployeePages > 1 && (
                  <div className="flex items-center gap-1.5 ml-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all font-bold text-xs cursor-pointer shadow-3xs"
                    >
                      یەکەمین
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-3xs flex items-center justify-center"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    
                    <span className="px-2 font-mono font-black text-white text-xs">
                      {currentPage}
                    </span>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(totalEmployeePages, prev + 1))}
                      disabled={currentPage === totalEmployeePages}
                      className="p-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-3xs flex items-center justify-center"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalEmployeePages)}
                      disabled={currentPage === totalEmployeePages}
                      className="px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all font-bold text-xs cursor-pointer shadow-3xs"
                    >
                      کۆتایین
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsSavedRecordsOpen(false)}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  داخستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Password Protected Delete Confirmation Modal */}
      {deleteTargetEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-rose-500/30 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-right text-white">
            {/* Modal Header */}
            <div className="bg-rose-950/40 border-b border-rose-500/30 p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/30 text-rose-300 border border-rose-400/40 flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base sm:text-lg">
                    دڵنیابوونەوە لە سڕینەوە
                  </h3>
                  <p className="text-xs text-rose-300 font-bold">
                    پێویستە ژمارەی نهێنی تایبەت بنووسیت
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmDelete} className="p-5 sm:p-6 space-y-4">
              {/* Target Record Info Box */}
              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-bold text-slate-300">ناوی کڕیار:</span>
                  <span className="font-black text-white text-sm">
                    {deleteTargetEmp.name}
                  </span>
                </div>
                {deleteTargetEmp.productName && (
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-bold text-slate-300">کاڵا و کێش/بڕ:</span>
                    <span className="font-bold text-slate-100">
                      {deleteTargetEmp.productName} ({deleteTargetEmp.quantity ?? 0} {deleteTargetEmp.unit || 'کگم'})
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-bold text-slate-300">کۆی گشتی:</span>
                  <span className="font-black font-mono text-white text-sm">
                    {formatCurrency(deleteTargetEmp.totalAmount || 0, settings.currency, settings.usdToIqdRate)}
                  </span>
                </div>
              </div>

              {/* Security PIN Input Field */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-rose-400" />
                  <span>ژمارەی نهێنی سڕینەوە بنووسە:</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showDeletePassword ? 'text' : 'password'}
                    autoFocus
                    required
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      if (deleteError) setDeleteError('');
                    }}
                    placeholder="ژمارەی نهێنی..."
                    className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-rose-500/40 bg-slate-950/70 text-white placeholder:text-slate-400 text-sm font-mono font-black shadow-xs focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="absolute left-3 text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                    title={showDeletePassword ? 'شاردنەوە' : 'پیشاندان'}
                  >
                    {showDeletePassword ? (
                      <EyeOff className="w-4 h-4 text-slate-300 hover:text-white" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-300 hover:text-white" />
                    )}
                  </button>
                </div>
                {deleteError ? (
                  <p className="text-xs font-bold text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{deleteError}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-300 font-medium">
                    تێبینی: بۆ تەواوکردنی سڕینەوە دەبێت وشەی نهێنی بەرپرسی سیستم داخڵ بکرێت.
                  </p>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-slate-100 hover:text-white text-xs sm:text-sm font-black transition-colors cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-500/80 hover:bg-rose-500 active:scale-95 text-white text-xs sm:text-sm font-black shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>سڕینەوەی یەکجاری</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Password Protected Edit Access Modal */}
      {editTargetEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-blue-500/30 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-right text-white">
            {/* Modal Header */}
            <div className="bg-blue-950/40 border-b border-blue-500/30 p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/30 text-blue-300 border border-blue-400/40 flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base sm:text-lg">
                    ڕێگەپێدان بۆ دەستکاریکردن
                  </h3>
                  <p className="text-xs text-blue-300 font-bold">
                    پێویستە ژمارەی نهێنی تایبەت بنووسیت
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmEditAccess} className="p-5 sm:p-6 space-y-4">
              {/* Target Record Info Box */}
              <div className="bg-slate-800/70 p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-bold text-slate-300">ناوی کڕیار:</span>
                  <span className="font-black text-white text-sm">
                    {editTargetEmp.name}
                  </span>
                </div>
                {editTargetEmp.productName && (
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-bold text-slate-300">کاڵا و کێش/بڕ:</span>
                    <span className="font-bold text-slate-100">
                      {editTargetEmp.productName} ({editTargetEmp.quantity ?? 0} {editTargetEmp.unit || 'کگم'})
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-bold text-slate-300">کۆی گشتی:</span>
                  <span className="font-black font-mono text-white text-sm">
                    {formatCurrency(editTargetEmp.totalAmount || 0, settings.currency, settings.usdToIqdRate)}
                  </span>
                </div>
              </div>

              {/* Security PIN Input Field */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-400" />
                  <span>ژمارەی نهێنی دەستکاری بنووسە:</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    autoFocus
                    required
                    value={editPassword}
                    onChange={(e) => {
                      setEditPassword(e.target.value);
                      if (editError) setEditError('');
                    }}
                    placeholder="ژمارەی نهێنی..."
                    className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-blue-500/40 bg-slate-950/70 text-white placeholder:text-slate-400 text-sm font-mono font-black shadow-xs focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute left-3 text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                    title={showEditPassword ? 'شاردنەوە' : 'پیشاندان'}
                  >
                    {showEditPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-300 hover:text-white" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-300 hover:text-white" />
                    )}
                  </button>
                </div>
                {editError ? (
                  <p className="text-xs font-bold text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{editError}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-300 font-medium">
                    تێبینی: بۆ کردنەوەی دەستکاری دەبێت وشەی نهێنی بەرپرسی سیستم داخڵ بکرێت.
                  </p>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-slate-100 hover:text-white text-xs sm:text-sm font-black transition-colors cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 active:scale-95 text-white text-xs sm:text-sm font-black shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                  <span>ڕێگەپێدانی دەستکاری</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Corporate Invoice View & Print Modal */}
      <InvoiceModal sale={activeInvoice} onClose={() => setActiveInvoice(null)} />

      {/* Interactive Calendar Date Picker Modal */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in" dir="rtl">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/15 w-full max-w-sm overflow-hidden flex flex-col animate-scale-up text-white">
            {/* Calendar Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 text-white p-4 flex items-center justify-between border-b border-cyan-500/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center font-bold shrink-0">
                  <Calendar className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">هەڵبژاردنی بەرواری ئامار</h3>
                  <p className="text-[10px] text-cyan-200/80">کلیک لەسەر بەروار بپۆشە بۆ بینینی ئامارەکان</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="داخستن"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Month Navigation Bar */}
            <div className="p-3 bg-slate-950/60 flex items-center justify-between border-b border-white/10" dir="ltr">
              <button
                type="button"
                onClick={() => {
                  setCalendarViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                }}
                className="p-2 rounded-xl bg-slate-800/80 border border-white/15 hover:bg-white/10 hover:text-cyan-300 hover:border-cyan-400/40 text-white transition-colors shadow-2xs cursor-pointer"
                title="مانگی پێشوو"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center font-black text-xs sm:text-sm text-white flex items-center gap-2">
                <span>
                  {calendarViewMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCalendarViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                }}
                className="p-2 rounded-xl bg-slate-800/80 border border-white/15 hover:bg-white/10 hover:text-cyan-300 hover:border-cyan-400/40 text-white transition-colors shadow-2xs cursor-pointer"
                title="مانگی داهاتوو"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days Grid */}
            <div className="p-3.5">
              {/* Day Labels Header */}
              <div className="grid grid-cols-7 text-center mb-2">
                {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ه'].map((dayName, idx) => (
                  <span key={idx} className="text-[11px] font-bold text-slate-300">
                    {dayName}
                  </span>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const year = calendarViewMonth.getFullYear();
                  const month = calendarViewMonth.getMonth();
                  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
                  // Adjust Sunday=0 to Kurdish/Middle East week index offset (Sat=0)
                  const adjustedOffset = (firstDayIndex + 1) % 7; 
                  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

                  const cells = [];
                  for (let i = 0; i < adjustedOffset; i++) {
                    cells.push(<div key={`empty-${i}`} className="h-9 sm:h-10" />);
                  }

                  const pad = (n: number) => n.toString().padStart(2, '0');
                  let todayStr = '';
                  try {
                    todayStr = getNowDateTimeLocal().split('T')[0];
                  } catch {
                    todayStr = new Date().toISOString().split('T')[0];
                  }

                  for (let day = 1; day <= totalDaysInMonth; day++) {
                    const cellDateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
                    const isSelected = statsDate === cellDateStr;
                    const isToday = todayStr === cellDateStr;

                    cells.push(
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setStatsDate(cellDateStr);
                          try {
                            const timePart = entryDateTime.includes('T') ? entryDateTime.split('T')[1] : '12:00';
                            setEntryDateTime(`${cellDateStr}T${timePart}`);
                          } catch {
                            setEntryDateTime(`${cellDateStr}T12:00`);
                          }
                          setIsCalendarOpen(false);
                        }}
                        className={`h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-bold flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-md scale-105 font-black z-10'
                            : isToday
                            ? 'bg-cyan-950/60 text-cyan-300 border-2 border-cyan-400/80 font-extrabold hover:bg-cyan-900/80'
                            : 'text-white hover:bg-white/10 hover:text-cyan-300'
                        }`}
                      >
                        <span>{day}</span>
                        {isToday && !isSelected && (
                          <span className="w-1 h-1 rounded-full bg-cyan-400 absolute bottom-1" />
                        )}
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>

            {/* Calendar Footer Actions */}
            <div className="p-3 bg-slate-950/70 border-t border-white/10 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const nowStr = getNowDateTimeLocal();
                  const today = nowStr.split('T')[0];
                  setStatsDate(today);
                  setEntryDateTime(nowStr);
                  const parts = today.split('-');
                  if (parts.length === 3) {
                    setCalendarViewMonth(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
                  }
                  setIsCalendarOpen(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 font-black text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>ئەمڕۆ (Today)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCalendarOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-bold text-xs transition-colors cursor-pointer"
              >
                داخستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
