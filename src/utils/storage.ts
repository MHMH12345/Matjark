/**
 * Asynchronous, debounced storage engine with backup and restore.
 * Preloaded with authentic Egyptian market store catalog in Egyptian Pounds (ج.م / EGP).
 */

import { Customer, Expense, Invoice, Product, StoreSettings, Supplier } from '../types';

export interface AppDatabase {
  products: Product[];
  invoices: Invoice[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
  settings: StoreSettings;
  version: number;
  nextInvoiceSequence?: number;
  nextExpenseSequence?: number;
}

const STORAGE_KEY = 'matjark_store_db_v2_egp';

const getNextInvoiceSequence = (invoices: Invoice[]): number => {
  const highest = invoices.reduce((max, invoice) => {
    const match = invoice.invoiceNumber.match(/^INV-(?:[0-9]{4}-)?([0-9]+)$/);
    return match ? Math.max(max, Number(match[1]) || 0) : max;
  }, 0);
  return highest + 1;
};

const getNextExpenseSequence = (expenses: Expense[]): number => {
  const highest = expenses.reduce((max, expense) => {
    const match = expense.receiptNumber?.match(/^EXP-(?:[0-9]{4}-)?([0-9]+)$/);
    return match ? Math.max(max, Number(match[1]) || 0) : max;
  }, 0);
  return highest + 1;
};

const ensureDatabaseSequences = (db: AppDatabase): AppDatabase => ({
  ...db,
  nextInvoiceSequence: Math.max(
    Number.isSafeInteger(db.nextInvoiceSequence) && (db.nextInvoiceSequence ?? 0) > 0
      ? db.nextInvoiceSequence!
      : 1,
    getNextInvoiceSequence(db.invoices)
  ),
  nextExpenseSequence: Math.max(
    Number.isSafeInteger(db.nextExpenseSequence) && (db.nextExpenseSequence ?? 0) > 0
      ? db.nextExpenseSequence!
      : 1,
    getNextExpenseSequence(db.expenses)
  ),
});

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'سوبر ماركت البركة',
  storeNameEn: 'El-Baraka Supermarket',
  taxNumber: '412-895-321', // رقم التسجيل الضريبي / البطاقة الضريبية
  crNumber: '109842', // السجل التجاري
  branchName: 'فرع المعادي - القاهرة',
  address: 'شارع النصر، المعادي الجديدة، القاهرة، جمهورية مصر العربية',
  phone: '01012345678',
  enableTax: true, // VAT is enabled by default for the Egyptian sample store.
  defaultTaxRate: 0.14, // ضريبة القيمة المضافة المصرية 14%
  pricesIncludeTax: true, // Shelf and POS prices are final prices that already include VAT.
  currency: 'ج.م',
  currencyEn: 'EGP',
  currencyFormat: 'ar',
  receiptFooterMessage: 'شكرًا لتعاملكم معنا! البضاعة المباعة تستبدل وترد خلال 14 يومًا بموجب الفاتورة.',
  autoPrintReceipt: true,
  enableAudioBeep: true,
  lowStockThreshold: 10,
  theme: 'light',
  googleDriveConnected: false,
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'سمنة روابي نباتي صافي 700 جم',
    nameEn: 'Rawabi Pure Ghee 700g',
    barcode: '622100100101',
    category: 'زيوت وسمن',
    costPrice: 58.0,
    salePrice: 68.0,
    stock: 45,
    minStockAlert: 10,
    taxRate: 0.14,
    unit: 'علبة',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now(),
  },
  {
    id: 'prod-2',
    name: 'أرز مصري ممتاز الحبة الرفيعة 1 كجم',
    nameEn: 'Egyptian White Rice 1kg',
    barcode: '622100100102',
    category: 'بقوليات وحبوب',
    costPrice: 26.0,
    salePrice: 32.0,
    stock: 80,
    minStockAlert: 15,
    taxRate: 0.14,
    unit: 'كيس',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now(),
  },
  {
    id: 'prod-3',
    name: 'شاي العروسة ناعم عبوة 250 جم',
    nameEn: 'El-Arosa Black Tea 250g',
    barcode: '622100100103',
    category: 'مشروبات وشاي',
    costPrice: 42.0,
    salePrice: 50.0,
    stock: 65,
    minStockAlert: 12,
    taxRate: 0.14,
    unit: 'باكت',
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now(),
  },
  {
    id: 'prod-4',
    name: 'زيت عباد الشمس كريستال نقي 800 مل',
    nameEn: 'Crystal Sunflower Oil 800ml',
    barcode: '622100100104',
    category: 'زيوت وسمن',
    costPrice: 62.0,
    salePrice: 72.0,
    stock: 35,
    minStockAlert: 8,
    taxRate: 0.14,
    unit: 'زجاجة',
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now(),
  },
  {
    id: 'prod-5',
    name: 'مكرونة الملكة أقلام فاخرة 400 جم',
    nameEn: 'El-Maleka Penne Pasta 400g',
    barcode: '622100100105',
    category: 'بقوليات وحبوب',
    costPrice: 11.5,
    salePrice: 15.0,
    stock: 120,
    minStockAlert: 25,
    taxRate: 0.14,
    unit: 'كيس',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now(),
  },
  {
    id: 'prod-6',
    name: 'جبنة دومتي بلس فيتا طبيعي 500 جم',
    nameEn: 'Domty Plus Feta Cheese 500g',
    barcode: '622100100106',
    category: 'ألبان وأجبان',
    costPrice: 28.0,
    salePrice: 35.0,
    stock: 40,
    minStockAlert: 10,
    taxRate: 0.14,
    unit: 'علبة',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now(),
  },
  {
    id: 'prod-7',
    name: 'سكر أبيض بلوري نقي مكرر 1 كجم',
    nameEn: 'Refined White Sugar 1kg',
    barcode: '622100100107',
    category: 'بقالة أساسية',
    costPrice: 31.0,
    salePrice: 36.0,
    stock: 5, // تنبيه نقص المخزون
    minStockAlert: 15,
    taxRate: 0.14,
    unit: 'كيس',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now(),
  },
  {
    id: 'prod-8',
    name: 'بن محوج هيل سادة ممتاز 200 جم',
    nameEn: 'Premium Cardamom Coffee 200g',
    barcode: '622100100108',
    category: 'مشروبات وشاي',
    costPrice: 85.0,
    salePrice: 105.0,
    stock: 22,
    minStockAlert: 6,
    taxRate: 0.14,
    unit: 'عبوة',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now(),
  },
  {
    id: 'prod-9',
    name: 'تونة صن شاين قطع بزيت دوار الشمس 170 جم',
    nameEn: 'Sunshine Chunk Tuna in Oil 170g',
    barcode: '622100100109',
    category: 'معلبات ومحفوظات',
    costPrice: 48.0,
    salePrice: 58.0,
    stock: 30,
    minStockAlert: 8,
    taxRate: 0.14,
    unit: 'علبة',
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now(),
  },
  {
    id: 'prod-10',
    name: 'مسحوق غسيل أوتوماتيك لافندر مركز 2.5 كجم',
    nameEn: 'Automatic Laundry Powder Lavender 2.5kg',
    barcode: '622100100110',
    category: 'منظفات وعناية',
    costPrice: 155.0,
    salePrice: 185.0,
    stock: 14,
    minStockAlert: 5,
    taxRate: 0.14,
    unit: 'شيكارة',
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now(),
  },
  {
    id: 'prod-11',
    name: 'مناديل ورقية سحب كلاسيك 550 منديل (عرض 3 عبوات)',
    nameEn: 'Facial Tissues 550s 3-Pack',
    barcode: '622100100111',
    category: 'منظفات وعناية',
    costPrice: 52.0,
    salePrice: 65.0,
    stock: 4, // قارب النفاد
    minStockAlert: 10,
    taxRate: 0.14,
    unit: 'حزمة',
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now(),
  },
  {
    id: 'prod-12',
    name: 'شوكولاتة ديري ميلك بالبندق اللذيذ 90 جم',
    nameEn: 'Dairy Milk Hazelnut Chocolate 90g',
    barcode: '622100100112',
    category: 'حلويات وبسكويت',
    costPrice: 38.0,
    salePrice: 48.0,
    stock: 55,
    minStockAlert: 12,
    taxRate: 0.14,
    unit: 'قطعة',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'المهندس أحمد فتحي حسن',
    phone: '01099887766',
    taxNumber: '554-123-900',
    email: 'ahmed.fathy@example.com',
    address: 'شارع اللاسلكي، المعادي، القاهرة',
    balance: 0,
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'cust-2',
    name: 'الأستاذة مروة إبراهيم عبد الله',
    phone: '01234567890',
    address: 'دجلة، المعادي، القاهرة',
    balance: 180.0, // حساب آجل
    createdAt: Date.now() - 86400000 * 20,
  },
  {
    id: 'cust-3',
    name: 'شركة النيل للخدمات والتوريدات',
    phone: '0225198765',
    taxNumber: '612-458-100',
    email: 'finance@nile-services.com.eg',
    address: 'المعادي الجديدة، القاهرة',
    balance: 0,
    createdAt: Date.now() - 86400000 * 15,
  },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'supp-1',
    name: 'شركة جهينة للصناعات الغذائية',
    companyName: 'Juhayna Food Industries',
    phone: '0238201200',
    taxNumber: '200-112-980',
    balance: 0,
    createdAt: Date.now() - 86400000 * 60,
  },
  {
    id: 'supp-2',
    name: 'مؤسسة الأهرام للتوزيع والسلع الغذائية',
    companyName: 'Al-Ahram Food Distribution',
    phone: '01155443322',
    taxNumber: '310-887-452',
    balance: 3200.0, // مستحق للمورد
    createdAt: Date.now() - 86400000 * 45,
  },
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    title: 'إيجار مقر المحل - فرع المعادي',
    category: 'rent',
    amount: 8000.0,
    taxAmount: 0,
    date: Date.now() - 86400000 * 10,
    paymentMethod: 'transfer',
    notes: 'تحويل عبر تطبيق إنستاباي InstaPay لحساب المالك',
    receiptNumber: 'RENT-EGY-11',
  },
  {
    id: 'exp-2',
    title: 'فاتورة الكهرباء الشهرية للمحل التجاري',
    category: 'utilities',
    amount: 1450.0,
    taxAmount: 0,
    date: Date.now() - 86400000 * 4,
    paymentMethod: 'card',
    receiptNumber: 'ELEC-4491',
  },
  {
    id: 'exp-3',
    title: 'شراء بكر ورق فواتير حراري وأكياس تعبئة مطبوعة',
    category: 'maintenance',
    amount: 420.0,
    taxAmount: 0,
    date: Date.now() - 86400000 * 1,
    paymentMethod: 'cash',
    notes: '20 رول ورق فواتير 80 ملم + باكت أكياس سوبرماركت',
  },
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1001',
    invoiceNumber: 'INV-2026-1001',
    timestamp: Date.now() - 86400000 * 1 - 3600000 * 4,
    status: 'completed',
    paymentMethod: 'card',
    cashierName: 'كاشير المحل',
    isTaxEnabled: false,
    subtotal: 136.0,
    discountTotal: 0,
    taxTotal: 0,
    grandTotal: 136.0,
    amountPaid: 136.0,
    changeDue: 0,
    customerName: 'المهندس أحمد فتحي حسن',
    customerId: 'cust-1',
    items: [
      {
        productId: 'prod-1',
        productName: 'سمنة روابي نباتي صافي 700 جم',
        barcode: '622100100101',
        quantity: 2,
        unitPrice: 68.0,
        costPrice: 58.0,
        discount: 0,
        taxRate: 0,
        subtotal: 136.0,
        taxAmount: 0,
        total: 136.0,
      },
    ],
  },
  {
    id: 'inv-1002',
    invoiceNumber: 'INV-2026-1002',
    timestamp: Date.now() - 3600000 * 2,
    status: 'completed',
    paymentMethod: 'cash',
    cashierName: 'كاشير المحل',
    isTaxEnabled: false,
    subtotal: 97.0,
    discountTotal: 5.0,
    taxTotal: 0,
    grandTotal: 92.0,
    amountPaid: 100.0,
    changeDue: 8.0,
    customerName: 'عميل نقدي',
    items: [
      {
        productId: 'prod-3',
        productName: 'شاي العروسة ناعم عبوة 250 جم',
        barcode: '622100100103',
        quantity: 1,
        unitPrice: 50.0,
        costPrice: 42.0,
        discount: 5.0,
        taxRate: 0,
        subtotal: 45.0,
        taxAmount: 0,
        total: 45.0,
      },
      {
        productId: 'prod-12',
        productName: 'شوكولاتة ديري ميلك بالبندق اللذيذ 90 جم',
        barcode: '622100100112',
        quantity: 1,
        unitPrice: 48.0,
        costPrice: 38.0,
        discount: 0,
        taxRate: 0,
        subtotal: 48.0,
        taxAmount: 0,
        total: 48.0,
      },
    ],
  },
];

let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function loadDatabase(): AppDatabase {
  if (typeof window === 'undefined') {
    return ensureDatabaseSequences({
      products: INITIAL_PRODUCTS,
      invoices: INITIAL_INVOICES,
      customers: INITIAL_CUSTOMERS,
      suppliers: INITIAL_SUPPLIERS,
      expenses: INITIAL_EXPENSES,
      settings: INITIAL_SETTINGS,
      version: 2,
    });
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const db = ensureDatabaseSequences({
        products: INITIAL_PRODUCTS,
        invoices: INITIAL_INVOICES,
        customers: INITIAL_CUSTOMERS,
        suppliers: INITIAL_SUPPLIERS,
        expenses: INITIAL_EXPENSES,
        settings: INITIAL_SETTINGS,
        version: 2,
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return db;
    }

    const parsed = JSON.parse(raw) as AppDatabase;
    return ensureDatabaseSequences({
      products: Array.isArray(parsed.products) && parsed.products.length > 0 ? parsed.products : INITIAL_PRODUCTS,
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : INITIAL_INVOICES,
      customers: Array.isArray(parsed.customers) ? parsed.customers : INITIAL_CUSTOMERS,
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : INITIAL_SUPPLIERS,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : INITIAL_EXPENSES,
      settings: {
        ...INITIAL_SETTINGS,
        ...(parsed.settings || {}),
        // Older databases predate the inclusive-price option; migrate them to the agreed POS model.
        enableTax: parsed.settings?.pricesIncludeTax === undefined
          ? true
          : (parsed.settings.enableTax ?? INITIAL_SETTINGS.enableTax),
        pricesIncludeTax: parsed.settings?.pricesIncludeTax ?? true,
        currency: 'ج.م',
        currencyEn: 'EGP',
      },
      version: 2,
      nextInvoiceSequence: parsed.nextInvoiceSequence,
      nextExpenseSequence: parsed.nextExpenseSequence,
    });
  } catch (err) {
    console.error('Failed to parse database from localStorage:', err);
    return ensureDatabaseSequences({
      products: INITIAL_PRODUCTS,
      invoices: INITIAL_INVOICES,
      customers: INITIAL_CUSTOMERS,
      suppliers: INITIAL_SUPPLIERS,
      expenses: INITIAL_EXPENSES,
      settings: INITIAL_SETTINGS,
      version: 2,
    });
  }
}

export function saveDatabaseDebounced(db: AppDatabase): void {
  if (typeof window === 'undefined') return;

  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.warn('Storage quota warning or write failure:', e);
    }
  }, 300);
}

export function saveDatabaseImmediate(db: AppDatabase): void {
  if (typeof window === 'undefined') return;
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Critical save failed:', e);
  }
}

export function exportDatabaseBackup(db: AppDatabase): void {
  const jsonStr = JSON.stringify(db, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `matjark_backup_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
