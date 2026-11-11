export type PaymentMethod = 'cash' | 'card' | 'wallet' | 'transfer' | 'credit';

export type InvoiceStatus = 'completed' | 'refunded' | 'partially_refunded' | 'voided';

export interface Product {
  id: string;
  name: string;
  nameEn?: string;
  barcode: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStockAlert: number;
  taxRate: number; // e.g. 0.14 for 14% or 0 if tax disabled
  unit: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number; // Sale price at time of cart addition
  discount: number; // Fixed amount discount per item
  taxRate: number;
  notes?: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  timestamp: number;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeDue: number;
  customerId?: string;
  customerName?: string;
  customerTaxNumber?: string;
  cashierName: string;
  status: InvoiceStatus;
  isTaxEnabled: boolean;
  zatcaQrString?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  taxNumber?: string;
  email?: string;
  address?: string;
  balance: number; // Positive = credit owed to store, negative = debt
  createdAt: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  taxNumber?: string;
  companyName: string;
  balance: number;
  createdAt: number;
}

export interface Expense {
  id: string;
  title: string;
  category: 'rent' | 'salaries' | 'utilities' | 'inventory_purchase' | 'maintenance' | 'marketing' | 'other';
  amount: number;
  taxAmount: number;
  date: number;
  paymentMethod: PaymentMethod;
  supplierId?: string;
  notes?: string;
  receiptNumber?: string;
}

export interface StoreSettings {
  storeName: string;
  storeNameEn: string;
  taxNumber: string; // البطاقة الضريبية / الرقم الضريبي
  crNumber: string; // السجل التجاري
  branchName: string;
  address: string;
  phone: string;
  enableTax: boolean; // خيار إلغاء أو تفعيل الضريبة للمرونة التامة
  defaultTaxRate: number; // 0.14 for Egypt 14% or custom
  currency: string; // ج.م
  currencyEn: string; // EGP
  currencyFormat?: 'ar' | 'en' | 'both'; // 'ar' => 1,250.00 ج.م, 'en' => 1,250.00 EGP, 'both' => 1,250.00 ج.م (EGP)
  receiptFooterMessage: string;
  autoPrintReceipt: boolean;
  enableAudioBeep: boolean;
  lowStockThreshold: number;
  theme: 'light' | 'dark' | 'system';
  googleDriveConnected?: boolean;
  lastGoogleDriveBackup?: number;
}

export interface PerformanceBenchmarkResult {
  operation: string;
  unoptimizedTimeMs: number;
  optimizedTimeMs: number;
  improvementPercentage: number;
  itemsProcessed: number;
}
