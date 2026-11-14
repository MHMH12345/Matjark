/**
 * Asynchronous, debounced storage engine with backup and restore.
 * Preloaded with authentic Egyptian market store catalog in Egyptian Pounds (ج.م / EGP).
 */

import { Customer, Expense, Invoice, Product, StoreSettings, Supplier } from '../types';
import { DEFAULT_SECURITY_POLICY } from './permissions';

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
  security: DEFAULT_SECURITY_POLICY,
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
  localBackupEnabled: false,
  localBackupIntervalMinutes: 60,
  googleDriveAutoSyncEnabled: false,
  googleDriveSyncIntervalMinutes: 60,
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

const APP_DATABASE_NAME = 'matjark_app_database';
const APP_DATABASE_VERSION = 1;
const APP_DATABASE_STORE = 'app_state';
const PRODUCT_IMAGES_STORE = 'product_images';

type StoredProductImage = {
  productId: string;
  blob: Blob;
};

type PreparedDatabase = {
  storedDatabase: AppDatabase;
  runtimeDatabase: AppDatabase;
  imageWrites: StoredProductImage[];
  managedImageIds: Set<string>;
};

let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let appDatabasePromise: Promise<IDBDatabase> | null = null;
let storageBackend: 'indexeddb' | 'localstorage' = 'indexeddb';
let pendingDatabaseSave: Promise<void> = Promise.resolve();
const managedProductImages = new Map<string, { sourceUrl: string; objectUrl: string }>();

export function createInitialDatabase(): AppDatabase {
  return ensureDatabaseSequences({
    products: INITIAL_PRODUCTS,
    invoices: INITIAL_INVOICES,
    customers: INITIAL_CUSTOMERS,
    suppliers: INITIAL_SUPPLIERS,
    expenses: INITIAL_EXPENSES,
    settings: INITIAL_SETTINGS,
    version: 3,
  });
}

function openAppDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  }
  if (appDatabasePromise) return appDatabasePromise;

  appDatabasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(APP_DATABASE_NAME, APP_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(APP_DATABASE_STORE)) {
        database.createObjectStore(APP_DATABASE_STORE);
      }
      if (!database.objectStoreNames.contains(PRODUCT_IMAGES_STORE)) {
        database.createObjectStore(PRODUCT_IMAGES_STORE, { keyPath: 'productId' });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => {
      appDatabasePromise = null;
      reject(request.error ?? new Error('Unable to open the application database.'));
    };
    request.onblocked = () => {
      appDatabasePromise = null;
      reject(new Error('Application database upgrade is blocked by another tab.'));
    };
  });

  return appDatabasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
  });
}

function normalizeDatabase(source: Partial<AppDatabase> | null | undefined): AppDatabase {
  const parsed = source ?? {};
  const settings = parsed.settings ?? INITIAL_SETTINGS;
  return ensureDatabaseSequences({
    products: Array.isArray(parsed.products) && parsed.products.length > 0 ? parsed.products : INITIAL_PRODUCTS,
    invoices: Array.isArray(parsed.invoices) ? parsed.invoices : INITIAL_INVOICES,
    customers: Array.isArray(parsed.customers) ? parsed.customers : INITIAL_CUSTOMERS,
    suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : INITIAL_SUPPLIERS,
    expenses: Array.isArray(parsed.expenses) ? parsed.expenses : INITIAL_EXPENSES,
    settings: {
      ...INITIAL_SETTINGS,
      ...settings,
      security: { ...DEFAULT_SECURITY_POLICY, ...(settings.security || {}) },
      enableTax: settings.pricesIncludeTax === undefined
        ? true
        : (settings.enableTax ?? INITIAL_SETTINGS.enableTax),
      pricesIncludeTax: true,
      currency: 'ج.م',
      currencyEn: 'EGP',
    },
    version: 3,
    nextInvoiceSequence: parsed.nextInvoiceSequence,
    nextExpenseSequence: parsed.nextExpenseSequence,
  });
}

function readLegacyDatabase(): AppDatabase {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeDatabase(JSON.parse(raw) as AppDatabase) : createInitialDatabase();
  } catch (error) {
    console.error('Failed to read the legacy Matjark database:', error);
    return createInitialDatabase();
  }
}

function createManagedObjectUrl(productId: string, sourceUrl: string, blob: Blob): string {
  const previous = managedProductImages.get(productId);
  if (previous && previous.objectUrl !== sourceUrl) {
    URL.revokeObjectURL(previous.objectUrl);
  }
  // A new upload already has a Blob URL; reuse it instead of creating a second URL.
  const objectUrl = sourceUrl.startsWith('blob:') ? sourceUrl : URL.createObjectURL(blob);
  managedProductImages.set(productId, { sourceUrl, objectUrl });
  return objectUrl;
}

async function prepareDatabaseForStorage(database: AppDatabase): Promise<PreparedDatabase> {
  const imageWrites: StoredProductImage[] = [];
  const managedImageIds = new Set<string>();
  const storedProducts: Product[] = [];
  const runtimeProducts: Product[] = [];
  const liveProductIds = new Set(database.products.map((product) => product.id));

  for (const product of database.products) {
    const imageUrl = product.imageUrl;
    const previous = managedProductImages.get(product.id);

    if (imageUrl && (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:'))) {
      managedImageIds.add(product.id);
      if (previous && (previous.sourceUrl === imageUrl || previous.objectUrl === imageUrl)) {
        const storedProduct = { ...product };
        delete storedProduct.imageUrl;
        storedProducts.push(storedProduct);
        runtimeProducts.push({ ...product, imageUrl: previous.objectUrl });
        continue;
      }

      try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Unable to read the product image.');
        const blob = await response.blob();
        const objectUrl = createManagedObjectUrl(product.id, imageUrl, blob);
        imageWrites.push({ productId: product.id, blob });
        const storedProduct = { ...product };
        delete storedProduct.imageUrl;
        storedProducts.push(storedProduct);
        runtimeProducts.push({ ...product, imageUrl: objectUrl });
        continue;
      } catch (error) {
        console.warn('Product image could not be moved to image storage:', product.id, error);
      }
    }

    if (previous) {
      URL.revokeObjectURL(previous.objectUrl);
      managedProductImages.delete(product.id);
    }
    storedProducts.push(product);
    runtimeProducts.push(product);
  }

  for (const [productId, image] of managedProductImages) {
    if (!liveProductIds.has(productId)) {
      URL.revokeObjectURL(image.objectUrl);
      managedProductImages.delete(productId);
    }
  }

  return {
    storedDatabase: { ...database, products: storedProducts },
    runtimeDatabase: { ...database, products: runtimeProducts },
    imageWrites,
    managedImageIds,
  };
}

async function writeDatabaseToIndexedDB(database: AppDatabase): Promise<AppDatabase> {
  const prepared = await prepareDatabaseForStorage(database);
  const appDatabase = await openAppDatabase();
  const transaction = appDatabase.transaction(
    [APP_DATABASE_STORE, PRODUCT_IMAGES_STORE],
    'readwrite'
  );
  const done = transactionResult(transaction);
  const appStore = transaction.objectStore(APP_DATABASE_STORE);
  const imagesStore = transaction.objectStore(PRODUCT_IMAGES_STORE);

  appStore.put(prepared.storedDatabase, 'current');
  prepared.imageWrites.forEach((image) => imagesStore.put(image));

  const existingImageKeysRequest = imagesStore.getAllKeys();
  existingImageKeysRequest.onsuccess = () => {
    for (const key of existingImageKeysRequest.result) {
      if (typeof key === 'string' && !prepared.managedImageIds.has(key)) {
        imagesStore.delete(key);
      }
    }
  };

  await done;
  return prepared.runtimeDatabase;
}

function hydrateDatabaseImages(database: AppDatabase, images: StoredProductImage[]): AppDatabase {
  const imagesByProductId = new Map(images.map((image) => [image.productId, image.blob]));
  return {
    ...database,
    products: database.products.map((product) => {
      const blob = imagesByProductId.get(product.id);
      if (!blob) return product;
      const objectUrl = URL.createObjectURL(blob);
      managedProductImages.set(product.id, { sourceUrl: objectUrl, objectUrl });
      return { ...product, imageUrl: objectUrl };
    }),
  };
}

export async function loadDatabaseAsync(): Promise<AppDatabase> {
  if (typeof window === 'undefined') return createInitialDatabase();

  try {
    const database = await openAppDatabase();
    const transaction = database.transaction(
      [APP_DATABASE_STORE, PRODUCT_IMAGES_STORE],
      'readonly'
    );
    const done = transactionResult(transaction);
    const storedRequest = requestResult<AppDatabase | undefined>(
      transaction.objectStore(APP_DATABASE_STORE).get('current')
    );
    const imagesRequest = requestResult<StoredProductImage[]>(
      transaction.objectStore(PRODUCT_IMAGES_STORE).getAll()
    );
    const [storedDatabase, images] = await Promise.all([storedRequest, imagesRequest]);
    await done;
    storageBackend = 'indexeddb';

    if (storedDatabase) {
      const normalized = normalizeDatabase(storedDatabase);
      const hydrated = hydrateDatabaseImages(normalized, images);
      const hasLegacyInlineImages = hydrated.products.some(
        (product) => product.imageUrl?.startsWith('data:')
      );
      return hasLegacyInlineImages
        ? writeDatabaseToIndexedDB(hydrated)
        : hydrated;
    }

    // One-time migration: keep the old LocalStorage copy until the IndexedDB write succeeds.
    const legacy = readLegacyDatabase();
    const migrated = await writeDatabaseToIndexedDB(legacy);
    window.localStorage.removeItem(STORAGE_KEY);
    return migrated;
  } catch (error) {
    // Older or restricted browsers can continue using the legacy storage path.
    console.warn('IndexedDB is unavailable; using the legacy LocalStorage database.', error);
    storageBackend = 'localstorage';
    const legacy = readLegacyDatabase();
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      } catch (storageError) {
        console.error('Unable to initialize LocalStorage fallback:', storageError);
      }
    }
    return legacy;
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read image data.'));
    reader.readAsDataURL(blob);
  });
}

export async function createDatabaseBackupSnapshot(database: AppDatabase): Promise<AppDatabase> {
  const products = await Promise.all(database.products.map(async (product) => {
    const imageUrl = product.imageUrl;
    if (!imageUrl || !imageUrl.startsWith('blob:')) return product;
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) return product;
      return { ...product, imageUrl: await blobToDataUrl(await response.blob()) };
    } catch (error) {
      console.warn('Unable to include a product image in the backup:', product.id, error);
      return product;
    }
  }));
  return { ...database, products };
}

function enqueueDatabaseSave(database: AppDatabase): void {
  pendingDatabaseSave = pendingDatabaseSave
    .catch(() => undefined)
    .then(async () => {
      if (storageBackend === 'indexeddb') {
        await writeDatabaseToIndexedDB(database);
        return;
      }
      const snapshot = await createDatabaseBackupSnapshot(database);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    });
  pendingDatabaseSave.catch((error) => {
    console.error('Matjark database save failed:', error);
  });
}

export function saveDatabaseDebounced(database: AppDatabase): void {
  if (typeof window === 'undefined') return;
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    saveDebounceTimer = null;
    enqueueDatabaseSave(database);
  }, 300);
}

export function saveDatabaseImmediate(database: AppDatabase): void {
  if (typeof window === 'undefined') return;
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  enqueueDatabaseSave(database);
}

export async function exportDatabaseBackup(database: AppDatabase): Promise<void> {
  const snapshot = await createDatabaseBackupSnapshot(database);
  const jsonStr = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = 'matjark_backup_' + dateStr + '.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
