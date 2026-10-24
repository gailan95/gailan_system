import { Product, Customer, Sale, Expense, DebtTransaction, Employee } from '../types';
import { formatDateShort, formatTransactionNote } from './formatters';

// Helper to escape CSV cell content
function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// Download helper with UTF-8 BOM for Arabic/Kurdish characters in Google Sheets & Excel
export function downloadCSVFile(csvContent: string, filename: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 1. Export Sales (پسووڵە و فرۆشتنەکان) to CSV for Google Sheets
export function generateSalesCSV(sales: Sale[]): string {
  const headers = [
    'ژمارەی پسووڵە (Invoice No)',
    'بەروار (Date)',
    'ناوی کڕیار (Customer)',
    'مۆبایلی کڕیار (Phone)',
    'کۆی گشتی کاڵاکان (Items Summary)',
    'کۆی پارە - د.ع (Total Amount)',
    'بڕی پارەی دراو - د.ع (Paid Amount)',
    'بڕی قەرز - د.ع (Debt Amount)',
    'شێوازی پارەدان (Payment Type)',
    'سافی قازانج - د.ع (Profit)',
    'تێبینی (Notes)',
  ];

  const rows = sales.map((sale) => {
    const itemsSummary = sale.items
      .map((item) => `${item.productName} (${item.quantity} ${item.unit} x ${item.sellingPrice})`)
      .join(' | ');

    const paymentTypeKurdish =
      sale.paymentType === 'cash'
        ? 'کاش'
        : sale.paymentType === 'debt'
        ? 'قەرز'
        : 'کاش و قەرز';

    return [
      escapeCSV(sale.invoiceNumber),
      escapeCSV(formatDateShort(sale.date)),
      escapeCSV(sale.customerName),
      escapeCSV(sale.customerPhone || '-'),
      escapeCSV(itemsSummary),
      escapeCSV(sale.total),
      escapeCSV(sale.paidAmount),
      escapeCSV(sale.debtAmount),
      escapeCSV(paymentTypeKurdish),
      escapeCSV(sale.profit || 0),
      escapeCSV(sale.notes || ''),
    ].join(',');
  });

  return [headers.map(escapeCSV).join(','), ...rows].join('\n');
}

// 2. Export Customers & Debts (کڕیاران و قەرزەکان) to CSV
export function generateCustomersCSV(customers: Customer[]): string {
  const headers = [
    'ناوی کڕیار (Customer Name)',
    'ژمارەی مۆبایل (Phone)',
    'کۆی قەرزی ئێستا - د.ع (Current Debt)',
    'ناونیشان (Address)',
    'دۆخی قەرز (Status)',
    'بەرواری تۆمارکردن (Created Date)',
    'تێبینی (Notes)',
  ];

  const rows = customers.map((c) => {
    const status = c.totalDebt > 0 ? 'قەرزدار' : 'بێ قەرز';
    return [
      escapeCSV(c.name),
      escapeCSV(c.phone || '-'),
      escapeCSV(c.totalDebt),
      escapeCSV(c.address || '-'),
      escapeCSV(status),
      escapeCSV(formatDateShort(c.createdAt)),
      escapeCSV(c.notes || ''),
    ].join(',');
  });

  return [headers.map(escapeCSV).join(','), ...rows].join('\n');
}

// 3. Export Products & Inventory (کاڵاکان و کۆگا) to CSV
export function generateProductsCSV(products: Product[]): string {
  const headers = [
    'ناوی کاڵا (Product Name)',
    'کۆد (Code)',
    'یەکەی پێوانە (Unit)',
    'مەوجودی کۆگا (Current Stock)',
    'نرخی کڕین / دانە - د.ع (Purchase Price)',
    'نرخی فرۆشتن / دانە - د.ع (Selling Price)',
    'کرێی گواستنەوە - د.ع (Transportation Fee)',
    'کرێی کرێکار - د.ع (Worker Fee)',
    'کرێی رافعە - د.ع (Forklift Fee)',
    'کرێی تر - د.ع (Other Fee)',
    'خەرجی تر - د.ع (Other Expense)',
    'قازانج بۆ هەر دانەیەک - د.ع (Profit / Unit)',
    'کۆی سەرمایەی کاڵاکە - د.ع (Total Inventory Cost)',
    'کۆی نرخی فرۆشتنی مەوجود - د.ع (Total Potential Revenue)',
    'کەمترین ئاگادارکردنەوەی کۆگا (Min Stock Alert)',
    'تێبینی (Notes)',
  ];

  const rows = products.map((p) => {
    const profitPerUnit = p.sellingPrice - p.purchasePrice;
    const totalCost = p.stock * p.purchasePrice;
    const totalRevenue = p.stock * p.sellingPrice;

    return [
      escapeCSV(p.name),
      escapeCSV(p.barcode || '-'),
      escapeCSV(p.unit),
      escapeCSV(p.stock),
      escapeCSV(p.purchasePrice),
      escapeCSV(p.sellingPrice),
      escapeCSV(p.driverFee || 0),
      escapeCSV(p.workerFee || 0),
      escapeCSV(p.forkliftFee || 0),
      escapeCSV(p.otherFee || 0),
      escapeCSV(p.expenseFee || 0),
      escapeCSV(profitPerUnit),
      escapeCSV(totalCost),
      escapeCSV(totalRevenue),
      escapeCSV(p.minStockAlert),
      escapeCSV(p.notes || ''),
    ].join(',');
  });

  return [headers.map(escapeCSV).join(','), ...rows].join('\n');
}

// 4. Export Expenses (خەرجییەکان) to CSV
export function generateExpensesCSV(expenses: Expense[]): string {
  const headers = [
    'ناونیشانی خەرجی (Title)',
    'جۆری پۆلێن (Category)',
    'بڕی پارە - د.ع (Amount)',
    'بەروار (Date)',
    'وەرگر (Recipient)',
    'تۆمارکەر (Recorder)',
    'تێبینی (Notes)',
  ];

  const rows = expenses.map((e) => {
    return [
      escapeCSV(e.title),
      escapeCSV(e.category),
      escapeCSV(e.amount),
      escapeCSV(formatDateShort(e.date)),
      escapeCSV(e.recipient || ''),
      escapeCSV(e.recordedBy || (e as any).recorderName || ''),
      escapeCSV(e.notes || ''),
    ].join(',');
  });

  return [headers.map(escapeCSV).join(','), ...rows].join('\n');
}

// 5. Export Debt Transactions (مێژووی جووڵەی قەرزەکان) to CSV
export function generateDebtTransactionsCSV(
  transactions: DebtTransaction[],
  customers: Customer[]
): string {
  const headers = [
    'بەروار (Date)',
    'ناوی کڕیار (Customer Name)',
    'جۆری جووڵە (Type)',
    'بڕی پارە - د.ع (Amount)',
    'تێبینی (Notes)',
  ];

  const rows = transactions.map((t) => {
    const customer = customers.find((c) => c.id === t.customerId);
    const customerName = customer ? customer.name : t.customerName || 'نەزانراو';
    const typeKurdish =
      t.type === 'repayment'
        ? 'وەرگرتنەوەی قەرز (پارەدان)'
        : 'زیادکردنی قەرز';

    return [
      escapeCSV(formatDateShort(t.date)),
      escapeCSV(customerName),
      escapeCSV(typeKurdish),
      escapeCSV(t.amount),
      escapeCSV(formatTransactionNote(t.notes || '')),
    ].join(',');
  });

  return [headers.map(escapeCSV).join(','), ...rows].join('\n');
}

// 6. Export Employees & Form Entries (فەرمانبەران و تۆمارەکان) to CSV
export function generateEmployeesCSV(employees: Employee[]): string {
  const headers = [
    'ناوی فەرمانبەر / کڕیار (Name)',
    'کۆدی تۆمار (ID)',
    'ڕەگەز (Gender)',
    'بەش (Department)',
    'مۆبایل (Phone)',
    'کاڵا (Product)',
    'بڕ (Quantity)',
    'کۆی پارە - د.ع (Total Amount)',
    'پارەی دراو - د.ع (Paid Amount)',
    'پارەی ماوە / قەرز - د.ع (Debt Amount)',
    'بەروار (Date)',
  ];

  const rows = employees.map((emp) => {
    return [
      escapeCSV(emp.name),
      escapeCSV(emp.employeeId || '-'),
      escapeCSV(emp.gender || '-'),
      escapeCSV(emp.department || '-'),
      escapeCSV(emp.phone || '-'),
      escapeCSV(emp.productName || '-'),
      escapeCSV(emp.quantity || 0),
      escapeCSV(emp.totalAmount || 0),
      escapeCSV(emp.paidAmount || 0),
      escapeCSV(emp.debtAmount || 0),
      escapeCSV(formatDateShort(emp.createdAt)),
    ].join(',');
  });

  return [headers.map(escapeCSV).join(','), ...rows].join('\n');
}

// 7. Complete Database Combined CSV
export function generateAllInOneCSV(data: {
  sales: Sale[];
  customers: Customer[];
  products: Product[];
  expenses: Expense[];
  debtTransactions: DebtTransaction[];
  employees?: Employee[];
}): string {
  const sections: string[] = [];

  // Section 1: Sales
  sections.push('=== خشتەی فرۆش و پسووڵەکان (SALES & INVOICES) ===');
  sections.push(generateSalesCSV(data.sales));
  sections.push('\n');

  // Section 2: Customers & Debts
  sections.push('=== خشتەی کڕیاران و قەرزەکان (CUSTOMERS & DEBTS) ===');
  sections.push(generateCustomersCSV(data.customers));
  sections.push('\n');

  // Section 3: Products & Inventory
  sections.push('=== خشتەی کاڵاکان و کۆگا (PRODUCTS & INVENTORY) ===');
  sections.push(generateProductsCSV(data.products));
  sections.push('\n');

  // Section 4: Expenses
  sections.push('=== خشتەی خەرجییەکان (EXPENSES) ===');
  sections.push(generateExpensesCSV(data.expenses));
  sections.push('\n');

  // Section 5: Debt History
  sections.push('=== خشتەی مێژووی وەرگرتن و جووڵەی قەرزەکان (DEBT TRANSACTIONS) ===');
  sections.push(generateDebtTransactionsCSV(data.debtTransactions, data.customers));

  if (data.employees && data.employees.length > 0) {
    sections.push('\n');
    sections.push('=== خشتەی تۆمارەکانی فۆرم و فەرمانبەران (FORM ENTRIES & EMPLOYEES) ===');
    sections.push(generateEmployeesCSV(data.employees));
  }

  return sections.join('\n');
}
