import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Plus, Trash2, Users, Pencil, X, ShieldCheck, Eye, Save, ChevronDown, ChevronUp, Wallet, User, ArrowLeftRight, PieChart, Package, UserPlus, Upload } from 'lucide-react';
import { ShareholderTransaction, ShareholderProfile } from '../types';
import { compressImage } from '../utils/imageCompressor';
import { SecurityPasscodeModal } from './SecurityPasscodeModal';
import { ShareholderInvoiceModal } from './ShareholderInvoiceModal';
import { 
  useSystemClock, 
  toLocalDateTimeInput, 
  parseInputDateToIso, 
  getSyncedNow 
} from '../utils/clockSync';

import { normalizeKurdishText } from '../utils/textNormalization';
import { calculateAllShareholderLiveShares } from '../utils/shareholderCalculations';
import { useAuth } from '../context/AuthContext';

export const ShareholderLedger: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    shareholderTransactions, 
    addShareholderTransaction, 
    updateShareholderTransaction,
    deleteShareholderTransaction, 
    products,
    updateProduct,
    closedProductArchives,
    productMovements,
    sales,
    settings 
  } = useDatabase();

  // Central system clock sync with 10-second real-time update pulse
  const { syncedDate } = useSystemClock(10000);
  
  const [showForm, setShowForm] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedInvoiceTx, setSelectedInvoiceTx] = useState<ShareholderTransaction | null>(null);
  const [editModalTx, setEditModalTx] = useState<ShareholderTransaction | null>(null);
  const [deleteTargetTx, setDeleteTargetTx] = useState<ShareholderTransaction | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<{ name: string; transactions: ShareholderTransaction[] } | null>(null);
  const [expandedShareholders, setExpandedShareholders] = useState<Record<string, boolean>>({});
  const [selectedBreakdown, setSelectedBreakdown] = useState<{
    name: string;
    total: number;
    items: any[];
  } | null>(null);

  const [deletedShareholderKeys, setDeletedShareholderKeys] = useState<string[]>(() => {
    try {
      const list = JSON.parse(localStorage.getItem('deleted_shareholders') || '[]');
      const arr = Array.isArray(list) ? list : [];
      const mohammadNorm = normalizeKurdishText('محمد دیالا');
      if (!arr.includes(mohammadNorm)) {
        arr.push(mohammadNorm);
        localStorage.setItem('deleted_shareholders', JSON.stringify(arr));
      }
      return arr;
    } catch {
      return [normalizeKurdishText('محمد دیالا')];
    }
  });

  // Automatically remove "محمد دیالا" from any products or transactions
  useEffect(() => {
    const targetNorm = normalizeKurdishText('محمد دیالا');
    products.forEach((p) => {
      if (p.shareholderName && normalizeKurdishText(p.shareholderName) === targetNorm) {
        updateProduct(p.id, { shareholderName: undefined, shareholderPercentage: undefined });
      }
    });
    shareholderTransactions.forEach((tx) => {
      if (normalizeKurdishText(tx.name) === targetNorm) {
        deleteShareholderTransaction(tx.id);
      }
    });
  }, [products, shareholderTransactions, updateProduct, deleteShareholderTransaction]);
  
  // Shareholder Profiles (Independent of transactions)
  const [shareholderProfiles, setShareholderProfiles] = useState<ShareholderProfile[]>(() => {
    try {
      const data = localStorage.getItem('kurd_pos_shareholder_profiles_v1');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const saveProfiles = (profiles: ShareholderProfile[]) => {
    setShareholderProfiles(profiles);
    try {
      localStorage.setItem('kurd_pos_shareholder_profiles_v1', JSON.stringify(profiles));
    } catch {}
  };

  // Form for creating a new Shareholder Profile ONLY (No financial transaction required)
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    address: '',
    age: '',
    image: '',
    notes: '',
  });

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) return;

    const newProfile: ShareholderProfile = {
      id: 'shp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: profileForm.name.trim(),
      phone: profileForm.phone.trim() || undefined,
      address: profileForm.address.trim() || undefined,
      age: profileForm.age ? Number(profileForm.age) : undefined,
      image: profileForm.image.trim() || undefined,
      notes: profileForm.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const newNorm = normalizeKurdishText(newProfile.name);
    const updated = [newProfile, ...shareholderProfiles.filter(p => normalizeKurdishText(p.name) !== newNorm)];
    saveProfiles(updated);

    // Un-blacklist if it was deleted
    setDeletedShareholderKeys(prev => {
      const next = prev.filter(k => k !== newNorm);
      try { localStorage.setItem('deleted_shareholders', JSON.stringify(next)); } catch {}
      return next;
    });

    setProfileForm({
      name: '',
      phone: '',
      address: '',
      age: '',
      image: '',
      notes: '',
    });
    setShowForm(false);
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.8 });
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const res = uploadEvent.target?.result as string;
        setProfileForm(prev => ({ ...prev, image: res }));
      };
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const res = uploadEvent.target?.result as string;
        setProfileForm(prev => ({ ...prev, image: res }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Modal for editing an existing Shareholder Profile
  const [editProfileTarget, setEditProfileTarget] = useState<{
    originalKey: string;
    originalName: string;
    name: string;
    phone: string;
    address: string;
    age: string;
    image: string;
    notes: string;
    profileId?: string;
  } | null>(null);

  const handleEditProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editProfileTarget) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.8 });
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const res = uploadEvent.target?.result as string;
        setEditProfileTarget(prev => prev ? ({ ...prev, image: res }) : null);
      };
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const res = uploadEvent.target?.result as string;
        setEditProfileTarget(prev => prev ? ({ ...prev, image: res }) : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfileEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfileTarget || !editProfileTarget.name.trim()) return;

    const trimmedName = editProfileTarget.name.trim();
    const originalNorm = editProfileTarget.originalKey;
    const newNorm = normalizeKurdishText(trimmedName);

    const existingIdx = shareholderProfiles.findIndex(p => 
      (editProfileTarget.profileId && p.id === editProfileTarget.profileId) || 
      normalizeKurdishText(p.name) === originalNorm
    );

    let updatedProfiles = [...shareholderProfiles];
    const profileData: ShareholderProfile = {
      id: editProfileTarget.profileId || ('shp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
      name: trimmedName,
      phone: editProfileTarget.phone.trim() || undefined,
      address: editProfileTarget.address.trim() || undefined,
      age: editProfileTarget.age ? Number(editProfileTarget.age) : undefined,
      image: editProfileTarget.image.trim() || undefined,
      notes: editProfileTarget.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      updatedProfiles[existingIdx] = {
        ...updatedProfiles[existingIdx],
        ...profileData,
      };
    } else {
      updatedProfiles.unshift(profileData);
    }

    saveProfiles(updatedProfiles);

    if (originalNorm !== newNorm) {
      shareholderTransactions
        .filter(tx => normalizeKurdishText(tx.name) === originalNorm)
        .forEach(tx => {
          updateShareholderTransaction(tx.id, {
            name: trimmedName,
            phone: editProfileTarget.phone.trim() || undefined,
            address: editProfileTarget.address.trim() || undefined,
            age: editProfileTarget.age ? Number(editProfileTarget.age) : undefined,
            image: editProfileTarget.image.trim() || undefined,
          });
        });

      products
        .filter(p => p.shareholderName && normalizeKurdishText(p.shareholderName) === originalNorm)
        .forEach(p => {
          updateProduct(p.id, { shareholderName: trimmedName });
        });
    } else {
      shareholderTransactions
        .filter(tx => normalizeKurdishText(tx.name) === originalNorm)
        .forEach(tx => {
          updateShareholderTransaction(tx.id, {
            phone: editProfileTarget.phone.trim() || undefined,
            address: editProfileTarget.address.trim() || undefined,
            age: editProfileTarget.age ? Number(editProfileTarget.age) : undefined,
            image: editProfileTarget.image.trim() || undefined,
          });
        });
    }

    setDeletedShareholderKeys(prev => {
      const next = prev.filter(k => k !== newNorm && k !== originalNorm);
      try { localStorage.setItem('deleted_shareholders', JSON.stringify(next)); } catch {}
      return next;
    });

    setEditProfileTarget(null);
  };

  // Modal for adding a transaction to an existing shareholder
  const [txModalShareholder, setTxModalShareholder] = useState<string | null>(null);
  const [newTxData, setNewTxData] = useState({
    type: 'deposit' as 'deposit' | 'withdrawal',
    amount: '',
    date: toLocalDateTimeInput(),
    notes: '',
    recordedBy: '',
    image: '',
  });

  const handleNewTxImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.8 });
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const res = uploadEvent.target?.result as string;
        setNewTxData(prev => ({ ...prev, image: res }));
      };
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const res = uploadEvent.target?.result as string;
        setNewTxData(prev => ({ ...prev, image: res }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txModalShareholder || !newTxData.amount || !newTxData.date) return;

    addShareholderTransaction({
      name: txModalShareholder.trim(),
      type: newTxData.type,
      amount: parseFloat(newTxData.amount),
      date: parseInputDateToIso(newTxData.date),
      notes: newTxData.notes.trim() || undefined,
      recordedBy: newTxData.recordedBy.trim() || undefined,
      image: newTxData.image.trim() || undefined,
    });

    if (newTxData.image.trim()) {
      const targetNorm = normalizeKurdishText(txModalShareholder);
      setShareholderProfiles(prev => {
        const idx = prev.findIndex(p => normalizeKurdishText(p.name) === targetNorm);
        if (idx >= 0 && !prev[idx].image) {
          const next = [...prev];
          next[idx] = { ...next[idx], image: newTxData.image.trim() };
          saveProfiles(next);
          return next;
        }
        return prev;
      });
    }

    setNewTxData({
      type: 'deposit',
      amount: '',
      date: toLocalDateTimeInput(),
      notes: '',
      recordedBy: '',
      image: '',
    });
    setTxModalShareholder(null);
  };

  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    type: 'deposit' as 'deposit' | 'withdrawal',
    amount: '',
    date: '',
    notes: '',
    address: '',
    age: '',
    image: '',
    recordedBy: '',
  });

  const handleEditModalImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.8 });
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const res = uploadEvent.target?.result as string;
        setEditFormData(prev => ({ ...prev, image: res }));
      };
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const res = uploadEvent.target?.result as string;
        setEditFormData(prev => ({ ...prev, image: res }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-correction for transactions recorded on 2026-09-17 that defaulted to 00:00 UTC (03:00 local time)
  useEffect(() => {
    shareholderTransactions.forEach((tx) => {
      try {
        const d = new Date(tx.date);
        if (
          tx.date.includes('2026-09-17') &&
          (tx.date.includes('T00:00:00') || (d.getHours() === 3 && d.getMinutes() === 0))
        ) {
          const corrected = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 16, 0, 0);
          updateShareholderTransaction(tx.id, { date: corrected.toISOString() });
        }
      } catch {}
    });
  }, [shareholderTransactions, updateShareholderTransaction]);

  const handleOpenEditModal = (tx: ShareholderTransaction) => {
    setEditModalTx(tx);
    setEditFormData({
      name: tx.name,
      phone: tx.phone || '',
      type: (tx.type as 'deposit' | 'withdrawal') || 'deposit',
      amount: tx.amount.toString(),
      date: toLocalDateTimeInput(tx.date),
      notes: tx.notes || '',
      address: tx.address || '',
      age: tx.age?.toString() || '',
      image: tx.image || '',
      recordedBy: tx.recordedBy || '',
    });
  };

  const handleSaveEditModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalTx) return;
    if (!editFormData.name.trim() || !editFormData.amount) return;

    const parsedAmount = parseFloat(editFormData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    updateShareholderTransaction(editModalTx.id, {
      name: editFormData.name.trim(),
      phone: editFormData.phone.trim() || undefined,
      type: editFormData.type,
      amount: parsedAmount,
      date: parseInputDateToIso(editFormData.date),
      notes: editFormData.notes.trim() || undefined,
      address: editFormData.address.trim() || undefined,
      age: editFormData.age || undefined,
      image: editFormData.image.trim() || undefined,
      recordedBy: editFormData.recordedBy.trim() || undefined,
    });

    if (editFormData.image.trim()) {
      const targetNorm = normalizeKurdishText(editFormData.name);
      setShareholderProfiles(prev => {
        const idx = prev.findIndex(p => normalizeKurdishText(p.name) === targetNorm);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], image: editFormData.image.trim() };
          saveProfiles(next);
          return next;
        }
        return prev;
      });
    }

    setEditModalTx(null);
  };

  const totalDeposits = shareholderTransactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = shareholderTransactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
  const netEquity = totalDeposits - totalWithdrawals;

  const liveShares = useMemo(() => {
    return calculateAllShareholderLiveShares(products, closedProductArchives, productMovements, sales);
  }, [products, closedProductArchives, productMovements, sales]);

  const groupedShareholders = useMemo(() => {
    const map = new Map<string, {
      key: string;
      name: string;
      phone?: string;
      address?: string;
      age?: string | number;
      image?: string;
      notes?: string;
      profileId?: string;
      transactions: ShareholderTransaction[];
      latestDate: string;
      totalDeposits: number;
      totalWithdrawals: number;
      totalLiveShares: number;
      liveBreakdown: any[];
      netBalance: number;
    }>();

    // 1. Seed from Shareholder Profiles
    shareholderProfiles.forEach((profile) => {
      const key = normalizeKurdishText(profile.name);
      if (deletedShareholderKeys.includes(key)) return;
      map.set(key, {
        key,
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        age: profile.age,
        image: profile.image,
        notes: profile.notes,
        profileId: profile.id,
        transactions: [],
        latestDate: profile.createdAt || new Date().toISOString(),
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalLiveShares: 0,
        liveBreakdown: [],
        netBalance: 0,
      });
    });

    // 2. Process Manual Transactions (Filter out old auto-generated share deposits to avoid double counting)
    const filteredTxs = shareholderTransactions.filter(tx => {
      // If it's a deposit with a note mentioning share profit, skip it as we now calculate it live
      if (tx.type === 'deposit' && (tx.notes?.includes('پشکی قازانجی کاڵای') || tx.notes?.includes('پشکی قازانجی'))) {
        return false;
      }
      return true;
    });

    // Sort all transactions by date descending
    const sorted = [...filteredTxs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sorted.forEach((tx) => {
      const key = normalizeKurdishText(tx.name);
      if (deletedShareholderKeys.includes(key)) return;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: tx.name.trim(),
          phone: tx.phone?.trim() || undefined,
          address: tx.address?.trim() || undefined,
          age: tx.age || undefined,
          image: tx.image?.trim() || undefined,
          notes: tx.notes?.trim() || undefined,
          transactions: [],
          latestDate: tx.date,
          totalDeposits: 0,
          totalWithdrawals: 0,
          totalLiveShares: 0,
          liveBreakdown: [],
          netBalance: 0,
        });
      }
      const group = map.get(key)!;
      if (!group.phone && tx.phone?.trim()) group.phone = tx.phone.trim();
      if (!group.address && tx.address?.trim()) group.address = tx.address.trim();
      if (!group.age && tx.age) group.age = tx.age;
      if (!group.image && tx.image?.trim()) group.image = tx.image.trim();
      if (!group.notes && tx.notes?.trim()) group.notes = tx.notes.trim();

      group.transactions.push(tx);
      if (tx.type === 'deposit') {
        group.totalDeposits += tx.amount;
        group.netBalance += tx.amount;
      } else {
        group.totalWithdrawals += tx.amount;
        group.netBalance -= tx.amount;
      }
    });

    // 3. Add Live Shares
    liveShares.forEach((stats, key) => {
      if (deletedShareholderKeys.includes(key)) return;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: stats.name,
          transactions: [],
          latestDate: new Date(0).toISOString(),
          totalDeposits: 0,
          totalWithdrawals: 0,
          totalLiveShares: 0,
          liveBreakdown: [],
          netBalance: 0,
        });
      }
      const group = map.get(key)!;
      group.totalLiveShares = stats.totalLiveShare;
      group.liveBreakdown = stats.productBreakdown;
      group.netBalance += stats.totalLiveShare;
    });

    return Array.from(map.values())
      .filter((group) => {
        if (deletedShareholderKeys.includes(group.key)) return false;
        if (!group.profileId && group.transactions.length === 0 && group.totalLiveShares === 0 && group.netBalance === 0) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
  }, [shareholderProfiles, shareholderTransactions, liveShares, deletedShareholderKeys]);

  const toggleExpand = (key: string) => {
    setExpandedShareholders((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getRelativeTimeKurdish = (dateStr: string): string => {
    try {
      const txDate = new Date(dateStr);
      const now = syncedDate;
      const diffMs = now.getTime() - txDate.getTime();
      if (isNaN(diffMs)) return 'ئێستا';
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins <= 5) {
        return 'ئێستا';
      } else if (diffMins < 60) {
        return `${diffMins} خولەک لەمەوبەر`;
      } else if (diffHours < 24) {
        return `${diffHours} سەعات لەمەوبەر`;
      } else if (diffDays === 1) {
        return 'دوێنێ';
      } else if (diffDays < 7 && diffDays > 1) {
        return `${diffDays} ڕۆژ لەمەوبەر`;
      } else {
        return formatDate(dateStr).split(' ')[0];
      }
    } catch {
      return 'ئێستا';
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg overflow-hidden mt-2.5 sm:mt-3 transition-all duration-300">
      {/* Header: Clickable Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 sm:p-3 flex items-center justify-between gap-3 text-right bg-slate-900/80 hover:bg-slate-800/80 active:scale-[0.99] transition-all cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 shadow-xs ${
            isOpen 
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-indigo-500/25 ring-2 ring-indigo-400/40' 
              : 'bg-slate-800 text-slate-400 border border-white/10'
          }`}>
            <User className="w-4 h-4 stroke-[2]" />
          </div>
          <div className="text-right">
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">باڵانسی هاوبەشەکان</h2>
            <p className="text-[10px] text-slate-400 font-medium">
              {isOpen ? 'دەست لێبدە بۆ شاردنەوە' : 'دەست لێبدە بۆ پیشاندانی باڵانسی هاوبەشەکان'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-400/30 hidden sm:inline-flex">
            {Object.keys(groupedShareholders).length} هاوبەش
          </span>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
            isOpen ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="border-t border-white/10 animate-in fade-in slide-in-from-top-3 duration-250">
          {/* Action Row */}
          <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs sm:text-sm font-bold text-slate-300">
              لیستی پشک و باڵانسی هاوبەشەکان ({Object.keys(groupedShareholders).length} هاوبەش)
            </div>
            <button
              type="button"
              onClick={() => {
                setProfileForm({
                  name: '',
                  phone: '',
                  address: '',
                  age: '',
                  image: '',
                  notes: '',
                });
                setShowForm(!showForm);
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {showForm ? 'داخستنی فۆڕم' : 'زیادکردنی هاوبەش'}
            </button>
          </div>

      {showForm && (
        <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-900/60 backdrop-blur-md animate-in slide-in-from-top-2 duration-200 text-white rounded-2xl mx-2 my-2 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <span className="text-xs text-slate-400">تەنها زانیارییە کەسییەکان بنووسە بۆ دروستکردنی پرۆفایلی هاوبەشی نوێ</span>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>دروستکردنی پرۆفایلی هاوبەش</span>
              <UserPlus className="w-4 h-4 text-cyan-400" />
            </h3>
          </div>
          <form onSubmit={handleCreateProfile} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-right">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ناوی تەواوی هاوبەش <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full bg-slate-900/60 backdrop-blur-md border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none text-right transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">ژمارەی مۆبایل</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full bg-slate-900/60 backdrop-blur-md border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none text-left font-mono transition-colors"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">ناونیشان / شوێن</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full bg-slate-900/60 backdrop-blur-md border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none text-right transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">تەمەن</label>
              <input
                type="number"
                value={profileForm.age}
                onChange={e => setProfileForm({ ...profileForm, age: e.target.value })}
                className="w-full bg-slate-900/60 backdrop-blur-md border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none text-center font-mono transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">وێنەی هاوبەش</label>
              <div className="flex items-center gap-2.5 bg-slate-900/60 backdrop-blur-md border border-slate-700 rounded-xl p-1.5 min-h-[46px]">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {profileForm.image ? (
                    <img src={profileForm.image} alt="وێنەی هاوبەش" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600/80 hover:bg-indigo-600 active:scale-95 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{profileForm.image ? 'گۆڕینی وێنە' : 'هەڵبژاردنی وێنە'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      className="hidden"
                    />
                  </label>
                  {profileForm.image && (
                    <button
                      type="button"
                      onClick={() => setProfileForm(prev => ({ ...prev, image: '' }))}
                      className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer shrink-0"
                      title="سڕینەوەی وێنە"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">تێبینی</label>
              <input
                type="text"
                value={profileForm.notes}
                onChange={e => setProfileForm({ ...profileForm, notes: e.target.value })}
                className="w-full bg-slate-900/60 backdrop-blur-md border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none text-right transition-colors"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:bg-white/10 text-xs font-bold transition-all cursor-pointer"
              >
                پاشگەزبوونەوە
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl px-6 py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>دروستکردنی پرۆفایلی هاوبەش</span>
              </button>
            </div>
          </form>
        </div>
      )}



      {/* Shareholders Cards (Replacing the table with the blue balance cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pb-12 sm:pb-8">
        {groupedShareholders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700 col-span-full">
            <Users className="w-10 h-10 mx-auto text-slate-500 mb-2" />
            <p className="font-bold text-sm text-slate-300">هیچ هاوبەشێک تۆمار نەکراوە</p>
            <p className="text-xs text-slate-500 mt-1">دەتوانیت لە ڕێگەی فۆرمی سەرەوە مامەڵەی نوێ تۆمار بکەیت</p>
          </div>
        ) : (
          groupedShareholders.map((group) => {
            const formatted = formatDate(group.latestDate);
            const isExpanded = !!expandedShareholders[group.key];
            const txCount = group.transactions.length;

            return (
              <div
                key={group.key}
                className="relative overflow-hidden bg-slate-800 text-slate-100 rounded-3xl p-4 sm:p-5 border border-slate-700 shadow-xl transition-all duration-300 hover:shadow-indigo-950/20"
              >
                {/* Subtle brushed metallic studio lighting sheen */}
                <div className="absolute inset-0 bg-radial-at-t from-white/[0.08] via-transparent to-transparent pointer-events-none" />

                  {/* Card Header: General Balance / Name & Last Update */}
                  <div className="relative flex items-start justify-between gap-4">
                    {/* Right Side in RTL: Title & Last update */}
                    <div className="text-right flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-100 tracking-wide truncate">
                        باڵانسی گشتی / {group.name}
                      </h3>
                      <div className="text-[11px] text-slate-400 font-normal mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 justify-end" dir="rtl">
                        {group.phone && <span className="font-mono text-cyan-300">{group.phone}</span>}
                        {group.address && <span>• {group.address}</span>}
                        {group.age && <span>• تەمەن: {group.age}</span>}
                        <span>• دواین نوێکاری: {getRelativeTimeKurdish(group.latestDate)}</span>
                      </div>
                    </div>

                    {/* Left Side in RTL: Avatar or minimal wallet icon */}
                    {group.image ? (
                      <img src={group.image} alt={group.name} className="w-10 h-10 rounded-2xl object-cover border border-slate-600 shadow-md shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-2xl bg-slate-700/50 border border-slate-600 flex items-center justify-center shrink-0 shadow-inner backdrop-blur-md">
                        <User className="w-4 h-4 text-slate-300 stroke-[1.5]" />
                      </div>
                    )}
                  </div>

                  {/* Primary Balance: High visual weight */}
                  <div className="relative mt-4 text-right flex items-baseline gap-2 flex-wrap" dir="rtl">
                    <div className="font-mono text-2xl sm:text-3xl font-black tracking-tight leading-none drop-shadow-xs"
                      style={{ color: group.netBalance > 0 ? '#34d399' : '#60a5fa' }}>
                      {Math.abs(Math.round(group.netBalance)).toLocaleString('en-US')}
                    </div>
                    <div className="text-xs font-semibold text-slate-400" dir="rtl">
                      {settings.currency === 'IQD' ? 'د.ع' : '$'}
                    </div>
                  </div>

                  {/* Real-time breakdown */}
                  <div className="relative mt-2 flex flex-col items-end gap-0.5" dir="rtl">
                    <button 
                      onClick={() => setSelectedBreakdown({
                        name: group.name,
                        total: group.totalLiveShares,
                        items: group.liveBreakdown
                      })}
                      className="text-[10px] text-slate-400 flex items-center gap-1 hover:bg-slate-700/50 px-2 py-1 rounded-lg transition-colors cursor-pointer group/share"
                    >
                      <span className="text-slate-300">پشکی قازانج:</span>
                      <span className="text-emerald-300 font-bold font-mono">
                        +{group.totalLiveShares.toLocaleString('en-US')}
                      </span>
                      <Eye className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100 transition-opacity ml-1" />
                    </button>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 px-2">
                      <span className="text-slate-300">باڵانسی نەختینە:</span>
                      <span className={`font-bold font-mono ${(group.totalDeposits - group.totalWithdrawals) >= 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
                        {(group.totalDeposits - group.totalWithdrawals).toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>

                {/* Hairline Divider */}
                <div className="my-5 border-t border-white/10" />

                {/* Control Buttons: Clean rounded pill-shaped interactive areas */}
                <div className="relative flex flex-col gap-2.5">
                  {/* Top Row: Add Tx, Transactions, View, Edit */}
                  <div className="grid grid-cols-4 gap-1.5 items-center">
                    {/* Add Transaction (نوێ) */}
                    <button
                      type="button"
                      onClick={() => {
                        setTxModalShareholder(group.name);
                        setNewTxData({
                          type: 'deposit',
                          amount: '',
                          date: toLocalDateTimeInput(),
                          notes: '',
                          recordedBy: '',
                          image: group.image || '',
                        });
                      }}
                      className="inline-flex items-center justify-center p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-100 border border-emerald-500/40 transition-all shadow-xs cursor-pointer active:scale-95"
                      title="تۆمارکردنی مامەڵەی نوێ بۆ ئەم هاوبەشە"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {/* Transactions (مامەڵە) */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(group.key)}
                      className={`inline-flex items-center justify-center p-2 rounded-xl border transition-all shadow-xs cursor-pointer active:scale-95 ${
                        isExpanded
                          ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400/40'
                          : 'bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 border-slate-700/80'
                      }`}
                      title="پیشاندانی سەرجەم مامەڵەکان"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                    </button>

                    {/* View (بینین) */}
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceTx(group.transactions[0])}
                      className="inline-flex items-center justify-center p-2 rounded-xl bg-indigo-600/85 hover:bg-indigo-600 text-white border border-indigo-400/40 transition-all shadow-md cursor-pointer active:scale-95"
                      title="بینینی کەشف حیساب"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Edit Profile (دەستکاریکردنی پرۆفایل) */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditProfileTarget({
                          originalKey: group.key,
                          originalName: group.name,
                          name: group.name,
                          phone: group.phone || '',
                          address: group.address || '',
                          age: group.age ? group.age.toString() : '',
                          image: group.image || '',
                          notes: group.notes || '',
                          profileId: group.profileId,
                        });
                      }}
                      className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-700/80 hover:bg-slate-600/90 text-slate-100 border border-slate-600/80 transition-all shadow-xs cursor-pointer active:scale-95"
                      title="دەستکاریکردنی پرۆفایل"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Delete (سڕینەوە) */}
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteGroupTarget({ name: group.name, transactions: group.transactions });
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-6 rounded-xl bg-rose-900/20 hover:bg-rose-900/40 text-rose-300 text-xs font-medium border border-rose-900/30 transition-all cursor-pointer active:scale-95"
                    title="سڕینەوەی باڵانس و سەرجەم مامەڵەکانی ئەم هاوبەشە"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                    <span>سڕینەوەی باڵانس</span>
                  </button>
                </div>

                {/* Sub-transactions list when expanded */}
                {isExpanded && txCount > 1 && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-600 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                      <span>سەرجەم مامەڵەکانی {group.name} ({txCount} مامەڵە):</span>
                      <span className="font-mono text-[11px] text-emerald-300">
                        {formatCurrency(group.netBalance, settings.currency, settings.usdToIqdRate)}
                      </span>
                    </div>

                    <div className="space-y-1.5 mt-2">
                      {group.transactions.map((subTx, idx) => {
                        const subFormatted = formatDate(subTx.date);
                        const isDeposit = subTx.type === 'deposit';

                        return (
                          <div
                            key={subTx.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-xs transition-colors gap-2"
                          >
                            <div className="flex items-center gap-2 flex-wrap text-slate-200">
                              <span className="w-5 h-5 rounded-full bg-slate-600 text-slate-100 flex items-center justify-center text-[10px] font-mono font-bold">
                                {idx + 1}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                  isDeposit ? 'bg-emerald-900/50 text-emerald-100 border border-emerald-800' : 'bg-rose-900/50 text-rose-100 border border-rose-800'
                                }`}
                              >
                                {isDeposit ? 'پارەدان' : 'ڕاکێشان'}
                              </span>
                              <span className="font-mono font-bold text-white text-sm" dir="ltr">
                                {formatCurrency(subTx.amount, settings.currency, settings.usdToIqdRate)}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400" dir="ltr">
                                {subFormatted}
                              </span>
                              {subTx.notes && (
                                <span className="text-[10px] text-slate-300 bg-slate-600/50 px-2 py-0.5 rounded-lg">
                                  {subTx.notes}
                                </span>
                              )}
                              {subTx.recordedBy && (
                                <span className="text-[10px] text-cyan-300 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
                                  تۆمارکەر: {subTx.recordedBy}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(subTx)}
                                className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/25 transition-colors cursor-pointer"
                                title="دەستکاری ئەم مامەڵەیە"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTargetTx(subTx)}
                                className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/25 transition-colors cursor-pointer"
                                title="سڕینەوەی ئەم مامەڵەیە"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Transaction Modal */}
      {editModalTx && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md overflow-y-auto flex justify-center items-start p-3 sm:p-4 pt-6 sm:pt-10 pb-24 sm:pb-16 animate-in fade-in duration-200 no-pull-refresh" dir="rtl">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-white/15 space-y-4 text-right animate-in zoom-in duration-150 text-white mb-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white">دەستکاریکردنی مامەڵەی هاوبەش</h3>
                  <p className="text-xs text-slate-300">گۆڕانکاری لە زانیاری و بڕی پارەی ئەم مامەڵەیە</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalTx(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">ناوی هاوبەش:</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 backdrop-blur-md text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none text-right font-bold transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">ژمارەی مۆبایل:</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 backdrop-blur-md text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none text-left font-mono transition-colors"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">جۆری مامەڵە:</label>
                  <select
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as 'deposit' | 'withdrawal' })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 backdrop-blur-md text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none text-right font-bold transition-colors"
                  >
                    <option value="deposit" className="bg-slate-900 text-white">پارەدان (پشک)</option>
                    <option value="withdrawal" className="bg-slate-900 text-white">وەرگرتن (ڕاکێشان)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    بڕی پارە ({settings.currency === 'IQD' ? 'د.ع' : '$'}):
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 backdrop-blur-md text-sm text-white font-mono font-bold text-center focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">بەروار و کات:</label>
                  <input
                    type="datetime-local"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 backdrop-blur-md text-xs font-mono text-white text-left focus:ring-2 focus:ring-amber-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">ناوی تۆمارکەر:</label>
                <input
                  type="text"
                  value={editFormData.recordedBy}
                  onChange={(e) => setEditFormData({ ...editFormData, recordedBy: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 backdrop-blur-md text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none text-right transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">تێبینی:</label>
                <input
                  type="text"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 backdrop-blur-md text-sm text-white focus:ring-2 focus:ring-amber-500 outline-none text-right transition-colors"
                />
              </div>



              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditModalTx(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/15 text-slate-200 hover:bg-white/10 hover:text-white text-xs font-bold transition-colors flex-1 cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 flex-1"
                >
                  <Save className="w-4 h-4" />
                  <span>پاشەکەوتکردن</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security Passcode Modal for Delete Single Transaction */}
      <SecurityPasscodeModal
        isOpen={!!deleteTargetTx}
        onClose={() => setDeleteTargetTx(null)}
        onConfirm={() => {
          if (deleteTargetTx) {
            deleteShareholderTransaction(deleteTargetTx.id);
            const targetNorm = normalizeKurdishText(deleteTargetTx.name);
            const remaining = shareholderTransactions.filter(
              (t) => t.id !== deleteTargetTx.id && normalizeKurdishText(t.name) === targetNorm
            );
            if (remaining.length === 0) {
              products
                .filter((p) => p.shareholderName && normalizeKurdishText(p.shareholderName) === targetNorm)
                .forEach((p) => {
                  updateProduct(p.id, { shareholderName: undefined, shareholderPercentage: undefined });
                });
              try {
                const list = JSON.parse(localStorage.getItem('deleted_shareholders') || '[]');
                if (!list.includes(targetNorm)) {
                  list.push(targetNorm);
                  localStorage.setItem('deleted_shareholders', JSON.stringify(list));
                }
              } catch {}
              saveProfiles(shareholderProfiles.filter((p) => normalizeKurdishText(p.name) !== targetNorm));
              setDeletedShareholderKeys((prev) => [...prev, targetNorm]);
            }
            setDeleteTargetTx(null);
          }
        }}
        title="سڕینەوەی مامەڵەی هاوبەش"
        description={`ئایا دڵنیایت لە سڕینەوەی مامەڵەی "${deleteTargetTx?.name || ''}" بە بڕی ${deleteTargetTx ? formatCurrency(deleteTargetTx.amount, settings.currency, settings.usdToIqdRate) : ''}؟ تکایە ژمارەی نهێنی بنووسە بۆ دڵنیابوونەوە لە سڕینەوە.`}
        danger={true}
        actionLabel="سڕینەوەی یەکجارەکی"
      />

      {/* Security Passcode Modal for Delete All Transactions of a Shareholder */}
      <SecurityPasscodeModal
        isOpen={!!deleteGroupTarget}
        onClose={() => setDeleteGroupTarget(null)}
        onConfirm={() => {
          if (deleteGroupTarget) {
            const targetNorm = normalizeKurdishText(deleteGroupTarget.name);
            // 1. Delete all transactions of this shareholder
            shareholderTransactions
              .filter((tx) => normalizeKurdishText(tx.name) === targetNorm)
              .forEach((tx) => {
                deleteShareholderTransaction(tx.id);
              });
            // 2. Clear shareholder from active products
            products
              .filter((p) => p.shareholderName && normalizeKurdishText(p.shareholderName) === targetNorm)
              .forEach((p) => {
                updateProduct(p.id, { shareholderName: undefined, shareholderPercentage: undefined });
              });
            // 3. Persist deleted list
            try {
              const list = JSON.parse(localStorage.getItem('deleted_shareholders') || '[]');
              if (!list.includes(targetNorm)) {
                list.push(targetNorm);
                localStorage.setItem('deleted_shareholders', JSON.stringify(list));
              }
            } catch {}
            // 4. Remove from shareholderProfiles
            saveProfiles(shareholderProfiles.filter((p) => normalizeKurdishText(p.name) !== targetNorm));
            setDeletedShareholderKeys((prev) => [...prev, targetNorm]);
            setDeleteGroupTarget(null);
          }
        }}
        title="سڕینەوەی باڵانسی هاوبەش"
        description={`ئایا دڵنیایت لە سڕینەوەی تەواوی باڵانس و سەرجەم مامەڵەکانی "${deleteGroupTarget?.name || ''}"؟ تکایە ژمارەی نهێنی بنووسە بۆ دڵنیابوونەوە لە سڕینەوە.`}
        danger={true}
        actionLabel="سڕینەوەی یەکجارەکی"
      />

      {/* Shareholder Invoice / View Modal */}
      <ShareholderInvoiceModal
        transaction={selectedInvoiceTx}
        onClose={() => setSelectedInvoiceTx(null)}
      />

      {/* Live Share Breakdown Modal */}
      {selectedBreakdown && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200" dir="rtl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner border border-emerald-200">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">وردەکاری پشکی قازانج</h3>
                  <p className="text-[10px] text-slate-900 font-bold">{selectedBreakdown.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBreakdown(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {selectedBreakdown.items.length === 0 ? (
                <div className="text-center py-10 text-slate-600">
                  <Package className="w-10 h-10 mx-auto opacity-20 mb-3" />
                  <p className="text-xs font-bold">هیچ قازانجێک تۆمار نەکراوە بۆ ئەم هاوبەشە</p>
                </div>
              ) : (
                selectedBreakdown.items
                  .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((item, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between group hover:border-emerald-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shadow-sm ${item.status === 'active' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-200 text-slate-600 border border-slate-300'}`}>
                        {item.status === 'active' ? 'چالاک' : 'داخراو'}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-black text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-900 font-bold flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-0.5">
                          <span>بەرواری کڕین: {formatDate(item.date)}</span>
                          <span className="hidden sm:inline text-slate-900">•</span>
                          <span>ڕێژەی پشک: %{item.percentage}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black text-emerald-600 font-mono">
                        +{formatCurrency(item.shareAmount, settings.currency, settings.usdToIqdRate)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-5 bg-emerald-50/50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-black text-slate-600 uppercase tracking-wider">کۆی گشتی پشکەکان:</span>
              <span className="text-base sm:text-lg font-black text-emerald-600 font-mono">
                {formatCurrency(selectedBreakdown.total, settings.currency, settings.usdToIqdRate)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal for Existing Shareholder */}
      {txModalShareholder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm no-print">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-5 shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200" dir="rtl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>تۆمارکردنی مامەڵەی نوێ بۆ: {txModalShareholder}</span>
              </h3>
              <button
                type="button"
                onClick={() => setTxModalShareholder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTx} className="space-y-3.5 text-right">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">جۆری مامەڵە</label>
                <select
                  value={newTxData.type}
                  onChange={e => setNewTxData({ ...newTxData, type: e.target.value as 'deposit' | 'withdrawal' })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none text-right transition-colors"
                >
                  <option value="deposit">پارەدان (پشک / دانانی پارە)</option>
                  <option value="withdrawal">وەرگرتن (ڕاکێشانی پارە)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  بڕی پارە ({settings.currency === 'IQD' ? 'د.ع' : '$'}) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={newTxData.amount}
                  onChange={e => setNewTxData({ ...newTxData, amount: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-center transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">بەروار و کات</label>
                <input
                  type="datetime-local"
                  required
                  value={newTxData.date}
                  onChange={e => setNewTxData({ ...newTxData, date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:ring-2 focus:ring-emerald-500 outline-none text-left transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ناوی تۆمارکەر</label>
                <input
                  type="text"
                  value={newTxData.recordedBy}
                  onChange={e => setNewTxData({ ...newTxData, recordedBy: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">تێبینی</label>
                <input
                  type="text"
                  value={newTxData.notes}
                  onChange={e => setNewTxData({ ...newTxData, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">وێنەی هاوبەش</label>
                <div className="flex items-center gap-2.5 bg-slate-800/80 border border-slate-700 rounded-xl p-1.5 min-h-[46px]">
                  <div className="w-10 h-10 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {newTxData.image ? (
                      <img src={newTxData.image} alt="وێنەی هاوبەش" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600/80 hover:bg-indigo-600 active:scale-95 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{newTxData.image ? 'گۆڕینی وێنە' : 'هەڵبژاردنی وێنە'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleNewTxImageChange}
                        className="hidden"
                      />
                    </label>
                    {newTxData.image && (
                      <button
                        type="button"
                        onClick={() => setNewTxData(prev => ({ ...prev, image: '' }))}
                        className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer shrink-0"
                        title="سڕینەوەی وێنە"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setTxModalShareholder(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:bg-white/10 text-xs font-bold cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl px-5 py-2 text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>تۆمارکردن</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Shareholder Profile Modal */}
      {editProfileTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm no-print">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-5 sm:p-6 shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200" dir="rtl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-cyan-400" />
                <span>دەستکاریکردنی پرۆفایل: {editProfileTarget.originalName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditProfileTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileEdit} className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-right">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ناوی تەواوی هاوبەش <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editProfileTarget.name}
                  onChange={e => setEditProfileTarget({ ...editProfileTarget, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none text-right transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ژمارەی مۆبایل</label>
                <input
                  type="text"
                  value={editProfileTarget.phone}
                  onChange={e => setEditProfileTarget({ ...editProfileTarget, phone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none text-left font-mono transition-colors"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ناونیشان / شوێن</label>
                <input
                  type="text"
                  value={editProfileTarget.address}
                  onChange={e => setEditProfileTarget({ ...editProfileTarget, address: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none text-right transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">تەمەن</label>
                <input
                  type="number"
                  value={editProfileTarget.age}
                  onChange={e => setEditProfileTarget({ ...editProfileTarget, age: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none text-center font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">تێبینی</label>
                <input
                  type="text"
                  value={editProfileTarget.notes}
                  onChange={e => setEditProfileTarget({ ...editProfileTarget, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none text-right transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">وێنەی هاوبەش</label>
                <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700 rounded-xl p-2 min-h-[50px]">
                  <div className="w-12 h-12 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {editProfileTarget.image ? (
                      <img src={editProfileTarget.image} alt="وێنەی هاوبەش" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600/80 hover:bg-indigo-600 active:scale-95 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{editProfileTarget.image ? 'گۆڕینی وێنە' : 'هەڵبژاردنی وێنە'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditProfileImageChange}
                        className="hidden"
                      />
                    </label>
                    {editProfileTarget.image && (
                      <button
                        type="button"
                        onClick={() => setEditProfileTarget(prev => prev ? ({ ...prev, image: '' }) : null)}
                        className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer shrink-0"
                        title="سڕینەوەی وێنە"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditProfileTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/10 text-xs font-bold transition-all cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl px-6 py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>پاشەکەوتکردنی گۆڕانکارییەکان</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};

