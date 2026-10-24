import React from 'react';
import {
  Apple,
  Phone,
  MapPin,
  Calendar,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Store,
  Barcode as BarcodeIcon,
} from 'lucide-react';
import { Sale, SaleItem, AppSettings, Customer } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { getInvoiceDirectUrl } from '../utils/qrUtils';
import {
  formatCurrency,
  formatNumber,
  formatDateOnly,
  formatTimeOnly,
  numberToKurdishWords,
} from '../utils/formatters';

export interface ThermalReceiptProps {
  sale: Sale;
  settings: AppSettings;
  paperWidth?: '80mm' | '58mm';
  showLogo?: boolean;
  customLogoUrl?: string;
  showBarcode?: boolean;
  showQRCode?: boolean;
  showPreviousDebt?: boolean;
  showCustomerInfo?: boolean;
  showCashier?: boolean;
  cashierName?: string;
  displayInvoiceNumber?: string;
  getItemBarcode?: (item: SaleItem) => string;
  customer?: Customer;
  previousDebt?: number;
  finalTotalDebt?: number;
  customStoreName?: string;
  customOfficeNumber?: string;
  customManagementLabel?: string;
  customManagers?: string;
  customPhone?: string;
  customPhoneOwner1?: string;
  customPhone2?: string;
  customPhoneOwner2?: string;
  customAddress?: string;
  customSubtitle?: string;
  customInvoiceFooter?: string;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  sale,
  settings,
  paperWidth = '80mm',
  showLogo = true,
  customLogoUrl,
  showBarcode = true,
  showQRCode = true,
  showPreviousDebt = true,
  showCustomerInfo = true,
  showCashier = true,
  cashierName = '',
  displayInvoiceNumber,
  getItemBarcode,
  customer,
  previousDebt = 0,
  finalTotalDebt = 0,
  customStoreName,
  customOfficeNumber,
  customManagementLabel,
  customManagers,
  customPhone,
  customPhoneOwner1,
  customPhone2,
  customPhoneOwner2,
  customAddress,
  customSubtitle,
  customInvoiceFooter,
}) => {
  const activeLogoUrl = customLogoUrl || settings.receiptLogoUrl || (typeof window !== 'undefined' ? localStorage.getItem('kurd_receipt_logo_url') : '') || '';

  const storeName = customStoreName !== undefined ? customStoreName : (settings.storeName !== undefined ? settings.storeName : '');
  const officeNumber = (customOfficeNumber && customOfficeNumber.trim() !== '') ? customOfficeNumber : (settings.officeNumber && settings.officeNumber.trim() !== '' ? settings.officeNumber : 'مەکتەبی ژمارە ( ٤٩ )');
  const managementLabel = (customManagementLabel && customManagementLabel.trim() !== '') ? customManagementLabel : (settings.managementLabel && settings.managementLabel.trim() !== '' ? settings.managementLabel : 'بەسەرپەرشتی');
  const cleanVal = (val?: string, forbidden: string[] = []) => {
    if (!val || val.trim() === '') return '';
    for (const f of forbidden) {
      if (val.includes(f)) return '';
    }
    return val;
  };

  const managerNames = cleanVal((customManagers && customManagers.trim() !== '') ? customManagers : settings.managerNames, ['سلام العامري', 'عباس كاظم']);
  const phone1 = cleanVal((customPhone && customPhone.trim() !== '') ? customPhone : settings.phone, ['07829219207']);
  const phoneOwner1 = cleanVal((customPhoneOwner1 && customPhoneOwner1.trim() !== '') ? customPhoneOwner1 : settings.phoneOwner1, ['سلام العامري']);
  const phone2 = cleanVal((customPhone2 && customPhone2.trim() !== '') ? customPhone2 : settings.phone2, ['0770 987 6543']);
  const phoneOwner2 = cleanVal((customPhoneOwner2 && customPhoneOwner2.trim() !== '') ? customPhoneOwner2 : settings.phoneOwner2, ['عباس كاظم']);
  const address = (customAddress && customAddress.trim() !== '') ? customAddress : (settings.address && settings.address.trim() !== '' ? settings.address : 'عەلوەی سەوزە و میوە - سلێمانی');
  const subtitle = (customSubtitle && customSubtitle.trim() !== '') ? customSubtitle : (settings.marketSubtitle && settings.marketSubtitle.trim() !== '' ? settings.marketSubtitle : 'بۆ بازرگانی میوە و سەوزە و وشکەبار بە کۆمەڵ');
  const footerMessage = (customInvoiceFooter && customInvoiceFooter.trim() !== '') ? customInvoiceFooter : (settings.invoiceFooterMessage && settings.invoiceFooterMessage.trim() !== '' ? settings.invoiceFooterMessage : 'سوپاس بۆ سەردانەکەتان، کاڵای فرۆشراو بە مەرجی هێنانەوەی پسووڵە دەگۆڕدرێتەوە');

  const invoiceNum = displayInvoiceNumber || sale.invoiceNumber || 'GJA-1';
  const is58mm = paperWidth === '58mm';
  const totalQuantity = sale.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalWeight = sale.items?.reduce((sum, item) => sum + (item.weight ?? item.quantity), 0) || 0;
  const totalCount = sale.items?.reduce((sum, item) => sum + (item.count ?? (item.unit === 'دانە' ? item.quantity : 1)), 0) || 0;

  // Barcode generator simulation
  const generateBarcodeLines = (seedStr: string) => {
    const chars = seedStr.replace(/[^a-zA-Z0-9]/g, '') || 'INV1001';
    const lines = [];
    for (let i = 0; i < 40; i++) {
      const charCode = chars.charCodeAt(i % chars.length) || 65;
      const isThick = (charCode + i * 3) % 3 === 0;
      const isThin = (charCode + i * 7) % 2 === 0;
      lines.push(
        <div
          key={i}
          className={`bg-black h-8 inline-block ${
            isThick ? 'w-[2.5px] mx-[0.5px]' : isThin ? 'w-[1.2px] mx-[0.5px]' : 'w-[1.8px] mx-[0.5px]'
          }`}
        />
      );
    }
    return lines;
  };

  return (
    <div
      id="thermal-receipt-printable"
      className={`thermal-receipt-root bg-white text-black font-sans select-text print:p-0 print:m-0 print:border-none print:shadow-none ${
        is58mm ? 'w-[58mm] max-w-[58mm] text-[10px] p-2' : 'w-[80mm] max-w-[80mm] text-[11.5px] p-3'
      } mx-auto shadow-lg border border-slate-300 relative leading-tight`}
      style={{ boxSizing: 'border-box' }}
      dir="rtl"
    >
      {/* =========================================================================
          1. HEADER & LOGO SECTION (Centered & High-Contrast for Thermal Heads)
          ========================================================================= */}
      <div className="text-center space-y-1 pb-2 border-b-2 border-dashed border-black">
        {/* Centered Emblem Logo */}
        {showLogo && (
          <div className="flex items-center justify-center mb-1">
            {activeLogoUrl ? (
              <img
                src={activeLogoUrl}
                alt="Logo"
                className={`object-contain ${is58mm ? 'max-h-12' : 'max-h-16'}`}
              />
            ) : (
              <div
                className={`rounded-full border-2 border-black flex flex-col items-center justify-center p-1 bg-white text-black ${
                  is58mm ? 'w-10 h-10' : 'w-13 h-13'
                }`}
              >
                <Apple className={`${is58mm ? 'w-5 h-5' : 'w-6 h-6'} text-black stroke-[2.4]`} />
                <span className="text-[5.5px] font-black uppercase tracking-tighter line-clamp-1 max-w-full px-0.5">
                  {storeName || 'کۆگا'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Store Name */}
        {storeName && (
          <h1 className={`font-black tracking-tight text-black break-words ${is58mm ? 'text-sm' : 'text-base'}`}>
            {storeName}
          </h1>
        )}

        {/* Office Number & Subtitle */}
        {officeNumber && (
          <p className="font-extrabold text-[10.5px] text-black leading-tight break-words">
            {officeNumber}
          </p>
        )}
        {subtitle && (
          <p className="text-[9.5px] font-semibold text-black leading-tight break-words">
            {subtitle}
          </p>
        )}

        {/* Management & Names */}
        {(managementLabel || managerNames) && (
          <div className="pt-0.5 pb-0.5 text-black">
            {managementLabel && (
              <span className="text-[9px] font-bold block text-black">
                {managementLabel}
              </span>
            )}
            {managerNames && (
              <p className="font-black text-[11px] text-black break-words leading-tight">
                {managerNames}
              </p>
            )}
          </div>
        )}

        {/* Contact Numbers */}
        {(phone1 || phone2) && (
          <div className="pt-0.5 text-black space-y-0.5 text-[10px]" dir="rtl">
            {phone1 && (
              <div className="flex items-center justify-center gap-1 font-bold">
                {phoneOwner1 && <span className="font-black">{phoneOwner1}:</span>}
                <span className="font-mono font-black" dir="ltr">
                  {phone1}
                </span>
              </div>
            )}
            {phone2 && (
              <div className="flex items-center justify-center gap-1 font-bold">
                {phoneOwner2 && <span className="font-black">{phoneOwner2}:</span>}
                <span className="font-mono font-black" dir="ltr">
                  {phone2}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Store Address */}
        {address && (
          <p className="text-[9px] font-semibold text-black pt-0.5 break-words">
            📍 {address}
          </p>
        )}
      </div>

      {/* =========================================================================
          2. RECEIPT METADATA & INVOICE DETAILS
          ========================================================================= */}
      <div className="py-2 space-y-1 border-b border-dashed border-black text-[10.5px]">
        {/* Receipt Title Banner */}
        <div className="bg-black text-white text-center py-0.5 font-black text-[11px] uppercase tracking-wider rounded-xs">
          پسووڵەی فرۆشتن / RECEIPT
        </div>

        <div className="grid grid-cols-2 gap-1 pt-1 font-bold">
          {/* Invoice Number */}
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-extrabold text-black shrink-0">ژ. پسووڵە:</span>
            <span className="font-mono font-black text-black truncate" dir="ltr">
              #{invoiceNum}
            </span>
          </div>

          {/* Payment Type */}
          <div className="flex items-center justify-end gap-1 min-w-0">
            <span className="font-extrabold text-black shrink-0">جۆر:</span>
            <span className="font-black text-black border border-black px-1 rounded-xs text-[9.5px]">
              {sale.debtAmount > 0 && sale.paidAmount === 0
                ? 'قەرز (Debt)'
                : sale.paidAmount > 0 && sale.debtAmount > 0
                ? 'قیست / بەشێک'
                : 'کاش (Cash)'}
            </span>
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <span className="font-sans font-bold text-black">بەروار:</span>
            <span className="font-bold text-black" dir="ltr">{formatDateOnly(sale.date)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-sans font-bold text-black">کات:</span>
            <span className="font-bold text-black" dir="ltr">{formatTimeOnly(sale.date)}</span>
          </div>
        </div>

        {/* Customer Information */}
        {showCustomerInfo && (
          <div className="border-t border-dotted border-black/60 pt-1 space-y-0.5">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-black shrink-0">کڕیاری بەڕێز:</span>
              <span className="font-black text-black truncate">{sale.customerName || 'کڕیاری گشتی'}</span>
            </div>
            {(customer?.phone || sale.customerPhone) && (
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <span className="font-semibold text-black shrink-0">مۆبایل:</span>
                <span className="font-mono font-bold text-black" dir="ltr">
                  {customer?.phone || sale.customerPhone}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Cashier / Recorder */}
        {showCashier && (
          <div className="flex items-center justify-between gap-1 text-[10px] border-t border-dotted border-black/60 pt-0.5">
            <span className="font-bold text-black">ژمێریار / تۆمارکەر:</span>
            <span className="font-black text-black">
              {cashierName?.trim() || sale.sellerName?.trim() || 'سیستەم'}
            </span>
          </div>
        )}
      </div>

      {/* =========================================================================
          3. LINE ITEMS TABLE (Aligned for 80mm & 58mm Thermal Printers)
          ========================================================================= */}
      <div className="py-2 border-b-2 border-dashed border-black">
        {/* Table Header */}
        <div className="flex items-center justify-between text-[10px] font-black pb-1 border-b border-black text-black">
          <div className="w-[44%] text-right">کاڵا</div>
          <div className="w-[18%] text-center">العدد/کێش</div>
          <div className="w-[18%] text-center">نرخ</div>
          <div className="w-[20%] text-left font-mono" dir="ltr">کۆ</div>
        </div>

        {/* Items List */}
        <div className="divide-y divide-dotted divide-black/50 py-0.5">
          {sale.items.map((item, idx) => {
            const countVal =
              item.count ??
              (item.unit === 'دانە' || item.unit === 'سندووق' || item.unit === 'کارتۆن'
                ? item.quantity
                : Math.max(1, Math.round(item.quantity / 15)));
            const weightVal = item.weight ?? item.quantity;
            const itemCode = getItemBarcode ? getItemBarcode(item) : (item.barcode || '');

            return (
              <div key={idx} className="py-1 space-y-0.5 text-[10.5px]">
                {/* Row: Product Name & Totals */}
                <div className="flex items-start justify-between gap-1">
                  {/* Product Title & Info */}
                  <div className="w-[44%] text-right font-black break-words leading-tight">
                    <span>{item.productName}</span>
                    {item.cropOwner && (
                      <span className="block text-[8.5px] font-normal text-black">
                        ({item.cropOwner})
                      </span>
                    )}
                  </div>

                  {/* Quantity & Weight */}
                  <div className="w-[18%] text-center font-mono font-bold text-[10px]">
                    <div>{formatNumber(countVal)} <span className="font-sans text-[8px]">{item.unit || 'د'}</span></div>
                    {item.weight !== undefined && (
                      <div className="text-[8px] font-mono text-black">{formatNumber(weightVal)}کگم</div>
                    )}
                  </div>

                  {/* Unit Selling Price */}
                  <div className="w-[18%] text-center font-mono font-bold text-[10px]">
                    {formatNumber(item.sellingPrice)}
                  </div>

                  {/* Item Total */}
                  <div className="w-[20%] text-left font-mono font-black text-[10.5px]" dir="ltr">
                    {formatNumber(item.total)}
                  </div>
                </div>

                {/* Sub-item code if available */}
                {itemCode && itemCode !== '—' && (
                  <div className="text-[8px] font-mono text-black text-right" dir="ltr">
                    کۆد: {itemCode}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick summary of item count */}
        <div className="flex items-center justify-between pt-1 border-t border-black text-[9.5px] font-bold text-black">
          <span>کۆی ژمارەی کاڵاکان:</span>
          <span className="font-mono font-black">{sale.items.length} جۆر ({formatNumber(totalQuantity)} بڕ)</span>
        </div>
      </div>

      {/* =========================================================================
          4. TOTALS & SUMMARY SECTION (Pixel-Perfect Alignment Before Printing)
          ========================================================================= */}
      <div className="py-2 space-y-1.5 border-b-2 border-dashed border-black">
        {/* Subtotal if discount exists */}
        {sale.discount > 0 && (
          <>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>کۆی سەرەتایی (Subtotal):</span>
              <span className="font-mono font-black" dir="ltr">
                {formatNumber(sale.subtotal || sale.total + sale.discount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>داشکاندن (Discount):</span>
              <span className="font-mono font-black" dir="ltr">
                -{formatNumber(sale.discount)}
              </span>
            </div>
          </>
        )}

        {/* GRAND TOTAL INVOICE BOX (High-contrast prominent thermal box) */}
        <div className="border-2 border-black p-1.5 bg-white text-black rounded-xs">
          <div className="flex items-center justify-between font-black">
            <span className={`${is58mm ? 'text-xs' : 'text-sm'}`}>کۆی گشتی پسووڵە:</span>
            <div className="text-left font-mono font-black" dir="ltr">
              <span className={`${is58mm ? 'text-sm' : 'text-base'}`}>
                {formatNumber(sale.total)}
              </span>
              <span className="text-[9px] font-sans font-black mr-1"> {settings.currency === 'USD' ? '$' : 'د.ع'}</span>
            </div>
          </div>
        </div>

        {/* Amount Paid & Remaining on Current Invoice */}
        <div className="space-y-1 pt-0.5 text-[10.5px]">
          <div className="flex items-center justify-between font-bold">
            <span>بڕی پارەی دراو (Paid):</span>
            <span className="font-mono font-black" dir="ltr">
              {formatNumber(sale.paidAmount)}
            </span>
          </div>

          {sale.debtAmount > 0 && (
            <div className="flex items-center justify-between font-bold">
              <span>ماوەی ئەم پسووڵەیە (Due):</span>
              <span className="font-mono font-black" dir="ltr">
                {formatNumber(sale.debtAmount)}
              </span>
            </div>
          )}

          {/* Previous Customer Debt */}
          {showPreviousDebt && previousDebt > 0 && (
            <div className="flex items-center justify-between font-bold border-t border-dotted border-black pt-1">
              <span>قەرزی پێشوو (Old Debt):</span>
              <span className="font-mono font-black" dir="ltr">
                {formatNumber(previousDebt)}
              </span>
            </div>
          )}

          {/* FINAL TOTAL DEBT (Prominent for accounting clarity) */}
          {showPreviousDebt && finalTotalDebt > 0 && (
            <div className="bg-black text-white p-1 rounded-xs flex items-center justify-between font-black mt-1">
              <span className="text-[10.5px]">کۆی گشتی قەرز (Total Debt):</span>
              <span className="font-mono text-xs" dir="ltr">
                {formatNumber(finalTotalDebt)} {settings.currency === 'USD' ? '$' : 'د.ع'}
              </span>
            </div>
          )}
        </div>

        {/* Kurdish Words & Numbers Spelled Out (تەفقیت بە ژمارە و نووسین) */}
        <div className="border-t border-dotted border-black pt-1 text-[9.5px] font-bold text-center flex flex-wrap items-center justify-center gap-1">
          <span className="font-extrabold text-black">تەفقیت:</span>
          <span className="font-mono font-black text-black" dir="ltr">
            {formatNumber(sale.total)} {settings.currency === 'USD' ? '$' : 'د.ع'}
          </span>
          <span className="font-black text-black">
            {numberToKurdishWords(sale.total, settings.currency)}
          </span>
        </div>
      </div>

      {/* =========================================================================
          5. FOOTER, BARCODE, CUT LINE & POLICIES
          ========================================================================= */}
      <div className="pt-2 text-center space-y-1.5">
        {/* Scannable Barcode Simulation */}
        {showBarcode && (
          <div className="flex flex-col items-center justify-center pt-1">
            <div className="flex items-center justify-center overflow-hidden">
              {generateBarcodeLines(invoiceNum)}
            </div>
            <span className="font-mono font-black text-[9px] tracking-widest mt-0.5" dir="ltr">
              *{invoiceNum}*
            </span>
          </div>
        )}

        {/* Scannable Invoice QR Code */}
        {showQRCode && (
          <div className="flex flex-col items-center justify-center pt-1.5 pb-0.5">
            <div className="bg-white p-1 rounded-xs border border-black/20 shadow-2xs">
              <QRCodeSVG
                value={getInvoiceDirectUrl(sale.id, invoiceNum)}
                size={is58mm ? 70 : 82}
                level="M"
                includeMargin={false}
              />
            </div>
            <span className="font-mono font-bold text-[8.5px] mt-0.5 text-black" dir="ltr">
              QR پسووڵە #{invoiceNum}
            </span>
          </div>
        )}

        {/* Return & Policy Notice */}
        {footerMessage && (
          <p className="text-[9px] font-bold text-black leading-tight px-1 break-words">
            {footerMessage}
          </p>
        )}

        {/* Debt Return Period Notice */}
        <p className="text-[9.5px] font-black text-black text-center pt-1 border-t border-dashed border-black">
          ماوەی هێنانەوەی قەرز تەنها ٧ ڕۆژە
        </p>

        {/* Tear Off / Cut Line Indicator */}
        <div className="pt-1 flex items-center justify-center gap-1 text-[8.5px] font-mono text-black/80">
          <span>- - - - - - - -</span>
          <Scissors className="w-3 h-3 inline stroke-[2]" />
          <span>- - - - - - - -</span>
        </div>

        <p className="text-[7.5px] font-mono text-black">
          GJA POS SYSTEM • {formatDateOnly(sale.date)}
        </p>
      </div>
    </div>
  );
};
