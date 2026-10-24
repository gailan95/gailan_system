import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { DollarSign, Plus, Calendar, Tag, Pencil, Trash2, User, UserCheck, Clock, X, Save } from 'lucide-react';
import { ExpenseItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { toLocalDateTimeInput, parseInputDateToIso } from '../utils/clockSync';
import { formatDate } from '../utils/formatters';
import { ExpenseDashboardWidget } from './ExpenseDashboardWidget';

export const ExpensesView: React.FC<{ onBackToMain?: () => void }> = ({ onBackToMain }) => {
  const { expenses, setExpenses, settings } = useDatabase();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cards'>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editExpenseTarget, setEditExpenseTarget] = useState<ExpenseItem | null>(null);
  const [deleteConfirmExpenseId, setDeleteConfirmExpenseId] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('گواستنەوە');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recordedBy, setRecordedBy] = useState(currentUser?.name || '');
  const [expenseDate, setExpenseDate] = useState(() => toLocalDateTimeInput());

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('گواستنەوە');
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editRecipient, setEditRecipient] = useState('');
  const [editRecordedBy, setEditRecordedBy] = useState('');
  const [editExpenseDate, setEditExpenseDate] = useState('');

  const filteredExpenses = expenses.filter(e => {
    if (!selectedMonth) return true;
    const d = new Date(e.date);
    const [y, m] = selectedMonth.split('-').map(Number);
    return d.getFullYear() === y && (d.getMonth() + 1) === m;
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;
    const newExp: ExpenseItem = {
      id: 'e-' + Date.now(),
      title: title.trim(),
      category,
      amount: Number(amount) || 0,
      date: parseInputDateToIso(expenseDate) || new Date().toISOString(),
      recipient: recipient.trim() || undefined,
      recordedBy: recordedBy.trim() || currentUser?.name || undefined,
      notes: notes.trim() || undefined,
    };
    setExpenses([newExp, ...expenses]);
    setTitle('');
    setAmount('');
    setNotes('');
    setRecipient('');
    setRecordedBy(currentUser?.name || '');
    setExpenseDate(toLocalDateTimeInput());
    setIsAddModalOpen(false);
  };

  const handleOpenEdit = (item: ExpenseItem) => {
    setEditExpenseTarget(item);
    setEditTitle(item.title);
    setEditCategory(item.category || 'گواستنەوە');
    setEditAmount(item.amount.toString());
    setEditNotes(item.notes || '');
    setEditRecipient(item.recipient || '');
    setEditRecordedBy(item.recordedBy || currentUser?.name || '');
    setEditExpenseDate(toLocalDateTimeInput(item.date));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExpenseTarget || !editTitle.trim() || !editAmount) return;

    const updatedList = expenses.map(item => {
      if (item.id === editExpenseTarget.id) {
        return {
          ...item,
          title: editTitle.trim(),
          category: editCategory,
          amount: Number(editAmount) || 0,
          date: parseInputDateToIso(editExpenseDate) || item.date,
          recipient: editRecipient.trim() || undefined,
          recordedBy: editRecordedBy.trim() || undefined,
          notes: editNotes.trim() || undefined,
        };
      }
      return item;
    });

    setExpenses(updatedList);
    setEditExpenseTarget(null);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
    setDeleteConfirmExpenseId(null);
  };

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-rose-400" />
            بەڕێوەبردنی خەرجییەکان و دابەشبوونیان
          </h1>
          <p className="text-sm text-slate-300 mt-1">تۆمار و هەڵبژاردنی مانگانەی خەرجییەکان بەپێی بەش</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800">
            <Calendar className="w-4 h-4 text-amber-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setTitle('');
              setAmount('');
              setNotes('');
              setRecipient('');
              setRecordedBy(currentUser?.name || '');
              setExpenseDate(toLocalDateTimeInput());
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-sm transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>خەرجی نوێ</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            داشبۆرد و دابەشبوونی بەشەکان
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cards')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'cards'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            لیستی پسوولە و کارتەکان
          </button>
        </div>

        <div className="text-xs text-slate-300 font-bold px-3">
          کۆی خەرجی مانگ: <span className="text-rose-400 font-mono font-black">{totalExpenses.toLocaleString()} د.ع</span>
        </div>
      </div>

      {/* Mode 1: Full Analytics Dashboard */}
      {activeTab === 'dashboard' && (
        <ExpenseDashboardWidget
          expenses={expenses}
          settings={settings}
          initialMonth={selectedMonth}
          onGoToExpenses={() => {
            setTitle('');
            setAmount('');
            setNotes('');
            setRecipient('');
            setRecordedBy(currentUser?.name || '');
            setExpenseDate(toLocalDateTimeInput());
            setIsAddModalOpen(true);
          }}
        />
      )}

      {/* Mode 2: Cards and Summary */}
      {activeTab === 'cards' && (
        <>
          {/* Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-xs text-slate-300 font-bold">کۆی خەرجییەکانی مانگی {selectedMonth}:</span>
              <h2 className="text-2xl font-black text-rose-400 font-mono mt-1">{totalExpenses.toLocaleString()} دینار</h2>
            </div>
          </div>

          {/* Expenses Table / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExpenses.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-900 rounded-3xl border border-dashed border-slate-800">
            <p className="text-sm font-bold">هیچ خەرجییەک لەم مانگەدا تۆمار نەکراوە</p>
          </div>
        ) : (
          filteredExpenses.map((e) => (
            <div key={e.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between relative group hover:border-slate-700 transition-all">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-base font-black text-white">{e.title}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {e.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(e)}
                      className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                      title="دەستکاریکردن"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmExpenseId(e.id)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                      title="سڕینەوە"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 my-3 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-bold">بڕی پارە:</span>
                  <span className="font-black font-mono text-rose-400 text-base">{e.amount.toLocaleString()} د.ع</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{formatDate(e.date)}</span>
                  </div>
                  {e.recipient && (
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>وەرگر: <strong className="text-white">{e.recipient}</strong></span>
                    </div>
                  )}
                  {e.recordedBy && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>تۆمارکەر: <strong className="text-white">{e.recordedBy}</strong></span>
                    </div>
                  )}
                  {e.notes && (
                    <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                      {e.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )}

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-right animate-in fade-in zoom-in duration-200 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-rose-500" />
                تۆمارکردنی خەرجی نوێ
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">ناوی خەرجی / ناونیشان *:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">بەش / پۆلێن:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                >
                  <option value="گواستنەوە">گواستنەوە</option>
                  <option value="خزمەتگوزاری">خزمەتگوزاری</option>
                  <option value="مووچە">مووچە</option>
                  <option value="چاککردنەوە">چاککردنەوە</option>
                  <option value="گشتی">گشتی</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">بڕی پارە (د.ع) *:</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-rose-500 text-center font-bold text-rose-400"
                  required
                  min="0"
                  step="any"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">بەروار و کات:</label>
                <input
                  type="datetime-local"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-rose-500 text-left"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">وەرگر:</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="ناوی ئەو کەسەی پارەکەی وەرگرتووە..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">تۆمارکەر:</label>
                <input
                  type="text"
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
                  placeholder="ناوی تۆمارکەر..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">تێبینی:</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/10 text-xs font-bold cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-rose-500 text-slate-950 font-black text-xs hover:bg-rose-400 cursor-pointer shadow-lg"
                >
                  تۆمارکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editExpenseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-right animate-in fade-in zoom-in duration-200 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-500" />
                دەستکاریکردنی خەرجی
              </h3>
              <button
                type="button"
                onClick={() => setEditExpenseTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">ناوی خەرجی / ناونیشان *:</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">بەش / پۆلێن:</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="گواستنەوە">گواستنەوە</option>
                  <option value="خزمەتگوزاری">خزمەتگوزاری</option>
                  <option value="مووچە">مووچە</option>
                  <option value="چاککردنەوە">چاککردنەوە</option>
                  <option value="گشتی">گشتی</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">بڕی پارە (د.ع) *:</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-500 text-center font-bold text-amber-400"
                  required
                  min="0"
                  step="any"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">بەروار و کات:</label>
                <input
                  type="datetime-local"
                  value={editExpenseDate}
                  onChange={(e) => setEditExpenseDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-amber-500 text-left"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">وەرگر:</label>
                <input
                  type="text"
                  value={editRecipient}
                  onChange={(e) => setEditRecipient(e.target.value)}
                  placeholder="ناوی ئەو کەسەی پارەکەی وەرگرتووە..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">تۆمارکەر:</label>
                <input
                  type="text"
                  value={editRecordedBy}
                  onChange={(e) => setEditRecordedBy(e.target.value)}
                  placeholder="ناوی تۆمارکەر..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-bold">تێبینی:</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditExpenseTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/10 text-xs font-bold cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs cursor-pointer shadow-lg"
                >
                  پاشەکەوتکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmExpenseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-right animate-in fade-in zoom-in duration-200 my-auto">
            <div className="flex items-center gap-3 mb-4 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">سڕینەوەی خەرجی</h3>
                <p className="text-xs text-slate-400">ئایا دڵنیایت لە سڕینەوەی ئەم خەرجییە؟</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmExpenseId(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:bg-white/10 text-xs font-bold cursor-pointer"
              >
                پاشگەزبوونەوە
              </button>
              <button
                type="button"
                onClick={() => handleDeleteExpense(deleteConfirmExpenseId)}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
              >
                بەڵێ، سڕینەوە
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
