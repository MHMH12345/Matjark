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
  approvalTier: 0 | 1 | 2 | 3;
}

export type PermissionEffect = 'allow' | 'override' | 'deny';

export interface OverrideCeiling {
  maxAmount?: ScaledMoney;
  maxPercentBp?: BasisPoints;
}

export interface Permission {
  key: PermissionKey;
  label: string;
  group: string;
  sensitive: boolean;
}

export interface RolePermission {
  roleKey: RoleKey;
  permission: PermissionKey;
  effect: PermissionEffect;
  ceiling?: OverrideCeiling;
}

export interface UserPermissionOverride {
  id: string;
  userId: string;
  permission: PermissionKey;
  effect: PermissionEffect;
  grantedBy: string;
  reason: string;
  expiresAt?: number;
  createdAt: number;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  roleKey: RoleKey;
  pinHash: string;
  pinSalt: string;
  passwordHash?: string;
  passwordSalt?: string;
  isActive: boolean;
  lastLoginAt?: number;
  createdAt: number;
  createdBy: string;
  archivedAt?: number;
}

export type ShiftStatus = 'open' | 'closing' | 'closed';

export interface Shift {
  id: string;
  shiftNumber: number;
  drawerId: string;
  deviceId: string;
  status: ShiftStatus;
  openedBy: string;
  openedAt: number;
  openingBalance: ScaledMoney;
  closedBy?: string;
  closedOnBehalfOf?: string;
  closedAt?: number;
  countedCash?: ScaledMoney;
  expectedCash?: ScaledMoney;
  variance?: ScaledMoney;
  varianceNote?: string;
  recountCount: number;
  revision: number;
  overrideCountByUser: Record<string, number>;
}

export type DrawerMovementKind =
  | 'opening' | 'cash_sale' | 'cash_refund' | 'expense'
  | 'cash_out' | 'cash_in' | 'safe_drop'
  | 'shift_variance' | 'post_close_adjustment' | 'closing';

export interface CashDrawerMovement {
  id: string;
  seq: number;
  shiftId: string;
  kind: DrawerMovementKind;
  amount: ScaledMoney;
  reasonCode?: string;
  note?: string;
  refType?: 'invoice' | 'credit_note' | 'expense' | 'purchase';
  refId?: string;
  userId: string;
  approvedBy?: string;
  overrideGrantId?: string;
  createdAt: number;
}

export interface PurchaseInvoiceLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  bonusQuantity?: number;
  unitCost: ScaledMoney;
  taxRateBp: BasisPoints;
  batchNumber?: string;
  expiryDate?: string;
}

export interface PurchaseInvoice {
  id: string;
  number: string;
  supplierId: string;
  supplierInvoiceNumber?: string;
  date: number;
  lines: PurchaseInvoiceLine[];
  subtotal: ScaledMoney;
  taxTotal: ScaledMoney;
  total: ScaledMoney;
  paid: ScaledMoney;
  paymentMethod: PaymentMethod;
  status: 'draft' | 'posted' | 'reversed';
  reversalOf?: string;
  shiftId?: string;
  postedBy: string;
  createdAt: number;
}

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string;
  receivedAt: number;
  expiryDate?: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: ScaledMoney;
  sourceType: 'purchase' | 'opening' | 'credit_note' | 'adjustment';
  sourceId?: string;
  status: 'active' | 'quarantine' | 'expired' | 'depleted';
}

export type AuditCategory =
  | 'auth' | 'override' | 'sale' | 'refund' | 'void' | 'drawer' | 'shift'
  | 'inventory' | 'purchase' | 'settings' | 'security' | 'backup' | 'tax';

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
  category: AuditCategory;
  severity: 'info' | 'warning' | 'critical';
  result: 'success' | 'denied' | 'failed' | 'cancelled';
  targetType?: string;
  targetId?: string;
  shiftId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  approvedBy?: string;
  selfApproved?: boolean;
  overrideGrantId?: string;
  appVersion: string;
  prevHash: string;
  hash: string;
}

export interface OverrideSummaryRow {
  label: string;
  value: string;
}

export interface OverrideRequest {
  id: string;
  actionKey: PermissionKey;
  requesterId: string;
  targetType: string;
  targetId?: string;
  summary: OverrideSummaryRow[];
  status: 'pending' | 'granted' | 'denied' | 'cancelled' | 'expired';
  approverId?: string;
  selfApproved: boolean;
  attempts: number;
  createdAt: number;
  resolvedAt?: number;
  grantId?: string;
}

export interface OverrideGrant {
  id: string;
  requestId: string;
  approverId: string;
  actionKey: PermissionKey;
  targetId?: string;
  issuedAt: number;
  expiresAt: number;
  consumedAt?: number;
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

