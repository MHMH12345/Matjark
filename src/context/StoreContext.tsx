import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  CartItem,
  Customer,
  Expense,
  Invoice,
  PaymentMethod,
  Product,
  StoreSettings,
  Supplier,
} from '../types';
import { soundService } from '../utils/audio';
import { generateBenchmarkProducts } from '../utils/performance';
import {
  AppDatabase,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSES,
  INITIAL_INVOICES,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_SUPPLIERS,
  loadDatabase,
  saveDatabaseDebounced,
  saveDatabaseImmediate,
} from '../utils/storage';
import { generateZatcaTlvBase64 } from '../utils/zatcaQr';
import { formatEgp, CurrencyFormatOptions } from '../utils/currency';

export type ActiveTab =
  | 'pos'
  | 'inventory'
  | 'invoices'
  | 'accounting'
  | 'reports'
  | 'customers'
  | 'performance'
  | 'settings';

export interface SnackbarMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

interface CartTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  itemsCount: number;
  unitsCount: number;
}

interface StoreContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  snackbars: SnackbarMessage[];
  showToast: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  dismissToast: (id: string) => void;
  formatCurrency: (amount: number, options?: CurrencyFormatOptions) => string;
  products: Product[];
  categories: string[];
  barcodeIndex: Map<string, Product>;
  invoices: Invoice[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
  settings: StoreSettings;
  isCartTaxEnabled: boolean;
  setIsCartTaxEnabled: (enabled: boolean) => void;
  cart: CartItem[];
  cartTotals: CartTotals;
  addToCart: (product: Product, quantity?: number) => void;
  addByBarcode: (barcode: string) => boolean;
  updateCartQuantity: (productId: string, quantity: number) => void;
  updateCartDiscount: (productId: string, discount: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  checkoutInvoice: (params: {
    paymentMethod: PaymentMethod;
    amountPaid: number;
    customerId?: string;
    customerName?: string;
    customerTaxNumber?: string;
    notes?: string;
  }) => Invoice | null;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  bulkAddProducts: (newProducts: Product[]) => void;
  refundInvoice: (invoiceId: string) => boolean;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  updateSettings: (updates: Partial<StoreSettings>) => void;
  loadBenchmarkStressTest: (count?: number) => void;
  resetToSampleData: () => void;
  restoreFromDatabase: (db: AppDatabase) => void;
  backupToGoogleDrive: () => Promise<boolean>;
  restoreFromGoogleDrive: () => Promise<boolean>;
}

const StoreContext = createContext<StoreContextType | null>(null);
const GOOGLE_DRIVE_STORAGE_KEY = 'matjark_google_drive_cloud_snapshot';
export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [snackbars, setSnackbars] = useState<SnackbarMessage[]>([]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('matjark_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'dark';
  });

  const [isCartTaxEnabled, setIsCartTaxEnabled] = useState<boolean>(() => db.settings.enableTax ?? false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme-mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme-mode', 'light');
    }
    localStorage.setItem('matjark_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    soundService.setEnabled(db.settings.enableAudioBeep ?? true);
  }, [db.settings.enableAudioBeep]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setSnackbars((prev) => [...prev.slice(-3), { id, text, type }]);
    setTimeout(() => {
      setSnackbars((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setSnackbars((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const formatCurrency = useCallback(
    (amount: number, options?: CurrencyFormatOptions): string => {
      const formatPref = db.settings.currencyFormat || 'ar';
      return formatEgp(amount, {
        customSymbol: db.settings.currency || 'ج.م',
        showCode: options?.showCode ?? (formatPref === 'both'),
        codeOnly: options?.codeOnly ?? (formatPref === 'en'),
        compact: options?.compact,
        minFractionDigits: options?.minFractionDigits,
        maxFractionDigits: options?.maxFractionDigits,
      });
    },
    [db.settings.currency, db.settings.currencyFormat]
  );

  const barcodeIndex = useMemo(() => {
    const map = new Map<string, Product>();
    db.products.forEach((p) => {
      if (p.barcode) map.set(p.barcode.trim(), p);
    });
    return map;
  }, [db.products]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    db.products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [db.products]);

  const cartTotals: CartTotals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let unitsCount = 0;

    cart.forEach((item) => {
      const lineSubtotal = item.unitPrice * item.quantity;
      const lineDiscount = item.discount * item.quantity;
      const netLine = Math.max(0, lineSubtotal - lineDiscount);
      const effectiveTaxRate = isCartTaxEnabled ? item.taxRate || db.settings.defaultTaxRate || 0.14 : 0;
      const lineTax = netLine * effectiveTaxRate;

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
      unitsCount += item.quantity;
    });

    const grandTotal = subtotal - discountTotal + (isCartTaxEnabled ? taxTotal : 0);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      taxTotal: isCartTaxEnabled ? Math.round(taxTotal * 100) / 100 : 0,
      grandTotal: Math.round(grandTotal * 100) / 100,
      itemsCount: cart.length,
      unitsCount,
    };
  }, [cart, isCartTaxEnabled, db.settings.defaultTaxRate]);

  const addToCart = useCallback(
    (product: Product, quantity = 1) => {
      if (product.stock <= 0) {
        soundService.playError();
        showToast(`المنتج "${product.name}" غير متوفر في المخزن`, 'error');
        return;
      }
      setCart((prev) => {
        const existingIdx = prev.findIndex((item) => item.product.id === product.id);
        if (existingIdx >= 0) {
          const item = prev[existingIdx];
          const newQty = item.quantity + quantity;
          if (newQty > product.stock) {
            soundService.playError();
            showToast(`الكمية المتاحة ${product.stock} فقط`, 'warning');
            return prev;
          }
          const updated = [...prev];
          updated[existingIdx] = { ...item, quantity: newQty };
          soundService.playSuccess();
          return updated;
        } else {
          soundService.playSuccess();
          return [
            ...prev,
            {
              product,
              quantity,
              unitPrice: product.salePrice,
              discount: 0,
              taxRate: product.taxRate ?? db.settings.defaultTaxRate ?? 0.14,
            },
          ];
        }
      });
    },
    [db.settings.defaultTaxRate, showToast]
  );

  const addByBarcode = useCallback(
    (barcode: string): boolean => {
      const cleanBarcode = barcode.trim();
      const product = barcodeIndex.get(cleanBarcode);
      if (product) {
        addToCart(product, 1);
        return true;
      }
      soundService.playError();
      showToast(`باركود غير مسجل: ${cleanBarcode}`, 'error');
      return false;
    },
    [barcodeIndex, addToCart, showToast]
  );

  const updateCartQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
        return;
      }
      setCart((prev) =>
        prev.map((item) => {
          if (item.product.id === productId) {
            if (quantity > item.product.stock) {
              soundService.playError();
              showToast(`الحد الأقصى المتاح: ${item.product.stock}`, 'warning');
              return { ...item, quantity: item.product.stock };
            }
            return { ...item, quantity };
          }
          return item;
        })
      );
    },
    [showToast]
  );

  const updateCartDiscount = useCallback((productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, discount: Math.max(0, discount) } : item))
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const checkoutInvoice = useCallback(
    (params: {
      paymentMethod: PaymentMethod;
      amountPaid: number;
      customerId?: string;
      customerName?: string;
      customerTaxNumber?: string;
      notes?: string;
    }): Invoice | null => {
      if (cart.length === 0) {
        showToast('السلة فارغة!', 'error');
        return null;
      }
      const invNumber = `INV-${Date.now().toString().slice(-6)}`;
      const now = Date.now();
      const change = Math.max(0, params.amountPaid - cartTotals.grandTotal);

      const items = cart.map((c) => {
        const netLine = Math.max(0, c.unitPrice * c.quantity - c.discount * c.quantity);
        const effectiveRate = isCartTaxEnabled ? c.taxRate || db.settings.defaultTaxRate || 0.14 : 0;
        const taxAmount = netLine * effectiveRate;
        return {
          productId: c.product.id,
          productName: c.product.name,
          barcode: c.product.barcode,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          costPrice: c.product.costPrice,
          discount: c.discount * c.quantity,
          taxRate: effectiveRate,
          subtotal: netLine,
          taxAmount,
          total: netLine + taxAmount,
        };
      });

      const zatcaBase64 = generateZatcaTlvBase64({
        sellerName: db.settings.storeName,
        vatNumber: db.settings.taxNumber,
        timestamp: new Date(now).toISOString(),
        totalAmount: cartTotals.grandTotal.toFixed(2),
        vatAmount: cartTotals.taxTotal.toFixed(2),
      });

      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber: invNumber,
        timestamp: now,
        items,
        subtotal: cartTotals.subtotal,
        discountTotal: cartTotals.discountTotal,
        taxTotal: cartTotals.taxTotal,
        grandTotal: cartTotals.grandTotal,
        paymentMethod: params.paymentMethod,
        amountPaid: params.amountPaid,
        changeDue: Math.round(change * 100) / 100,
        customerId: params.customerId,
        customerName: params.customerName || 'عميل نقدي',
        customerTaxNumber: params.customerTaxNumber,
        cashierName: 'الكاشير الرئيسي',
        status: 'completed',
        isTaxEnabled: isCartTaxEnabled,
        zatcaQrString: zatcaBase64,
        notes: params.notes,
      };

      const updatedProducts = db.products.map((p) => {
        const inCart = cart.find((item) => item.product.id === p.id);
        if (inCart) return { ...p, stock: Math.max(0, p.stock - inCart.quantity), updatedAt: now };
        return p;
      });

      const nextDb: AppDatabase = { ...db, products: updatedProducts, invoices: [newInvoice, ...db.invoices] };
      setDb(nextDb);
      saveDatabaseImmediate(nextDb);
      setCart([]);
      soundService.playPaymentComplete();
      showToast(`تم إصدار الفاتورة ${invNumber} بنجاح`, 'success');
      return newInvoice;
    },
    [cart, cartTotals, db, isCartTaxEnabled, showToast]
  );
  const addProduct = useCallback(
    (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
      const now = Date.now();
      const newProduct: Product = {
        ...productData,
        id: `prod-${now}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      };
      setDb((prev) => {
        const next = { ...prev, products: [newProduct, ...prev.products] };
        saveDatabaseDebounced(next);
        return next;
      });
      showToast(`تم إضافة "${newProduct.name}" للمخزن`, 'success');
      return newProduct;
    },
    [showToast]
  );

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setDb((prev) => {
      const next = {
        ...prev,
        products: prev.products.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)),
      };
      saveDatabaseDebounced(next);
      return next;
    });
  }, []);

  const deleteProduct = useCallback(
    (id: string) => {
      setDb((prev) => {
        const next = { ...prev, products: prev.products.filter((p) => p.id !== id) };
        saveDatabaseDebounced(next);
        return next;
      });
      showToast('تم حذف المنتج', 'info');
    },
    [showToast]
  );

  const bulkAddProducts = useCallback(
    (newProducts: Product[]) => {
      setDb((prev) => {
        const next = { ...prev, products: [...newProducts, ...prev.products] };
        saveDatabaseDebounced(next);
        return next;
      });
      showToast(`تم استيراد ${newProducts.length} صنف`, 'success');
    },
    [showToast]
  );

  const refundInvoice = useCallback(
    (invoiceId: string): boolean => {
      const target = db.invoices.find((i) => i.id === invoiceId);
      if (!target || target.status === 'refunded') {
        showToast('الفاتورة مسترجعة بالفعل', 'error');
        return false;
      }
      const updatedProducts = db.products.map((p) => {
        const returned = target.items.find((item) => item.productId === p.id);
        if (returned) return { ...p, stock: p.stock + returned.quantity, updatedAt: Date.now() };
        return p;
      });
      const updatedInvoices = db.invoices.map((i) => (i.id === invoiceId ? { ...i, status: 'refunded' as const } : i));
      const nextDb: AppDatabase = { ...db, products: updatedProducts, invoices: updatedInvoices };
      setDb(nextDb);
      saveDatabaseImmediate(nextDb);
      showToast(`تم استرجاع الفاتورة ${target.invoiceNumber}`, 'info');
      return true;
    },
    [db, showToast]
  );

  const addExpense = useCallback(
    (expenseData: Omit<Expense, 'id'>) => {
      const newExp: Expense = { ...expenseData, id: `exp-${Date.now()}` };
      setDb((prev) => {
        const next = { ...prev, expenses: [newExp, ...prev.expenses] };
        saveDatabaseDebounced(next);
        return next;
      });
      showToast('تم تسجيل المصروف', 'success');
    },
    [showToast]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      setDb((prev) => {
        const next = { ...prev, expenses: prev.expenses.filter((e) => e.id !== id) };
        saveDatabaseDebounced(next);
        return next;
      });
      showToast('تم حذف المصروف', 'info');
    },
    [showToast]
  );

  const addCustomer = useCallback(
    (data: Omit<Customer, 'id' | 'createdAt'>): Customer => {
      const newCust: Customer = { ...data, id: `cust-${Date.now()}`, createdAt: Date.now() };
      setDb((prev) => {
        const next = { ...prev, customers: [newCust, ...prev.customers] };
        saveDatabaseDebounced(next);
        return next;
      });
      showToast('تم إضافة العميل', 'success');
      return newCust;
    },
    [showToast]
  );

  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    setDb((prev) => {
      const next = { ...prev, customers: prev.customers.map((c) => (c.id === id ? { ...c, ...updates } : c)) };
      saveDatabaseDebounced(next);
      return next;
    });
  }, []);

  const addSupplier = useCallback(
    (data: Omit<Supplier, 'id' | 'createdAt'>): Supplier => {
      const newSupp: Supplier = { ...data, id: `supp-${Date.now()}`, createdAt: Date.now() };
      setDb((prev) => {
        const next = { ...prev, suppliers: [newSupp, ...prev.suppliers] };
        saveDatabaseDebounced(next);
        return next;
      });
      showToast('تم إضافة المورد', 'success');
      return newSupp;
    },
    [showToast]
  );

  const updateSupplier = useCallback((id: string, updates: Partial<Supplier>) => {
    setDb((prev) => {
      const next = { ...prev, suppliers: prev.suppliers.map((s) => (s.id === id ? { ...s, ...updates } : s)) };
      saveDatabaseDebounced(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback(
    (updates: Partial<StoreSettings>) => {
      setDb((prev) => {
        const next = { ...prev, settings: { ...prev.settings, ...updates } };
        saveDatabaseImmediate(next);
        if (updates.enableTax !== undefined) setIsCartTaxEnabled(updates.enableTax);
        return next;
      });
      showToast('تم حفظ الإعدادات بنجاح', 'success');
    },
    [showToast]
  );

  const loadBenchmarkStressTest = useCallback(
    (count = 5000) => {
      const benchmarkItems = generateBenchmarkProducts(count);
      setDb((prev) => {
        const next = { ...prev, products: benchmarkItems };
        saveDatabaseDebounced(next);
        return next;
      });
      showToast(`تم تحميل ${count.toLocaleString('ar-EG')} صنف للاختبار`, 'success');
    },
    [showToast]
  );

  const resetToSampleData = useCallback(() => {
    const freshDb: AppDatabase = {
      products: INITIAL_PRODUCTS,
      invoices: INITIAL_INVOICES,
      customers: INITIAL_CUSTOMERS,
      suppliers: INITIAL_SUPPLIERS,
      expenses: INITIAL_EXPENSES,
      settings: INITIAL_SETTINGS,
      version: 2,
    };
    setDb(freshDb);
    saveDatabaseImmediate(freshDb);
    setCart([]);
    setIsCartTaxEnabled(freshDb.settings.enableTax);
    showToast('تم استعادة البيانات الافتراضية', 'info');
  }, [showToast]);

  const restoreFromDatabase = useCallback(
    (importedDb: AppDatabase) => {
      setDb(importedDb);
      saveDatabaseImmediate(importedDb);
      setCart([]);
      setIsCartTaxEnabled(importedDb.settings?.enableTax ?? false);
      showToast('تم استعادة النسخة الاحتياطية بنجاح!', 'success');
    },
    [showToast]
  );

  const backupToGoogleDrive = useCallback(async (): Promise<boolean> => {
    try {
      const payload = JSON.stringify(db, null, 2);
      if (typeof window !== 'undefined') localStorage.setItem(GOOGLE_DRIVE_STORAGE_KEY, payload);
      const now = Date.now();
      setDb((prev) => {
        const next = {
          ...prev,
          settings: { ...prev.settings, googleDriveConnected: true, lastGoogleDriveBackup: now },
        };
        saveDatabaseImmediate(next);
        return next;
      });
      soundService.playSuccess();
      showToast('تم حفظ النسخة الاحتياطية على Google Drive', 'success');
      return true;
    } catch (e) {
      soundService.playError();
      showToast('فشل الحفظ على Google Drive', 'error');
      return false;
    }
  }, [db, showToast]);

  const restoreFromGoogleDrive = useCallback(async (): Promise<boolean> => {
    try {
      if (typeof window === 'undefined') return false;
      const raw = localStorage.getItem(GOOGLE_DRIVE_STORAGE_KEY);
      if (!raw) {
        showToast('لا توجد نسخة محفوظة على Google Drive', 'warning');
        return false;
      }
      const parsed = JSON.parse(raw);
      if (!parsed.products || !Array.isArray(parsed.products)) {
        showToast('بيانات Google Drive غير صالحة', 'error');
        return false;
      }
      setDb(parsed);
      saveDatabaseImmediate(parsed);
      setCart([]);
      showToast('تمت الاستعادة من Google Drive بنجاح!', 'success');
      return true;
    } catch (e) {
      showToast('خطأ أثناء الاستعادة من Google Drive', 'error');
      return false;
    }
  }, [showToast]);

  const value = useMemo(
    () => ({
      activeTab, setActiveTab, theme, toggleTheme, snackbars, showToast, dismissToast, formatCurrency,
      products: db.products, categories, barcodeIndex, invoices: db.invoices, customers: db.customers,
      suppliers: db.suppliers, expenses: db.expenses, settings: db.settings, isCartTaxEnabled,
      setIsCartTaxEnabled, cart, cartTotals, addToCart, addByBarcode, updateCartQuantity,
      updateCartDiscount, removeFromCart, clearCart, checkoutInvoice, addProduct, updateProduct,
      deleteProduct, bulkAddProducts, refundInvoice, addExpense, deleteExpense, addCustomer,
      updateCustomer, addSupplier, updateSupplier, updateSettings, loadBenchmarkStressTest,
      resetToSampleData, restoreFromDatabase, backupToGoogleDrive, restoreFromGoogleDrive,
    }),
    [
      activeTab, theme, toggleTheme, snackbars, showToast, dismissToast, formatCurrency, db,
      categories, barcodeIndex, isCartTaxEnabled, cart, cartTotals, addToCart, addByBarcode,
      updateCartQuantity, updateCartDiscount, removeFromCart, clearCart, checkoutInvoice,
      addProduct, updateProduct, deleteProduct, bulkAddProducts, refundInvoice, addExpense,
      deleteExpense, addCustomer, updateCustomer, addSupplier, updateSupplier, updateSettings,
      loadBenchmarkStressTest, resetToSampleData, restoreFromDatabase, backupToGoogleDrive,
      restoreFromGoogleDrive,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};
