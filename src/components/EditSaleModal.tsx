import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Save,
  SlidersHorizontal,
  Plus,
  Trash2,
  Receipt,
  User,
  Phone,
  Calendar,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Sale, SaleItem, Customer, Product } from '../types';
import { useDatabase } from '../context/DatabaseContext';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';

interface EditSaleModalProps {
  sale: Sale | null;
  onClose: () => void;
  onSaved?: () => void;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({ sale, onClose, onSaved }) => {
  const { settings, updateSale, customers, products, saveCompleteTransaction } = useDatabase();

  // Editable Sale Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<'cash' | 'debt' | 'partial'>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quickAddProductId, setQuickAddProductId] = useState('');

  useEffect(() => {
    if (sale) {
      setInvoiceNumber(sale.invoiceNumber || '');
      setCustomerId(sale.customerId || null);
      setCustomerName(sale.customerName || '');
      setCustomerPhone(sale.customerPhone || '');
      setSellerName(sale.sellerName || 'کاشێر');
      setSaleDate(sale.date ? sale.date.substring(0, 16) : new Date().toISOString().substring(0, 16));
      setItems(sale.items ? JSON.parse(JSON.stringify(sale.items)) : []);
      setDiscount(sale.discount || 0);
      setPaymentType((sale.paymentType as any) || (sale.debtAmount > 0 ? 'debt' : 'cash'));
      setPaidAmount(sale.paidAmount || 0);
      setNotes(sale.notes || '');
      setSaveSuccess(false);
      setIsSaving(false);
    }
  }, [sale]);

  if (!sale) return null;

  const handleCustomerNameChange = (name: string) => {
    setCustomerName(name);
    const found = customers.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (found) {
      setCustomerId(found.id);
      if (found.phone && found.phone !== '—') {
        setCustomerPhone(found.phone);
      }
    } else {
      setCustomerId(null);
    }
  };

  // Live Calculations
  const calculatedSubtotal = items.reduce(
    (acc, it) => acc + (Number(it.quantity || 0) * Number(it.sellingPrice || 0)),
    0
  );
  const calculatedTotal = Math.max(0, calculatedSubtotal - (Number(discount) || 0));

  let calculatedPaid = Number(paidAmount) || 0;
  if (paymentType === 'cash') {
    calculatedPaid = calculatedTotal;
  } else if (paymentType === 'debt') {
    calculatedPaid = 0;
  }
  const calculatedDebt = Math.max(0, calculatedTotal - calculatedPaid);

  const handleItemQtyChange = (index: number, newQty: number) => {
    const qty = Math.max(0, newQty);
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.quantity = qty;
      item.total = qty * (Number(item.sellingPrice) || 0);
      updated[index] = item;
      return updated;
    });
  };

  const handleItemPriceChange = (index: number, newPrice: number) => {
    const price = Math.max(0, newPrice);
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.sellingPrice = price;
      item.total = (Number(item.quantity) || 0) * price;
      updated[index] = item;
      return updated;
    });
  };

  const handleItemFieldChange = (index: number, field: keyof SaleItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'sellingPrice' || field === 'quantity') {
        item.total = (Number(item.quantity) || 0) * (Number(item.sellingPrice) || 0);
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('پێویستە لانی کەم یەک کاڵا لە پسووڵەکەدا بمێنێتەوە.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddNewItem = (prod?: Product) => {
    const newItem: SaleItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: prod?.id || '',
      barcode: prod?.barcode || '',
      productName: prod?.name || 'کاڵای نوێ',
      unit: prod?.unit || 'دانە',
      count: 1,
      quantity: 1,
      sellingPrice: prod?.sellingPrice || (prod as any)?.price || 0,
      cropOwner: prod?.ownerName || '',
      total: prod?.sellingPrice || (prod as any)?.price || 0,
    };
    setItems((prev) => [...prev, newItem]);
    setQuickAddProductId('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      alert('تکایە دڵنیابەرەوە لە هەبوونی کاڵا لە پسووڵەکەدا.');
      return;
    }

    setIsSaving(true);

    try {
      let effectiveCustomerId = customerId;
      if (!effectiveCustomerId && customerName.trim()) {
        const matched = customers.find(
          (c) => c.name.trim().toLowerCase() === customerName.trim().toLowerCase()
        );
        if (matched) effectiveCustomerId = matched.id;
      }

      const cleanedItems = items.map((it) => ({
        ...it,
        quantity: Number(it.quantity) || 0,
        count: it.count !== undefined && it.count !== null && (it.count as any) !== '' ? Number(it.count) : undefined,
        sellingPrice: Number(it.sellingPrice) || 0,
        total: (Number(it.quantity) || 0) * (Number(it.sellingPrice) || 0),
        unit: it.unit || 'دانە',
        productName: it.productName?.trim() || 'کاڵا',
        cropOwner: it.cropOwner?.trim() || '',
      }));

      // 1. Update sale with automatic inventory & debt sync through updateSale
      updateSale(sale.id, {
        invoiceNumber: invoiceNumber.trim() || sale.invoiceNumber,
        customerId: effectiveCustomerId || undefined,
        customerName: customerName.trim() || 'کڕیاری گشتی',
        customerPhone: customerPhone.trim(),
        sellerName: sellerName.trim() || sale.sellerName || 'کاشێر',
        date: new Date(saleDate).toISOString(),
        items: cleanedItems,
        subtotal: calculatedSubtotal,
        discount: Number(discount) || 0,
        total: calculatedTotal,
        paidAmount: calculatedPaid,
        debtAmount: calculatedDebt,
        paymentType,
        notes: notes.trim(),
      });

      // 2. Also notify saveCompleteTransaction helper for real-time listener sync
      saveCompleteTransaction({
        receiptId: invoiceNumber.trim() || sale.invoiceNumber,
        totalAmount: calculatedTotal,
        customerName: customerName.trim() || 'کڕیاری گشتی',
        debtAmount: calculatedDebt,
        productName: items.map((it) => it.productName).join('، '),
        quantity: items.reduce((s, it) => s + (it.quantity || 1), 0),
        price: calculatedTotal,
        items,
        isPaid: calculatedDebt <= 0,
        showAlert: false,
      }).catch((err) => console.warn('Edit sale saveCompleteTransaction warning:', err));

      setSaveSuccess(true);
      setTimeout(() => {
        if (onSaved) onSaved();
        onClose();
      }, 700);
    } catch (err) {
      console.error('Error saving edited sale:', err);
      alert('هەڵەیەک ڕوویدا لە کاتی پاشەکەوتکردندا.');
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fade-in"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden my-auto text-white flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2 flex-wrap">
                <span>دەستکاریکردنی زانیارییەکانی پسووڵە</span>
                <span className="font-mono text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  #{invoiceNumber || sale.invoiceNumber}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                گۆڕانکاری لە کاڵاکان، نرخ، کڕیار و قەرز بە شێوەی ئۆتۆماتیکی لە تەواوی سیستەمدا جێبەجێ دەبێت
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Notification Banner */}
        <div className="bg-gradient-to-r from-amber-950/40 via-emerald-950/30 to-slate-900 px-4 sm:px-6 py-2 border-b border-amber-500/20 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="font-bold text-amber-200">هاوکاتکردنی ئۆتۆماتیکی:</span>
            <span className="text-[11px] text-slate-300 hidden sm:inline">
              هەر گۆڕانکارییەک بکەیت ڕاستەوخۆ کۆگای کاڵاکان و حیساباتی قەرزەکان نوێ دەبنەوە.
            </span>
          </div>
          <div className="font-mono text-emerald-400 font-bold text-[11px]">
            کۆی گشتی: {formatCurrency(calculatedTotal, settings.currency, settings.usdToIqdRate)}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Row 1: Invoice Number, Customer Name, Phone, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            {/* Invoice Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-slate-400" />
                <span>ژمارەی پسووڵە</span>
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-mono font-bold text-white bg-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>ناوی کڕیار</span>
                </span>
                {customerId && (
                  <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    تۆمارکراوە
                  </span>
                )}
              </label>
              <input
                type="text"
                list="edit-customers-list"
                value={customerName}
                onChange={(e) => handleCustomerNameChange(e.target.value)}
                placeholder="ناوی کڕیار بنووسە..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold text-white bg-slate-900 focus:outline-none focus:border-amber-500"
              />
              <datalist id="edit-customers-list">
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} {c.totalDebt ? `(قەرز: ${formatNumber(c.totalDebt)})` : ''}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>ژمارەی مۆبایل</span>
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="07..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-mono text-white bg-slate-900 focus:outline-none focus:border-amber-500"
                dir="ltr"
              />
            </div>

            {/* Sale Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>بەرواری پسووڵە</span>
              </label>
              <input
                type="datetime-local"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-mono font-bold text-white bg-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Row 2: Invoice Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-400" />
                <span>کاڵاکانی ئەم پسووڵەیە ({items.length} کاڵا)</span>
              </h4>
              <span className="text-[10.5px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                گۆڕینی هەر بڕێک، ڕاستەوخۆ کۆگای کاڵاکان کەم یان زیاد دەکاتەوە
              </span>
            </div>

            {/* Table Container */}
            <div className="border border-slate-700/80 rounded-2xl overflow-hidden shadow-inner">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 min-w-[140px]">ناوی کاڵا</th>
                      <th className="py-2.5 px-2 min-w-[90px]">جوتیار / خاوەن</th>
                      <th className="py-2.5 px-2 text-center w-16">العدد</th>
                      <th className="py-2.5 px-2 text-center w-24">بڕ / کێش</th>
                      <th className="py-2.5 px-2 text-center w-20">یەکە</th>
                      <th className="py-2.5 px-2 text-center w-28">نرخی فرۆشتن</th>
                      <th className="py-2.5 px-3 text-left w-28">کۆی پارە</th>
                      <th className="py-2.5 px-2 text-center w-10">لابردن</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-medium bg-slate-900/60">
                    {items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-800/50 transition-colors">
                        {/* Product Name */}
                        <td className="py-2 px-2.5">
                          <input
                            type="text"
                            list="edit-product-names-list"
                            value={item.productName || ''}
                            onChange={(e) => handleItemFieldChange(idx, 'productName', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-slate-700 text-xs font-bold text-white bg-slate-950 focus:outline-none focus:border-amber-500"
                            placeholder="ناوی کاڵا..."
                          />
                        </td>

                        {/* Farmer / Crop Owner */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.cropOwner || ''}
                            onChange={(e) => handleItemFieldChange(idx, 'cropOwner', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-slate-700 text-xs text-slate-300 bg-slate-950 focus:outline-none focus:border-amber-500"
                            placeholder="جوتیار..."
                          />
                        </td>

                        {/* Count / العدد */}
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.count ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleItemFieldChange(idx, 'count', val === '' ? undefined : parseFloat(val));
                            }}
                            className="w-14 px-1.5 py-1 text-center font-bold text-xs rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-amber-500 font-mono"
                            placeholder="—"
                          />
                        </td>

                        {/* Quantity / Weight */}
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleItemQtyChange(idx, Number(e.target.value))}
                            className="w-20 px-2 py-1 text-center font-bold text-xs rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </td>

                        {/* Unit */}
                        <td className="py-2 px-1 text-center">
                          <input
                            type="text"
                            list="edit-units-list"
                            value={item.unit || 'دانە'}
                            onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                            className="w-16 px-1.5 py-1 text-center text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-300 focus:outline-none focus:border-amber-500"
                          />
                        </td>

                        {/* Selling Price */}
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.sellingPrice}
                            onChange={(e) => handleItemPriceChange(idx, Number(e.target.value))}
                            className="w-24 px-2 py-1 text-center font-bold text-xs rounded-lg border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </td>

                        {/* Row Total */}
                        <td className="py-2 px-3 text-left font-mono font-bold text-emerald-400" dir="ltr">
                          {formatNumber((Number(item.quantity) || 0) * (Number(item.sellingPrice) || 0))}
                        </td>

                        {/* Remove Action */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="لابردنی کاڵا لە پسووڵە"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Datalists for Autocomplete */}
              <datalist id="edit-product-names-list">
                {products.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} (ماوە: {p.stock ?? p.quantity ?? 0} {p.unit || ''})
                  </option>
                ))}
              </datalist>

              <datalist id="edit-units-list">
                <option value="کیلۆ" />
                <option value="دانە" />
                <option value="کارتۆن" />
                <option value="سندوق" />
                <option value="کیسە" />
                <option value="تەبەق" />
                <option value="گونیە" />
                <option value="مەتر" />
              </datalist>

              {/* Add New Item Toolbar */}
              <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <select
                    value={quickAddProductId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setQuickAddProductId(selId);
                      if (selId) {
                        const matched = products.find((p) => p.id === selId);
                        if (matched) handleAddNewItem(matched);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="">هەڵبژاردنی کاڵا لە کۆگا بۆ زیادکردن...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - (کۆگا: {p.stock ?? p.quantity ?? 0}) - نرخ: {formatNumber(p.sellingPrice || (p as any).price || 0)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddNewItem()}
                  className="px-3.5 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>زیادکردنی کاڵای دەستی بۆ پسووڵە</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Totals & Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">کۆتایی پارە (Subtotal)</label>
              <div className="font-mono font-bold text-white bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 text-left" dir="ltr">
                {formatCurrency(calculatedSubtotal, settings.currency, settings.usdToIqdRate)}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">داشکاندن (Discount)</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-mono font-bold text-white bg-slate-900 focus:outline-none focus:border-amber-500 text-left"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-emerald-400 mb-1">کۆی گشتی (Total)</label>
              <div className="font-mono font-black text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/30 text-left" dir="ltr">
                {formatCurrency(calculatedTotal, settings.currency, settings.usdToIqdRate)}
              </div>
            </div>
          </div>

          {/* Row 4: Payment Method & Debt Calculation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1.5">شێوازی پارەدان</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('cash');
                    setPaidAmount(calculatedTotal);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    paymentType === 'cash'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  کاش (نەقد)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('debt');
                    setPaidAmount(0);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    paymentType === 'debt'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  قەرز
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('partial');
                    if (paidAmount >= calculatedTotal || paidAmount === 0) {
                      setPaidAmount(Math.round(calculatedTotal / 2));
                    }
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    paymentType === 'partial'
                      ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  قیست / بەشێک
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                بڕی پارەی دراو (Paid Amount):
              </label>
              <input
                type="number"
                min="0"
                max={calculatedTotal}
                disabled={paymentType === 'cash' || paymentType === 'debt'}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-mono font-bold text-white bg-slate-900 focus:outline-none focus:border-amber-500 text-left disabled:opacity-60"
                dir="ltr"
              />
            </div>
          </div>

          {/* Automatic Debt & Inventory Guarantee Card */}
          <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-emerald-500/15 border border-amber-500/30 rounded-2xl p-3.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="font-black text-amber-300">ڕێکخستنی ئۆتۆماتیکی قەرز و کاڵاکان:</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                {calculatedDebt > 0 ? (
                  <>
                    بڕی قەرز:{' '}
                    <span className="font-mono font-bold text-amber-400" dir="ltr">
                      {formatCurrency(calculatedDebt, settings.currency, settings.usdToIqdRate)}
                    </span>
                    ، ئۆتۆماتیکی دەخرێتە سەر حیسابی «{customerName.trim() || 'کڕیار'}» لە بەشی قەرزەکان.
                  </>
                ) : (
                  <>ئەم پسووڵەیە هیچ قەرزێکی لەسەر نامێنێت و لە بەشی قەرزەکاندا پاکتاو دەکرێت.</>
                )}
              </p>
            </div>
            <div className="font-mono font-black text-amber-300 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-amber-500/40 shrink-0 text-left" dir="ltr">
              قەرزی ماوە: {formatCurrency(calculatedDebt, settings.currency, settings.usdToIqdRate)}
            </div>
          </div>

          {/* Row 5: Notes & Seller */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 mb-1">تێبینی پسووڵە</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="تێبینی بنووسە..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-white bg-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">ناوی فرۆشیار / ژمێریار</label>
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="کاشێر..."
                className="w-full px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-white bg-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors border border-slate-700 cursor-pointer"
            >
              پاشگەزبوونەوە
            </button>

            <button
              type="submit"
              disabled={isSaving || saveSuccess}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white'
              }`}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>پاشەکەوتکرا و قەرز و کاڵاکان نوێکرانەوە!</span>
                </>
              ) : isSaving ? (
                <span>سەیڤ دەکرێت...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>پاشەکەوتکردن (نوێکردنەوەی قەرز و کاڵاکان)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
