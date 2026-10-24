import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Trash2, AlertTriangle } from 'lucide-react';
import { SecurityPasscodeModal } from './SecurityPasscodeModal';

export const DataMaintenanceView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const months = [
    'کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران',
    'تەمموز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const handleDeleteData = async () => {
    alert(`سڕینەوەی داتاکانی ${months[selectedMonth - 1]} / ${selectedYear} بە سەرکەوتوویی ئەنجامدرا.`);
    setIsConfirmModalOpen(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-right space-y-6" dir="rtl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <span>سڕینەوەی داتاکان بەپێی بەروار</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-200 block mb-2">مانگ</label>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-rose-500 transition-all"
          >
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-200 block mb-2">ساڵ</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-rose-500 transition-all"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
        <p className="text-xs text-rose-200 font-bold leading-relaxed">
          ئاگاداری: ئەم کردارە هەموو داتاکانی تۆمارکراوی ئەم مانگە لە (فرۆش، قەرز، خەرجی و کرێکاران) بە یەکجاری دەسڕێتەوە و ناگەڕێتەوە. دڵنیابەرەوە لە ئەنجامدانی پشتیوانی (Backup) پێش سڕینەوە.
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer"
        >
          گەڕانەوە
        </button>
        <button
          type="button"
          onClick={() => setIsConfirmModalOpen(true)}
          className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-rose-950/40"
        >
          سڕینەوەی داتاکان
        </button>
      </div>

      {/* Passcode Protection for Deleting Data */}
      <SecurityPasscodeModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleDeleteData}
        title="سڕینەوەی داتاکان"
        description={`ئایا دڵنیایت لە سڕینەوەی سەرجەم داتاکانی ${months[selectedMonth - 1]} / ${selectedYear}؟ تکایە ژمارەی نهێنی بنووسە بۆ پشتڕاستکردنەوە.`}
        danger={true}
        actionLabel="سڕینەوەی داتاکان"
      />
    </div>
  );
};
