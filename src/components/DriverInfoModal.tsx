import React, { useState, useEffect } from 'react';
import { 
  X, 
  Truck, 
  User, 
  Phone, 
  Hash, 
  Save, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Product } from '../types';
import { useDatabase } from '../context/DatabaseContext';

interface DriverInfoModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export const DriverInfoModal: React.FC<DriverInfoModalProps> = ({ product, isOpen, onClose }) => {
  const { updateProduct, forceSaveToDisk } = useDatabase();
  const [formData, setFormData] = useState({
    driverName: '',
    carNumber: '',
    driverPhone: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        driverName: product.driverName || '',
        carNumber: product.carNumber || '',
        driverPhone: product.driverPhone || ''
      });
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      updateProduct(product.id, {
        ...formData
      });
      
      // Force immediate save to localStorage/IndexedDB to ensure no data loss on refresh
      if (forceSaveToDisk) {
        await forceSaveToDisk();
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to update driver info:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-center sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md sm:rounded-[32px] sm:shadow-2xl sm:border sm:border-slate-200 overflow-hidden sm:my-auto relative animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 flex flex-col min-h-screen sm:min-h-0 sm:max-h-[94vh]"
        dir="rtl"
      >
        {/* Header - Fixed at top */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white relative border-b border-white/10 shrink-0">
          <button 
            onClick={onClose}
            className="absolute left-5 top-5 p-2.5 rounded-2xl bg-white/15 hover:bg-white/25 transition-all cursor-pointer backdrop-blur-md border border-white/10 active:scale-90 z-10"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4 pt-2">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] border border-white/20">
              <Truck className="w-8 h-8 drop-shadow-md" />
            </div>
            <div className="flex-1 overflow-hidden">
              <h2 className="text-xl font-black tracking-tight truncate">زانیاری شۆفێر</h2>
              <p className="text-emerald-100/80 text-[11px] font-bold mt-0.5 truncate">کاڵا: {product.name}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-1">
          <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-7">
            <div className="space-y-5">
              {/* Driver Name */}
              <div className="space-y-2">
                <label className="text-[13px] font-black text-slate-900 flex items-center gap-2 mr-1">
                  <User className="w-4 h-4 text-emerald-600" />
                  ناوی شۆفێر
                </label>
                <input
                  type="text"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  placeholder="ناوی تەواوی شۆفێر بنووسە..."
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all outline-none font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium text-sm"
                />
              </div>

              {/* Car Number */}
              <div className="space-y-2">
                <label className="text-[13px] font-black text-slate-900 flex items-center gap-2 mr-1">
                  <Hash className="w-4 h-4 text-emerald-600" />
                  ژمارەی ئۆتۆمبێل
                </label>
                <input
                  type="text"
                  value={formData.carNumber}
                  onChange={(e) => setFormData({ ...formData, carNumber: e.target.value })}
                  placeholder="ژمارەی سەیارە بنووسە..."
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all outline-none font-black font-mono text-slate-900 placeholder:text-slate-400 placeholder:font-sans placeholder:font-medium text-sm"
                />
              </div>

              {/* Driver Phone */}
              <div className="space-y-2">
                <label className="text-[13px] font-black text-slate-900 flex items-center gap-2 mr-1">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  ژمارەی مۆبایل
                </label>
                <input
                  type="tel"
                  value={formData.driverPhone}
                  onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                  placeholder="٠٧٥٠ ..."
                  dir="ltr"
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 transition-all outline-none font-black font-mono text-slate-900 text-right placeholder:text-slate-400 placeholder:font-sans placeholder:font-medium text-sm"
                />
              </div>
            </div>

            {/* Action Buttons - Balanced and Equal Sizing */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                disabled={isSaving || showSuccess}
                className={`w-full sm:flex-1 h-14 rounded-2xl font-black text-white shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer text-sm sm:text-base border border-white/10 ${
                  showSuccess 
                    ? 'bg-emerald-500' 
                    : 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 hover:brightness-110'
                }`}
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : showSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    پاشەکەوت کرا
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 opacity-90" />
                    <span>پاشەکەوتکردنی گۆڕانکارییەکان</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:flex-1 h-14 rounded-2xl font-black text-slate-800 bg-slate-100 hover:bg-slate-200 hover:text-slate-950 transition-all active:scale-[0.98] cursor-pointer text-sm sm:text-base border border-slate-300"
              >
                داخستن
              </button>
            </div>

            {/* Footer info box - Inside scrollable area */}
            <div className="text-center pt-4 pb-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100/80 shadow-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-[10px] font-bold leading-tight">ئەم زانیارییانە بۆ مەبەستی بەدواداچوونی بارەکە بەکاردێن</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
