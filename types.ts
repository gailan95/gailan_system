export type ActiveTab =
  | 'main'
  | 'pos'
  | 'inventory'
  | 'inventory_dry'
  | 'debts'
  | 'profit_loss'
  | 'expenses'
  | 'closed'
  | 'capital'
  | 'accounts'
  | 'storage'
  | 'charts'
  | 'settings'
  | 'commission';

export type UserRole = 'admin' | 'cashier' | 'accountant' | 'owner' | 'manager';

export type Currency = 'IQD' | 'USD' | (string & {});

export type FeeCategory = 'driver' | 'worker' | 'forklift' | 'expense' | 'other' | string;

export interface FeePayment {
  id: string;
  feeType?: string;
  category?: FeeCategory;
  amount: number;
  note?: string;
  notes?: string;
  date: string;
  recipientName?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
  role: UserRole;
  phone?: string;
  email?: string;
  avatarColor?: string;
  image?: string;
  avatar?: string;
  createdAt: string;
  sessionToken?: string;
  sessionExpiresAt?: string;
  lastLogin?: string;
  permissions?: string[];
  firebaseUid?: string;
  emailVerified?: boolean;
}

export interface CommissionTransaction {
  id: string;
  date: string;
  type: 'buy' | 'pay' | 'sell' | 'receive';
  amount: number;
  productName?: string;
  notes?: string;
  recordedBy?: string;
  paymentMethod?: string;
}

export interface CommissionAccount {
  id: string;
  name: string;
  phone?: string;
  carNumber?: string;
  address?: string;
  age?: string | number;
  image?: string;
  balance: number;
  transactions: CommissionTransaction[];
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price?: number;
  cost?: number;
  quantity?: number;
  ownerName?: string;
  carNumber?: string;
  unit?: string;
  dateAdded?: string;
  isClosed?: boolean;
  barcode?: string;
  totalSales?: number;
  salesRevenue?: number;
  feePayments?: any;
  shareholderPercentage?: number;
  shareholderName?: string;
  initialStock?: number;
  stock?: number;
  purchasePriceTotal?: number;
  purchasePrice?: number;
  driverFee?: number;
  driverFeeTotal?: number;
  workerFeeUnit?: number | string | any;
  initialCount?: number;
  count?: number;
  workerFeeTotal?: number;
  workerFee?: number;
  forkliftFeeTotal?: number;
  forkliftFee?: number;
  expenseFeeTotal?: number;
  expenseFee?: number;
  otherFeeTotal?: number;
  otherFee?: number;
  sellingPrice?: number;
  driverName?: string;
  notes?: string;
  driverPhone?: string;
  createdAt?: string;
  updatedAt?: string;
  imageUrl?: string;
  commissionPercent?: number | string | any;
  commissionAmount?: number;
  safiAmount?: number;
  isCommissionSettled?: boolean;
  minStockAlert?: number;
  type?: string;
  purchaseDate?: string;
  closedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  totalDebt?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SaleItem {
  id?: string;
  productId?: string;
  barcode?: string;
  productName?: string;
  name?: string;
  quantity?: number;
  price?: number;
  sellingPrice?: number;
  unit?: string;
  count?: number;
  total?: number;
  cost?: number;
  profit?: number;
  date?: string;
  items?: any[];
  customerName?: string;
  customerPhone?: string;
  sellerName?: string;
  invoiceNumber?: string;
  debtAmount?: number;
  paidAmount?: number;
  paymentType?: 'cash' | 'debt' | 'mixed' | 'partial' | string;
  discount?: number;
  notes?: string;
  weight?: number;
  cropOwner?: string;
  purchasePrice?: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  debtAmount: number;
  paymentType: 'cash' | 'debt' | 'mixed' | 'partial' | string;
  sellerName: string;
  date: string;
  notes?: string;
  totalCost?: number;
  profit?: number;
  previousDebt?: number;
  storeName?: string;
  officeNumber?: string;
}

export interface ProductMovement {
  id: string;
  saleId: string;
  invoiceNumber: string;
  productId: string;
  barcode: string;
  productName: string;
  customerName: string;
  customerId?: string;
  date: string;
  quantity: number;
  count?: number;
  unit?: string;
  sellingPrice: number;
  purchasePrice?: number;
  totalAmount: number;
  totalCost?: number;
  profit?: number;
  notes?: string;
}

export type ProductSaleMovement = ProductMovement;

export interface DebtRecord {
  id: string;
  debtorName: string;
  amount: number;
  phone?: string;
  date: string;
  notes?: string;
  status: 'pending' | 'paid';
  receiverName?: string;
  paidDate?: string;
  paidAmount?: number;
  remainingAmount?: number;
  parentDebtId?: string;
  originalAmount?: number;
}

export interface DebtTransaction {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  type: 'debt' | 'payment' | 'repayment' | 'increase' | string;
  date: string;
  collectorName?: string;
  notes?: string;
  saleId?: string;
}

export interface ExpenseItem {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  recipient?: string;
  recordedBy?: string;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  recipient?: string;
  recorderName?: string;
  recordedBy?: string;
  notes?: string;
  isArchived?: boolean;
}

export interface ShareholderProfile {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  age?: string | number;
  image?: string;
  notes?: string;
  createdAt: string;
}

export interface ShareholderTransaction {
  id: string;
  name: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  date: string;
  notes?: string;
  phone?: string;
  address?: string;
  age?: string | number;
  image?: string;
  recordedBy?: string;
}

export interface Employee {
  id: string;
  employeeId?: string;
  name: string;
  phone?: string;
  address?: string;
  department?: string;
  salary?: number;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  quantity?: number;
  totalAmount?: number;
  productName?: string;
  saleId?: string;
  productBarcode?: string;
  debtAmount?: number;
  unit?: string;
  productId?: string;
  paidAmount?: number;
  items?: any[];
  gender?: string;
  count?: number;
}

export interface ClosedProductArchive {
  id: string;
  productId: string;
  name: string;
  barcode: string;
  category: string;
  unit?: string;
  purchasePrice?: number;
  purchasePriceTotal?: number;
  driverFee?: number;
  driverFeeTotal?: number;
  workerFee?: number;
  workerFeeTotal?: number;
  forkliftFee?: number;
  forkliftFeeTotal?: number;
  otherFee?: number;
  expenseFee?: number;
  commissionPercent?: number;
  commissionAmount?: number;
  safiAmount?: number;
  isCommissionSettled?: boolean;
  ownerName?: string;
  driverName?: string;
  carNumber?: string;
  driverPhone?: string;
  feePayments?: any[];
  baseCost?: number;
  stockAtClose?: number;
  initialStock?: number;
  totalSoldQty?: number;
  totalRevenue?: number;
  totalRev?: number;
  totalCost?: number;
  netProfit?: number;
  houseProfit?: number;
  closedAt?: string;
  createdAt?: string;
  isClosed?: boolean;
  isDeletedFromInventory?: boolean;
  notes?: string;
  shareholderName?: string;
  shareholderPercentage?: number;
}

export interface AppSettings {
  storeName: string;
  currency: string;
  phone: string;
  address: string;
  officeNumber?: string;
  marketSubtitle?: string;
  managementLabel?: string;
  managerNames?: string;
  phoneOwner1?: string;
  phoneOwner2?: string;
  invoiceFooterMessage?: string;
  phone2?: string;
  securityPasscode?: string;
  defaultCommissionPercent?: number | string | any;
  usdToIqdRate?: number;
  showReceiptLogo?: boolean;
  receiptLogoUrl?: string;
  shareholdersEquity?: number;
}

export interface UserSessionLog {
  id: string;
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  loginTime: string;
  lastActiveTime: string;
  durationMinutes: number;
  isActive: boolean;
}

export interface ActivityLogItem {
  id: string;
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  actionType: string;
  description: string;
  timestamp: string;
}
