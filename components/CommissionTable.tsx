import React from 'react';
import { CommissionTransaction } from '../types';
import { Eye, Printer, Trash2 } from 'lucide-react';

interface CommissionTableProps {
  transactions: CommissionTransaction[];
  onView: (tx: CommissionTransaction) => void;
  onPrint: (tx: CommissionTransaction) => void;
  onDelete: (tx: CommissionTransaction) => void;
}

export const CommissionTable: React.FC<CommissionTableProps> = ({
  transactions,
  onView,
  onPrint,
  onDelete,
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
      <div className="bg-[#00a86b] text-white p-4 flex items-center justify-between">
        <h3 className="font-black text-sm sm:text-base">خشتەی مامەڵەکان</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
              <th className="p-3 border-l border-slate-200 w-12 text-center">#</th>
              <th className="p-3 border-l border-slate-200">جۆری مامەڵە</th>
              <th className="p-3 border-l border-slate-200">بەروار و کات</th>
              <th className="p-3 border-l border-slate-200">بڕی پارە</th>
              <th className="p-3 border-l border-slate-200">تێبینی</th>
              <th className="p-3 text-center">کردارەکان</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-600">
                  هیچ مامەڵەیەک تۆمار نەکراوە
                </td>
              </tr>
            ) : (
              transactions.map((tx, idx) => (
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
                    </span>
                  </td>
                  <td className="p-3 border-l border-slate-200 font-mono text-slate-600 text-xs">
                    {new Date(tx.date).toLocaleString('ku-IQ')}
                  </td>
                  <td className="p-3 border-l border-slate-200 font-mono font-bold text-[#047857]">
                    {Number(tx.amount).toLocaleString('en-US')} د.ع
                  </td>
                  <td className="p-3 border-l border-slate-200 text-slate-600 text-xs truncate max-w-[150px]">
                    {tx.notes || '-'}
                  </td>
                  <td className="p-3 text-center flex items-center justify-center gap-1.5">
                    {/* دوگمەی بینین */}
                    <button 
                      type="button"
                      onClick={() => onView(tx)} 
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 cursor-pointer" 
                      title="بینین"
                    >
                      <Eye className="w-4 h-4 pointer-events-none" />
                    </button>
                    
                    {/* دوگمەی چاپکردن */}
                    <button 
                      type="button"
                      onClick={() => onPrint(tx)} 
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 cursor-pointer" 
                      title="چاپکردن"
                    >
                      <Printer className="w-4 h-4 pointer-events-none" />
                    </button>
                    
                    {/* دوگمەی سڕینەوە */}
                    <button 
                      type="button"
                      onClick={() => onDelete(tx)} 
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer" 
                      title="سڕینەوە"
                    >
                      <Trash2 className="w-4 h-4 pointer-events-none" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
