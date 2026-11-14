export type ScaledMoney = number;
export type BasisPoints = number;

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

export interface Invoice extends InvoiceLedgerFields {
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
  pricesIncludeTax?: boolean;
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
  balance: number; // موجب = مديونية على العميل لصالح المتجر، سالب = رصيد دائن للعميل
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
  security?: SecurityPolicySettings;
  storeName: string;
  storeNameEn: string;
  taxNumber: string; // البطاقة الضريبية / الرقم الضريبي
  crNumber: string; // السجل التجاري
  branchName: string;
  address: string;
  phone: string;
  enableTax: boolean; // خيار إلغاء أو تفعيل الضريبة للمرونة التامة
  defaultTaxRate: number; // 0.14 for Egypt 14% or custom
  pricesIncludeTax?: boolean; // true when sale prices already include VAT
  currency: string; // ج.م
  currencyEn: string; // EGP
  currencyFormat?: 'ar' | 'en' | 'both'; // 'ar' => 1,250.00 ج.م, 'en' => 1,250.00 EGP, 'both' => 1,250.00 ج.م (EGP)
  receiptFooterMessage: string;
  autoPrintReceipt: boolean;
  enableAudioBeep: boolean;
  lowStockThreshold: number;
  theme: 'light' | 'dark' | 'system';
  /** Local hourly/versioned backup while the app is open. */
  localBackupEnabled?: boolean;
  localBackupIntervalMinutes?: number;
  /** Google Drive keeps one replaceable daily file and retries pending days after reconnecting. */
  googleDriveAutoSyncEnabled?: boolean;
  googleDriveSyncIntervalMinutes?: number;
  /** Legacy fields retained only to read older saved settings. */
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
// ===== الصلاحيات (9.7) =====
export type PermissionKey =
  | 'sale.create' | 'sale.hold' | 'sale.discount.up_to_10' | 'sale.discount.over_10'
  | 'refund.partial' | 'refund.full' | 'credit.limit.exceed' | 'cart.remove_after_add'
  | 'invoice.void_open_shift' | 'receipt.reprint' | 'drawer.cash_in' | 'drawer.cash_out'
  | 'shift.open' | 'shift.close' | 'shift.reopen' | 'product.price_edit' | 'product.archive'
  | 'stock.adjust' | 'purchase.create' | 'reports.financial.view' | 'tax.decision.approve'
  | 'user.manage' | 'security.settings' | 'backup.export' | 'backup.restore' | 'override.manage';

export type RoleKey = 'owner' | 'manager' | 'supervisor' | 'cashier' | 'accountant';

export interface Role {
  key: RoleKey;
  label: string;
  isSystem: boolean;
  permissions: PermissionKey[];
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  roleKey: RoleKey;
  pinHash: string;
  pinSalt: string;
  isActive: boolean;
  createdAt: number;
  createdBy: string;
}

export interface OverrideCeiling {
  maxAmount: ScaledMoney;
  maxDiscountPercent: number;
}

export interface SecurityPolicySettings {
  cartRemoveGraceSeconds: number;
  blindCloseStrict: boolean;
  varianceToleranceCents: ScaledMoney;
  drawerFreeLimit: ScaledMoney;
  drawerFreeShiftTotal: ScaledMoney;
  overrideWarnPerShift: number;
  overrideHardCapPerShift: number;
  minShelfLifeDaysForRestock: number;
  auditRetentionYears: number;
  ceilings: Record<string, Record<'supervisor' | 'manager', OverrideCeiling>>;
}

export interface AuditLogEntry {
  id: string;
  seq: number;
  createdAt: number;
  userId: string;
  userNameSnapshot: string;
  roleSnapshot: RoleKey;
  deviceId: string;
  sessionId: string;
  actionKey: string;
  category: string;
  severity: 'info' | 'warning' | 'critical';
  result: 'success' | 'failure' | 'denied';
  appVersion: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export interface Shift {
  id: string;
  openedAt: number;
  openedBy: string;
  openingFloat: ScaledMoney;
  closedAt?: number;
  closedBy?: string;
  expectedCash?: ScaledMoney;
  countedCash?: ScaledMoney;
  variance?: ScaledMoney;
  status: 'open' | 'closed' | 'reopened';
}

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber?: string;
  receivedAt: number;
  expiresAt?: number;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: ScaledMoney;
}

export interface CreditNoteLine {
  id: string;
  productId: string;
  quantity: number;
  refundNet: ScaledMoney;
  refundTax: ScaledMoney;
  reasonCode: 'defective' | 'wrong_item' | 'changed_mind' | 'pricing_error' | 'other';
  batchAllocations: { batchId: string; quantity: number }[];
  restock: 'to_original_batch' | 'new_batch' | 'quarantine' | 'none';
}

export interface CreditNote {
  id: string;
  number: string;
  invoiceId: string;
  invoiceNumber: string;
  createdAt: number;
  shiftId?: string;
  userId: string;
  approvedBy?: string;
  overrideGrantId?: string;
  lines: CreditNoteLine[];
  totalRefund: ScaledMoney;
  refundMethod: 'cash' | 'original_method' | 'customer_balance' | 'exchange';
  reason: string;
  rateRule: 'original' | 'effective_at_return';
  decisionId?: string;
}

export interface InvoiceLedgerFields {
  shiftId?: string;
  userId?: string;
  printCount?: number;
  reprintCount?: number;
  receiptSnapshot?: Record<string, unknown>;
  voidedAt?: number;
  voidedBy?: string;
  voidReason?: string;
  paymentReversalRef?: string;
  etaSubmitted?: boolean;
}
