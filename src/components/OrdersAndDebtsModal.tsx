import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Receipt,
  ShoppingBag,
  Users,
  CheckCircle2,
  Plus,
  RefreshCw,
  Copy,
  Code2,
  Calendar,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isFirestoreQuotaBlocked, handleFirestoreError } from '../utils/firestoreQuota';
import { useDatabase } from '../context/DatabaseContext';
import { formatCurrency, formatDate } from '../utils/formatters';

interface OrdersAndDebtsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrdersAndDebtsModal: React.FC<OrdersAndDebtsModalProps> = ({ isOpen, onClose }) => {
  const { saveCompleteTransaction } = useDatabase();
  const [activeTab, setActiveTab] = useState<'records' | 'create' | 'code'>('records');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    receiptId: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    totalAmount: 25000,
    customerName: 'احمد محمد',
    debtAmount: 10000,
    productName: 'کاڵای نموونەیی',
    quantity: 2,
    price: 7500,
  });

  // Subscribe to real-time changes in orders_and_debts
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    try {
      const q = query(collection(db, 'orders_and_debts'), limit(40));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          // Sort by createdAt descending
          docs.sort((a: any, b: any) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
          });
          setRecords(docs);
          setLoading(false);
        },
        (err) => {
          handleFirestoreError(err, 'orders_and_debts subscription');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle sample test run
  const handleTestSampleData = async () => {
    setSubmitting(true);
    try {
      const sampleData = {
        receiptId: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        totalAmount: 25000,
        customerName: 'احمد محمد',
        debtAmount: 10000,
        productName: 'کاڵای نموونەیی',
        quantity: 2,
        price: 7500,
        showAlert: true,
      };

      const docId = await saveCompleteTransaction(sampleData);
      if (docId) {
        setLastCreatedId(docId);
        setActiveTab('records');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle custom submit
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const docId = await saveCompleteTransaction({
        receiptId: formData.receiptId.trim() || `REC-${Date.now()}`,
        totalAmount: Number(formData.totalAmount) || 0,
        customerName: formData.customerName.trim() || 'کڕیاری گشتی',
        debtAmount: Number(formData.debtAmount) || 0,
        productName: formData.productName.trim() || 'کاڵا',
        quantity: Number(formData.quantity) || 1,
        price: Number(formData.price) || Number(formData.totalAmount) || 0,
        showAlert: true,
      });

      if (docId) {
        setLastCreatedId(docId);
        // Reset ID for next entry
        setFormData((prev) => ({
          ...prev,
          receiptId: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        }));
        setActiveTab('records');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const codeSnippet = `import { getFirestore, collection, addDoc } from "firebase/firestore";

const db = getFirestore();

async function saveCompleteTransaction(transactionData) {
  try {
    // دروستکردنی ئۆبجێکتی گشتی کە هەموو داتاکانی تێدایە
    const completeData = {
      // زانیاری پسوڵە (Receipt)
      receipt: {
        receiptId: transactionData.receiptId,
        totalAmount: transactionData.totalAmount,
        date: new Date().toISOString()
      },
      
      // زانیاری قەرز (Debt - ئەگەر هەبێت)
      debt: {
        customerName: transactionData.customerName,
        debtAmount: transactionData.debtAmount,
        isPaid: false
      },
      
      // زانیاری کاڵا (Product)
      product: {
        productName: transactionData.productName,
        quantity: transactionData.quantity,
        price: transactionData.price
      },
      
      createdAt: new Date()
    };

    // ناردنی بۆ فایەربەیس (Firestore Collection: orders_and_debts)
    const docRef = await addDoc(collection(db, "orders_and_debts"), completeData);
    console.log("داتاکە بە سەرکەوتوویی سەیڤ کرا بە IDی: ", docRef.id);
    
    alert("پسوڵە، قەرز و کاڵاکە پێکەوە سەیڤ کران!");
  } catch (error) {
    console.error("هەڵە لە سەیڤکردنی داتا: ", error);
  }
}

// نموونەی بەکارهێنان:
const sampleData = {
  receiptId: "REC-2026-01",
  totalAmount: 25000,
  customerName: "احمد محمد",
  debtAmount: 10000,
  productName: "کاڵای نموونەیی",
  quantity: 2,
  price: 7500
};

saveCompleteTransaction(sampleData);`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-fadeIn no-print">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-purple-800/40">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-inner">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black">فایەربەیس: orders_and_debts</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-400/20 text-purple-200 text-[10px] font-mono font-bold border border-purple-400/30">
                  Firestore
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5">
                سەیڤکردنی یەکگرتووی پسوڵە (Receipt)، قەرز (Debt) و کاڵا (Product) لە یەک دۆکیومێنت
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-900 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons & Test Quick Action */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-bold">
            <button
              onClick={() => setActiveTab('records')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'records'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>تۆمارەکان ({records.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>فۆرمی تۆمارکردن</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>کۆدی فەنکشن</span>
            </button>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleTestSampleData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{submitting ? 'تۆماردەکرێت...' : 'تاقیکردنەوەی سەیڤی نموونە (Sample Data)'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB 1: Records View */}
          {activeTab === 'records' && (
            <div className="space-y-4">
              {lastCreatedId && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-emerald-900 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold">دواین داتای تۆمارکراو بە سەرکەوتوویی: </span>
                      <code className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                        {lastCreatedId}
                      </code>
                    </div>
                  </div>
                  <button
                    onClick={() => setLastCreatedId(null)}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
                  >
                    داخستن
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-900 font-semibold px-1">
                <span>لیستی بەڵگەنامەکان لەناو کۆلێکشن (Collection: orders_and_debts)</span>
                {loading && <span className="text-purple-600 animate-pulse">باردەکرێت...</span>}
              </div>

              {records.length === 0 && !loading ? (
                <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-6 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 mx-auto flex items-center justify-center">
                    <Database className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">هیچ داتایەک لە orders_and_debts نییە</h4>
                  <p className="text-xs text-slate-900 max-w-md mx-auto">
                    دەتوانیت بە دوگمەی «تاقیکردنەوەی سەیڤی نموونە» داتای نموونەیی تۆمار بکەیت، یان هەر فرۆشتنێکی نوێ ئەنجام بدەیت بۆ ئەوەی ڕاستەوخۆ لێرە دەربکەوێت.
                  </p>
                  <button
                    onClick={handleTestSampleData}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    سەیڤکردنی یەکەم نموونە
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {records.map((item) => {
                    const r = item.receipt || {};
                    const d = item.debt || {};
                    const p = item.product || {};
                    const isCopied = copiedId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all space-y-3"
                      >
                        {/* Card Header: Doc ID & Date */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <code className="text-[11px] font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                              {item.id.slice(0, 12)}...
                            </code>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.id);
                              setCopiedId(item.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="text-[10px] font-bold text-slate-900 hover:text-purple-600 flex items-center gap-1 cursor-pointer"
                            title="کۆپیکردنی ناسنامەی دۆکیومێنت"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{isCopied ? 'کۆپیکرا!' : 'کۆپی ID'}</span>
                          </button>
                        </div>

                        {/* Three Sections: Receipt, Debt, Product */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {/* Receipt */}
                          <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-2.5 space-y-1">
                            <div className="text-[10px] font-bold text-purple-700 flex items-center gap-1">
                              <Receipt className="w-3 h-3" />
                              <span>پسوڵە</span>
                            </div>
                            <div className="font-mono font-black text-slate-900 text-[11px] truncate">
                              {r.receiptId || 'REC'}
                            </div>
                            <div className="font-bold text-purple-900 text-xs">
                              {formatCurrency(r.totalAmount || 0)}
                            </div>
                          </div>

                          {/* Debt */}
                          <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-2.5 space-y-1">
                            <div className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>قەرز</span>
                            </div>
                            <div className="font-bold text-slate-900 text-[11px] truncate" title={d.customerName}>
                              {d.customerName || 'کڕیار'}
                            </div>
                            <div className="font-bold text-amber-900 text-xs">
                              {d.debtAmount > 0 ? formatCurrency(d.debtAmount) : 'بێ قەرز'}
                            </div>
                          </div>

                          {/* Product */}
                          <div className="bg-teal-50/70 border border-teal-100 rounded-xl p-2.5 space-y-1">
                            <div className="text-[10px] font-bold text-teal-700 flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3" />
                              <span>کاڵا</span>
                            </div>
                            <div className="font-bold text-slate-900 text-[11px] truncate" title={p.productName}>
                              {p.productName || 'کاڵا'}
                            </div>
                            <div className="text-[11px] text-teal-900 font-bold">
                              {p.quantity || 1} دانە
                            </div>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {item.createdAt?.toDate
                              ? formatDate(item.createdAt.toDate().toISOString())
                              : formatDate(item.createdAt || new Date().toISOString())}
                          </span>
                          <span className="text-slate-900 font-mono">
                            نرخی کاڵا: {formatCurrency(p.price || 0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Custom Entry Form */}
          {activeTab === 'create' && (
            <form onSubmit={handleCustomSubmit} className="space-y-4 max-w-xl mx-auto">
              <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 text-xs text-purple-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-purple-800">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>تۆمارکردن بە فەنکشنی saveCompleteTransaction</span>
                </div>
                <p className="text-purple-700 leading-relaxed text-[11px]">
                  ئەم فۆرمە زانیارییەکانی پسوڵە، قەرز، و کاڵاکە پێکەوە ڕێکدەخات و بە شێوەی ئۆبجێکتی گشتی بۆ کۆلێکشن <code className="bg-white px-1 rounded text-purple-900 font-mono">orders_and_debts</code> دەنێرێت.
                </p>
              </div>

              {/* Receipt Info */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-purple-600" />
                  <span>١. زانیاری پسوڵە (Receipt)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">ژمارەی پسوڵە (receiptId)</label>
                    <input
                      type="text"
                      required
                      value={formData.receiptId}
                      onChange={(e) => setFormData({ ...formData, receiptId: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">کۆی پسوڵە (totalAmount)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Debt Info */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>٢. زانیاری قەرز (Debt)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">ناوی کڕیار (customerName)</label>
                    <input
                      type="text"
                      required
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">بڕی قەرز (debtAmount)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.debtAmount}
                      onChange={(e) => setFormData({ ...formData, debtAmount: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-teal-600" />
                  <span>٣. زانیاری کاڵا (Product)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">ناوی کاڵا (productName)</label>
                    <input
                      type="text"
                      required
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">ژمارە / کێش (quantity)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">نرخ (price)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('records')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition-colors cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'سەیڤ دەکرێت...' : 'سەیڤکردن پێکەوە (saveCompleteTransaction)'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Code Viewer */}
          {activeTab === 'code' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400 font-sans text-xs">
                <span>کۆدی فەنکشنەکە لە پڕۆژەکەدا جێبەجێکراوە و لە داتابەیسەکەت بەستراوە:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(codeSnippet);
                    setCopiedId('code');
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 text-[11px] font-sans font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedId === 'code' ? 'کۆپیکرا!' : 'کۆپیکردنی کۆد'}</span>
                </button>
              </div>

              <div className="bg-slate-900 text-slate-900 rounded-2xl p-4 border border-slate-800 overflow-x-auto text-[11px] leading-relaxed">
                <pre>{codeSnippet}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-900 text-[11px]">
            کۆلێکشن: <strong className="text-slate-900 font-mono">orders_and_debts</strong> | هەموو سەیڤکردنێکی نوێی پسوڵە ئۆتۆماتیکی لێرە تۆمار دەبێت
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold transition-colors cursor-pointer"
          >
            داخستن
          </button>
        </div>
      </div>
    </div>
  );
};
