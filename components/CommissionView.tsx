import React, { useState, useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { CommissionAccount, CommissionTransaction } from '../types';
import {
  Printer,
  Plus,
  PlusCircle,
  User,
  FileText,
  ChevronDown,
  ChevronLeft,
  ArrowLeft,
  Wallet,
  Search,
  Trash2,
  X,
  Edit3,
  Eye,
} from 'lucide-react';
import { CommissionPrintModal } from './CommissionPrintModal';
import { SecurityPasscodeModal } from './SecurityPasscodeModal';
import { useAuth } from '../context/AuthContext';
import { toLocalDateTimeInput, parseInputDateToIso } from '../utils/clockSync';

interface CommissionViewProps {
  onBackToMain?: () => void;
}

export const CommissionView: React.FC<CommissionViewProps> = ({ onBackToMain }) => {
  const {
    commissionAccounts,
    addCommissionTransaction,
    addCommissionAccount,
    updateCommissionAccount,
    deleteCommissionAccount,
    deleteCommissionTransaction,
  } = useDatabase();

  const [selectedAccount, setSelectedAccount] = useState<CommissionAccount | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<CommissionTransaction | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState<boolean>(false);
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState<boolean>(false);
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState<boolean>(false);
  const [deleteTargetAccount, setDeleteTargetAccount] = useState<CommissionAccount | null>(null);
  const [deleteTargetTx, setDeleteTargetTx] = useState<{ accountId: string; txId: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAccountsExpanded, setIsAccountsExpanded] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  // New Account Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCarNumber, setNewCarNumber] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newImage, setNewImage] = useState('');

  // Edit Account Form State
  const [editAccountId, setEditAccountId] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editCarNumber, setEditCarNumber] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editAge, setEditAge] = useState<string | number>('');
  const [editImage, setEditImage] = useState<string>('');

  const { currentUser } = useAuth();

  // New Transaction Form State
  const [txType, setTxType] = useState<'buy' | 'pay' | 'sell' | 'receive'>('sell');
  const [txAmount, setTxAmount] = useState('');
  const [txProductName, setTxProductName] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txDate, setTxDate] = useState(() => toLocalDateTimeInput());
  const [txRecordedBy, setTxRecordedBy] = useState(() => currentUser?.name || '');
  const [txPaymentMethod, setTxPaymentMethod] = useState('');

  // Edit Transaction Form State
  const [editTxTarget, setEditTxTarget] = useState<CommissionTransaction | null>(null);
  const [editTxType, setEditTxType] = useState<'buy' | 'pay' | 'sell' | 'receive'>('sell');
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxProductName, setEditTxProductName] = useState('');
  const [editTxNotes, setEditTxNotes] = useState('');
  const [editTxDate, setEditTxDate] = useState('');
  const [editTxRecordedBy, setEditTxRecordedBy] = useState('');
  const [editTxPaymentMethod, setEditTxPaymentMethod] = useState('');

  // Total balance across all commission accounts
  const totalBalance = useMemo(() => {
    return commissionAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  }, [commissionAccounts]);

  // Keep selectedAccount in sync with database updates
  const activeAccount = useMemo(() => {
    if (!selectedAccount) return null;
    return commissionAccounts.find((a) => a.id === selectedAccount.id) || selectedAccount;
  }, [commissionAccounts, selectedAccount]);

  // Filtered accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return commissionAccounts;
    const q = searchQuery.trim().toLowerCase();
    return commissionAccounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.phone && a.phone.includes(q)) ||
        (a.carNumber && a.carNumber.toLowerCase().includes(q)) ||
        (a.address && a.address.toLowerCase().includes(q))
    );
  }, [commissionAccounts, searchQuery]);

  const openAccount = (acc: CommissionAccount) => {
    setSelectedAccount(acc);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const checkAuthorization = () => {
    return true;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const res = uploadEvent.target?.result as string;
      if (isEdit) {
        setEditImage(res);
      } else {
        setNewImage(res);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addCommissionAccount({
      name: newName.trim(),
      phone: newPhone.trim(),
      carNumber: newCarNumber.trim(),
      address: newAddress.trim(),
      age: newAge ? Number(newAge) : undefined,
      image: newImage.trim(),
    });
    setNewName('');
    setNewPhone('');
    setNewCarNumber('');
    setNewAddress('');
    setNewAge('');
    setNewImage('');
    setIsNewAccountModalOpen(false);
  };

  const openEditAccount = (acc: CommissionAccount, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditAccountId(acc.id);
    setEditName(acc.name);
    setEditPhone(acc.phone || '');
    setEditCarNumber(acc.carNumber || '');
    setEditAddress(acc.address || '');
    setEditAge(acc.age || '');
    setEditImage(acc.image || '');
    setIsEditAccountModalOpen(true);
  };

  const handleUpdateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editAccountId) return;
    updateCommissionAccount(editAccountId, {
      name: editName.trim(),
      phone: editPhone.trim(),
      carNumber: editCarNumber.trim(),
      address: editAddress.trim(),
      age: editAge ? Number(editAge) : undefined,
      image: editImage.trim(),
    });
    setIsEditAccountModalOpen(false);
  };

  const handleDeleteAccount = (acc: CommissionAccount, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!checkAuthorization()) return;
    if (confirm(`دڵنیایت لە سڕینەوەی خاوەن کاڵا (${acc.name})؟`)) {
      deleteCommissionAccount(acc.id);
      if (selectedAccount?.id === acc.id) {
        setSelectedAccount(null);
      }
    }
  };

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount || !txAmount) return;
    addCommissionTransaction(activeAccount.id, {
      type: txType,
      amount: Number(txAmount),
      productName: txProductName.trim() || 'مامەڵەی عمولە',
      notes: txNotes.trim(),
      date: txDate ? new Date(txDate).toISOString() : new Date().toISOString(),
      recordedBy: txRecordedBy.trim(),
      paymentMethod: txPaymentMethod.trim(),
    });
    setTxAmount('');
    setTxProductName('');
    setTxNotes('');
    setTxDate(toLocalDateTimeInput());
    setTxRecordedBy(currentUser?.name || '');
    setTxPaymentMethod('');
    setIsNewTxModalOpen(false);
  };

  const openPrintForAccount = (acc: CommissionAccount, tx?: CommissionTransaction) => {
    if (!checkAuthorization()) return;
    setSelectedAccount(acc);
    setSelectedTransaction(tx || null);
    setIsPrintModalOpen(true);
  };

  const handleExportExcel = () => {
    if (!activeAccount || !activeAccount.transactions || activeAccount.transactions.length === 0) {
      alert('هیچ مامەڵەیەک نییە بۆ داگرتن');
      return;
    }
    const csvContent = [
      ['#', 'جۆری مامەڵە', 'بەروار و کات', 'بڕی پارە (دینار)', 'تێبینی'].join(','),
      ...activeAccount.transactions.map((t, i) => [
        i + 1,
        t.type,
        new Date(t.date).toISOString(),
        t.amount,
        `"${t.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission_${activeAccount.name}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==========================================
  // BRANCH 1: DEDICATED OWNER TRANSACTIONS PAGE
  // ==========================================
  if (selectedAccount && activeAccount) {
    // ۱. لێرەدا هاوسەنگییەکە تەنها لەسەر بنەمای مامەڵەکانی خودی ئەم خاوەن کاڵایە دەژمێردرێت
    const ownerTransactions = activeAccount.transactions || [];
    
    const calculatedOwnerBalance = ownerTransactions.reduce((acc, tx) => {
      const amount = Number(tx.amount) || 0;
      if (tx.type === 'sell' || tx.type === 'pay') {
        return acc + amount;
      } else if (tx.type === 'buy' || tx.type === 'receive') {
        return acc - amount;
      }
      return acc;
    }, 0);

    return (
      <div className="max-w-4xl mx-auto space-y-3.5 sm:space-y-4 pb-24 animate-fadeIn">
        {/* 1. TOP HEADER BAR */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => {
              setSelectedAccount(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="bg-white hover:bg-slate-50 text-slate-900 font-bold px-4 py-2 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-2 transition-all cursor-pointer text-xs sm:text-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-slate-900" />
            <span>گەڕانەوە</span>
          </button>

          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide truncate max-w-[220px]">
              {activeAccount.name}
            </h1>
            {activeAccount.image ? (
              <img src={activeAccount.image} alt={activeAccount.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center border-2 border-white shadow-md">
                <User className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
        </div>



        {/* 4. TOTAL TRANSACTIONS BADGE & EXCEL EXPORT / VIEW TOGGLE */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setTxDate(toLocalDateTimeInput());
                setTxRecordedBy(currentUser?.name || '');
                setIsNewTxModalOpen(true);
              }}
              className="bg-[#00c975] hover:bg-[#00b368] active:scale-[0.99] text-white font-black text-sm py-2 px-4 rounded-xl shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>زیادکردنی مامەڵە</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>داگرتنی (xlsx.)</span>
            </button>


          </div>
        </div>

        {/* TABLE VIEW */}
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
            <div className="bg-[#00a86b] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-white" />
                <h3 className="font-black text-sm sm:text-base">خشتەی مامەڵە</h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
                    <th className="p-3 border-l border-slate-200 w-12 text-center">#</th>
                    <th className="p-3 border-l border-slate-200">جۆری مامەڵە</th>
                    <th className="p-3 border-l border-slate-200">بەروار و کات</th>
                    <th className="p-3 border-l border-slate-200">بڕی پارە</th>
                    <th className="p-3 border-l border-slate-200">شێوازی پارەدان</th>
                    <th className="p-3 text-center">کردارەکان</th>
                  </tr>
                </thead>
                <tbody>
                  {!activeAccount.transactions || activeAccount.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-600">
                        هیچ مامەڵەیەک تۆمار نەکراوە
                      </td>
                    </tr>
                  ) : (
                    activeAccount.transactions.map((tx, idx) => (
                      <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50 transition-all">
                        <td className="p-3 border-l border-slate-200 text-center font-mono font-bold text-slate-600">
                          {idx + 1}
                        </td>
                        <td className="p-3 border-l border-slate-200 font-bold">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs ${
                            tx.type === 'sell' ? 'bg-emerald-100 text-emerald-800' :
                            tx.type === 'buy' ? 'bg-purple-100 text-purple-800' :
                            tx.type === 'pay' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {tx.type === 'sell' ? 'فرۆشتنی کاڵا' : tx.type === 'buy' ? 'کڕینی کاڵا' : tx.type === 'pay' ? 'پارەدان' : 'وەرگرتن'}
                            {tx.productName ? ` (${tx.productName})` : ''}
                          </span>
                        </td>
                        <td className="p-3 border-l border-slate-200 font-mono text-slate-600 text-xs">
                          <div>{new Date(tx.date).toLocaleString('ku-IQ')}</div>
                          {tx.recordedBy && <div className="text-[10px] text-slate-400 mt-0.5">تۆمارکەر: {tx.recordedBy}</div>}
                        </td>
                        <td className="p-3 border-l border-slate-200 font-mono font-bold text-[#047857]">
                          {Number(tx.amount).toLocaleString('en-US')} د.ع
                        </td>
                        <td className="p-3 border-l border-slate-200 text-slate-600 text-xs truncate max-w-[150px]">
                          <div>{tx.paymentMethod || '-'}</div>
                          {tx.notes && <div className="text-[10px] text-slate-400 mt-0.5">تێبینی: {tx.notes}</div>}
                        </td>
                        <td className="p-3 text-center flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTransaction(tx);
                              setIsPrintModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 cursor-pointer"
                            title="بینین"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openPrintForAccount(activeAccount, tx)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 cursor-pointer"
                            title="چاپکردن"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!tx) return;
                              setEditTxTarget(tx);
                              setEditTxType(tx.type || 'sell');
                              setEditTxAmount(tx.amount?.toString() || '');
                              setEditTxProductName(tx.productName || '');
                              setEditTxNotes(tx.notes || '');
                              setEditTxDate(toLocalDateTimeInput(tx.date));
                              setEditTxRecordedBy(tx.recordedBy || '');
                              setEditTxPaymentMethod(tx.paymentMethod || '');
                            }}
                            className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 cursor-pointer"
                            title="دەستکاری"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTargetTx({ accountId: activeAccount.id, txId: tx.id });
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                            title="سڕینەوە"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#ebfaf3] font-black text-slate-900 border-t-2 border-emerald-300">
                    <td colSpan={3} className="p-3 text-right">کۆی هاوسەنگی خاوەن کاڵاکە ({activeAccount.transactions?.length || 0} مامەڵە):</td>
                    <td colSpan={3} className={`p-3 font-mono text-base ${calculatedOwnerBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                      {Math.round(Math.abs(calculatedOwnerBalance)).toLocaleString('en-US')} د.ع
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        {/* Print Modal */}
        {selectedAccount && (
          <CommissionPrintModal
            isOpen={isPrintModalOpen}
            onClose={() => setIsPrintModalOpen(false)}
            account={selectedAccount}
            transaction={selectedTransaction}
          />
        )}

        {/* Add Transaction Modal with 4 choice cards */}
        {isNewTxModalOpen && activeAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl text-right border border-slate-100 animate-scaleUp max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  زیادکردنی مامەڵە: {activeAccount.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsNewTxModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-600 hover:text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTransaction} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-900 mb-2 font-bold">جۆری مامەڵە:</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as 'buy' | 'pay' | 'sell' | 'receive')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="sell">فرۆشتنی کاڵا</option>
                    <option value="buy">کڕینی کاڵا</option>
                    <option value="pay">پارەدان</option>
                    <option value="receive">پارە وەرگرتن</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-900 mb-1.5 font-bold">
                    بڕی پارە (دینار): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-900 mb-1.5 font-bold">ناوی کاڵا یان بار:</label>
                  <input
                    type="text"
                    value={txProductName}
                    onChange={(e) => setTxProductName(e.target.value)}
                    placeholder="وەک: تەماتە، خەیار، سێو..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-900 mb-1.5 font-bold">تێبینی / ژمارەی پسووڵە:</label>
                  <input
                    type="text"
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    placeholder="تێبینی یان پسووڵەی #..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-900 mb-1.5 font-bold">بەروار و کات:</label>
                    <input
                      type="datetime-local"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-900 mb-1.5 font-bold">ناوی تۆمارکەر:</label>
                    <input
                      type="text"
                      value={txRecordedBy}
                      onChange={(e) => setTxRecordedBy(e.target.value)}
                      placeholder="ناوی تۆمارکەر..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-900 mb-1.5 font-bold">شێوازی پارەدان / وەرگرتن:</label>
                  <input
                    type="text"
                    value={txPaymentMethod}
                    onChange={(e) => setTxPaymentMethod(e.target.value)}
                    placeholder="شێوازی پارەدان (وەک: نەقد، حەواڵە، کارتی بانکی)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsNewTxModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-900 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                  >
                    پاشگەزبوونەوە
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#00c975] hover:bg-[#00b368] text-white font-black text-xs cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    زیادکردنی مامەڵە
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Security Passcode Modal for deleting transaction */}
        <SecurityPasscodeModal
          isOpen={!!deleteTargetTx}
          onClose={() => setDeleteTargetTx(null)}
          onConfirm={() => {
            if (deleteTargetTx) {
              deleteCommissionTransaction(deleteTargetTx.accountId, deleteTargetTx.txId);
              setDeleteTargetTx(null);
            }
          }}
          title="سڕینەوەی مامەڵەی عمولە"
          description="دڵنیایت لە سڕینەوەی ئەم مامەڵەیە؟ تکایە ژمارەی نهێنی بنووسە."
          actionLabel="سڕینەوە"
          danger
        />

        {/* Edit Transaction Modal */}
        {editTxTarget && activeAccount && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto" dir="rtl">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl text-right animate-in fade-in zoom-in duration-200 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-sky-600" />
                  دەستکاریکردنی مامەڵە
                </h3>
                <button
                  type="button"
                  onClick={() => setEditTxTarget(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!editTxTarget || !activeAccount) return;
                  const updatedTxs = activeAccount.transactions.map((t) => {
                    if (t.id === editTxTarget.id) {
                      return {
                        ...t,
                        type: editTxType,
                        amount: Number(editTxAmount) || 0,
                        productName: editTxProductName.trim() || undefined,
                        notes: editTxNotes.trim() || undefined,
                        date: parseInputDateToIso(editTxDate),
                        recordedBy: editTxRecordedBy.trim() || undefined,
                        paymentMethod: editTxPaymentMethod.trim() || undefined,
                      };
                    }
                    return t;
                  });

                  const calculateBalance = (txs: CommissionTransaction[]) => {
                    return txs.reduce((bal, t) => {
                      const amount = Number(t.amount) || 0;
                      if (t.type === 'sell' || t.type === 'pay') return bal + amount;
                      if (t.type === 'buy' || t.type === 'receive') return bal - amount;
                      return bal;
                    }, 0);
                  };

                  updateCommissionAccount(activeAccount.id, {
                    transactions: updatedTxs,
                    balance: calculateBalance(updatedTxs),
                  });
                  setEditTxTarget(null);
                }}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">جۆری مامەڵە:</label>
                  <select
                    value={editTxType}
                    onChange={(e) => setEditTxType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="sell">فرۆشتنی کاڵا</option>
                    <option value="buy">کڕینی کاڵا</option>
                    <option value="pay">پارەدان</option>
                    <option value="receive">وەرگرتن</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ناوی کاڵا / بابەت:</label>
                  <input
                    type="text"
                    value={editTxProductName}
                    onChange={(e) => setEditTxProductName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بڕی پارە (د.ع):</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={editTxAmount}
                    onChange={(e) => setEditTxAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono font-bold text-sm text-center focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بەروار و کات:</label>
                  <input
                    type="datetime-local"
                    value={editTxDate}
                    onChange={(e) => setEditTxDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-900 text-left focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تۆمارکەر / وەرگر:</label>
                  <input
                    type="text"
                    value={editTxRecordedBy}
                    onChange={(e) => setEditTxRecordedBy(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شێوازی پارەدان:</label>
                  <input
                    type="text"
                    value={editTxPaymentMethod}
                    onChange={(e) => setEditTxPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تێبینی:</label>
                  <input
                    type="text"
                    value={editTxNotes}
                    onChange={(e) => setEditTxNotes(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditTxTarget(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                  >
                    پاشگەزبوونەوە
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs cursor-pointer shadow-lg"
                  >
                    پاشەکەوتکردن
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // BRANCH 2: COMMISSION ACCOUNTS LIST VIEW
  // ==========================================
  return (
    <div className="max-w-2xl mx-auto space-y-3.5 sm:space-y-4 pb-24 animate-fadeIn">
      {/* 1. TOP HEADER BAR: Back to Main, Title & Add New Button */}
      <div className="flex items-center justify-between px-1 gap-2">
        {/* Back Button */}
        {onBackToMain ? (
          <button
            type="button"
            onClick={onBackToMain}
            className="bg-white hover:bg-slate-50 text-slate-900 font-bold px-3.5 py-2 rounded-2xl shadow-sm border border-slate-200/80 flex items-center gap-1.5 transition-all cursor-pointer text-xs sm:text-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-slate-900" />
            <span>سەرەکی</span>
          </button>
        ) : (
          <div />
        )}

        {/* Section Title */}
        <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
          هەژماری خاوەن کاڵاکان
        </h1>

        {/* Small Add New Button opposite to Main Button */}
        <button
          type="button"
          onClick={() => setIsNewAccountModalOpen(true)}
          className="bg-[#00c975] hover:bg-[#00b368] active:scale-95 text-white font-black text-xs sm:text-sm py-2 px-3.5 rounded-2xl shadow-md shadow-emerald-500/25 flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>زیادکردنی نوێ</span>
        </button>
      </div>

      {/* 2. SUMMARY MINT GREEN BALANCE CARD */}
      <div className="bg-[#ebfaf3] border border-emerald-200/80 rounded-3xl p-6 sm:p-7 shadow-md text-center">
        <div className="flex items-center justify-center gap-2 text-slate-900 font-bold text-xs sm:text-sm mb-2">
          <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-800" />
          <span>کۆی گشتی (هاوسەنگی کۆتایی)</span>
        </div>
        <div className={`text-3xl sm:text-4xl font-black flex items-center justify-center gap-2 font-mono ${
          totalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
        }`} dir="ltr">
          <span>{Math.round(Math.abs(totalBalance)).toLocaleString('en-US')}</span>
          <span className="text-lg sm:text-xl font-bold font-vazir">د.ع</span>
        </div>
      </div>

      {/* 4. ACCOUNTS TOGGLE CARD */}
      <div
        onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
        className={`rounded-2xl py-2.5 px-3.5 sm:py-3 sm:px-4 shadow-sm hover:shadow transition-all cursor-pointer select-none flex items-center justify-between ${
          isAccountsExpanded
            ? 'bg-[#00a86b] text-white border border-emerald-500/30'
            : 'bg-white text-slate-900 border border-slate-200/80'
        }`}
      >
        {/* Right side in RTL: Avatar circle and Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isAccountsExpanded
                ? 'bg-white/20 text-white'
                : 'bg-[#ebfaf3] text-[#047857]'
            }`}
          >
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0 text-right">
            <h2
              className={`text-sm sm:text-base font-black truncate ${
                isAccountsExpanded ? 'text-white' : 'text-slate-900'
              }`}
            >
              خاوەن کاڵاکان
            </h2>
          </div>
        </div>

        {/* Left side in RTL: Badge & Chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
              isAccountsExpanded
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-900'
            }`}
          >
            {commissionAccounts.length} کەس
          </span>
          {isAccountsExpanded ? (
            <ChevronDown className="w-4 h-4 text-white" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          )}
        </div>
      </div>

      {/* 5. OPENED LIST OF INDIVIDUAL OWNER PILLS */}
      {isAccountsExpanded && (
        <div className="space-y-2.5 pt-1 animate-fadeIn">
          {/* Quick Search if more than 3 accounts */}
          {commissionAccounts.length > 3 && (
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="گەڕان بەپێی ناوی خاوەن کاڵا یان مۆبایل..."
                className="w-full pr-14 pl-9 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm text-slate-900 shadow-2xs text-center"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {filteredAccounts.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-600 text-sm shadow-sm border border-slate-100">
              هیچ خاوەن کاڵایەک نەدۆزرایەوە
            </div>
          ) : (
            filteredAccounts.map((acc) => {
              const numBalance = Number(acc.balance || 0);
              return (
                <div
                  key={acc.id}
                  onClick={() => openAccount(acc)}
                  className="bg-white hover:bg-emerald-50/50 active:scale-[0.99] rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100 hover:border-emerald-200 flex items-center justify-between cursor-pointer transition-all select-none"
                >
                  {/* Right side in RTL: Avatar circle & Name & Phone/Address/Age */}
                  <div 
                    onClick={() => openAccount(acc)}
                    className="flex items-center gap-3.5 min-w-0 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-emerald-500/20">
                      {acc.image ? (
                        <img src={acc.image} alt={acc.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-emerald-700" />
                      )}
                    </div>
                    <div className="min-w-0 text-right">
                      <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate hover:text-emerald-700 transition-colors">
                        {acc.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-900 mt-0.5 flex-wrap">
                        {acc.phone && <span dir="ltr">{acc.phone}</span>}
                        {acc.address && <span>• {acc.address}</span>}
                        {acc.age && <span>• تەمەن: {acc.age}</span>}
                        {!acc.phone && !acc.address && !acc.age && <span className="text-[11px] text-slate-600">بێ زانیاری</span>}
                      </div>
                    </div>
                  </div>

                  {/* Left side in RTL: Balance amount, Edit/Delete & Chevron arrow */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-left cursor-pointer" onClick={() => openAccount(acc)}>
                      <div
                        className={`font-black font-mono text-base sm:text-lg ${
                          numBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                        dir="ltr"
                      >
                        {Math.abs(Math.round(numBalance)).toLocaleString('en-US')}
                        <span className="text-xs sm:text-sm font-bold font-vazir mr-1">د.ع</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => openEditAccount(acc, e)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition-all cursor-pointer"
                      title="دەستکاری زانیاری"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetAccount(acc);
                      }}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 shadow-xs transition-all cursor-pointer active:scale-95"
                      title="سڕینەوە"
                    >
                      <Trash2 className="w-4 h-4 pointer-events-none" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openAccount(acc)}
                      className="p-1 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                      title="کردنەوەی لاپەڕەی تایبەت"
                    >
                      <ChevronLeft className="w-5 h-5 shrink-0" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 8. MODAL: ADD NEW OWNER ACCOUNT */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl text-right border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-[#00c975]" />
                زیادکردنی خاوەن کاڵای نوێ
              </h3>
              <button
                type="button"
                onClick={() => setIsNewAccountModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-600 hover:text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
              {/* Image at the top */}
              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">وێنەی خاوەن کاڵا:</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                    {newImage ? (
                      <img src={newImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, false)}
                    className="w-full text-xs text-slate-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">
                  ناوی خاوەن کاڵا: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">ژمارەی مۆبایل:</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">ناونیشان:</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">تەمەن:</label>
                <input
                  type="number"
                  value={newAge}
                  onChange={(e) => setNewAge(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-900 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#00c975] hover:bg-[#00b368] text-white font-black text-xs cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  تۆمارکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. MODAL: EDIT OWNER ACCOUNT */}
      {isEditAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl text-right border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                دەستکاری زانیاری خاوەن کاڵا
              </h3>
              <button
                type="button"
                onClick={() => setIsEditAccountModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-600 hover:text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateAccount} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
              {/* Image at the top */}
              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">وێنەی خاوەن کاڵا:</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                    {editImage ? (
                      <img src={editImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, true)}
                    className="w-full text-xs text-slate-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">
                  ناوی خاوەن کاڵا: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">ژمارەی مۆبایل:</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">ناونیشان:</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">تەمەن:</label>
                <input
                  type="number"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditAccountModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-900 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs cursor-pointer shadow-md shadow-blue-500/20"
                >
                  نوێکردنەوە
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Security Passcode Modal for deleting owner account */}

      <SecurityPasscodeModal
        isOpen={!!deleteTargetAccount}
        onClose={() => setDeleteTargetAccount(null)}
        onConfirm={() => {
          if (deleteTargetAccount) {
            deleteCommissionAccount(deleteTargetAccount.id);
            if (selectedAccount?.id === deleteTargetAccount.id) {
              setSelectedAccount(null);
            }
            setDeleteTargetAccount(null);
          }
        }}
        title="سڕینەوەی خاوەن کاڵا"
        description={`دڵنیایت لە سڕینەوەی (${deleteTargetAccount?.name})؟ تکایە ژمارەی نهێنی بنووسە.`}
        actionLabel="سڕینەوە"
        danger
      />
    </div>
  );
};
