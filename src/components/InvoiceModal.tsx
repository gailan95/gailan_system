import React, { useState } from 'react';
import {
  Printer,
  X,
  Building2,
  Phone,
  MapPin,
  Trash2,
  SlidersHorizontal,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileText,
  User,
  Barcode,
  BadgeCheck,
  CheckCircle2,
  Apple,
  Sparkles,
  Settings,
  Clock,
  Coins,
  Check,
  Maximize2,
  Layers,
  FileDown,
  Share2,
  Send,
  Loader2,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Receipt,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { Sale, SaleItem, AppSettings } from '../types';
import { useDatabase } from '../context/DatabaseContext';
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateOnly,
  formatTimeOnly,
  numberToKurdishWords,
} from '../utils/formatters';
import { EditSaleModal } from './EditSaleModal';
import { downloadInvoicePDF, shareInvoicePDF } from '../utils/pdfExporter';
import { ThermalReceipt } from './ThermalReceipt';
import {
  getSavedReceiptLogoUrl,
  getSavedShowReceiptLogo,
  saveReceiptLogoSettings,
  removeCustomReceiptLogo,
  compressLogoImage,
} from '../utils/receiptLogoUtils';

interface InvoiceModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ sale: initialSale, onClose }) => {
  const { settings, updateSettings, customers, deleteSale, updateSale, products, employees, sales, forceSaveToDisk } = useDatabase();
  const sale = (initialSale ? sales.find((s) => s.id === initialSale.id) : null) || initialSale;

  const [invoiceStyle, setInvoiceStyle] = useState<'wholesale' | 'corporate' | 'thermal'>('wholesale');
  // Paper size and orientation state: default A6 Landscape (پانی) as requested
  const [paperSize, setPaperSize] = useState<'A6' | 'A5' | 'A4'>('A6');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Thermal Print Preview specific state
  const [thermalWidth, setThermalWidth] = useState<'80mm' | '58mm'>('80mm');
  const [thermalZoom, setThermalZoom] = useState<number>(1);
  const [thermalShowLogo, setThermalShowLogo] = useState<boolean>(() => getSavedShowReceiptLogo());
  const [activeLogoUrl, setActiveLogoUrl] = useState<string>(() => getSavedReceiptLogoUrl() || settings.receiptLogoUrl || '');
  const [thermalShowBarcode, setThermalShowBarcode] = useState<boolean>(true);
  const [thermalShowPreviousDebt, setThermalShowPreviousDebt] = useState<boolean>(true);
  const [thermalShowCustomerInfo, setThermalShowCustomerInfo] = useState<boolean>(true);
  const [thermalShowCashier, setThermalShowCashier] = useState<boolean>(true);

  React.useEffect(() => {
    const handleLogoChange = () => {
      setThermalShowLogo(getSavedShowReceiptLogo());
      setActiveLogoUrl(getSavedReceiptLogoUrl() || settings.receiptLogoUrl || '');
    };
    window.addEventListener('storage', handleLogoChange);
    window.addEventListener('receiptLogoChange', handleLogoChange);
    return () => {
      window.removeEventListener('storage', handleLogoChange);
      window.removeEventListener('receiptLogoChange', handleLogoChange);
    };
  }, [settings.receiptLogoUrl]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showPastDebt, setShowPastDebt] = useState(true);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Split receipt state
  const totalItemsCount = sale?.items?.length || 0;
  const [isSplitEnabled, setIsSplitEnabled] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => (totalItemsCount > 8 ? 6 : 5));
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [showAllSplitPages, setShowAllSplitPages] = useState<boolean>(true);
  const [isSplitControlOpen, setIsSplitControlOpen] = useState(false);

  // Split calculations: dynamically partition items across receipt pages (Hook at top level)
  const splitPages = React.useMemo(() => {
    if (!sale || !sale.items || sale.items.length === 0) return [];
    
    // Use the user-defined itemsPerPage if split is enabled, otherwise use total items
    const limit = isSplitEnabled ? itemsPerPage : sale.items.length;
    
    if (sale.items.length <= limit) {
      return [
        {
          pageIndex: 0,
          pageNumber: 1,
          totalPages: 1,
          items: sale.items,
          startIndex: 0,
          endIndex: sale.items.length,
          pageSubtotal: sale.items.reduce((s, it) => s + it.total, 0),
          isFirst: true,
          isLast: true,
        },
      ];
    }
    
    const pages = [];
    const totalPages = Math.ceil(sale.items.length / limit);
    for (let i = 0; i < totalPages; i++) {
      const startIndex = i * limit;
      const endIndex = Math.min(startIndex + limit, sale.items.length);
      const pageItems = sale.items.slice(startIndex, endIndex);
      const pageSubtotal = pageItems.reduce((s, it) => s + it.total, 0);
      
      pages.push({
        pageIndex: i,
        pageNumber: i + 1,
        totalPages,
        items: pageItems,
        startIndex,
        endIndex,
        pageSubtotal,
        isFirst: i === 0,
        isLast: i === totalPages - 1,
      });
    }
    return pages;
  }, [sale, isSplitEnabled, itemsPerPage]);

  // Quick live customization for the wholesale invoice & full store settings
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  // Helper to dynamically resolve the recorder name from the sale or associated employee record
  const resolveRecorderName = () => {
    if (sale?.sellerName && sale.sellerName.trim()) {
      return sale.sellerName.trim();
    }
    if (sale && employees) {
      const matchedEmp = employees.find(
        (e) =>
          e.saleId === sale.id ||
          (e.name && sale.customerName && e.name.trim().toLowerCase() === sale.customerName.trim().toLowerCase())
      );
      if (matchedEmp?.employeeId && matchedEmp.employeeId.trim()) {
        return matchedEmp.employeeId.trim();
      }
    }
    return '';
  };

  const [cashierName, setCashierName] = useState(() => resolveRecorderName());

  React.useEffect(() => {
    const currentName = resolveRecorderName();
    if (currentName) {
      setCashierName(currentName);
    } else if (sale?.sellerName) {
      setCashierName(sale.sellerName);
    } else {
      setCashierName('');
    }
  }, [sale, employees]);
  const [quickOfficeNumber, setQuickOfficeNumber] = useState(
    settings.officeNumber !== undefined ? settings.officeNumber : 'مەکتەبی ژمارە ( ٤٩ )'
  );
  const [quickManagementLabel, setQuickManagementLabel] = useState(
    settings.managementLabel !== undefined
      ? (settings.managementLabel === 'بـإداره' || settings.managementLabel === 'بإداره' ? 'بەسەرپەرشتی' : settings.managementLabel)
      : 'بەسەرپەرشتی'
  );
  const [quickManagers, setQuickManagers] = useState(
    settings.managerNames !== undefined ? ((settings.managerNames || '').includes('سلام') ? '' : settings.managerNames) : ''
  );
  const [quickPhone, setQuickPhone] = useState(
    settings.phone !== undefined ? ((settings.phone || '').includes('07829219207') ? '' : settings.phone) : ''
  );
  const [quickPhoneOwner1, setQuickPhoneOwner1] = useState(
    settings.phoneOwner1 !== undefined ? ((settings.phoneOwner1 || '').includes('سلام') ? '' : settings.phoneOwner1) : ''
  );
  const [quickPhone2, setQuickPhone2] = useState(
    settings.phone2 !== undefined ? ((settings.phone2 || '').includes('0770 987 6543') ? '' : settings.phone2) : ''
  );
  const [quickPhoneOwner2, setQuickPhoneOwner2] = useState(
    settings.phoneOwner2 !== undefined ? ((settings.phoneOwner2 || '').includes('عباس') ? '' : settings.phoneOwner2) : ''
  );
  const [quickAddress, setQuickAddress] = useState(
    settings.address !== undefined ? settings.address : 'عەلوەی سەوزە و میوە - سلێمانی'
  );
  const [quickStoreName, setQuickStoreName] = useState(
    settings.storeName !== undefined ? settings.storeName : ''
  );
  const [quickSubtitle, setQuickSubtitle] = useState(
    settings.marketSubtitle !== undefined
      ? settings.marketSubtitle
      : 'بۆ بازرگانی میوە و سەوزە و وشکەبار بە کۆمەڵ'
  );
  const [quickInvoiceFooter, setQuickInvoiceFooter] = useState(
    settings.invoiceFooterMessage !== undefined
      ? settings.invoiceFooterMessage
      : 'سوپاس بۆ سەردانەکەتان، کاڵای فرۆشراو بە مەرجی هێنانەوەی پسووڵە دەگۆڕدرێتەوە'
  );

  const quickLogoInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploadingQuickLogo, setIsUploadingQuickLogo] = useState(false);

  const handleQuickLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingQuickLogo(true);
    try {
      const compressed = await compressLogoImage(file, 350);
      setActiveLogoUrl(compressed);
      saveReceiptLogoSettings(compressed, thermalShowLogo);
      updateSettings({ receiptLogoUrl: compressed });
    } catch (err) {
      console.error('Error compressing logo:', err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          setActiveLogoUrl(dataUrl);
          saveReceiptLogoSettings(dataUrl, thermalShowLogo);
          updateSettings({ receiptLogoUrl: dataUrl });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingQuickLogo(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveQuickLogo = () => {
    setActiveLogoUrl('');
    removeCustomReceiptLogo();
    updateSettings({ receiptLogoUrl: '' });
    saveReceiptLogoSettings('', thermalShowLogo);
  };

  React.useEffect(() => {
    if (settings.officeNumber !== undefined) setQuickOfficeNumber(settings.officeNumber);
    if (settings.managementLabel !== undefined) {
      setQuickManagementLabel(
        settings.managementLabel === 'بـإداره' || settings.managementLabel === 'بإداره'
          ? 'بەسەرپەرشتی'
          : settings.managementLabel
      );
    }
    if (settings.managerNames !== undefined) setQuickManagers((settings.managerNames || '').includes('سلام') ? '' : settings.managerNames);
    if (settings.phone !== undefined) setQuickPhone((settings.phone || '').includes('07829219207') ? '' : settings.phone);
    if (settings.phoneOwner1 !== undefined) setQuickPhoneOwner1((settings.phoneOwner1 || '').includes('سلام') ? '' : settings.phoneOwner1);
    if (settings.phone2 !== undefined) setQuickPhone2((settings.phone2 || '').includes('0770 987 6543') ? '' : settings.phone2);
    if (settings.phoneOwner2 !== undefined) setQuickPhoneOwner2((settings.phoneOwner2 || '').includes('عباس') ? '' : settings.phoneOwner2);
    if (settings.address !== undefined) setQuickAddress(settings.address);
    if (settings.storeName !== undefined) {
      setQuickStoreName(settings.storeName);
    }
    if (settings.marketSubtitle !== undefined) setQuickSubtitle(settings.marketSubtitle);
    if (settings.invoiceFooterMessage !== undefined) setQuickInvoiceFooter(settings.invoiceFooterMessage);
  }, [settings]);

  const handleFieldChange = (field: keyof AppSettings, value: string) => {
    switch (field) {
      case 'storeName':
        setQuickStoreName(value);
        break;
      case 'officeNumber':
        setQuickOfficeNumber(value);
        break;
      case 'managementLabel':
        setQuickManagementLabel(value);
        break;
      case 'managerNames':
        setQuickManagers(value);
        break;
      case 'marketSubtitle':
        setQuickSubtitle(value);
        break;
      case 'phone':
        setQuickPhone(value);
        break;
      case 'phoneOwner1':
        setQuickPhoneOwner1(value);
        break;
      case 'phone2':
        setQuickPhone2(value);
        break;
      case 'phoneOwner2':
        setQuickPhoneOwner2(value);
        break;
      case 'address':
        setQuickAddress(value);
        break;
      case 'invoiceFooterMessage':
        setQuickInvoiceFooter(value);
        break;
    }
    updateSettings({ [field]: value });
  };

  const handleCashierNameChange = (newName: string) => {
    setCashierName(newName);
    if (sale) {
      updateSale(sale.id, { sellerName: newName });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (isExportingPDF || !sale) return;
    try {
      setIsExportingPDF(true);
      if (invoiceStyle === 'thermal') {
        await downloadInvoicePDF('thermal-receipt-printable', {
          filename: `ThermalReceipt_${sale.invoiceNumber || 'GJA'}_${thermalWidth}.pdf`,
          paperSize: thermalWidth,
          orientation: 'portrait',
          elementIds: ['thermal-receipt-printable'],
        });
      } else {
        const elementIds = isSplitEnabled && splitPages.length > 1
          ? splitPages.map((_, idx) => `printable-invoice-page-${idx}`)
          : ['printable-invoice-page-0'];

        await downloadInvoicePDF('printable-invoice-page-0', {
          filename: `Invoice_${sale.invoiceNumber || 'GJA'}${isSplitEnabled && splitPages.length > 1 ? '_Split' : ''}.pdf`,
          paperSize,
          orientation,
          elementIds,
        });
      }
    } catch (err) {
      console.error('PDF export error:', err);
      alert('داواکارییەکە تووشی هەڵە بوو لە کاتی دروستکردنی فایلی PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleSharePDF = async () => {
    if (isExportingPDF || !sale) return;
    try {
      setIsExportingPDF(true);
      if (invoiceStyle === 'thermal') {
        await shareInvoicePDF('thermal-receipt-printable', {
          filename: `ThermalReceipt_${sale.invoiceNumber || 'GJA'}_${thermalWidth}.pdf`,
          paperSize: thermalWidth,
          orientation: 'portrait',
          elementIds: ['thermal-receipt-printable'],
        });
      } else {
        const elementIds = isSplitEnabled && splitPages.length > 1
          ? splitPages.map((_, idx) => `printable-invoice-page-${idx}`)
          : ['printable-invoice-page-0'];

        await shareInvoicePDF('printable-invoice-page-0', {
          filename: `Invoice_${sale.invoiceNumber || 'GJA'}${isSplitEnabled && splitPages.length > 1 ? '_Split' : ''}.pdf`,
          paperSize,
          orientation,
          elementIds,
        });
      }
    } catch (err) {
      console.error('PDF share error:', err);
      alert('داواکارییەکە تووشی هەڵە بوو لە کاتی ناردنی فایلی PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;
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
      setDeleteError('ژمارەی نهێنی هەڵەیە! تکایە دووبارە تاقی بکەرەوە.');
      return;
    }

    // Perform deletion with stock rollback
    deleteSale(sale.id, false);
    setIsDeleting(false);
    onClose();
  };

  const handleSaveQuickSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated = {
      ...settings,
      storeName: quickStoreName,
      officeNumber: quickOfficeNumber,
      managementLabel: quickManagementLabel,
      managerNames: quickManagers,
      phone: quickPhone,
      phoneOwner1: quickPhoneOwner1,
      phone2: quickPhone2,
      phoneOwner2: quickPhoneOwner2,
      address: quickAddress,
      marketSubtitle: quickSubtitle,
      invoiceFooterMessage: quickInvoiceFooter,
    };
    updateSettings(updated);
    if (sale && sale.sellerName !== cashierName) {
      updateSale(sale.id, { sellerName: cashierName });
    }
    await forceSaveToDisk({ settings: updated });
    setSettingsSavedSuccess(true);
    setTimeout(() => {
      setSettingsSavedSuccess(false);
      setIsQuickSettingsOpen(false);
    }, 900);
  };

  const customer = sale
    ? customers.find(
        (c) =>
          (sale.customerId && c.id === sale.customerId) ||
          (c.name && sale.customerName && c.name.trim().toLowerCase() === sale.customerName.trim().toLowerCase())
      )
    : undefined;

  const currentInvoiceDebt = sale
    ? (sale.paymentType === 'cash' && sale.paidAmount >= sale.total
        ? 0
        : sale.debtAmount > 0
        ? sale.debtAmount
        : Math.max(0, sale.total - sale.paidAmount))
    : 0;

  const previousDebt = sale
    ? (sale.previousDebt !== undefined && sale.previousDebt >= 0
        ? sale.previousDebt
        : customer
        ? Math.max(0, customer.totalDebt - currentInvoiceDebt)
        : sales
            .filter(
              (s) =>
                s.id !== sale.id &&
                new Date(s.date).getTime() < new Date(sale.date).getTime() &&
                ((sale.customerId && s.customerId === sale.customerId) ||
                  (s.customerName && sale.customerName && s.customerName.trim().toLowerCase() === sale.customerName.trim().toLowerCase()))
            )
            .reduce((sum, s) => sum + (s.debtAmount || Math.max(0, s.total - s.paidAmount)), 0))
    : 0;

  // Formula: کۆی قەرز = (قەرزی سەر پسوڵەی ئێستا + کۆی قەرزەکانی پێشوو)
  const finalTotalDebt = currentInvoiceDebt + previousDebt;
  const totalQuantity = sale?.items ? sale.items.reduce((sum, itm) => sum + itm.quantity, 0) : 0;

  const saleIndex = sale ? sales.findIndex((s) => s.id === sale.id) : -1;
  const displayInvoiceNumber =
    sale?.invoiceNumber &&
    sale.invoiceNumber.toLowerCase() !== 'gg' &&
    !sale.invoiceNumber.toLowerCase().includes('ئەحمەد') &&
    !sale.invoiceNumber.toLowerCase().includes('حمزة') &&
    sale.invoiceNumber.length > 0 &&
    (sale.invoiceNumber.includes('-') || /\d/.test(sale.invoiceNumber))
      ? sale.invoiceNumber
      : `GJA-${saleIndex >= 0 ? saleIndex + 1 : sales.length || 1}`;

  // Helper to reliably resolve the product barcode for every single item in current, past and future invoices
  const getItemBarcode = (item: SaleItem): string => {
    const rawCode = (item.barcode || '').trim();
    const rawOwner = (item.cropOwner || '').trim();
    const cleanName = (item.productName || '').trim().toLowerCase();

    // Check if rawCode is an actual numeric barcode (or valid barcode not equal to seller/customer name or employee initials like 'Gg')
    const isCleanNumeric = /^\d{3,}$/.test(rawCode);
    const isOwnerNumeric = /^\d{3,}$/.test(rawOwner);

    // 1. Direct match by matching Product in inventory
    const matchedProd = products?.find(
      (p) =>
        (item.productId && p.id === item.productId) ||
        (cleanName && p.name && p.name.trim().toLowerCase() === cleanName) ||
        (rawCode && p.barcode && p.barcode.trim() === rawCode)
    );

    if (matchedProd?.barcode && /^\d+$/.test(matchedProd.barcode.trim())) {
      return matchedProd.barcode.trim();
    }
    if (matchedProd?.barcode && matchedProd.barcode.trim()) {
      return matchedProd.barcode.trim();
    }

    // 2. Direct match by matching Employee's productBarcode
    const matchedEmp = employees?.find(
      (e) =>
        (cleanName && e.productName && e.productName.trim().toLowerCase() === cleanName) ||
        (item.productId && e.productId === item.productId)
    );
    if (matchedEmp?.productBarcode && /^\d+$/.test(matchedEmp.productBarcode.trim())) {
      return matchedEmp.productBarcode.trim();
    }
    if (matchedEmp?.productBarcode && matchedEmp.productBarcode.trim()) {
      return matchedEmp.productBarcode.trim();
    }

    // 3. Look up across other sales in the system for this same product name having a numeric barcode
    if (cleanName && sales) {
      for (const s of sales) {
        for (const si of s.items) {
          if (
            si.productName &&
            si.productName.trim().toLowerCase() === cleanName &&
            si.barcode &&
            /^\d{3,}$/.test(si.barcode.trim())
          ) {
            return si.barcode.trim();
          }
        }
      }
    }

    // 4. If current item barcode itself is numeric
    if (isCleanNumeric) {
      return rawCode;
    }
    if (isOwnerNumeric) {
      return rawOwner;
    }

    // 5. If item has barcode that is not customer/seller name or single short word like 'Gg'
    if (
      rawCode &&
      rawCode.toLowerCase() !== 'gg' &&
      rawCode !== sale?.customerName &&
      rawCode !== cashierName &&
      rawCode !== (sale?.sellerName || '')
    ) {
      return rawCode;
    }

    // 6. Consistent deterministic 6-digit barcode calculated from the product name
    if (cleanName) {
      let hash = 0;
      for (let i = 0; i < cleanName.length; i++) {
        hash = (hash << 5) - hash + cleanName.charCodeAt(i);
        hash |= 0;
      }
      const code = 100000 + (Math.abs(hash) % 900000);
      return `${code}`;
    }

    return '—';
  };

  // If no sale is provided, don't render UI
  if (!sale) return null;

  // In A6 landscape (148mm × 105mm), table should fit neatly.
  // We keep empty rows small so total rows is at most 3 or 4 to guarantee 105mm fit.
  const minimumRows = 3;
  const emptyRowsCount = Math.max(0, minimumRows - (sale.items?.length || 0));

  return (
    <>
      {/* Dynamic Print Sizing Styles for A6 Landscape / A5 / A4 / Thermal 80mm & 58mm */}
      <style>{`
        .a6-landscape-sheet * {
          box-sizing: border-box;
        }
        @media print {
          @page {
            size: ${
              invoiceStyle === 'thermal'
                ? thermalWidth === '58mm'
                  ? '58mm auto'
                  : '80mm auto'
                : paperSize === 'A6'
                ? '148mm 105mm'
                : paperSize === 'A5'
                ? orientation === 'landscape'
                  ? '210mm 148mm'
                  : '148mm 210mm'
                : orientation === 'landscape'
                ? '297mm 210mm'
                : '210mm 297mm'
            };
            margin: ${invoiceStyle === 'thermal' ? '0mm' : paperSize === 'A6' ? '2.5mm' : '5mm'};
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-invoice {
            width: ${
              invoiceStyle === 'thermal'
                ? thermalWidth === '58mm'
                  ? '58mm'
                  : '80mm'
                : paperSize === 'A6'
                ? '143mm'
                : paperSize === 'A5'
                ? '200mm'
                : '100%'
            } !important;
            max-width: ${
              invoiceStyle === 'thermal'
                ? thermalWidth === '58mm'
                  ? '58mm'
                  : '80mm'
                : paperSize === 'A6'
                ? '143mm'
                : paperSize === 'A5'
                ? '200mm'
                : '100%'
            } !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          .thermal-receipt-root {
            width: 100% !important;
            max-width: ${thermalWidth === '58mm' ? '58mm' : '80mm'} !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            padding: ${thermalWidth === '58mm' ? '1mm 2mm' : '2mm 3mm'} !important;
          }
          .printable-split-sheet {
            width: 100% !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          .printable-split-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .a6-landscape-sheet {
            width: 100% !important;
            max-width: 143mm !important;
            max-height: ${paperSize === 'A6' ? '99mm' : 'auto'} !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-md flex justify-center items-start p-2 sm:p-4 pt-6 sm:pt-10 pb-32 sm:pb-24 overflow-y-auto overscroll-contain no-pull-refresh">
        <div className="bg-slate-900/90 backdrop-blur-xl sm:rounded-3xl max-w-4xl w-full sm:shadow-2xl sm:border sm:border-white/15 overflow-hidden flex flex-col mb-10 sm:mb-8 pb-20">
          {/* Top Action Toolbar (Hidden during print) */}
          <div className="p-3 sm:p-4 bg-slate-900 text-white border-b border-slate-800 flex flex-col gap-3 no-print">
            {/* Top Row: Title, Invoice # Badge, Format Selector, and Close Button */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Apple className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-black text-xs sm:text-sm text-white truncate">پسووڵەی فرۆشتن</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30 shrink-0">
                      #{displayInvoiceNumber}
                    </span>
                  </div>
                  <span className="text-[10.5px] sm:text-[11px] text-slate-300 font-medium hidden sm:inline">
                    {invoiceStyle === 'thermal'
                      ? 'پێشبینینی ڕاستەوخۆ بۆ پرینتەری گەرمی (Thermal 80mm/58mm POS)'
                      : invoiceStyle === 'corporate'
                      ? 'شێوازی فەرمی کۆمپانیا - چاپ لەسەر قەبارەی A4'
                      : 'شێوازی عەلوە و بازرگانی - چاپ لەسەر قەبارەی A6 پانی'}
                  </span>
                </div>
              </div>

              {/* Invoice Format & Print Preview Mode Tabs */}
              <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setInvoiceStyle('wholesale')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceStyle === 'wholesale'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-200 hover:text-white hover:bg-slate-700/50'
                  }`}
                  title="پسووڵەی بازرگانی و عەلوە (A6 Landscape)"
                >
                  <Apple className="w-3.5 h-3.5" />
                  <span>عەلوە (A6)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceStyle('corporate')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceStyle === 'corporate'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-200 hover:text-white hover:bg-slate-700/50'
                  }`}
                  title="پسووڵەی فەرمی کۆمپانیا (A4 Portrait)"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">کۆمپانیا (A4)</span>
                  <span className="sm:hidden">A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceStyle('thermal')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    invoiceStyle === 'thermal'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/50'
                      : 'text-amber-300 hover:text-amber-200 hover:bg-amber-500/20'
                  }`}
                  title="پێشبینینی چاپی گەرمی بۆ پرینتەری پسووڵەی 80mm/58mm"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>چاپی گەرمی (POS)</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white text-xs font-bold transition-all border border-slate-600/80 cursor-pointer active:scale-95 shrink-0 shadow-xs"
                title="داخستنی پسووڵە"
              >
                <X className="w-4 h-4 text-slate-200" />
                <span className="hidden sm:inline">داخستن</span>
              </button>
            </div>

            {/* Bottom Row: Context-Adaptive Action Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              {/* Primary Actions: Print & PDF */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className={`flex items-center gap-1.5 text-white px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer active:scale-95 ${
                    invoiceStyle === 'thermal'
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {invoiceStyle === 'thermal'
                      ? `چاپکردنی گەرمی (${thermalWidth})`
                      : `چاپکردن ${splitPages.length > 1 ? `(${splitPages.length} لاپەڕە)` : `(${paperSize} ${paperSize === 'A6' ? 'پانی' : ''})`}`}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isExportingPDF}
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                  title="داگرتنی پسووڵە بە فایلی PDF"
                >
                  {isExportingPDF ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-200" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  <span>PDF {invoiceStyle === 'thermal' ? `(${thermalWidth})` : ''}</span>
                </button>

                <button
                  type="button"
                  disabled={isExportingPDF}
                  onClick={handleSharePDF}
                  className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                  title="ناردنی پسووڵە بە فایلی PDF"
                >
                  {isExportingPDF ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-200" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">ناردن</span>
                </button>

                {/* Split Receipt Button (Only in Wholesale Mode) */}
                {invoiceStyle === 'wholesale' && (
                  <button
                    type="button"
                    onClick={() => setIsSplitControlOpen(!isSplitControlOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border shadow-xs cursor-pointer active:scale-95 ${
                      isSplitEnabled && splitPages.length > 1
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 ring-2 ring-amber-400/50'
                        : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                    }`}
                    title="دابەشکردنی کاڵاکانی پسووڵە بۆ چەند لاپەڕەیەک"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>دابەشکردن {isSplitEnabled && splitPages.length > 1 ? `(${splitPages.length} بەش)` : ''}</span>
                  </button>
                )}
              </div>

              {/* Secondary Controls: Adaptive based on mode */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {invoiceStyle === 'thermal' ? (
                  /* Thermal-specific controls: Width & Zoom */
                  <>
                    <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex items-center text-[11px] sm:text-xs">
                      <button
                        type="button"
                        onClick={() => setThermalWidth('80mm')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          thermalWidth === '80mm'
                            ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                            : 'text-slate-200 hover:text-white hover:bg-slate-700/60'
                        }`}
                        title="قەبارەی ستاندارد 80mm POS"
                      >
                        80mm ستاندارد
                      </button>
                      <button
                        type="button"
                        onClick={() => setThermalWidth('58mm')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          thermalWidth === '58mm'
                            ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                            : 'text-slate-200 hover:text-white hover:bg-slate-700/60'
                        }`}
                        title="قەبارەی بچووک 58mm POS"
                      >
                        58mm بچووک
                      </button>
                    </div>

                    {/* Zoom Level Controls */}
                    <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex items-center text-xs">
                      <button
                        type="button"
                        onClick={() => setThermalZoom(prev => Math.max(0.75, Number((prev - 0.15).toFixed(2))))}
                        className="px-1.5 py-1 text-slate-200 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                        title="بچووککردنەوە"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setThermalZoom(1)}
                        className="px-2 py-1 text-[10.5px] font-mono font-bold text-amber-300 hover:text-white"
                        title="گەڕاندنەوە بۆ %100"
                      >
                        {Math.round(thermalZoom * 100)}%
                      </button>
                      <button
                        type="button"
                        onClick={() => setThermalZoom(prev => Math.min(1.4, Number((prev + 0.15).toFixed(2))))}
                        className="px-1.5 py-1 text-slate-200 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                        title="گەورەکردن"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  /* Standard Paper Size Selector for Wholesale / Corporate */
                  <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex items-center text-[11px] sm:text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setPaperSize('A6');
                        setOrientation('landscape');
                      }}
                      className={`px-2 py-1 rounded-lg font-bold transition-all ${
                        paperSize === 'A6'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-200 hover:text-white hover:bg-slate-700/60'
                      }`}
                      title="A6 پانی (148×105mm)"
                    >
                      A6
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaperSize('A5');
                        setOrientation('landscape');
                      }}
                      className={`px-2 py-1 rounded-lg font-bold transition-all ${
                        paperSize === 'A5'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-200 hover:text-white hover:bg-slate-700/60'
                      }`}
                      title="A5 پانی (210×148mm)"
                    >
                      A5
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaperSize('A4');
                        setOrientation('portrait');
                      }}
                      className={`px-2 py-1 rounded-lg font-bold transition-all ${
                        paperSize === 'A4'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-200 hover:text-white hover:bg-slate-700/60'
                      }`}
                      title="A4 فەرمی (210×297mm)"
                    >
                      A4
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsQuickSettingsOpen(!isQuickSettingsOpen)}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border shadow-xs cursor-pointer active:scale-95 ${
                    isQuickSettingsOpen
                      ? 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-400/50'
                      : 'bg-indigo-950/70 text-indigo-200 hover:bg-indigo-900 hover:text-white border-indigo-800/60'
                  }`}
                  title="سێتینگی فرۆشگا"
                >
                  <Settings className="w-3.5 h-3.5 text-indigo-300" />
                  <span className="hidden sm:inline">سێتینگ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeletePassword('');
                    setDeleteError('');
                    setShowPassword(false);
                    setIsDeleting(true);
                  }}
                  className="flex items-center gap-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/50 px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-colors cursor-pointer"
                  title="سڕینەوەی پسووڵە"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                  <span className="hidden md:inline">سڕینەوە</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Invoice Settings Dropdown (No Print) */}
          {isQuickSettingsOpen && (
            <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 border-b-2 border-indigo-600 text-white no-print shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <span>سێتینگ و ڕێکخستنی زانیارییەکانی فرۆشگا لە پسووڵەدا</span>
                      {settingsSavedSuccess && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> پاشەکەوت کرا
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      هەر گۆڕانکارییەک بکەیت ڕاستەوخۆ لەسەر شاشە و لە کاتی چاپی پسووڵەکەدا جێبەجێ دەبێت
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickSettingsOpen(false)}
                  className="text-slate-600 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveQuickSettings} className="space-y-3.5 text-xs">
                {/* هەڵبژاردنی لۆگۆ لە پەنجەرەی پسووڵە */}
                <div className="p-3 bg-slate-900/95 border border-slate-700/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-600 flex items-center justify-center p-1 overflow-hidden shrink-0">
                      {activeLogoUrl ? (
                        <img src={activeLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>لۆگۆ و وێنەی پسووڵە:</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {activeLogoUrl ? 'وێنەی لۆگۆ هەڵبژێردراوە' : 'هیچ وێنەیەک دانەنراوە'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={quickLogoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleQuickLogoFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => quickLogoInputRef.current?.click()}
                      disabled={isUploadingQuickLogo}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingQuickLogo ? 'لە بارکردندایە...' : activeLogoUrl ? 'گۆڕینی لۆگۆ' : 'هەڵبژاردنی لۆگۆ'}</span>
                    </button>
                    {activeLogoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveQuickLogo}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 transition-colors border border-slate-700 cursor-pointer"
                        title="سڕینەوەی لۆگۆ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-200 font-bold mb-1">
                      ناوی فرۆشگا / مەڵبەندی بازاڕکردن:
                    </label>
                    <input
                      type="text"
                      value={quickStoreName}
                      onChange={(e) => handleFieldChange('storeName', e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 text-white font-bold text-sm placeholder:text-slate-400 shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-200 font-bold mb-1">
                      ژمارەی مەکتەب / نووسینگە:
                    </label>
                    <input
                      type="text"
                      value={quickOfficeNumber}
                      onChange={(e) => handleFieldChange('officeNumber', e.target.value)}
                      placeholder="مەکتەبی ژمارە ( ٤٩ )"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 text-white font-bold text-sm placeholder:text-slate-400 shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-amber-300 font-extrabold mb-1">
                      سەردێڕی بەڕێوەبردن (وەک: بەسەرپەرشتی):
                    </label>
                    <input
                      type="text"
                      value={quickManagementLabel}
                      onChange={(e) => handleFieldChange('managementLabel', e.target.value)}
                      placeholder="بەسەرپەرشتی"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-amber-500/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 text-amber-300 font-extrabold text-sm placeholder:text-amber-500/40 shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-amber-300 font-extrabold mb-1">
                      ناوی بەڕێوەبەران (خاوەنکارەکان):
                    </label>
                    <input
                      type="text"
                      value={quickManagers}
                      onChange={(e) => handleFieldChange('managerNames', e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-amber-500/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 text-amber-300 font-extrabold text-sm placeholder:text-amber-500/40 shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-200 font-bold mb-1">
                      وەسفی بازرگانی:
                    </label>
                    <input
                      type="text"
                      value={quickSubtitle}
                      onChange={(e) => handleFieldChange('marketSubtitle', e.target.value)}
                      placeholder="بۆ بازرگانی میوە و سەوزە و وشکەبار بە کۆمەڵ"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 text-white font-bold text-sm placeholder:text-slate-400 shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-200 font-bold mb-1">
                      ژمارەی تەلەفۆنی سەرەکی (یەکەم):
                    </label>
                    <input
                      type="text"
                      value={quickPhone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 text-white font-mono font-bold text-sm placeholder:text-slate-400 shadow-inner"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-amber-300 font-extrabold mb-1">
                      خاوەنی ژمارەی سەرەکی (کەسی ۱):
                    </label>
                    <input
                      type="text"
                      value={quickPhoneOwner1}
                      onChange={(e) => handleFieldChange('phoneOwner1', e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-amber-500/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 text-amber-300 font-extrabold text-sm placeholder:text-amber-500/40 shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-200 font-bold mb-1">
                      ژمارەی تەلەفۆنی دووەم:
                    </label>
                    <input
                      type="text"
                      value={quickPhone2}
                      onChange={(e) => handleFieldChange('phone2', e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 text-white font-mono font-bold text-sm placeholder:text-slate-400 shadow-inner"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-amber-300 font-extrabold mb-1">
                      خاوەنی ژمارەی دووەم (کەسی ۲):
                    </label>
                    <input
                      type="text"
                      value={quickPhoneOwner2}
                      onChange={(e) => handleFieldChange('phoneOwner2', e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-amber-500/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 text-amber-300 font-extrabold text-sm placeholder:text-amber-500/40 shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-200 font-bold mb-1">
                      ناوی ژمێریار / بێژەر:
                    </label>
                    <input
                      type="text"
                      value={cashierName}
                      onChange={(e) => handleCashierNameChange(e.target.value)}
                      placeholder={cashierName || 'ژمێریار'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 text-white font-bold text-sm placeholder:text-slate-400 shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-200 font-bold mb-1">
                      ناونیشانی فرۆشگا / کۆگا:
                    </label>
                    <input
                      type="text"
                      value={quickAddress}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      placeholder="عەلوەی سەوزە و میوە"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 text-white font-bold text-sm placeholder:text-slate-400 shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-700/80">
                  <span className="text-[11px] text-slate-300 font-medium">
                    💡 زانیارییەکان لە داتابەیس پاشەکەوت دەکرێن و بۆ هەموو پسووڵەکانی داهاتووش جێگیر دەمێننەوە.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsQuickSettingsOpen(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-600 bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      داخستنی سێتینگ
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>پاشەکەوتکردن لە تەواوی سیستم</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Split Receipt Control Drawer (No Print) */}
          {isSplitControlOpen && (
            <div className="p-3.5 sm:p-4 bg-gradient-to-b from-amber-950/90 via-slate-900 to-slate-900 border-b-2 border-amber-500 text-white no-print shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                      <span>دابەشکردنی پسووڵە بۆ چەند لاپەڕەیەک (Split Receipt)</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                        {sale.items.length} کاڵا = {splitPages.length} پسووڵە
                      </span>
                    </h3>
                    <p className="text-[10.5px] sm:text-[11px] text-slate-900">
                      کاتێک ژمارەی کاڵاکان زۆر دەبێت، پسووڵەکە دابەش دەکرێت بۆ چەند لاپەڕەیەکی A6 بۆ چاپی ڕوون و بێ کێشە
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSplitControlOpen(false)}
                  className="text-slate-600 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* 1. Toggle Split Status */}
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold text-slate-200 block">دۆخی دابەشکردن</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSplitEnabled(true)}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-black transition-all ${
                        isSplitEnabled
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-slate-700 text-slate-200 hover:text-white'
                      }`}
                    >
                      چالاکە ({splitPages.length} لاپەڕە)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSplitEnabled(false)}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all ${
                        !isSplitEnabled
                          ? 'bg-slate-600 text-white shadow-xs'
                          : 'bg-slate-700/60 text-slate-300 hover:text-white'
                      }`}
                    >
                      یەک پسووڵە
                    </button>
                  </div>
                </div>

                {/* 2. Items per page */}
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold text-slate-200 block">ژمارەی کاڵا لە هەر پسووڵەیەکدا</span>
                  <div className="flex items-center gap-1.5">
                    {[3, 4, 5, 6].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          setItemsPerPage(count);
                          setIsSplitEnabled(true);
                        }}
                        className={`flex-1 py-1 px-1 rounded-lg font-mono font-black text-xs transition-all ${
                          itemsPerPage === count && isSplitEnabled
                            ? 'bg-amber-500 text-slate-950 font-black ring-1 ring-amber-400'
                            : 'bg-slate-700 text-slate-200 hover:text-white'
                        }`}
                      >
                        {count} کاڵا
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Screen View Mode */}
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold text-slate-200 block">شێوازی پیشاندان لەسەر شاشە</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAllSplitPages(true)}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all ${
                        showAllSplitPages
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-700 text-slate-200 hover:text-white'
                      }`}
                    >
                      هەموو لاپەڕەکان بەیەکەوە
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAllSplitPages(false)}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all ${
                        !showAllSplitPages
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-700 text-slate-200 hover:text-white'
                      }`}
                    >
                      لاپەڕە بە لاپەڕە
                    </button>
                  </div>
                </div>
              </div>

              {/* Page Navigator if single page view on screen */}
              {!showAllSplitPages && isSplitEnabled && splitPages.length > 1 && (
                <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={activePageIndex === 0}
                    onClick={() => setActivePageIndex(Math.max(0, activePageIndex - 1))}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs font-bold transition-all text-slate-200 hover:text-white"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>لاپەڕەی پێشوو</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {splitPages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePageIndex(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                          activePageIndex === idx
                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                            : 'bg-slate-700 text-slate-200 hover:text-white'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={activePageIndex === splitPages.length - 1}
                    onClick={() => setActivePageIndex(Math.min(splitPages.length - 1, activePageIndex + 1))}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs font-bold transition-all"
                  >
                    <span>لاپەڕەی دواتر</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Smart recommendation banner when many items exist and drawer is closed */}
          {sale.items.length > 4 && !isSplitControlOpen && !isSplitEnabled && (
            <div className="px-3 sm:px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-200 no-print">
              <div className="flex items-center gap-2 min-w-0">
                <Scissors className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold truncate">
                  ئەم پسووڵەیە {sale.items.length} کاڵای تێدایە! دەتوانیت دابەشی بکەیت بۆ {Math.ceil(sale.items.length / 4)} پسووڵەی A6 بۆ چاپی جوان و فراوان.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSplitEnabled(true);
                  setIsSplitControlOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 transition-all cursor-pointer"
              >
                دابەشکردنی پسووڵە
              </button>
            </div>
          )}

          {/* Printable Area - Calibrated for A6 Landscape */}
          <div
            className="p-1.5 sm:p-5 bg-slate-950/60 backdrop-blur-md flex-1 overflow-y-auto flex flex-col items-center justify-start print:p-0 print:m-0 print:bg-white print:overflow-visible w-full gap-4 print:gap-0"
            id="printable-invoice"
          >
            {invoiceStyle === 'wholesale' ? (
              /* ==========================================================
                 1. WHOLESALE FRUIT & VEGETABLE MARKET STYLE - A6 LANDSCAPE
                 ========================================================== */
              splitPages
                .filter((_, idx) => showAllSplitPages || !isSplitEnabled || idx === activePageIndex)
                .map((page, pIdx) => {
                  const isMulti = isSplitEnabled && splitPages.length > 1;
                  const pageId = `printable-invoice-page-${page.pageIndex}`;

                  return (
                    <div
                      key={page.pageIndex}
                      id={pageId}
                      className="printable-split-sheet bg-white print:bg-white text-slate-950 p-2.5 sm:p-4 border-2 border-slate-950 shadow-md w-full max-w-[680px] mx-auto rounded-none print:rounded-none print:shadow-none print:border-black font-sans a6-landscape-sheet box-border relative"
                    >


                      {/* On-screen Page Badge Indicator */}
                      {isMulti && (
                        <div className="no-print absolute -top-3 left-4 bg-amber-500 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-md border border-amber-600 flex items-center gap-1 z-10">
                          <Scissors className="w-3 h-3" />
                          <span>پسووڵەی {page.pageNumber} لە {page.totalPages}</span>
                        </div>
                      )}

                      {/* Top Header Row - High Fidelity Structured Receipt Header */}
                      <div className="receipt-header flex items-center justify-between gap-2 sm:gap-3 pb-1.5 sm:pb-2 border-b-2 border-slate-950">
                        {/* Left: Traditional Agricultural / Wholesale Emblem Logo */}
                        {thermalShowLogo && (
                          <div className="w-12 sm:w-16 shrink-0 flex flex-col items-center justify-center text-center">
                            {activeLogoUrl ? (
                              <img
                                src={activeLogoUrl}
                                alt="Logo"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                              />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-slate-950 bg-white flex flex-col items-center justify-center p-0.5 shadow-2xs text-slate-900">
                                <Apple className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700 stroke-[2.2]" />
                                <span className="text-[5.5px] sm:text-[6.5px] font-black uppercase tracking-tighter text-slate-900 line-clamp-1 max-w-full px-0.5">
                                  {(quickStoreName || settings.storeName) || 'کۆگا و بازرگانی'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Center: Management, Owners & Contact Phone Numbers */}
                        <div className="flex-1 text-center space-y-0.5 px-0.5 sm:px-1 min-w-0">
                          {/* سەردێری بەڕێوەبردن و ناوی بەڕێوەبەران / خاوەنەکان */}
                          {(quickManagementLabel || quickManagers) && (
                            <div className="owners-info flex flex-col items-center justify-center text-slate-900 leading-tight">
                              {quickManagementLabel && (
                                <span className="management-title text-[8.5px] sm:text-[9.5px] font-bold text-slate-900">
                                  {quickManagementLabel}
                                </span>
                              )}
                              {quickManagers && (
                                <span className="text-[9.5px] sm:text-xs font-black text-slate-950">
                                  {quickManagers}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Both Phone numbers with their respective owners */}
                          <div className="flex items-center justify-center gap-1.5 sm:gap-3 flex-wrap text-slate-950 pt-0.5" dir="rtl">
                            {quickPhone ? (
                              <div className="flex items-center gap-0.5 sm:gap-1 font-bold text-[10px] sm:text-[13px] leading-tight">
                                {quickPhoneOwner1 ? (
                                  <span className="text-slate-950 font-black text-[9.5px] sm:text-xs">
                                    {quickPhoneOwner1}:
                                  </span>
                                ) : null}
                                <span className="font-black font-mono text-slate-950" dir="ltr">
                                  {quickPhone}
                                </span>
                              </div>
                            ) : null}

                            {quickPhone && quickPhone2 ? (
                              <span className="text-slate-600 font-bold text-[10px] sm:text-xs">|</span>
                            ) : null}

                            {quickPhone2 ? (
                              <div className="flex items-center gap-0.5 sm:gap-1 font-bold text-[10px] sm:text-[13px] leading-tight">
                                {quickPhoneOwner2 ? (
                                  <span className="text-slate-950 font-black text-[9.5px] sm:text-xs">
                                    {quickPhoneOwner2}:
                                  </span>
                                ) : null}
                                <span className="font-black font-mono text-slate-950" dir="ltr">
                                  {quickPhone2}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Store Details Column: ناوی فرۆشگا، ژمارەی مەکتەب و وەسفی بازرگانی */}
                        <div className="store-details text-right space-y-0.5 shrink-0 max-w-[42%] min-w-0">
                          {(quickStoreName || settings.storeName) && (
                            <h2 className="shop-name text-xs sm:text-base font-black text-slate-950 tracking-tight leading-none block whitespace-nowrap">
                              {quickStoreName || settings.storeName}
                            </h2>
                          )}
                          {quickOfficeNumber && (
                            <span className="text-[10px] sm:text-xs font-black text-slate-900 leading-none block whitespace-nowrap">
                              {quickOfficeNumber}
                            </span>
                          )}
                          {quickSubtitle && (
                            <p className="commercial-description text-[7.5px] sm:text-[9.5px] font-bold text-slate-900 leading-tight whitespace-nowrap">
                              {quickSubtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Sub-Header: Date Box & Invoice Number Box */}
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-3 my-1.5 sm:my-2 text-xs sm:text-sm font-bold">
                        {/* Right (in RTL): ژمارەی پسووڵە */}
                        <div className="border border-slate-950 rounded-none flex items-stretch bg-white shadow-2xs min-w-0">
                          <div className="bg-slate-200/90 font-black px-1.5 sm:px-3 py-1 border-l border-slate-950 flex items-center justify-center shrink-0 min-w-[70px] sm:min-w-[110px] text-[9.5px] sm:text-xs text-slate-900 leading-tight">
                            ژمارەی پسووڵە
                          </div>
                          <div className="px-1.5 sm:px-3 py-1 font-mono font-black text-xs sm:text-base text-slate-950 flex items-center justify-center flex-1 min-w-0 leading-tight gap-1.5" dir="ltr">
                            <span>{displayInvoiceNumber}</span>
                            {isMulti && (
                              <span className="text-[10px] sm:text-xs font-sans font-black px-1.5 py-0.2 rounded bg-slate-200 text-slate-900 border border-slate-400">
                                ({page.pageNumber}/{page.totalPages})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Left (in RTL): بەروار */}
                        <div className="border border-slate-950 rounded-none flex items-stretch bg-white shadow-2xs min-w-0">
                          <div className="bg-slate-200/90 font-black px-1.5 sm:px-3 py-1 border-l border-slate-950 flex items-center justify-center shrink-0 min-w-[50px] sm:min-w-[85px] text-[9.5px] sm:text-xs text-slate-900 leading-tight">
                            بەروار
                          </div>
                          <div className="px-1.5 sm:px-3 py-1 font-mono font-bold text-[10px] sm:text-sm text-slate-950 flex items-center justify-center flex-1 min-w-0 leading-tight" dir="ltr">
                            {formatDateOnly(sale.date)}
                          </div>
                        </div>
                        </div>

                      {/* Main Wholesale Grid Table */}
                      <div className="border-2 border-slate-950 bg-white shadow-2xs w-full flex flex-col">
                        {/* Header */}
                        <div className="grid grid-cols-[8%_15%_15%_14%_14%_34%] bg-slate-200/90 text-slate-950 font-black text-center border-b-2 border-slate-950 min-w-0">
                          <div className="py-1.5 px-0.5 sm:px-1 border-l border-slate-950 flex items-center justify-center text-[8.5px] min-[380px]:text-[9px] sm:text-xs leading-tight min-w-0">کۆد</div>
                          <div className="py-1.5 px-0.5 sm:px-1 border-l border-slate-950 flex items-center justify-center text-[8.5px] min-[380px]:text-[9px] sm:text-xs leading-tight min-w-0">جۆری کاڵا</div>
                          <div className="py-1.5 px-0.5 border-l border-slate-950 flex items-center justify-center text-[8.5px] min-[380px]:text-[9px] sm:text-xs leading-tight min-w-0">دانە</div>
                          <div className="py-1.5 px-0.5 sm:px-1 border-l border-slate-950 flex items-center justify-center text-[8.5px] min-[380px]:text-[9px] sm:text-xs leading-tight min-w-0">نرخ</div>
                          <div className="py-1.5 px-0.5 sm:px-1 border-l border-slate-950 flex items-center justify-center text-[8.5px] min-[380px]:text-[9px] sm:text-xs leading-tight min-w-0">کێش</div>
                          <div className="py-1.5 px-0.5 sm:px-1 flex items-center justify-center text-[8.5px] min-[380px]:text-[9px] sm:text-xs leading-tight min-w-0">پارە</div>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col">
                          {page.items.map((item, idx) => {
                            const countVal =
                              item.count ??
                              (item.unit === 'دانە' || item.unit === 'سندووق' || item.unit === 'کارتۆن'
                                ? item.quantity
                                : Math.max(1, Math.round(item.quantity / 15)));

                            const weightVal = item.weight ?? item.quantity;
                            const itemCodeOrBarcode = getItemBarcode(item);

                            return (
                              <div
                                key={idx}
                                className="grid grid-cols-[8%_15%_15%_14%_14%_34%] font-bold text-slate-950 hover:bg-slate-50 transition-colors border-b border-slate-950 last:border-b-0"
                              >
                                <div className="py-1 sm:py-1.5 px-0.5 sm:px-1 flex flex-wrap items-center justify-center text-center font-mono font-black border-l border-slate-950 text-[8.5px] sm:text-[10px] md:text-xs min-w-0 break-words" dir="ltr">
                                  <span className="leading-tight break-all text-slate-900 w-full">{itemCodeOrBarcode}</span>
                                </div>

                                <div className="py-1 sm:py-1.5 px-0.5 sm:px-1 flex flex-wrap items-center justify-center text-center font-black border-l border-slate-950 text-[9px] sm:text-[10px] md:text-xs min-w-0 break-words">
                                  <span className="leading-tight break-words w-full">{item.productName}</span>
                                </div>

                                <div className="py-1 sm:py-1.5 px-0.5 flex flex-wrap items-center justify-center text-center font-mono font-black border-l border-slate-950 text-[8.5px] sm:text-[10px] md:text-xs min-w-0 break-words">
                                  <span className="leading-tight w-full">{formatNumber(countVal)}</span>
                                </div>

                                <div className="py-1 sm:py-1.5 px-0.5 sm:px-1 flex flex-wrap items-center justify-center text-center font-mono font-bold border-l border-slate-950 text-[8.5px] sm:text-[10px] md:text-xs min-w-0 break-words">
                                  <span className="leading-tight w-full">{formatNumber(item.sellingPrice)}</span>
                                </div>

                                <div className="py-1 sm:py-1.5 px-0.5 sm:px-1 flex flex-wrap items-center justify-center text-center font-mono font-black text-slate-900 border-l border-slate-950 text-[8.5px] sm:text-[10px] md:text-xs min-w-0 break-words">
                                  <span className="leading-tight w-full">{formatNumber(weightVal)}</span>
                                </div>

                                <div className="py-1 sm:py-1.5 px-0.5 sm:px-1 flex flex-wrap items-center justify-center text-center font-mono font-black text-slate-950 text-[9px] sm:text-[10px] md:text-xs min-w-0 break-words">
                                  <span className="leading-tight w-full">{formatNumber(item.total)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Bottom Section - Clean 2-Row Spacious Contained Alignment */}
                      <div className="mt-1 sm:mt-1.5 space-y-1 sm:space-y-1.5 w-full text-xs">
                        {/* Row 1: Customer Name (Right) & Grand Total (Left) */}
                        <div className="grid grid-cols-2 gap-1 sm:gap-2 font-bold w-full">
                          {/* Right in RTL: Customer Name */}
                          <div className="border border-slate-950 rounded-none flex items-stretch bg-white shadow-2xs min-w-0">
                            <div className="bg-slate-200/90 font-black px-1 py-1 border-l border-slate-950 flex items-center justify-center shrink-0 min-w-[36px] sm:min-w-[48px] text-[9.5px] sm:text-[11px] text-slate-900 leading-tight">
                              کڕیار
                            </div>
                            <div
                              className={`px-1 py-0.5 font-black text-slate-950 flex items-center justify-center flex-1 min-w-0 text-center leading-tight break-words ${
                                (sale.customerName || '').length > 25
                                  ? 'text-[8.5px] min-[380px]:text-[9.5px] sm:text-[11px]'
                                  : (sale.customerName || '').length > 15
                                  ? 'text-[9.5px] min-[380px]:text-[10.5px] sm:text-xs'
                                  : 'text-[11px] min-[380px]:text-xs sm:text-sm'
                              }`}
                            >
                              {sale.customerName}
                            </div>
                          </div>

                          {/* Left in RTL: Grand Total Amount */}
                          <div className="border border-slate-950 rounded-none flex items-stretch bg-white shadow-2xs min-w-0">
                            <div className="bg-slate-200/90 font-black px-1.5 sm:px-2 py-1 border-l border-slate-950 flex items-center justify-center shrink-0 min-w-[70px] sm:min-w-[95px] text-[10px] sm:text-xs text-slate-950 leading-tight">
                              {isMulti ? `کۆی گشتی (${page.pageNumber}/${page.totalPages})` : 'کۆی گشتی'}
                            </div>
                            <div className="px-1.5 sm:px-2 py-1 font-mono font-black text-xs min-[380px]:text-sm sm:text-base text-slate-950 flex items-center justify-center flex-1 min-w-0 leading-tight tracking-tight truncate" dir="ltr">
                              {formatNumber(sale.total)}
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Accountant / Cashier (Right) & Mamala (Left) */}
                        <div className="grid grid-cols-2 gap-1 sm:gap-2 font-bold w-full">
                          {/* Right in RTL: Accountant / Cashier Name */}
                          <div className="border border-slate-950 rounded-none flex items-stretch bg-white shadow-2xs min-w-0">
                            <div className="bg-slate-200/90 font-black px-1 sm:px-1.5 py-1 border-l border-slate-950 flex items-center justify-center shrink-0 min-w-[45px] sm:min-w-[60px] text-[9.5px] sm:text-[11px] text-slate-900 leading-tight">
                              ژمێریار
                            </div>
                            <div className="px-1 sm:px-1.5 py-1 font-black text-[10px] sm:text-xs text-slate-950 flex items-center justify-center flex-1 min-w-0 text-center leading-tight truncate">
                              {cashierName?.trim() || sale.sellerName?.trim() || 'ژمێریار'}
                            </div>
                          </div>

                          {/* Left in RTL: Mamala / Transaction Type */}
                          <div className="border border-slate-950 rounded-none flex items-stretch bg-white shadow-2xs min-w-0">
                            <div className="bg-slate-200/90 font-black px-1.5 sm:px-2 py-1 border-l border-slate-950 flex items-center justify-center shrink-0 min-w-[55px] sm:min-w-[80px] text-[10px] sm:text-xs text-slate-900 leading-tight">
                              مامەڵە
                            </div>
                            <div className="px-1.5 sm:px-2 py-1 font-black text-xs sm:text-sm text-slate-950 flex items-center justify-center flex-1 min-w-0 text-center leading-tight truncate">
                              {(() => {
                                if (sale.paymentType === 'debt' || sale.debtAmount >= sale.total || sale.paidAmount === 0) {
                                  return <span className="font-black text-rose-700">قەرز</span>;
                                } else if (sale.paymentType === 'cash' || sale.paidAmount >= sale.total) {
                                  return <span className="font-black text-emerald-700">پارە دراوە</span>;
                                } else {
                                  return (
                                    <span className="font-mono font-black" dir="ltr">
                                      {formatNumber(sale.paidAmount)}
                                    </span>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Row 3: Current Total Debt (Full Width) */}
                        <div className="grid grid-cols-1 font-bold w-full">
                          <div className="border border-slate-950 rounded-none flex items-stretch bg-white shadow-2xs min-w-0">
                            <div className="bg-slate-200/90 font-black px-1.5 sm:px-2.5 py-1 border-l border-slate-950 flex items-center justify-center shrink-0 min-w-[70px] sm:min-w-[95px] text-[10px] sm:text-xs text-slate-900 leading-tight">
                              کۆی قەرز
                            </div>
                            <div className="px-1.5 sm:px-2.5 py-1 font-mono font-black text-xs min-[380px]:text-sm sm:text-base text-slate-950 flex items-center justify-center flex-1 min-w-0 leading-tight tracking-tight truncate" dir="ltr">
                              {formatNumber(finalTotalDebt)}
                            </div>
                          </div>
                        </div>

                        {/* Footer Note: Debt Return Period */}
                        <div className="text-center pt-1 border-t border-slate-950/40 text-[10px] sm:text-[11px] font-black text-slate-950">
                          ماوەی هێنانەوەی قەرز تەنها ٧ ڕۆژە
                        </div>
                      </div>
                    </div>
                  );
                })
            ) : invoiceStyle === 'corporate' ? (
              /* ==========================================================
                 2. CORPORATE INVOICE STYLE (FORMAL COMPANY A4 LAYOUT)
                 ========================================================== */
              <div className="border-2 border-slate-800 rounded-2xl p-4 sm:p-6 bg-white print:border-black print:p-2 print:rounded-none space-y-4 max-w-3xl w-full">
                {/* Top Corporate Header Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b-2 border-slate-800">
                  <div className="space-y-1 text-right">
                    <div className="flex items-center gap-2.5">
                      {thermalShowLogo && (
                        activeLogoUrl ? (
                          <img
                            src={activeLogoUrl}
                            alt="Logo"
                            className="w-12 h-12 object-contain rounded-xl border border-slate-200 p-0.5 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-xs border border-slate-800 shrink-0">
                            <Building2 className="w-5 h-5 text-emerald-400" />
                          </div>
                        )
                      )}
                      <div>
                        {(quickStoreName !== undefined ? quickStoreName : settings.storeName) ? (
                          <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                            {quickStoreName !== undefined ? quickStoreName : settings.storeName}
                          </h1>
                        ) : null}
                        {quickSubtitle && (
                          <p className="text-[11px] font-bold text-slate-600">
                            {quickSubtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 font-medium">
                      {quickAddress && (
                        <p className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-900 shrink-0" />
                          <span>{quickAddress}</span>
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 text-slate-900 pt-0.5">
                        {quickPhone && (
                          <div className="flex items-center gap-1 font-mono" dir="ltr">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span className="font-bold text-slate-900">{quickPhone}</span>
                            {quickPhoneOwner1 && (
                              <span className="font-sans font-bold text-slate-900 text-[11px]" dir="rtl">
                                ({quickPhoneOwner1})
                              </span>
                            )}
                          </div>
                        )}
                        {quickPhone2 && (
                          <div className="flex items-center gap-1 font-mono" dir="ltr">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span className="font-bold text-slate-900">{quickPhone2}</span>
                            {quickPhoneOwner2 && (
                              <span className="font-sans font-bold text-slate-900 text-[11px]" dir="rtl">
                                ({quickPhoneOwner2})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Left: Invoice Reference Badge */}
                  <div className="w-full sm:w-auto text-left flex flex-col items-start sm:items-end space-y-1.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                    <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-center shadow-xs">
                      <span className="text-[9px] tracking-widest text-slate-600 font-mono uppercase block">
                        SALES INVOICE
                      </span>
                      <span className="text-xs font-black text-emerald-400 block mt-0.5">
                        فاکتۆری فرۆشتن
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-right w-full sm:w-52 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-xs font-black text-slate-900" dir="ltr">
                          {displayInvoiceNumber}
                        </span>
                        <span className="text-slate-900 font-bold text-[10.5px]">ژمارەی پسووڵە:</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-200 pt-0.5">
                        <span className="font-mono text-slate-900 text-[10.5px]" dir="ltr">
                          {formatDate(sale.date)}
                        </span>
                        <span className="text-slate-900 text-[10.5px]">بەروار:</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-300">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-900">کڕیاری بەڕێز:</span>
                      <span className="font-black text-slate-900">{sale.customerName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-900">ژمارەی مۆبایل:</span>
                      <span className="font-mono font-bold text-slate-900" dir="ltr">
                        {customer?.phone || sale.customerPhone || 'دیارینەکراوە'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 md:border-r md:border-slate-200 md:pr-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-900">جۆری مامەڵە:</span>
                      <span className="font-bold text-slate-900">
                        {sale.debtAmount > 0 && sale.paidAmount === 0 ? 'قەرز' : sale.paidAmount > 0 && sale.debtAmount > 0 ? 'قیست' : 'کاش'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-900">ژمێریار:</span>
                      <span className="font-bold text-slate-900">{cashierName}</span>
                    </div>
                  </div>
                </div>

                {/* Items Grid Table */}
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs flex flex-col">
                  {/* Header */}
                  <div className="grid grid-cols-[6%_22%_8%_14%_18%_32%] bg-slate-900 text-white font-bold">
                    <div className="py-2 px-1 sm:px-2 flex items-center justify-center border-l border-slate-800 text-[10px] sm:text-xs min-w-0">#</div>
                    <div className="py-2 px-1 sm:px-2 flex items-center justify-start border-l border-slate-800 text-[10px] sm:text-xs min-w-0">ناوی کاڵا</div>
                    <div className="py-2 px-1 sm:px-2 flex items-center justify-center border-l border-slate-800 text-[10px] sm:text-xs min-w-0">یەکە</div>
                    <div className="py-2 px-1 sm:px-2 flex items-center justify-center border-l border-slate-800 text-[10px] sm:text-xs min-w-0 text-center">بڕ / کێش</div>
                    <div className="py-2 px-1.5 sm:px-2 flex items-center justify-start border-l border-slate-800 text-[10px] sm:text-xs min-w-0">نرخ</div>
                    <div className="py-2 px-1.5 sm:px-2 flex items-center justify-start text-[10px] sm:text-xs min-w-0">پارە</div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-col">
                    {sale.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`grid grid-cols-[6%_22%_8%_14%_18%_32%] border-b border-slate-200 last:border-b-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
                      >
                        <div className="py-2 px-1.5 sm:px-2 flex items-center justify-center font-mono text-slate-900 border-l border-slate-200 text-[10px] sm:text-xs min-w-0">
                          <span className="break-all">{idx + 1}</span>
                        </div>
                        <div className="py-2 px-1.5 sm:px-2.5 flex flex-wrap items-center justify-start font-bold text-slate-900 border-l border-slate-200 text-[10px] sm:text-xs min-w-0">
                          <span className="break-words w-full leading-tight">{item.productName}</span>
                          {item.cropOwner && (
                            <span className="text-[9px] sm:text-[10px] text-slate-900 font-normal w-full mt-0.5">
                              ({item.cropOwner})
                            </span>
                          )}
                        </div>
                        <div className="py-2 px-1.5 sm:px-2 flex flex-wrap items-center justify-center text-center text-slate-600 border-l border-slate-200 text-[10px] sm:text-xs min-w-0">
                          <span className="break-words w-full">{item.unit || 'دانە'}</span>
                        </div>
                        <div className="py-2 px-1.5 sm:px-2 flex flex-wrap items-center justify-center text-center font-mono font-bold text-slate-900 border-l border-slate-200 text-[10px] sm:text-xs min-w-0">
                          <span className="break-words w-full">{item.quantity}</span>
                        </div>
                        <div className="py-2 px-1.5 sm:px-2.5 flex flex-wrap items-center justify-start font-mono text-slate-900 border-l border-slate-200 text-[10px] sm:text-xs min-w-0">
                          <span className="break-words w-full">{formatCurrency(item.sellingPrice, settings.currency, settings.usdToIqdRate)}</span>
                        </div>
                        <div className="py-2 px-1.5 sm:px-2.5 flex flex-wrap items-center justify-start font-mono font-black text-slate-950 text-[10px] sm:text-xs min-w-0">
                          <span className="break-words w-full">{formatCurrency(item.total, settings.currency, settings.usdToIqdRate)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-1">
                    <span className="text-slate-900 text-[10.5px] font-bold block">
                      تەفقیتی ژمێریاری (بە ژمارە و وشە):
                    </span>
                    <p className="font-bold text-slate-900 text-xs flex flex-col items-start gap-1.5">
                      <span className="font-mono font-black text-emerald-800" dir="ltr">
                        {formatNumber(sale.total)} {settings.currency === 'USD' ? '$' : 'د.ع'}
                      </span>
                      <span>{numberToKurdishWords(sale.total, settings.currency)}</span>
                    </p>
                  </div>

                  <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 space-y-1.5">
                    <div className="flex justify-between items-center font-black text-sm text-slate-950 pb-1 border-b border-slate-200">
                      <span>کۆی پوخت:</span>
                      <span className="font-mono text-emerald-700">
                        {formatCurrency(sale.total, settings.currency, settings.usdToIqdRate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-900">
                      <span>دراو بە کاش:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatCurrency(sale.paidAmount, settings.currency, settings.usdToIqdRate)}
                      </span>
                    </div>
                    {sale.debtAmount > 0 && (
                      <div className="flex justify-between items-center text-amber-800 font-bold">
                        <span>ماوەی ئەم پسووڵەیە:</span>
                        <span className="font-mono">
                          {formatCurrency(sale.debtAmount, settings.currency, settings.usdToIqdRate)}
                        </span>
                      </div>
                    )}
                    {previousDebt > 0 && (
                      <div className="flex justify-between items-center text-rose-800 font-black pt-1 border-t border-slate-200">
                        <span>کۆی گشتی حیساب لەگەڵ پێشوو:</span>
                        <span className="font-mono text-sm">
                          {formatCurrency(finalTotalDebt, settings.currency, settings.usdToIqdRate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Note: Debt Return Period */}
                <div className="text-center pt-2.5 border-t border-slate-300 text-xs font-black text-slate-900">
                  ماوەی هێنانەوەی قەرز تەنها ٧ ڕۆژە
                </div>
              </div>
            ) : (
              /* ==========================================================
                 3. THERMAL RECEIPT PRINT PREVIEW (80mm / 58mm POS PRINTERS)
                 ========================================================== */
              <div className="w-full flex flex-col items-center">
                {/* Real-time Toggle Options Toolbar (No-Print) */}
                <div className="no-print w-full max-w-xl mb-3 p-2.5 bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-2 text-xs text-white">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>هەڵبژاردەکانی پێشبینین:</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !thermalShowLogo;
                        setThermalShowLogo(next);
                        saveReceiptLogoSettings(activeLogoUrl, next);
                      }}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        thermalShowLogo
                          ? 'bg-emerald-600/90 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-200 border-slate-600 hover:text-white hover:bg-slate-700'
                      }`}
                      title="دیاریکردنی لۆگۆی کۆمپانیا لە سەرەوە"
                    >
                      {thermalShowLogo ? '✓ ' : ''}لۆگۆ
                    </button>

                    <button
                      type="button"
                      onClick={() => setThermalShowBarcode(!thermalShowBarcode)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        thermalShowBarcode
                          ? 'bg-emerald-600/90 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-200 border-slate-600 hover:text-white hover:bg-slate-700'
                      }`}
                      title="دیاریکردنی کۆدی پسووڵە"
                    >
                      {thermalShowBarcode ? '✓ ' : ''}کۆد
                    </button>

                    <button
                      type="button"
                      onClick={() => setThermalShowPreviousDebt(!thermalShowPreviousDebt)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        thermalShowPreviousDebt
                          ? 'bg-emerald-600/90 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-200 border-slate-600 hover:text-white hover:bg-slate-700'
                      }`}
                      title="دیاریکردنی قەرزی پێشوو لە خوارەوە"
                    >
                      {thermalShowPreviousDebt ? '✓ ' : ''}قەرزی پێشوو
                    </button>

                    <button
                      type="button"
                      onClick={() => setThermalShowCustomerInfo(!thermalShowCustomerInfo)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        thermalShowCustomerInfo
                          ? 'bg-emerald-600/90 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-200 border-slate-600 hover:text-white hover:bg-slate-700'
                      }`}
                      title="دیاریکردنی زانیاری و ناوی کڕیار"
                    >
                      {thermalShowCustomerInfo ? '✓ ' : ''}کڕیار
                    </button>

                    <button
                      type="button"
                      onClick={() => setThermalShowCashier(!thermalShowCashier)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        thermalShowCashier
                          ? 'bg-emerald-600/90 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-200 border-slate-600 hover:text-white hover:bg-slate-700'
                      }`}
                      title="دیاریکردنی ناوی ژمێریار / بێژەر"
                    >
                      {thermalShowCashier ? '✓ ' : ''}ژمێریار
                    </button>
                  </div>
                </div>

                {/* Print Preview Container with Zoom scaling and Thermal paper aesthetics */}
                <div
                  className="w-full flex justify-center items-start transition-all"
                  style={{
                    transform: `scale(${thermalZoom})`,
                    transformOrigin: 'top center',
                    marginBottom: thermalZoom > 1 ? `${(thermalZoom - 1) * 350}px` : undefined,
                  }}
                >
                  <div
                    id="thermal-receipt-printable"
                    className="bg-white rounded-md shadow-xl border border-slate-300 print:shadow-none print:border-none print:m-0"
                  >
                    <ThermalReceipt
                      sale={sale}
                      settings={settings}
                      paperWidth={thermalWidth}
                      showLogo={thermalShowLogo}
                      customLogoUrl={activeLogoUrl}
                      showBarcode={thermalShowBarcode}
                      showPreviousDebt={thermalShowPreviousDebt}
                      showCustomerInfo={thermalShowCustomerInfo}
                      showCashier={thermalShowCashier}
                      cashierName={cashierName}
                      displayInvoiceNumber={displayInvoiceNumber}
                      getItemBarcode={getItemBarcode}
                      customer={customer}
                      previousDebt={previousDebt}
                      finalTotalDebt={finalTotalDebt}
                      customStoreName={quickStoreName}
                      customOfficeNumber={quickOfficeNumber}
                      customManagementLabel={quickManagementLabel}
                      customManagers={quickManagers}
                      customPhone={quickPhone}
                      customPhoneOwner1={quickPhoneOwner1}
                      customPhone2={quickPhone2}
                      customPhoneOwner2={quickPhoneOwner2}
                      customAddress={quickAddress}
                      customSubtitle={quickSubtitle}
                      customInvoiceFooter={quickInvoiceFooter}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Invoice Security Passcode Modal */}
      {isDeleting && (
        <div className="fixed inset-0 z-[160] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">سڕینەوەی پسووڵەی #{displayInvoiceNumber}</h3>
                  <p className="text-xs text-slate-900">پێویستە ژمارەی نهێنی سڕینەوە بنووسیت</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleting(false)}
                className="text-slate-600 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-4">
              <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 text-xs text-rose-900 space-y-2">
                <p className="font-bold text-rose-800">
                  ⚠️ ئاگاداری: سڕینەوەی ئەم پسووڵەیە فرۆشەکە هەڵدەوەشێنێتەوە و بڕی کاڵاکان بۆ کۆگا دەگەڕێنێتەوە.
                </p>
                <p className="text-[11px] text-emerald-800 font-bold bg-emerald-100/70 p-2 rounded-xl border border-emerald-200">
                  🛡️ تێبینی: قەرزی کڕیاران بۆ هەمیشە دەمێنێتەوە و بە سڕینەوەی پسووڵە قەرزەکان ناسڕدرێنەوە (دەستکاریکردن و پاکتاوکردن تەنها لە بەشی قەرز دەبێت).
                </p>
                <p className="text-[11px] text-rose-800 font-medium">
                  تکایە ژمارەی نهێنی بنووسە بۆ پشتڕاستکردنەوە:
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                  ژمارەی نهێنی (Password):
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    required
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      setDeleteError('');
                    }}
                    placeholder="ژمارەی نهێنی بنووسە..."
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm font-mono text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {deleteError && (
                  <p className="text-xs font-bold text-rose-600 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{deleteError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleting(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors flex-1"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 flex-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>پشکنین و سڕینەوە</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {isEditing && (
        <EditSaleModal
          sale={sale}
          onClose={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false);
            if (forceSaveToDisk) forceSaveToDisk();
          }}
        />
      )}
    </>
  );
};
