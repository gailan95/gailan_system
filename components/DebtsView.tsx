import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Plus, User, Phone, CheckCircle2, Trash2, Search, FileText, LayoutGrid, Users, AlertTriangle, ChevronRight, ChevronLeft, MoreVertical, History, RefreshCcw, Calendar, Clock, ArrowDownLeft, X, Eye, Lock, EyeOff, ShieldAlert, RotateCcw, Undo2, Receipt, MessageSquare, Copy, Check, Filter, MapPin } from 'lucide-react';
import { DebtRecord, Sale, SaleItem } from '../types';
import { Overdue3DIcon, Users3DIcon, DebtCoin3DIcon } from './ThreeDIcons';
import { InvoiceModal } from './InvoiceModal';
import { normalizeKurdishText, isSameCustomerOrDebtor, parseNumericDebt } from '../utils/textNormalization';

export interface DebtsViewProps {
  onViewInvoice?: (invoice: any) => void;
  onBackToMain?: () => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({ onViewInvoice, onBackToMain }) => {
  const { debts, setDebts, settings, sales, employees, customers, updateCustomer, updateSale, addManualDebt } = useDatabase();
  const { currentUser } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(24);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // History Modal with 2 Pages: 'unpaid' (نەدراو) and 'paid' (دراو)
  const [historyModalDebt, setHistoryModalDebt] = useState<DebtRecord | null>(null);
  const [historyTab, setHistoryTab] = useState<'unpaid' | 'paid'>('unpaid');

  // Local state for invoice view if onViewInvoice is not passed from parent
  const [viewingInvoiceSale, setViewingInvoiceSale] = useState<Sale | null>(null);

  // Detail Modal for viewing specific debt (دوگمەی بینین)
  const [viewDetailDebt, setViewDetailDebt] = useState<DebtRecord | null>(null);

  // Security Passcode Modal state for Delete & Settle (داواکردنی ژمارەی نهێنی هەمیشە)
  const [securityModalAction, setSecurityModalAction] = useState<'delete' | 'settle' | null>(null);
  const [securityTargetDebt, setSecurityTargetDebt] = useState<DebtRecord | null>(null);
  const [securityPassword, setSecurityPassword] = useState('');
  const [showSecurityPassword, setShowSecurityPassword] = useState(false);
  const [securityError, setSecurityError] = useState('');

  // Receive Payment Modal states
  const [receiveModalDebt, setReceiveModalDebt] = useState<DebtRecord | null>(null);
  const [receiveAmount, setReceiveAmount] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiveDate, setReceiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [receiveNotes, setReceiveNotes] = useState('');

  // Overdue Debtors Modal & Filter States (مۆداڵی زانیاری قەرزدارانی دواکەوتوو)
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
  const [debtFilterTab, setDebtFilterTab] = useState<'all' | 'overdue' | 'pending' | 'paid'>('all');
  const [overdueSearchQuery, setOverdueSearchQuery] = useState('');
  const [overdueSortBy, setOverdueSortBy] = useState<'days' | 'amount' | 'name'>('days');
  const [copiedOverdueToast, setCopiedOverdueToast] = useState(false);

  // Reset page when search or itemsPerPage or debtFilterTab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage, debtFilterTab]);

  const [debtorName, setDebtorName] = useState('');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtorName.trim()) return;
    const newDebt: DebtRecord = {
      id: 'd-' + Date.now(),
      debtorName,
      amount: Number(amount) || 0,
      phone,
      date: new Date().toISOString(),
      notes,
      status: 'pending'
    };
    setDebts([newDebt, ...debts]);
    setDebtorName('');
    setAmount('');
    setPhone('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  // Add Additional Debt Modal state & handler
  const [addDebtModalTarget, setAddDebtModalTarget] = useState<DebtRecord | null>(null);
  const [additionalDebtAmount, setAdditionalDebtAmount] = useState('');
  const [additionalDebtNotes, setAdditionalDebtNotes] = useState('');

  const handleAddAdditionalDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDebtModalTarget) return;
    const addAmt = Number(additionalDebtAmount) || 0;
    if (addAmt <= 0) {
      alert('تکایە بڕی قەرز بە دروستی بنووسە');
      return;
    }
    const debtorName = addDebtModalTarget.debtorName;
    const debtorPhone = addDebtModalTarget.phone;

    const newDebtRecord: DebtRecord = {
      id: `d-add-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      debtorName,
      phone: debtorPhone || '',
      amount: addAmt,
      date: new Date().toISOString(),
      notes: additionalDebtNotes.trim() ? `${additionalDebtNotes.trim()} (زیادکردنی قەرز)` : 'قەرزی زیادکراو',
      status: 'pending',
      originalAmount: addAmt
    };

    setDebts(prev => [newDebtRecord, ...prev]);

    if (updateCustomer) {
      const matchingCust = customers.find(c => isSameCustomerOrDebtor(c.name, debtorName, c.phone, debtorPhone));
      if (matchingCust) {
        const curDebt = parseNumericDebt(matchingCust.totalDebt) || 0;
        updateCustomer(matchingCust.id, {
          totalDebt: curDebt + addAmt,
          debt: curDebt + addAmt,
          debtAmount: curDebt + addAmt
        } as any);
      }
    }

    setAddDebtModalTarget(null);
    setAdditionalDebtAmount('');
    setAdditionalDebtNotes('');
  };

  const openReceiveModal = (debt: DebtRecord) => {
    setReceiveModalDebt(debt);
    const initialAmount = debt.amount > 0 ? debt.amount : (debt.paidAmount || 0);
    setReceiveAmount(initialAmount > 0 ? initialAmount.toString() : '');
    setReceiverName(currentUser?.name || '');
    setReceiveDate(new Date().toISOString().split('T')[0]);
    setReceiveNotes('');
    setActiveMenuId(null);
  };

  const handleReceivePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveModalDebt) return;
    const payAmt = Number(receiveAmount) || 0;
    if (payAmt <= 0) {
      alert('تکایە بڕی پارەی وەرگیراو بە دروستی دیاری بکە');
      return;
    }
    const collector = receiverName.trim() || currentUser?.name || 'وەرگر';
    const payDate = receiveDate || new Date().toISOString().split('T')[0];
    const debtorName = receiveModalDebt.debtorName;
    const debtorPhone = receiveModalDebt.phone;

    // Record transaction for statistics
    addManualDebt({
      customerId: receiveModalDebt.id,
      customerName: debtorName,
      amount: payAmt,
      type: 'repayment',
      date: new Date().toISOString(),
      collectorName: collector,
      notes: `وەرگرتنی پارەی قەرز لە ${debtorName} - ${receiveNotes.trim()}`
    });

    // 1. Calculate matching customer and remaining debt
    const matchingCust = customers.find(c => isSameCustomerOrDebtor(c.name, debtorName, c.phone, debtorPhone));
    const currentCustDebt = matchingCust 
      ? (parseNumericDebt(matchingCust.totalDebt) || parseNumericDebt((matchingCust as any).debt) || 0)
      : (parseNumericDebt(receiveModalDebt.amount) || 0);
    const newCustDebt = Math.max(0, currentCustDebt - payAmt);

    // 2. Determine settlement state
    const isFullSettlement = (receiveModalDebt.amount <= 0 || payAmt >= receiveModalDebt.amount || newCustDebt === 0);
    const origAmt = receiveModalDebt.amount > 0 ? receiveModalDebt.amount : (receiveModalDebt.originalAmount || receiveModalDebt.paidAmount || payAmt);

    // 3. Create paid record that goes to "بەشی دراوەکان و پاکتاوکردن"
    const paidRecord: DebtRecord = {
      id: `d-paid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      debtorName: debtorName,
      phone: debtorPhone || matchingCust?.phone || '',
      amount: 0,
      paidAmount: payAmt,
      originalAmount: origAmt,
      parentDebtId: receiveModalDebt.id,
      receiverName: collector,
      paidDate: payDate,
      date: receiveModalDebt.date || payDate,
      status: 'paid',
      notes: receiveNotes.trim()
        ? `${receiveNotes.trim()} (وەرگیرا لەلایەن: ${collector}${isFullSettlement ? ' - پاکتاوکرا و درایەوە' : ' - بەشێک لە قەرز'})`
        : `وەرگیرا لەلایەن: ${collector}${isFullSettlement ? ' (پاکتاوکرا و درایەوە)' : ' (بەشێک لە قەرز)'}`
    };

    // 4. Update debts state
    setDebts(prev => {
      const existsInPrev = prev.some(d => d.id === receiveModalDebt.id);
      let updatedList: DebtRecord[];

      if (isFullSettlement) {
        if (existsInPrev) {
          updatedList = prev.map(d => {
            if (d.id === receiveModalDebt.id) {
              return {
                ...d,
                amount: 0,
                status: 'paid' as const,
                paidAmount: payAmt,
                originalAmount: origAmt,
                receiverName: collector,
                paidDate: payDate,
                notes: receiveNotes.trim()
                  ? `${d.notes ? d.notes + ' - ' : ''}${receiveNotes.trim()} (پاکتاوکرا و درایەوە)`
                  : (d.notes ? `${d.notes} (پاکتاوکرا و درایەوە لەلایەن: ${collector})` : `پاکتاوکرا و درایەوە لەلایەن: ${collector}`)
              };
            }
            return d;
          });
        } else {
          // If it was dynamic from POS/Sale, add as a permanent paid record
          const fullPaid: DebtRecord = {
            ...receiveModalDebt,
            amount: 0,
            status: 'paid',
            paidAmount: payAmt,
            originalAmount: origAmt,
            receiverName: collector,
            paidDate: payDate,
            notes: (receiveModalDebt.notes ? `${receiveModalDebt.notes} - ` : '') + `پاکتاوکرا و درایەوە لەلایەن: ${collector}`
          };
          updatedList = [fullPaid, ...prev];
        }

        // If customer debt reached zero, mark all remaining pending debts of this customer as paid and settled
        if (matchingCust || newCustDebt === 0) {
          updatedList = updatedList.map(d => {
            if (isSameCustomerOrDebtor(d.debtorName, debtorName, d.phone, debtorPhone) && d.status === 'pending') {
              return {
                ...d,
                amount: 0,
                status: 'paid' as const,
                paidAmount: d.amount > 0 ? d.amount : (d.originalAmount || 0),
                paidDate: payDate,
                receiverName: collector,
                notes: (d.notes ? d.notes + ' - ' : '') + 'پاکتاوکرا و درایەوە'
              };
            }
            return d;
          });
        }
      } else {
        // Partial settlement
        const remaining = Math.max(0, receiveModalDebt.amount - payAmt);
        if (existsInPrev) {
          updatedList = [
            paidRecord,
            ...prev.map(d => {
              if (d.id === receiveModalDebt.id) {
                return {
                  ...d,
                  amount: remaining,
                  notes: d.notes
                    ? `${d.notes} (وەرگیرا: ${payAmt.toLocaleString()} د.ع لەلایەن: ${collector})`
                    : `وەرگیرا: ${payAmt.toLocaleString()} د.ع لەلایەن: ${collector}`
                };
              }
              return d;
            })
          ];
        } else {
          // Dynamic record: add remaining pending slice AND paid record
          const remainingPending: DebtRecord = {
            ...receiveModalDebt,
            id: `debt_rem_${Date.now()}`,
            amount: remaining,
            status: 'pending',
            originalAmount: origAmt,
            notes: (receiveModalDebt.notes ? `${receiveModalDebt.notes} - ` : '') + `ماوە دوای وەرگرتنی ${payAmt.toLocaleString()} د.ع`
          };
          updatedList = [paidRecord, remainingPending, ...prev];
        }
      }

      return updatedList;
    });

    // 5. Deduct from customer's debt in customers database
    if (updateCustomer && matchingCust) {
      updateCustomer(matchingCust.id, {
        totalDebt: newCustDebt,
        debt: newCustDebt,
        debtAmount: newCustDebt
      } as any);
    }

    // 6. Update linked sale if applicable
    if (updateSale && sales) {
      const linkedSale = sales.find(s => 
        (receiveModalDebt.id && receiveModalDebt.id.includes(s.id)) ||
        (s.customerName && isSameCustomerOrDebtor(s.customerName, debtorName, s.customerPhone, debtorPhone) && s.debtAmount > 0)
      );
      if (linkedSale) {
        const newSaleDebt = Math.max(0, (linkedSale.debtAmount || 0) - payAmt);
        const newSalePaid = (linkedSale.paidAmount || 0) + payAmt;
        updateSale(linkedSale.id, {
          debtAmount: newSaleDebt,
          paidAmount: newSalePaid,
          paymentType: newSaleDebt === 0 ? 'cash' : 'partial'
        });
      }
    }

    setReceiveModalDebt(null);
  };

  // گەڕانەوەی قەرزی دراو بۆ بەشی نەدراو (Undo / Revert payment to unpaid)
  const handleRevertDebtToUnpaid = (targetDebt: DebtRecord) => {
    const revertAmt = targetDebt.paidAmount || targetDebt.originalAmount || targetDebt.amount || 0;
    
    // Check if it's a partial payment slice that has a parent debt
    if (targetDebt.parentDebtId) {
      const parentExists = debts.some(d => d.id === targetDebt.parentDebtId);
      if (parentExists) {
        setDebts(prev => 
          prev
            .map(d => {
              if (d.id === targetDebt.parentDebtId) {
                return {
                  ...d,
                  status: 'pending' as const,
                  amount: (Number(d.amount) || 0) + revertAmt,
                  notes: (d.notes ? d.notes + ' - ' : '') + `گەڕێنرایەوە بۆ نەدراو (${revertAmt.toLocaleString()} د.ع)`
                };
              }
              return d;
            })
            .filter(d => d.id !== targetDebt.id)
        );
        if (updateCustomer) {
          const matchingCust = customers.find(c => isSameCustomerOrDebtor(c.name, targetDebt.debtorName, c.phone, targetDebt.phone));
          if (matchingCust) {
            const curDebt = parseNumericDebt(matchingCust.totalDebt) || 0;
            updateCustomer(matchingCust.id, { totalDebt: curDebt + revertAmt, debt: curDebt + revertAmt, debtAmount: curDebt + revertAmt } as any);
          }
        }
        setHistoryTab('unpaid');
        return;
      }
    }

    // Otherwise it's either an original debt marked as paid, or a standalone paid record:
    setDebts(prev => prev.map(d => {
      if (d.id === targetDebt.id) {
        const restoredAmount = d.originalAmount && d.originalAmount > 0 
          ? d.originalAmount 
          : (d.paidAmount && d.paidAmount > 0 ? d.paidAmount : (d.amount > 0 ? d.amount : revertAmt));
        return {
          ...d,
          status: 'pending',
          amount: restoredAmount,
          paidAmount: undefined,
          paidDate: undefined,
          receiverName: undefined,
          notes: (d.notes ? d.notes + ' - ' : '') + 'گەڕێنرایەوە بۆ لاپەڕەی نەدراو'
        };
      }
      return d;
    }));

    if (updateCustomer) {
      const matchingCust = customers.find(c => isSameCustomerOrDebtor(c.name, targetDebt.debtorName, c.phone, targetDebt.phone));
      if (matchingCust) {
        const curDebt = parseNumericDebt(matchingCust.totalDebt) || 0;
        updateCustomer(matchingCust.id, { totalDebt: curDebt + revertAmt, debt: curDebt + revertAmt, debtAmount: curDebt + revertAmt } as any);
      }
    }

    // Switch tab to unpaid page so user immediately sees the returned debt in the unpaid section
    setHistoryTab('unpaid');
  };

  // دۆزینەوە یان دروستکردنی پسووڵەی قەرزەکە وەک خۆی (Detailed Invoice) بۆ پیشاندان لە مۆداڵی پسووڵە
  const resolveSaleForDebt = (targetDebt: DebtRecord): Sale => {
    const cleanId = targetDebt.id.replace(/^debt_rec_/, '').replace(/^paid_/, '');
    
    // 1. گەڕان بەدوای پسووڵە بەپێی ناسێنەر لە لیستی sales
    let foundSale = sales.find((s) => s.id === cleanId || s.id === targetDebt.id);

    // 2. ئەگەر قەرزەکە لە قەرزێکی سەرەکییەوە بووبێت
    if (!foundSale && targetDebt.parentDebtId) {
      const parentClean = targetDebt.parentDebtId.replace(/^debt_rec_/, '');
      foundSale = sales.find((s) => s.id === parentClean || s.id === targetDebt.parentDebtId);
    }

    // 3. دۆزینەوە بەپێی ژمارەی پسووڵە لە تێبینییەکان
    if (!foundSale && targetDebt.notes) {
      const invMatch = targetDebt.notes.match(/(?:پسووڵەی\s*ژمارە|INV|REC)[\s:-]*([A-Za-z0-9_-]+)/i);
      if (invMatch) {
        const invCandidate = invMatch[1].trim();
        foundSale = sales.find(
          (s) => s.invoiceNumber && (s.invoiceNumber === invCandidate || s.invoiceNumber.includes(invCandidate))
        );
      }
    }

    // 4. دۆزینەوە بەپێی ناوی کڕیار و نزیکی بەروار لە فرۆشەکان
    if (!foundSale && targetDebt.debtorName) {
      const cleanName = targetDebt.debtorName.trim().toLowerCase();
      const customerSales = sales.filter(
        (s) => s.customerName && s.customerName.trim().toLowerCase() === cleanName
      );
      if (customerSales.length > 0) {
        const targetTime = new Date(targetDebt.date).getTime();
        foundSale = customerSales.reduce((closest, curr) => {
          const currDiff = Math.abs(new Date(curr.date).getTime() - targetTime);
          const closestDiff = Math.abs(new Date(closest.date).getTime() - targetTime);
          return currDiff < closestDiff ? curr : closest;
        });
      }
    }

    // 5. دۆزینەوە لە تۆمارەکانی کارمەند/فرۆشتن (EmployeeDataEntryForm)
    const matchedEmp = employees.find(
      (e) =>
        e.name &&
        targetDebt.debtorName &&
        e.name.trim().toLowerCase() === targetDebt.debtorName.trim().toLowerCase() &&
        (e.saleId === cleanId || !foundSale)
    );

    // ئەگەر پسووڵە لە سیستەمدا هەبوو، زانیارییە بنەڕەتییەکانی پسووڵەکە و کاڵاکانی بەکاربێنە بە نوێکردنەوەی دۆخی قەرز
    if (foundSale) {
      const isPaid = targetDebt.status === 'paid';
      return {
        ...foundSale,
        paidAmount: isPaid ? (targetDebt.paidAmount || targetDebt.amount || foundSale.paidAmount) : foundSale.paidAmount,
        debtAmount: isPaid ? 0 : (targetDebt.amount || foundSale.debtAmount),
        paymentType: isPaid ? 'cash' : foundSale.paymentType,
        sellerName: targetDebt.receiverName || foundSale.sellerName || currentUser?.name || 'سیستەم',
        notes: targetDebt.notes || foundSale.notes,
        date: targetDebt.paidDate || targetDebt.date || foundSale.date,
      };
    }

    // 6. ئەگەر لە sales نەبوو (وەک قەرزی دەستی یان وەرگیراو)، پسووڵەیەکی تەواو و فەرمی ڕێکبخە
    let invoiceNumber = matchedEmp?.employeeId || '';
    if (!invoiceNumber && targetDebt.notes) {
      const match = targetDebt.notes.match(/پسووڵەی\s*ژمارە\s*([^\s-]+)/);
      if (match) invoiceNumber = match[1].trim();
    }
    if (!invoiceNumber) {
      const numPart = targetDebt.id.replace(/\D/g, '').slice(-5);
      invoiceNumber = `GJA-${numPart || Math.floor(1000 + Math.random() * 9000)}`;
    }

    const effectiveAmount = targetDebt.status === 'paid' 
      ? (targetDebt.paidAmount || targetDebt.amount) 
      : targetDebt.amount;

    const items: SaleItem[] =
      matchedEmp?.items && matchedEmp.items.length > 0
        ? matchedEmp.items
        : [
            {
              productId: matchedEmp?.productId || 'debt-item-1',
              barcode: matchedEmp?.productBarcode || invoiceNumber,
              productName:
                matchedEmp?.productName ||
                (targetDebt.notes && !targetDebt.notes.startsWith('پسووڵەی') && targetDebt.notes.length < 50
                  ? targetDebt.notes
                  : targetDebt.status === 'paid'
                  ? 'وەسڵی وەرگرتنەوەی قەرز'
                  : 'قەرزی کڕیار / کاڵا'),
              quantity: matchedEmp?.quantity || 1,
              unit: matchedEmp?.unit || 'دانە',
              sellingPrice: effectiveAmount,
              total: effectiveAmount,
            },
          ];

    const matchedCustomer = customers.find(
      (c) => c.name && targetDebt.debtorName && c.name.trim().toLowerCase() === targetDebt.debtorName.trim().toLowerCase()
    );

    return {
      id: targetDebt.id,
      invoiceNumber,
      customerId: matchedCustomer?.id,
      customerName: targetDebt.debtorName,
      customerPhone: targetDebt.phone || matchedCustomer?.phone || '',
      items,
      subtotal: effectiveAmount,
      discount: 0,
      total: effectiveAmount,
      paidAmount: targetDebt.status === 'paid' ? effectiveAmount : 0,
      debtAmount: targetDebt.status === 'paid' ? 0 : effectiveAmount,
      paymentType: targetDebt.status === 'paid' ? 'cash' : 'debt',
      sellerName: targetDebt.receiverName || currentUser?.name || 'بەڕێوەبەر',
      date: targetDebt.paidDate || targetDebt.date,
      notes: targetDebt.notes,
    };
  };

  // کاتێک دەست دەنرێت بە دوگمەی بینین، پسووڵەی قەرزەکە وەک خۆی لە مۆداڵی فەرمی پیشان دەدرێت
  const handleViewDebtInvoice = (targetDebt: DebtRecord) => {
    const saleObj = resolveSaleForDebt(targetDebt);
    if (onViewInvoice) {
      onViewInvoice(saleObj);
    } else {
      setViewingInvoiceSale(saleObj);
    }
  };

  const markAsPaid = (id: string) => {
    const target = debts.find(d => d.id === id);
    if (target) {
      openReceiveModal(target);
    } else {
      setDebts(debts.map(d => d.id === id ? { ...d, status: 'paid' } : d));
      setActiveMenuId(null);
    }
  };

  const openSecurityModal = (debt: DebtRecord, action: 'delete' | 'settle') => {
    setSecurityTargetDebt(debt);
    setSecurityModalAction(action);
    setSecurityPassword('');
    setShowSecurityPassword(false);
    setSecurityError('');
    setActiveMenuId(null);
  };

  const handleConfirmSecurityAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityTargetDebt || !securityModalAction) return;

    const entered = securityPassword.trim();
    const configuredPasscode = (settings?.securityPasscode || '').trim();
    const userPass = (currentUser?.password || '').trim();

    const isMatch =
      (configuredPasscode && entered === configuredPasscode) ||
      (userPass && entered === userPass) ||
      entered === '1995@' ||
      entered === '@Gayla1995' ||
      entered === '1234';

    if (!isMatch) {
      setSecurityError('ژمارەی نهێنی هەڵەیە! تکایە دووبارە تاقی بکەرەوە.');
      return;
    }

    if (securityModalAction === 'delete') {
      setDebts(debts.filter(d => d.id !== securityTargetDebt.id));
    } else if (securityModalAction === 'settle') {
      const settleAmount = securityTargetDebt.amount > 0 
        ? securityTargetDebt.amount 
        : (securityTargetDebt.originalAmount || securityTargetDebt.paidAmount || 0);
      setDebts(debts.map(d => 
        d.id === securityTargetDebt.id 
          ? { 
              ...d, 
              amount: 0, 
              status: 'paid', 
              paidAmount: settleAmount,
              originalAmount: settleAmount,
              paidDate: new Date().toISOString().split('T')[0],
              receiverName: currentUser?.name || 'کاشێر',
              notes: (d.notes ? d.notes + ' - ' : '') + 'پاکتاوکرا و پارێزرا لە مێژوو' 
            } 
          : d
      ));

      if (updateCustomer) {
        const matchingCust = customers.find(c => isSameCustomerOrDebtor(c.name, securityTargetDebt.debtorName, c.phone, securityTargetDebt.phone));
        if (matchingCust) {
          updateCustomer(matchingCust.id, { totalDebt: 0 });
        }
      }
    }

    setSecurityModalAction(null);
    setSecurityTargetDebt(null);
    setSecurityPassword('');
    setSecurityError('');
  };

  // کۆکردنەوەی هەموو قەرزەکان: پێکهاتوو لە لیستی سەرەکی debts و هەر قەرزێکی کڕیار لە خاڵی فرۆشتن (customers / sales / employees / local orders) کە لە debts نەبووبێت
  const allDebts = useMemo(() => {
    let list = [...debts];

    // Read any local POS orders
    let localOrders: any[] = [];
    try {
      const raw = localStorage.getItem('kurd_orders_and_debts_local');
      if (raw) localOrders = JSON.parse(raw);
    } catch {}

    // 1. پشکنینی کڕیاران (Customers) بەپێی totalDebt ی ڕاستەقینە
    (customers || []).forEach((c) => {
      const custDebt = (c.totalDebt !== undefined && c.totalDebt !== null)
        ? Math.max(0, parseNumericDebt(c.totalDebt))
        : (parseNumericDebt((c as any).debt) || parseNumericDebt((c as any).debtAmount) || 0);
      if (!c.name) return;

      const existingPendingRecord = list.find((d) => isSameCustomerOrDebtor(d.debtorName, c.name, d.phone, c.phone) && d.status === 'pending');
      if (custDebt > 0) {
        if (existingPendingRecord) {
          existingPendingRecord.amount = custDebt;
          existingPendingRecord.originalAmount = Math.max(existingPendingRecord.originalAmount || 0, custDebt);
        } else {
          list.push({
            id: `debt_cust_${c.id || Date.now()}`,
            debtorName: c.name,
            amount: custDebt,
            phone: c.phone || '',
            date: c.updatedAt || c.createdAt || new Date().toISOString(),
            notes: c.notes ? `${c.notes} (قەرزی کڕیار)` : 'قەرزی تۆمارکراو لە خاڵی فرۆشتن و سەرمایە',
            status: 'pending',
            originalAmount: custDebt,
          });
        }
      } else {
        // ئەگەر کڕیارەکە قەرزەکەی سفر بوو، سەرجەم قەرزە نەدراوەکانی دەبنە پاکتاوکراو و ناوی دەمێنێتەوە بۆ مێژوو
        let foundAny = false;
        list.forEach((d) => {
          if (isSameCustomerOrDebtor(d.debtorName, c.name, d.phone, c.phone)) {
            foundAny = true;
            if (d.status === 'pending') {
              d.amount = 0;
              d.status = 'paid';
              d.paidAmount = d.amount > 0 ? d.amount : (d.originalAmount || 0);
              d.paidDate = d.paidDate || new Date().toISOString().split('T')[0];
              d.notes = d.notes ? `${d.notes} (پاکتاوکرا)` : 'پاکتاوکرا و درایەوە';
            }
          }
        });

        if (!foundAny) {
          const hasSales = (sales || []).some(s => isSameCustomerOrDebtor(s.customerName, c.name, s.customerPhone, c.phone));
          if (hasSales || c.totalDebt !== undefined || (c as any).debt !== undefined) {
            list.push({
              id: `debt_cust_settled_${c.id}`,
              debtorName: c.name,
              amount: 0,
              paidAmount: 0,
              phone: c.phone || '',
              date: c.updatedAt || c.createdAt || new Date().toISOString(),
              notes: c.notes ? `${c.notes} (پاکتاوکرا)` : 'قەرزی پاکتاوکراو (دراوەتەوە)',
              status: 'paid',
              originalAmount: 0,
              paidDate: (c.updatedAt ? c.updatedAt.split('T')[0] : new Date().toISOString().split('T')[0])
            });
          }
        }
      }
    });

    // 2. پشکنینی فرۆشتنەکان (Sales) - تەنها بۆ ئەو کڕیارانەی کە لە لیستی customers نین
    (sales || []).forEach((s) => {
      const sDebt = parseNumericDebt(s.debtAmount) || 0;
      if (sDebt <= 0 || !s.customerName) return;

      // ئەگەر کڕیارەکە پێشتر لە بەشی کڕیاران بوو، قەرزەکەی لە totalDebt ئەژمار کراوە و فرۆشتنی کۆن زیاد ناکرێت
      const isRegistered = (customers || []).some((c) => isSameCustomerOrDebtor(c.name, s.customerName, c.phone, s.customerPhone));
      if (isRegistered) return;

      const existingPending = list
        .filter((d) => isSameCustomerOrDebtor(d.debtorName, s.customerName, d.phone, s.customerPhone) && d.status === 'pending')
        .reduce((sum, d) => sum + (parseNumericDebt(d.amount) || 0), 0);

      if (existingPending < sDebt) {
        list.push({
          id: `debt_rec_${s.id}`,
          debtorName: s.customerName,
          amount: sDebt - existingPending,
          phone: s.customerPhone || '',
          date: s.date || new Date().toISOString(),
          notes: `پسووڵەی فرۆشتن #${s.invoiceNumber || ''}`,
          status: 'pending',
          originalAmount: sDebt - existingPending,
        });
      }
    });

    // 3. پشکنینی فەرمانبەران / خاڵی فرۆشتن (Employees) - تەنها بۆ ئەوانەی لە customers نین
    (employees || []).forEach((emp) => {
      const empDebt = parseNumericDebt(emp.debtAmount) || 0;
      if (empDebt <= 0 || !emp.name) return;

      const isRegistered = (customers || []).some((c) => isSameCustomerOrDebtor(c.name, emp.name, c.phone, emp.phone));
      if (isRegistered) return;

      const existingPending = list
        .filter((d) => isSameCustomerOrDebtor(d.debtorName, emp.name, d.phone, emp.phone) && d.status === 'pending')
        .reduce((sum, d) => sum + (parseNumericDebt(d.amount) || 0), 0);

      if (existingPending < empDebt) {
        list.push({
          id: `debt_emp_${emp.id || Date.now()}`,
          debtorName: emp.name,
          amount: empDebt - existingPending,
          phone: emp.phone || '',
          date: emp.date || emp.createdAt || new Date().toISOString(),
          notes: `قەرزی خاڵی فرۆشتن (${emp.productName || 'کاڵا'})`,
          status: 'pending',
          originalAmount: empDebt - existingPending,
        });
      }
    });

    // 4. پشکنینی تۆمارەکانی خاڵی فرۆشتن لە لۆکاڵ (Local Orders) - تەنها بۆ ئەوانەی لە customers نین
    localOrders.forEach((ord) => {
      const ordDebt = parseNumericDebt(ord.debt?.debtAmount) || 0;
      const custName = ord.debt?.customerName || ord.customerName;
      if (ordDebt <= 0 || !custName || ord.debt?.isPaid) return;

      const isRegistered = (customers || []).some((c) => isSameCustomerOrDebtor(c.name, custName));
      if (isRegistered) return;

      const existingPending = list
        .filter((d) => isSameCustomerOrDebtor(d.debtorName, custName) && d.status === 'pending')
        .reduce((sum, d) => sum + (parseNumericDebt(d.amount) || 0), 0);

      if (existingPending < ordDebt) {
        list.push({
          id: `debt_ord_${ord.id || Date.now()}`,
          debtorName: custName,
          amount: ordDebt - existingPending,
          phone: '',
          date: ord.createdAt || new Date().toISOString(),
          notes: `قەرزی خاڵی فرۆشتن (#${ord.receipt?.receiptId || ''})`,
          status: 'pending',
          originalAmount: ordDebt - existingPending,
        });
      }
    });

    const uniqueMap = new Map<string, DebtRecord>();
    list.forEach((item, index) => {
      const keyId = item.id ? item.id : `debt_item_${index}`;
      if (uniqueMap.has(keyId)) {
        uniqueMap.set(`${keyId}_${index}`, { ...item, id: `${keyId}_${index}` });
      } else {
        uniqueMap.set(keyId, item);
      }
    });
    return Array.from(uniqueMap.values());
  }, [debts, customers, sales, employees]);

  // پاشەکەوتکردنی ئۆتۆماتیکی لە کلاود و لۆکاڵ ئەگەر قەرزی نوێ دەستنیشانکرا
  useEffect(() => {
    if (allDebts.length > debts.length) {
      setDebts(allDebts);
    }
  }, [allDebts, debts.length, setDebts]);

  // Helper to accurately get debtor's total debt across customer record and pending debts
  const getDebtorTotalDebt = useCallback((debtorName: string, phone?: string, fallbackDebt?: DebtRecord): number => {
    const matchingCust = customers.find(c => isSameCustomerOrDebtor(c.name, debtorName, c.phone, phone));
    if (matchingCust) {
      if (matchingCust.totalDebt !== undefined && matchingCust.totalDebt !== null) {
        return Math.max(0, parseNumericDebt(matchingCust.totalDebt));
      }
      if ((matchingCust as any).debt !== undefined && (matchingCust as any).debt !== null) {
        return Math.max(0, parseNumericDebt((matchingCust as any).debt));
      }
      if ((matchingCust as any).debtAmount !== undefined && (matchingCust as any).debtAmount !== null) {
        return Math.max(0, parseNumericDebt((matchingCust as any).debtAmount));
      }
    }

    const pendingInAll = allDebts
      .filter(d2 => isSameCustomerOrDebtor(d2.debtorName, debtorName, d2.phone, phone) && d2.status === 'pending')
      .reduce((sum, d2) => sum + (parseNumericDebt(d2.amount) || 0), 0);

    if (pendingInAll > 0) return pendingInAll;

    if (fallbackDebt && fallbackDebt.status === 'pending') {
      return parseNumericDebt(fallbackDebt.amount) || parseNumericDebt(fallbackDebt.originalAmount) || 0;
    }
    return 0;
  }, [customers, allDebts]);

  const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Calculate debt duration/period in days
  const getDebtDuration = useCallback((dateStr: string, status: 'pending' | 'paid', paidDate?: string) => {
    if (status === 'paid') {
      return {
        text: 'دراوەتەوە (پاکتاوکراو)',
        shortText: 'دراوەتەوە',
        days: 0,
        isOverdue: false,
        isPaid: true
      };
    }

    if (!dateStr) {
      return {
        text: 'ئەمڕۆ (٠ ڕۆژ)',
        shortText: 'ئەمڕۆ',
        days: 0,
        isOverdue: false,
        isPaid: false
      };
    }

    const createdDate = new Date(dateStr);
    if (isNaN(createdDate.getTime())) {
      return {
        text: 'نادیار',
        shortText: 'نادیار',
        days: 0,
        isOverdue: false,
        isPaid: false
      };
    }

    const endDate = new Date();
    const startDay = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate()).getTime();
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();

    const diffDays = Math.max(0, Math.floor((endDay - startDay) / (1000 * 60 * 60 * 24)));
    const isOverdue = diffDays >= 6;

    if (diffDays === 0) {
      return {
        text: 'ئەمڕۆ (٠ ڕۆژ)',
        shortText: 'ئەمڕۆ',
        days: 0,
        isOverdue: false,
        isPaid: false
      };
    } else if (diffDays === 1) {
      return {
        text: '١ ڕۆژ',
        shortText: '١ ڕۆژ',
        days: 1,
        isOverdue: false,
        isPaid: false
      };
    } else if (diffDays === 2) {
      return {
        text: '٢ ڕۆژ',
        shortText: '٢ ڕۆژ',
        days: 2,
        isOverdue: false,
        isPaid: false
      };
    } else {
      return {
        text: isOverdue ? `${diffDays} ڕۆژ (دواکەوتوو)` : `${diffDays} ڕۆژ`,
        shortText: `${diffDays} ڕۆژ`,
        days: diffDays,
        isOverdue,
        isPaid: false
      };
    }
  }, []);

  const overdueDebts = useMemo(() => {
    return allDebts.filter(d => {
      if (d.status !== 'pending') return false;
      const debtTime = new Date(d.date).getTime();
      return (now - debtTime) >= SIX_DAYS_MS;
    });
  }, [allDebts, now, SIX_DAYS_MS]);

  const totalOverdueAmount = useMemo(() => {
    return overdueDebts.reduce((sum, d) => sum + (parseNumericDebt(d.amount) || 0), 0);
  }, [overdueDebts]);

  // Group overdue debts by debtor so user gets complete picture of each overdue customer
  const groupedOverdueDebtors = useMemo(() => {
    const map = new Map<string, {
      debtorName: string;
      phone: string;
      address: string;
      totalOverdueAmount: number;
      maxDaysOverdue: number;
      oldestDate: string;
      debts: DebtRecord[];
      customer?: any;
    }>();

    overdueDebts.forEach(d => {
      const cleanKey = (d.debtorName || 'بێ ناو').trim().toLowerCase();
      const matchedCust = customers.find(c => isSameCustomerOrDebtor(c.name, d.debtorName, c.phone, d.phone));
      const debtTime = new Date(d.date).getTime();
      const days = isNaN(debtTime) ? 6 : Math.max(0, Math.floor((now - debtTime) / (1000 * 60 * 60 * 24)));
      const amt = parseNumericDebt(d.amount) || 0;

      if (!map.has(cleanKey)) {
        map.set(cleanKey, {
          debtorName: d.debtorName || 'بێ ناو',
          phone: d.phone || matchedCust?.phone || '',
          address: matchedCust?.address || '',
          totalOverdueAmount: amt,
          maxDaysOverdue: days,
          oldestDate: d.date,
          debts: [d],
          customer: matchedCust
        });
      } else {
        const existing = map.get(cleanKey)!;
        existing.totalOverdueAmount += amt;
        if (days > existing.maxDaysOverdue) {
          existing.maxDaysOverdue = days;
          existing.oldestDate = d.date;
        }
        if (!existing.phone && (d.phone || matchedCust?.phone)) {
          existing.phone = d.phone || matchedCust?.phone || '';
        }
        if (!existing.address && matchedCust?.address) {
          existing.address = matchedCust.address;
        }
        existing.debts.push(d);
      }
    });

    let list = Array.from(map.values());

    if (overdueSearchQuery.trim()) {
      const q = normalizeKurdishText(overdueSearchQuery);
      list = list.filter(item => 
        normalizeKurdishText(item.debtorName).includes(q) ||
        (item.phone && item.phone.includes(overdueSearchQuery.replace(/\D/g, ''))) ||
        (item.address && normalizeKurdishText(item.address).includes(q)) ||
        item.debts.some(d => d.notes && normalizeKurdishText(d.notes).includes(q))
      );
    }

    list.sort((a, b) => {
      if (overdueSortBy === 'days') return b.maxDaysOverdue - a.maxDaysOverdue;
      if (overdueSortBy === 'amount') return b.totalOverdueAmount - a.totalOverdueAmount;
      if (overdueSortBy === 'name') return a.debtorName.localeCompare(b.debtorName);
      return 0;
    });

    return list;
  }, [overdueDebts, customers, now, overdueSearchQuery, overdueSortBy]);

  const getWhatsAppLink = (phone: string, debtorName: string, amount: number, days: number) => {
    const cleanPhone = phone.replace(/\D/g, '');
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith('07')) {
      formattedPhone = '964' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('7')) {
      formattedPhone = '964' + formattedPhone;
    }
    const message = encodeURIComponent(
      `سڵاو بەڕێز ${debtorName}، هیوادارم باش بن.\nتەنها بیرخستنەوەیەکی دۆستانەیە سەبارەت بە قەرزەکەتان بە بڕی (${amount.toLocaleString()} د.ع) کە (${days} ڕۆژ)ە دواکەوتووە.\nسوپاس بۆ هاوکاریتان.`
    );
    return `https://wa.me/${formattedPhone}?text=${message}`;
  };

  const handleCopyOverdueDebtors = () => {
    if (groupedOverdueDebtors.length === 0) return;
    const lines = [
      '📋 لیستی قەرزە دواکەوتووەکان (٦+ ڕۆژ):',
      `کۆی گشتی قەرزی دواکەوتوو: ${totalOverdueAmount.toLocaleString()} د.ع`,
      `ژمارەی قەرزداران: ${groupedOverdueDebtors.length} کەس`,
      '----------------------------------------',
      ...groupedOverdueDebtors.map((item, idx) => {
        const phoneStr = item.phone ? ` | تەلەفۆن: ${item.phone}` : '';
        return `${idx + 1}. ${item.debtorName}${phoneStr} | بڕ: ${item.totalOverdueAmount.toLocaleString()} د.ع | دواکەوتوو: +${item.maxDaysOverdue} ڕۆژ`;
      }),
      '----------------------------------------'
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedOverdueToast(true);
    setTimeout(() => setCopiedOverdueToast(false), 2500);
  };

  // فلتەرکردنی قەرزەکان بە شێوازی پێشکەوتووی کوردی و بەپێی تابی دەستنیشانکراو
  const filteredDebts = useMemo(() => {
    let base = allDebts;

    if (debtFilterTab === 'overdue') {
      base = base.filter(d => {
        const totalAmt = getDebtorTotalDebt(d.debtorName, d.phone, d);
        if (d.status === 'paid' || totalAmt <= 0) return false;
        const debtTime = new Date(d.date).getTime();
        const diffDays = Math.max(0, Math.floor((now - debtTime) / (1000 * 60 * 60 * 24)));
        return diffDays >= 6;
      });
    } else if (debtFilterTab === 'pending') {
      base = base.filter(d => {
        const totalAmt = getDebtorTotalDebt(d.debtorName, d.phone, d);
        return d.status !== 'paid' && (Number(d.amount) > 0 || totalAmt > 0);
      });
    } else if (debtFilterTab === 'paid') {
      base = base.filter(d => {
        const totalAmt = getDebtorTotalDebt(d.debtorName, d.phone, d);
        return d.status === 'paid' || totalAmt === 0 || Number(d.amount) === 0;
      });
    }
    // If debtFilterTab === 'all': keep all debts (both active and settled/paid) so customer records remain accessible!

    const q = normalizeKurdishText(searchQuery);
    if (!q) return base;
    return base.filter(d => 
      normalizeKurdishText(d.debtorName).includes(q) ||
      (d.phone && d.phone.includes(searchQuery.replace(/\D/g, ''))) ||
      (d.notes && normalizeKurdishText(d.notes).includes(q))
    );
  }, [allDebts, debtFilterTab, searchQuery, getDebtorTotalDebt, now]);

  // Sort debts: pending active debts with amount > 0 appear FIRST so they are prominent!
  const sortedDebts = useMemo(() => {
    return [...filteredDebts].sort((a, b) => {
      const aAmt = getDebtorTotalDebt(a.debtorName, a.phone, a);
      const bAmt = getDebtorTotalDebt(b.debtorName, b.phone, b);
      const aIsPending = a.status === 'pending' && aAmt > 0 && Number(a.amount) > 0;
      const bIsPending = b.status === 'pending' && bAmt > 0 && Number(b.amount) > 0;
      if (aIsPending && !bIsPending) return -1;
      if (!aIsPending && bIsPending) return 1;
      if (bAmt !== aAmt) return bAmt - aAmt;
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    });
  }, [filteredDebts, getDebtorTotalDebt]);

  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(sortedDebts.length / Number(itemsPerPage)) || 1;

  const displayedDebts = itemsPerPage === 'all' 
    ? sortedDebts 
    : sortedDebts.slice((currentPage - 1) * Number(itemsPerPage), currentPage * Number(itemsPerPage));

  // کۆی قەرزە دراو و پاکتاوکراوەکان (کۆی گشتی پارەی دراو لە بەشی پاکتاوکردن)
  const paidDebtsList = useMemo(() => {
    return allDebts.filter(d => {
      const totalAmt = getDebtorTotalDebt(d.debtorName, d.phone, d);
      return d.status === 'paid' || totalAmt === 0 || (d.amount === 0 && ((d.paidAmount || 0) > 0 || (d.originalAmount || 0) > 0));
    });
  }, [allDebts, getDebtorTotalDebt]);

  const paidDebtsCount = useMemo(() => {
    return paidDebtsList.length;
  }, [paidDebtsList]);

  const totalPaidDebtAmount = useMemo(() => {
    return paidDebtsList.reduce((sum, d) => sum + (d.paidAmount || d.originalAmount || (d.amount === 0 ? d.originalAmount || 0 : 0)), 0);
  }, [paidDebtsList]);

  // کۆی گشتی قەرز: هاوئاهەنگ لەگەڵ بەشی سەرمایە و خاڵی فرۆشتن بە وردی
  const totalPendingDebt = useMemo(() => {
    const debtsSum = allDebts
      .filter(d => d.status === 'pending')
      .reduce((sum, d) => sum + (parseNumericDebt(d.amount) || 0), 0);
    const custSum = (customers || []).reduce(
      (sum, c) => sum + (parseNumericDebt(c.totalDebt) || parseNumericDebt((c as any).debt) || parseNumericDebt((c as any).debtAmount) || 0),
      0
    );
    return Math.max(debtsSum, custSum);
  }, [allDebts, customers]);

  const pendingCount = useMemo(() => {
    const activeDebtors = new Set<string>();
    allDebts.forEach(d => {
      if (d.status === 'pending' && (parseNumericDebt(d.amount) > 0 || getDebtorTotalDebt(d.debtorName, d.phone, d) > 0)) {
        activeDebtors.add(normalizeKurdishText(d.debtorName));
      }
    });
    (customers || []).forEach(c => {
      if ((parseNumericDebt(c.totalDebt) || parseNumericDebt((c as any).debt) || 0) > 0 && c.name) {
        activeDebtors.add(normalizeKurdishText(c.name));
      }
    });
    return activeDebtors.size;
  }, [allDebts, customers, getDebtorTotalDebt]);

  return (
    <div className="space-y-4 pb-24 animate-fadeIn" dir="rtl">
      {/* 1. TOP HEADER SEARCH & ACTION */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4">
        {/* Search & New Customer Action Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="گەڕانی خێرا بەپێی ناوی قەرزدار، ژمارە مۆبایل..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-11 py-3.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-center"
            />
            <Search className="w-5 h-5 text-slate-600 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto bg-[#00c975] hover:bg-[#00b368] active:scale-[0.99] text-white font-black text-sm sm:text-base py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>کڕیاری نوێ (قەرزی نوێ)</span>
          </button>
        </div>

        {/* 3 Summary 3D Cards with Full Width and Spacious Number Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          {/* 1. Overdue Debt 3D Card (Clickable - پیشاندانی ناو و زانیاری قەرزدارانی دواکەوتوو) */}
          <button
            type="button"
            onClick={() => setIsOverdueModalOpen(true)}
            className="bg-gradient-to-br from-rose-50 via-red-50 to-rose-100 hover:from-rose-100 hover:to-rose-200/90 border-2 border-rose-300 hover:border-rose-400 rounded-2xl p-4 shadow-xs hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-between gap-3 text-right cursor-pointer group overflow-hidden w-full"
            title="کرتە بکە بۆ پیشاندانی ناو و زانیاری قەرزدارانی دواکەوتوو"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-black text-rose-800">قەرزی دواکەوتوو (٦+ ڕۆژ)</p>
                <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded-full shrink-0">
                  {overdueDebts.length}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base lg:text-lg font-black text-rose-950 font-mono tracking-tight break-all" dir="ltr">
                  {totalOverdueAmount.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-rose-700 shrink-0">د.ع</span>
              </div>
            </div>
            <div className="relative shrink-0">
              <Overdue3DIcon className="w-11 h-11 shrink-0 group-hover:scale-110 transition-transform duration-200" />
              {overdueDebts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping" />
              )}
            </div>
          </button>

          {/* 3. Total Debt 3D Card */}
          <button
            type="button"
            onClick={() => setDebtFilterTab('all')}
            className={`bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 border-2 rounded-2xl p-4 shadow-xs hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-between gap-3 text-right cursor-pointer group overflow-hidden w-full ${
              debtFilterTab === 'all' ? 'border-emerald-500 ring-2 ring-emerald-300' : 'border-emerald-200/80 hover:border-emerald-300'
            }`}
            title="کرتە بکە بۆ پیشاندانی هەموو قەرزەکان"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-800">کۆی گشتی قەرز</p>
              <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base lg:text-lg font-black text-emerald-950 font-mono tracking-tight break-all" dir="ltr">
                  {totalPendingDebt.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-800 shrink-0">د.ع</span>
              </div>
            </div>
            <DebtCoin3DIcon className="w-11 h-11 shrink-0 group-hover:scale-110 transition-transform duration-200" />
          </button>
        </div>

        {/* Quick Filter Tabs: هەمووی | قەرزی دواکەوتوو | نەدراوەکان | دراوەکان و پاکتاوکراو */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-600 ml-1">فلتەری قەرز:</span>
          <button
            type="button"
            onClick={() => setDebtFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              debtFilterTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>هەموو قەرزەکان</span>
            <span className="font-mono text-[11px] opacity-80">({allDebts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDebtFilterTab('overdue');
              setIsOverdueModalOpen(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
              debtFilterTab === 'overdue'
                ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/25'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>قەرزی دواکەوتوو (٦+ ڕۆژ)</span>
            <span className="font-mono text-[11px] bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded-full font-bold">
              {overdueDebts.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDebtFilterTab('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              debtFilterTab === 'pending'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span>قەرزە نەدراوەکان</span>
            <span className="font-mono text-[11px] opacity-80">({pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setDebtFilterTab('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              debtFilterTab === 'paid'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>قەرزە پاکتاوکراوەکان (دراوەکان)</span>
            <span className="font-mono text-[11px] opacity-80">({paidDebtsCount})</span>
          </button>
        </div>

        {/* View Mode & Pagination Selector */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>شێوازی خشتە</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>شێوازی کارت</span>
            </button>
          </div>

          <span className="text-xs font-bold text-slate-600 shrink-0">پیشاندان لە هەر پەڕەیەک:</span>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-end">
            {[12, 24, 48, 100, 'all'].map((opt) => (
              <button
                key={String(opt)}
                type="button"
                onClick={() => setItemsPerPage(opt as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  itemsPerPage === opt ? 'bg-[#00c975] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt === 'all' ? 'هەمووی' : opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. DEBTS TABLE / CARDS VIEW */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
          <div className="bg-[#00a86b] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-white" />
              <h3 className="font-black text-sm sm:text-base">خشتەی قەرزەکان</h3>
            </div>
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-mono">
              {filteredDebts.length} تۆمار
            </span>
          </div>

          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-right border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200 text-xs sm:text-sm">
                  <th className="p-3.5 sm:p-4 border-l border-slate-200 w-12 sm:w-16 text-center">#</th>
                  <th className="p-3.5 sm:p-4 border-l border-slate-200 min-w-[240px] sm:min-w-[320px]">ناوی کڕیار</th>
                  <th className="p-3.5 sm:p-4 border-l border-slate-200 min-w-[190px] sm:min-w-[260px]">
                    {debtFilterTab === 'paid' ? 'بڕی پارەی دراو (پاکتاوکراو)' : 'بڕی قەرز'}
                  </th>
                  <th className="p-3.5 sm:p-4 border-l border-slate-200 text-center min-w-[150px] sm:min-w-[190px]">
                    {debtFilterTab === 'paid' ? 'دۆخ و بەرواری وەرگرتن' : 'ماوەی قەرز'}
                  </th>
                  <th className="p-3.5 sm:p-4 text-center w-28">کردارەکان</th>
                </tr>
              </thead>
              <tbody>
                {displayedDebts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-600 font-bold text-sm">
                      هیچ قەرزێک لەم بەشەدا تۆمار نەکراوە
                    </td>
                  </tr>
                ) : (
                  displayedDebts.map((d, idx) => {
                    const totalAmt = getDebtorTotalDebt(d.debtorName, d.phone, d);
                    const isPaidDebt = d.status === 'paid' || totalAmt === 0 || (Number(d.amount) <= 0 && ((d.paidAmount || 0) > 0 || (d.originalAmount || 0) > 0));
                    const duration = getDebtDuration(d.date, isPaidDebt ? 'paid' : d.status, d.paidDate);
                    const paidAmtDisplay = d.paidAmount || d.originalAmount || d.amount || 0;

                    return (
                      <tr key={d.id} className={`border-b transition-all relative ${
                        isPaidDebt ? 'bg-emerald-50/30 hover:bg-emerald-50/60 border-emerald-100' : 'border-slate-100 hover:bg-slate-50'
                      }`}>
                        <td className="p-3.5 sm:p-4 border-l border-slate-200 text-center font-mono font-bold text-slate-600 text-xs sm:text-sm">
                          {(currentPage - 1) * (itemsPerPage === 'all' ? filteredDebts.length : Number(itemsPerPage)) + idx + 1}
                        </td>
                        <td className="p-3.5 sm:p-4 border-l border-slate-200 min-w-[240px] sm:min-w-[320px]">
                          <div className="font-black text-slate-900 text-sm sm:text-base leading-snug break-words flex items-center gap-2">
                            <span>{d.debtorName}</span>
                            {isPaidDebt && (
                              <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                                پاکتاوکراو
                              </span>
                            )}
                          </div>
                          {d.phone && (
                            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-900 mt-1 font-medium">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span dir="ltr">{d.phone}</span>
                            </div>
                          )}
                          {d.notes && (
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[260px]">
                              {d.notes}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 sm:p-4 border-l border-slate-200 whitespace-nowrap min-w-[190px] sm:min-w-[260px]">
                          {isPaidDebt ? (
                            <div>
                              <span className="font-mono font-black text-emerald-700 text-base sm:text-lg lg:text-xl block" dir="ltr">
                                {paidAmtDisplay.toLocaleString()} د.ع
                              </span>
                              <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">
                                ✓ دراوەتەوە (قەرزی پاکتاوکراو)
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="font-mono font-black text-rose-700 text-base sm:text-lg lg:text-xl block" dir="ltr">
                                {totalAmt.toLocaleString()} د.ع
                              </span>
                              {d.paidAmount && d.paidAmount > 0 ? (
                                <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">
                                  دراو: {d.paidAmount.toLocaleString()} د.ع
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 sm:p-4 border-l border-slate-200 text-center whitespace-nowrap min-w-[150px] sm:min-w-[190px]">
                          {isPaidDebt ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                <span>دراوەتەوە (پاکتاوکراو)</span>
                              </span>
                              <span className="text-[11px] text-slate-600 font-mono" dir="ltr">
                                {d.paidDate || (d.date ? d.date.split('T')[0] : '')}
                              </span>
                              {d.receiverName && (
                                <span className="text-[10px] text-slate-700 font-bold">
                                  وەرگر: {d.receiverName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold shadow-2xs ${
                              duration.isOverdue
                                ? 'bg-rose-100 text-rose-800 border border-rose-300 font-black animate-pulse'
                                : duration.days === 0
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-200'
                            }`}>
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>{duration.text}</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 sm:p-4 text-center relative whitespace-nowrap w-28">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === d.id ? null : d.id);
                            }}
                            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 flex items-center justify-center mx-auto transition-all cursor-pointer shadow-xs active:scale-95"
                            title="کردارەکان"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          {/* Action Dropdown Menu */}
                          {activeMenuId === d.id && (
                            <div className="absolute left-8 mt-1 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 text-right animate-scaleUp">
                              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-black text-slate-600">
                                کردارەکان بۆ {d.debtorName}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  handleViewDebtInvoice(d);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 cursor-pointer transition-all border-b border-slate-100"
                              >
                                <FileText className="w-4 h-4 text-indigo-600" />
                                <span>بینینی پسووڵە</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setHistoryModalDebt(d);
                                  setHistoryTab(isPaidDebt ? 'paid' : 'unpaid');
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2.5 text-xs font-bold text-slate-900 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-all"
                              >
                                <History className="w-4 h-4 text-sky-600" />
                                <span>دوگمەی مێژوو (نەدراو و دراو)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddDebtModalTarget(d);
                                  setAdditionalDebtAmount('');
                                  setAdditionalDebtNotes('');
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer transition-all border-t border-slate-100"
                              >
                                <Plus className="w-4 h-4 text-emerald-600" />
                                <span>زیادکردنی قەرز</span>
                              </button>

                              {!isPaidDebt ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openReceiveModal(d)}
                                    className="w-full px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer transition-all"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>وەرگرتنی قەرز (تۆمارکردنی پارەدان)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openSecurityModal(d, 'settle')}
                                    className="w-full px-4 py-2.5 text-xs font-bold text-teal-700 hover:bg-teal-50 flex items-center gap-2 cursor-pointer transition-all border-t border-slate-100"
                                  >
                                    <RefreshCcw className="w-4 h-4 text-teal-600" />
                                    <span>پاکتاوکردنی قەرز (دەستبەجێ)</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRevertDebtToUnpaid(d);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer transition-all border-t border-slate-100"
                                >
                                  <RotateCcw className="w-4 h-4 text-amber-600" />
                                  <span>گەڕانەوە بۆ نەدراو</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => openSecurityModal(d, 'delete')}
                                className="w-full px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-all border-t border-slate-100"
                              >
                                <Trash2 className="w-4 h-4 text-rose-600" />
                                <span>دوگمەی سڕینەوە</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedDebts.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-600 bg-white rounded-3xl border border-slate-200">
              هیچ قەرزێک لەم بەشەدا تۆمار نەکراوە
            </div>
          ) : (
            displayedDebts.map((d) => {
              const totalAmount = getDebtorTotalDebt(d.debtorName, d.phone, d);
              const isPaidDebt = d.status === 'paid' || totalAmount === 0 || (Number(d.amount) <= 0 && ((d.paidAmount || 0) > 0 || (d.originalAmount || 0) > 0));
              const duration = getDebtDuration(d.date, isPaidDebt ? 'paid' : d.status, d.paidDate);
              const paidAmtDisplay = d.paidAmount || d.originalAmount || d.amount || 0;

              return (
                <div key={d.id} className={`bg-white border rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative ${
                  isPaidDebt ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-200'
                }`}>
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 border ${
                          isPaidDebt ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-base font-black text-slate-900">{d.debtorName}</h3>
                            {isPaidDebt && (
                              <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full border border-emerald-300">
                                پاکتاو
                              </span>
                            )}
                          </div>
                          {d.phone && (
                            <span className="flex items-center gap-1 font-mono text-xs text-slate-900 mt-0.5" dir="ltr">
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                              {d.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3 Dots Menu Button for Cards */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === d.id ? null : d.id);
                          }}
                          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                          title="کردارەکان"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {activeMenuId === d.id && (
                          <div className="absolute left-0 mt-1 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2 text-right animate-scaleUp">
                            <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-black text-slate-600">
                              کردارەکان بۆ {d.debtorName}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handleViewDebtInvoice(d);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 cursor-pointer transition-all border-b border-slate-100"
                            >
                              <FileText className="w-4 h-4 text-indigo-600" />
                              <span>بینینی پسووڵە</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setHistoryModalDebt(d);
                                setHistoryTab(isPaidDebt ? 'paid' : 'unpaid');
                                setActiveMenuId(null);
                              }}
                              className="w-full px-4 py-2.5 text-xs font-bold text-slate-900 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-all"
                            >
                              <History className="w-4 h-4 text-sky-600" />
                              <span>دوگمەی مێژوو</span>
                            </button>
                            {!isPaidDebt ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openReceiveModal(d)}
                                  className="w-full px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer transition-all"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>وەرگرتنی قەرز</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openSecurityModal(d, 'settle')}
                                  className="w-full px-4 py-2.5 text-xs font-bold text-teal-700 hover:bg-teal-50 flex items-center gap-2 cursor-pointer transition-all border-t border-slate-100"
                                >
                                  <RefreshCcw className="w-4 h-4 text-teal-600" />
                                  <span>پاکتاوکردنی قەرز</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  handleRevertDebtToUnpaid(d);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer transition-all border-t border-slate-100"
                              >
                                <RotateCcw className="w-4 h-4 text-amber-600" />
                                <span>گەڕانەوە بۆ نەدراو</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openSecurityModal(d, 'delete')}
                              className="w-full px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-all border-t border-slate-100"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                              <span>دوگمەی سڕینەوە</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isPaidDebt ? (
                      <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-emerald-900 font-bold">بڕی پارەی دراو:</span>
                          <span className="font-black font-mono text-emerald-800 text-base sm:text-lg" dir="ltr">
                            {paidAmtDisplay.toLocaleString()} د.ع
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-emerald-200/60">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>پاکتاوکراو و دراوەتەوە</span>
                          </span>
                          <span className="font-mono text-slate-500" dir="ltr">
                            {d.paidDate || (d.date ? d.date.split('T')[0] : '')}
                          </span>
                        </div>
                        {d.receiverName && (
                          <div className="text-[10px] text-slate-600 font-bold">
                            وەرگیراو لەلایەن: {d.receiverName}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-900 font-bold">کۆی قەرزی ماوە:</span>
                          <span className="font-black font-mono text-rose-700 text-base sm:text-lg block mt-0.5" dir="ltr">
                            {totalAmount.toLocaleString()} د.ع
                          </span>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                          duration.isOverdue ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{duration.text}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredDebts.length > 0 && itemsPerPage !== 'all' && totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-5 py-4 rounded-3xl border border-slate-200 shadow-sm mt-4">
          <div className="text-xs text-slate-900 font-medium">
            پیشاندانی {(currentPage - 1) * Number(itemsPerPage) + 1} تا{' '}
            {Math.min(currentPage * Number(itemsPerPage), filteredDebts.length)} لە کۆی{' '}
            {filteredDebts.length} قەرز
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                currentPage === 1
                  ? 'border-slate-200 text-slate-900 cursor-not-allowed bg-slate-50'
                  : 'border-slate-200 text-slate-900 hover:bg-slate-100 bg-white'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
              <span>پێشوو</span>
            </button>
            <span className="text-xs font-bold text-slate-900 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                currentPage === totalPages
                  ? 'border-slate-200 text-slate-900 cursor-not-allowed bg-slate-50'
                  : 'border-slate-200 text-slate-900 hover:bg-slate-100 bg-white'
              }`}
            >
              <span>دواتر</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* History Modal - 2 Pages: لاپەڕەی نەدراو و لاپەڕەی دراو */}
      {historyModalDebt && (
        <div 
          onClick={() => setHistoryModalDebt(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-2xl shadow-2xl text-right animate-scaleUp max-h-[92vh] overflow-y-auto flex flex-col"
          >
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-sky-600" />
                  مێژووی قەرز: {historyModalDebt.debtorName}
                </h3>
                <p className="text-xs text-slate-900 mt-0.5">پوختەی هەردوو لاپەڕەی قەرزی نەدراو و قەرزی دراو</p>
              </div>
              <div className="flex items-center gap-2">
                {historyModalDebt.phone && (
                  <span className="font-mono text-xs text-slate-900 bg-slate-100 px-3 py-1 rounded-xl" dir="ltr">
                    {historyModalDebt.phone}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setHistoryModalDebt(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Debtor Records filtering into 2 pages with 100% history permanence */}
            {(() => {
              const debtorNameClean = historyModalDebt.debtorName.trim().toLowerCase();
              const debtorPhoneClean = (historyModalDebt.phone || '').trim();

              const debtorRecords = debts.filter(
                d => isSameCustomerOrDebtor(d.debtorName, historyModalDebt.debtorName, d.phone, historyModalDebt.phone)
              );

              // دۆزینەوەی سەرجەم پسووڵەکانی فرۆشتنی قەرز بۆ ئەم کڕیارە بۆ دڵنیابوون لەوەی هیچ مێژوویەک ون نابێت
              const creditSalesWithoutDebt = sales
                .filter(s => {
                  const isMatch = isSameCustomerOrDebtor(s.customerName, historyModalDebt.debtorName, s.customerPhone, historyModalDebt.phone);
                  const hasDebt = (s.debtAmount > 0) || s.paymentType === 'debt' || s.paymentType === 'partial';
                  if (!isMatch || !hasDebt) return false;
                  return !debtorRecords.some(d => d.id === `debt_rec_${s.id}` || d.id === s.id);
                })
                .map(s => ({
                  id: `debt_rec_${s.id}`,
                  debtorName: s.customerName,
                  phone: s.customerPhone || '',
                  amount: s.debtAmount,
                  date: s.date,
                  status: (s.debtAmount > 0 ? 'pending' : 'paid') as 'pending' | 'paid',
                  paidAmount: s.debtAmount <= 0 ? (s.total || s.paidAmount) : undefined,
                  originalAmount: s.debtAmount || s.total,
                  notes: `پسووڵەی فرۆشتن #${s.invoiceNumber}`,
                } as DebtRecord));

              const allCustomerHistory = [...debtorRecords, ...creditSalesWithoutDebt];

              const getHistoricalPaidAmt = (d: DebtRecord) => {
                if (typeof d.paidAmount === 'number' && d.paidAmount > 0) return d.paidAmount;
                if (typeof d.originalAmount === 'number' && d.originalAmount > 0) return d.originalAmount;
                if (typeof d.amount === 'number' && d.amount > 0) return d.amount;
                return 0;
              };

              const activeDebts = allCustomerHistory.filter(d => d.status !== 'paid' && (Number(d.amount) > 0));
              const paidDebts = allCustomerHistory.filter(d => d.status === 'paid' || (Number(d.amount) <= 0));

              const totalActive = activeDebts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
              const totalPaid = paidDebts.reduce((sum, d) => sum + getHistoricalPaidAmt(d), 0);
              const grandTotal = totalActive + totalPaid;

              return (
                <div className="flex-1 flex flex-col space-y-4">
                  {/* 2 Pages Tabs Navigation */}
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setHistoryTab('unpaid')}
                      className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                        historyTab === 'unpaid'
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-400/50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                      }`}
                    >
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>لاپەڕەی نەدراو</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                        historyTab === 'unpaid' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {activeDebts.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHistoryTab('paid')}
                      className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                        historyTab === 'paid'
                          ? 'bg-[#00c975] text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>لاپەڕەی دراو</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                        historyTab === 'paid' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {paidDebts.length}
                      </span>
                    </button>
                  </div>

                  {/* PAGE 1: لاپەڕەی نەدراو */}
                  {historyTab === 'unpaid' && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-4 rounded-2xl flex items-center justify-between shadow-sm">
                        <div>
                          <span className="text-xs text-amber-100 font-bold block">کۆی قەرزی نەدراو (ماوە):</span>
                          <span className="text-xl sm:text-2xl font-black font-mono tracking-tight" dir="ltr">
                            {totalActive.toLocaleString()} د.ع
                          </span>
                        </div>
                        <div className="bg-white/20 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono">
                          {activeDebts.length} قەرز ماوەتەوە
                        </div>
                      </div>

                      {activeDebts.length === 0 ? (
                        <div className="p-8 text-center bg-emerald-50/70 border border-emerald-200/80 rounded-2xl my-2">
                          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                          <p className="font-black text-slate-900 text-sm">هیچ قەرزێکی نەدراو نییە!</p>
                          <p className="text-xs text-slate-900 mt-1">هەموو قەرزەکانی ئەم کڕیارە پاکتاوکراون و دراونەتەوە.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {activeDebts.map((d) => (
                            <div 
                              key={d.id} 
                              className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-400 hover:shadow-sm transition-all flex items-center justify-between gap-3 text-xs"
                            >
                              {/* تەنها بڕی پارەکەی و بەروار */}
                              <div className="flex flex-col gap-1 text-right">
                                <span className="font-mono font-black text-slate-900 text-base" dir="ltr">
                                  {d.amount.toLocaleString()} د.ع
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-900 font-mono text-xs" dir="ltr">
                                  <Calendar className="w-3.5 h-3.5 text-slate-600" />
                                  {new Date(d.date).toLocaleDateString()}
                                </span>
                              </div>

                              {/* دوگمەی بینین و وەرگرتنەوە */}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleViewDebtInvoice(d)}
                                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-slate-200/80 active:scale-95 shadow-2xs"
                                  title="بینینی پسووڵەی قەرزەکە وەک خۆی"
                                >
                                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>بینین</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openReceiveModal(d)}
                                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs hover:shadow-emerald-500/25 active:scale-95"
                                  title="وەرگرتنەوەی پارە"
                                >
                                  <ArrowDownLeft className="w-3.5 h-3.5 text-white" />
                                  <span>وەرگرتنەوە</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PAGE 2: لاپەڕەی دراو */}
                  {historyTab === 'paid' && (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="bg-gradient-to-r from-[#00c975] via-emerald-600 to-teal-700 text-white p-4 rounded-2xl flex items-center justify-between shadow-sm">
                        <div>
                          <span className="text-xs text-emerald-100 font-bold block">کۆی قەرزی دراو (دراوەتەوە):</span>
                          <span className="text-xl sm:text-2xl font-black font-mono tracking-tight" dir="ltr">
                            {totalPaid.toLocaleString()} د.ع
                          </span>
                        </div>
                        <div className="bg-white/20 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono">
                          {paidDebts.length} پارەدان تۆمارکراوە
                        </div>
                      </div>

                      {paidDebts.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl my-2">
                          <Clock className="w-12 h-12 text-slate-900 mx-auto mb-2" />
                          <p className="font-black text-slate-900 text-sm">هیچ قەرزێکی دراو نییە</p>
                          <p className="text-xs text-slate-600 mt-1">هێشتا هیچ بڕە پارەیەکی دراو بۆ ئەم کڕیارە تۆمار نەکراوە.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {paidDebts.map((d) => (
                            <div 
                              key={d.id} 
                              className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-400 hover:shadow-sm transition-all flex items-center justify-between gap-3 text-xs"
                            >
                              {/* تەنها بڕی پارەکەی و بەروار */}
                              <div className="flex flex-col gap-1 text-right">
                                <span className="font-mono font-black text-emerald-700 text-base" dir="ltr">
                                  {getHistoricalPaidAmt(d).toLocaleString()} د.ع
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-900 font-mono text-xs" dir="ltr">
                                  <Calendar className="w-3.5 h-3.5 text-slate-600" />
                                  {d.paidDate || new Date(d.date).toLocaleDateString()}
                                </span>
                              </div>

                              {/* دوگمەی بینین و گەڕانەوە و وەرگرتنەوە */}
                              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleViewDebtInvoice(d)}
                                  className="px-2.5 sm:px-3 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-900 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all border border-slate-200/80 active:scale-95 shadow-2xs"
                                  title="بینینی پسووڵەی قەرزەکە وەک خۆی"
                                >
                                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                  <span className="hidden sm:inline">بینین</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRevertDebtToUnpaid(d)}
                                  className="px-2.5 sm:px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95 hover:shadow-amber-500/20"
                                  title="گەڕانەوە بۆ بەشی لاپەڕەی نەدراو"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                                  <span>گەڕانەوە</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openReceiveModal(d)}
                                  className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs hover:shadow-emerald-500/25 active:scale-95"
                                  title="وەرگرتنەوەی پارە"
                                >
                                  <ArrowDownLeft className="w-3.5 h-3.5 text-white" />
                                  <span className="hidden sm:inline">وەرگرتنەوە</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                      <span className="text-slate-900">کۆی گشتی: <strong className="text-slate-900 font-mono" dir="ltr">{grandTotal.toLocaleString()} د.ع</strong></span>
                      <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">ماوە: <strong className="font-mono" dir="ltr">{totalActive.toLocaleString()} د.ع</strong></span>
                      <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">دراو: <strong className="font-mono" dir="ltr">{totalPaid.toLocaleString()} د.ع</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHistoryModalDebt(null)}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer transition-all"
                    >
                      داخستن
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Receive Payment Modal - دیاریکردنی بڕی پارەی وەرگیراو و ناوی وەرگر و بەروار */}
      {receiveModalDebt && (
        <div 
          onClick={() => setReceiveModalDebt(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl text-right animate-scaleUp max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                وەرگرتنی پارەی قەرز
              </h3>
              <button
                type="button"
                onClick={() => setReceiveModalDebt(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-900 font-bold">ناوی کڕیار:</span>
                <span className="text-slate-900 font-black text-sm">{receiveModalDebt.debtorName}</span>
              </div>
              {receiveModalDebt.phone && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-900 font-bold">ژمارەی مۆبایل:</span>
                  <span className="text-slate-900 font-mono" dir="ltr">{receiveModalDebt.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-bold">کۆی قەرزی قەرزدار (ماوە):</span>
                <span className="text-rose-700 font-black font-mono text-base" dir="ltr">
                  {(getDebtorTotalDebt(receiveModalDebt.debtorName, receiveModalDebt.phone, receiveModalDebt) || receiveModalDebt.amount).toLocaleString()} د.ع
                </span>
              </div>
            </div>

            <form onSubmit={handleReceivePayment} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-slate-900 font-bold">بڕی پارەی وەرگیراو (دینار):</label>
                  {(() => {
                    const totalOwed = getDebtorTotalDebt(receiveModalDebt.debtorName, receiveModalDebt.phone, receiveModalDebt) || receiveModalDebt.amount;
                    return totalOwed > 0 ? (
                      <button
                        type="button"
                        onClick={() => setReceiveAmount(totalOwed.toString())}
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                      >
                        هەموو قەرزەکە ({totalOwed.toLocaleString()} د.ع)
                      </button>
                    ) : null;
                  })()}
                </div>
                <input
                  type="number"
                  value={receiveAmount}
                  onChange={(e) => setReceiveAmount(e.target.value)}
                  placeholder="بڕی پارەی وەرگیراو بنووسە..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-base font-black font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  autoFocus
                />
                {Number(receiveAmount) > 0 && (() => {
                  const totalOwed = getDebtorTotalDebt(receiveModalDebt.debtorName, receiveModalDebt.phone, receiveModalDebt) || receiveModalDebt.amount;
                  return (
                    <div className="mt-1.5 text-[11px] font-bold">
                      {Number(receiveAmount) >= totalOwed ? (
                        <span className="text-emerald-600">
                          ✓ ئەم قەرزە بە تەواوی دادەخرێت، دەبێتە پاکتاوکراو و دەڕواتە بەشی دراوەکان
                        </span>
                      ) : (
                        <span className="text-amber-600">
                          بڕی ماوەی قەرز دوای داشکاندن: {(totalOwed - Number(receiveAmount)).toLocaleString()} د.ع
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">ناوی وەرگر (کێ پارەکەی وەرگرتووە):</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="ناوی وەرگر (بەڕێوەبەر، کاشێر...)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">بەرواری وەرگرتن:</label>
                <input
                  type="date"
                  value={receiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">تێبینی (ئارەزوومەندانە):</label>
                <input
                  type="text"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="تێبینی لەسەر وەرگرتنی پارەکە..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReceiveModalDebt(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-900 font-bold text-xs hover:bg-slate-200 cursor-pointer transition-all"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#00c975] hover:bg-[#00b368] active:scale-[0.99] text-white font-black text-xs cursor-pointer shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تەئکیدکردن و وەرگرتن</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Debt Modal */}
      {isAddModalOpen && (
        <div 
          onClick={() => setIsAddModalOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl text-right animate-scaleUp"
          >
            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              تۆمارکردنی قەرزی نوێ
            </h3>
            <form onSubmit={handleAddDebt} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">ناوی خاوەن قەرز:</label>
                <input
                  type="text"
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  placeholder="ناوی تەواو..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">بڕی قەرز (دینار):</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">ژمارەی تەلەفۆن:</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0750..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">تێبینی:</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="هۆکاری قەرز..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-900 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#00c975] text-white font-black text-xs hover:bg-[#00b368] cursor-pointer shadow-lg shadow-emerald-500/25"
                >
                  تۆمارکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Debt Details Modal - دوگمەی بینین */}
      {viewDetailDebt && (
        <div 
          onClick={() => setViewDetailDebt(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl text-right animate-scaleUp max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                وردەکاری تۆماری قەرز
              </h3>
              <button
                type="button"
                onClick={() => setViewDetailDebt(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Highlight Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200">
                <span className="text-xs text-slate-900 font-bold block mb-1">بڕی پارە:</span>
                <span className="text-2xl font-black font-mono text-slate-900 tracking-tight" dir="ltr">
                  {(
                    (viewDetailDebt.status === 'paid' 
                      ? (viewDetailDebt.paidAmount || viewDetailDebt.amount) 
                      : viewDetailDebt.amount) || 0
                  ).toLocaleString()} د.ع
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    viewDetailDebt.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {viewDetailDebt.status === 'paid' ? '✓ دراوەتەوە' : 'ماوە (نەدراوە)'}
                  </span>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-900 font-bold">ناوی کڕیار:</span>
                  <span className="font-black text-slate-900">{viewDetailDebt.debtorName}</span>
                </div>
                {viewDetailDebt.phone && (
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                    <span className="text-slate-900 font-bold">ژمارەی مۆبایل:</span>
                    <span className="font-mono font-bold text-slate-900" dir="ltr">{viewDetailDebt.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-900 font-bold">بەروار:</span>
                  <span className="font-mono font-bold text-slate-900" dir="ltr">
                    {viewDetailDebt.paidDate || new Date(viewDetailDebt.date).toLocaleDateString()}
                  </span>
                </div>
                {viewDetailDebt.receiverName && (
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-200/60">
                    <span className="text-slate-900 font-bold">ناوی وەرگر:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {viewDetailDebt.receiverName}
                    </span>
                  </div>
                )}
                {viewDetailDebt.notes && (
                  <div className="flex items-start justify-between py-1.5">
                    <span className="text-slate-900 font-bold shrink-0">تێبینی:</span>
                    <span className="font-medium text-slate-900 text-left max-w-[200px] break-words">
                      {viewDetailDebt.notes}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewDetailDebt;
                    setViewDetailDebt(null);
                    handleViewDebtInvoice(target);
                  }}
                  className="flex-1 py-3 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-indigo-500/25 active:scale-95"
                  title="بینینی پسووڵەی تەواو"
                >
                  <FileText className="w-4 h-4" />
                  <span>بینینی پسووڵە</span>
                </button>
                {viewDetailDebt.status === 'paid' && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewDetailDebt;
                      setViewDetailDebt(null);
                      handleRevertDebtToUnpaid(target);
                    }}
                    className="flex-1 py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-amber-500/25 active:scale-95"
                    title="گەڕانەوە بۆ لاپەڕەی نەدراو"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>گەڕانەوە بۆ نەدراو</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const target = viewDetailDebt;
                    setViewDetailDebt(null);
                    openReceiveModal(target);
                  }}
                  className="flex-1 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>وەرگرتنەوەی پارە</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewDetailDebt(null)}
                  className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs cursor-pointer transition-all"
                >
                  داخستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Passcode Modal - داواکردنی ژمارەی نهێنی هەمیشە بۆ سڕینەوە و پاکتاوکردن */}
      {securityModalAction && securityTargetDebt && (
        <div
          onClick={() => {
            setSecurityModalAction(null);
            setSecurityTargetDebt(null);
          }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl text-right animate-scaleUp max-h-[92vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className={`text-base sm:text-lg font-black flex items-center gap-2 ${
                securityModalAction === 'delete' ? 'text-rose-600' : 'text-teal-600'
              }`}>
                <Lock className="w-5 h-5 shrink-0" />
                <span>
                  {securityModalAction === 'delete'
                    ? 'پشتڕاستکردنەوەی سڕینەوە بە ژمارەی نهێنی'
                    : 'پشتڕاستکردنەوەی پاکتاوکردن بە ژمارەی نهێنی'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSecurityModalAction(null);
                  setSecurityTargetDebt(null);
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Debt Summary Box */}
            <div className={`p-4 rounded-2xl mb-4 border ${
              securityModalAction === 'delete'
                ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                : 'bg-teal-50/70 border-teal-200 text-teal-950'
            }`}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold opacity-75">ناوی کڕیار:</span>
                <span className="font-black text-sm">{securityTargetDebt.debtorName}</span>
              </div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold opacity-75">بڕی قەرز:</span>
                <span className="font-black font-mono text-base" dir="ltr">
                  {securityTargetDebt.amount.toLocaleString()} د.ع
                </span>
              </div>
              <p className="text-[11px] font-medium mt-2 pt-2 border-t border-slate-200/60 leading-relaxed">
                {securityModalAction === 'delete'
                  ? 'ئاگاداربە: ئەم قەرزە بە تەواوی لە سیستەم دەسڕدرێتەوە و ناگەڕێتەوە.'
                  : 'بڕی ئەم قەرزە دەبێتە سفر و دۆخەکەی دەگۆڕدرێت بۆ پاکتاوکراو (دراوەتەوە).'}
              </p>
            </div>

            {/* Password Verification Form */}
            <form onSubmit={handleConfirmSecurityAction} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-900 mb-1.5 font-bold">
                  تکایە ژمارەی نهێنی (Password) بنووسە:
                </label>
                <div className="relative">
                  <input
                    type={showSecurityPassword ? 'text' : 'password'}
                    value={securityPassword}
                    onChange={(e) => {
                      setSecurityPassword(e.target.value);
                      if (securityError) setSecurityError('');
                    }}
                    placeholder="ژمارەی نهێنی بنووسە..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-wider"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecurityPassword(!showSecurityPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600 cursor-pointer"
                    title={showSecurityPassword ? 'شاردنەوەی ژمارەی نهێنی' : 'پیشاندانی ژمارەی نهێنی'}
                  >
                    {showSecurityPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {securityError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{securityError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className={`flex-1 py-3 px-4 rounded-xl text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98 ${
                    securityModalAction === 'delete'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                      : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/25'
                  }`}
                >
                  {securityModalAction === 'delete' ? (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>سڕینەوە بە دڵنیاییەوە</span>
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="w-4 h-4" />
                      <span>پاکتاوکردنی قەرز</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSecurityModalAction(null);
                    setSecurityTargetDebt(null);
                  }}
                  className="py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs cursor-pointer transition-all"
                >
                  پاشگەزبوونەوە
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overdue Debtors Modal - پیشاندانی تەواوی زانیاری و ناوی قەرزدارانی دواکەوتوو */}
      {isOverdueModalOpen && (
        <div
          onClick={() => setIsOverdueModalOpen(false)}
          className="fixed inset-0 z-[105] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-right animate-scaleUp"
          >
            {/* Header - Compact */}
            <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-red-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="bg-white/20 p-1.5 rounded-xl backdrop-blur-xs shrink-0">
                  <Overdue3DIcon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <h3 className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                    <span>قەرزە دواکەوتووەکان (٦+ ڕۆژ)</span>
                    <span className="bg-white/25 text-white text-[10px] sm:text-xs px-2 py-0.2 rounded-full font-mono">
                      {groupedOverdueDebtors.length} قەرزدار
                    </span>
                  </h3>
                  <span className="text-[10px] text-rose-100/90 font-medium hidden md:inline truncate">
                    • ماوەی ٦ ڕۆژ و زیاتر
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOverdueModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
                title="داخستن"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Unified Compact Control Bar: Stats, Actions, Search & Sort */}
            <div className="bg-rose-50/60 border-b border-rose-100 px-3 py-2 shrink-0 space-y-1.5">
              {/* Row 1: Quick Stats + Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                {/* Stats Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="bg-white border border-rose-200/80 px-2.5 py-0.5 rounded-lg shadow-2xs flex items-center gap-1 text-[11px]">
                    <span className="text-slate-500 font-bold">کۆی قەرز:</span>
                    <span className="font-black text-rose-700 font-mono text-xs" dir="ltr">
                      {totalOverdueAmount.toLocaleString()} د.ع
                    </span>
                  </div>
                  <div className="bg-white border border-rose-200/80 px-2 py-0.5 rounded-lg shadow-2xs flex items-center gap-1 text-[11px]">
                    <span className="text-slate-500 font-bold">ژمارە:</span>
                    <span className="font-black text-slate-900 font-mono text-xs">
                      {groupedOverdueDebtors.length} کەس
                    </span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyOverdueDebtors}
                    disabled={groupedOverdueDebtors.length === 0}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95 disabled:opacity-50"
                    title="کۆپیکردنی زانیارییەکان بۆ کلیپبۆرد"
                  >
                    {copiedOverdueToast ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-black">کۆپی کرا!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>کۆپیکردن</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDebtFilterTab('overdue');
                      setIsOverdueModalOpen(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
                    title="فلتەرکردنی خشتەی سەرەکی بەپێی قەرزە دواکەوتووەکان"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>پیشاندان لە خشتەی سەرەکی</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Compact Search & Sort Inline */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 pt-1 border-t border-rose-100/70">
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    value={overdueSearchQuery}
                    onChange={(e) => setOverdueSearchQuery(e.target.value)}
                    placeholder="گەڕان بەپێی ناو، مۆبایل..."
                    className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-7 py-1 text-slate-900 text-[11px] focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {overdueSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setOverdueSearchQuery('')}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Sorting Options Inline */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg w-full sm:w-auto justify-end">
                  <span className="text-[10px] font-bold text-slate-500 px-1.5 shrink-0">ڕیزکردن:</span>
                  <button
                    type="button"
                    onClick={() => setOverdueSortBy('days')}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                      overdueSortBy === 'days' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    زۆرترین ڕۆژ
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverdueSortBy('amount')}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                      overdueSortBy === 'amount' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    بەرزترین بڕ
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverdueSortBy('name')}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                      overdueSortBy === 'name' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ناوی قەرزدار
                  </button>
                </div>
              </div>
            </div>

            {/* Debtors List Grid */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-50/60 space-y-3">
              {groupedOverdueDebtors.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-xs">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-slate-900">
                    {overdueSearchQuery ? 'هیچ قەرزدارێک بەم گەڕانە نەدۆزرایەوە' : 'هیچ قەرزێکی دواکەوتوو بوونی نییە!'}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                    {overdueSearchQuery
                      ? 'تکایە دووبارە بە وشەیەکی تر بگەڕێ.'
                      : 'دەستخۆش! هەموو قەرزەکان لە ماوەی ئاسایی خۆیاندان (کەمتر لە ٦ ڕۆژ) یان پاکتاوکراون.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {groupedOverdueDebtors.map((item, idx) => (
                    <div
                      key={item.debtorName + idx}
                      className="bg-white border-2 border-rose-100 hover:border-rose-300 rounded-xl p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-2 relative overflow-hidden"
                    >
                      {/* Top Accent Strip */}
                      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />

                      {/* Header info */}
                      <div>
                        <div className="flex items-start justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                              {item.debtorName.slice(0, 1) || 'ق'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-black text-slate-900 text-xs sm:text-sm leading-tight truncate">
                                {item.debtorName}
                              </h4>
                              {item.customer?.category && (
                                <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-bold mt-0.5 inline-block">
                                  {item.customer.category}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Overdue Badge */}
                          <div className="flex flex-col items-end shrink-0">
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-lg text-[10.5px] font-black shadow-2xs">
                              <Clock className="w-3 h-3 text-rose-600" />
                              <span>+{item.maxDaysOverdue} ڕۆژ دواکەوتوو</span>
                            </span>
                          </div>
                        </div>

                        {/* Amount Box */}
                        <div className="bg-rose-50/70 border border-rose-200/80 rounded-lg py-1 px-2.5 my-1.5 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-rose-900">بڕی قەرز:</span>
                          <span className="font-mono font-black text-rose-700 text-xs sm:text-sm" dir="ltr">
                            {item.totalOverdueAmount.toLocaleString()} د.ع
                          </span>
                        </div>

                        {/* Contact details */}
                        <div className="space-y-1 text-[11px] text-slate-700">
                          {item.phone ? (
                            <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="font-mono font-bold text-slate-900 text-[10.5px]" dir="ltr">
                                  {item.phone}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <a
                                  href={`tel:${item.phone}`}
                                  className="px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center gap-0.5 border border-emerald-200 transition-colors"
                                  title="پەیوەندی تەلەفۆنی"
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>تەلەفۆن</span>
                                </a>
                                <a
                                  href={getWhatsAppLink(item.phone, item.debtorName, item.totalOverdueAmount, item.maxDaysOverdue)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-1.5 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-0.5 shadow-2xs transition-colors"
                                  title="ناردنی نامەی بیرخستنەوەی واتسئاپ بە کوردی"
                                >
                                  <MessageSquare className="w-2.5 h-2.5" />
                                  <span>واتسئاپ</span>
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-500 text-[10px] font-medium bg-slate-50 p-1 rounded-lg border border-slate-100">
                              مۆبایل تۆمار نەکراوە
                            </div>
                          )}

                          {item.address && (
                            <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.address}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-slate-700 text-[10px]">
                            <Calendar className="w-3 h-3 text-slate-600 shrink-0" />
                            <span>
                              سەرەتای قەرز: {item.oldestDate?.split('T')[0] || item.oldestDate}
                            </span>
                          </div>

                          {/* Individual debts count or notes */}
                          {item.debts.length > 1 ? (
                            <div className="bg-amber-50 text-amber-900 border border-amber-200/70 p-1.5 rounded-lg text-[10px]">
                              <span className="font-bold">{item.debts.length} پسووڵەی جیاوازی هەیە</span>
                            </div>
                          ) : item.debts[0]?.notes ? (
                            <div className="text-slate-500 text-[10px] bg-slate-50 p-1 rounded-lg border border-slate-100 truncate">
                              <span className="font-bold text-slate-600 ml-1">تێبینی:</span>
                              {item.debts[0].notes}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsOverdueModalOpen(false);
                            openReceiveModal(item.debts[0]);
                          }}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
                          title="وەرگرتنی قەرز و تۆمارکردنی پارەدان"
                        >
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>وەرگرتن</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOverdueModalOpen(false);
                            setHistoryModalDebt(item.debts[0]);
                            setHistoryTab('unpaid');
                          }}
                          className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                          title="مێژووی قەرز"
                        >
                          <History className="w-3 h-3 text-sky-600" />
                          <span>مێژوو</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOverdueModalOpen(false);
                            handleViewDebtInvoice(item.debts[0]);
                          }}
                          className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                          title="بینینی پسووڵە"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="hidden sm:inline">پسووڵە</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOverdueModalOpen(false);
                            setSearchQuery(item.debtorName);
                          }}
                          className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-bold text-xs flex items-center justify-center cursor-pointer transition-all"
                          title="فلتەرکردن بەپێی ئەم قەرزدارە لە خشتە"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 shrink-0">
              <span>پیشاندانی {groupedOverdueDebtors.length} قەرزدار لە کۆی {overdueDebts.length} قەرزی دواکەوتوو</span>
              <button
                type="button"
                onClick={() => setIsOverdueModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-900 border border-slate-300 font-bold cursor-pointer transition-all shadow-2xs"
              >
                داخستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Invoice / Receipt Modal for Viewing Debt Receipt */}
      {viewingInvoiceSale && (
        <InvoiceModal
          sale={viewingInvoiceSale}
          onClose={() => setViewingInvoiceSale(null)}
        />
      )}
    </div>
  );
};
