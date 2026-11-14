import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createIconButton, createList } from 'material';
import {
  Badge as MaterialBadge,
  BottomSheet as MaterialBottomSheet,
  ButtonGroup as MaterialButtonGroup,
  ButtonGroupItem as MaterialButtonGroupItem,
  Card as MaterialCard,
  Snackbar as MaterialSnackbar,
  Progress as MaterialProgress,
} from 'material/react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Barcode,
  CreditCard,
  Banknote,
  Smartphone,
  Clock3,
  Camera,
  ChevronUp,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CartItem, PaymentMethod } from '../../types';
import { getProductPlaceholderSvg } from '../../utils/imageCompressor';
import { normalizeArabicText } from '../../utils/performance';
import { ThermalReceipt } from './ThermalReceipt';
import { MuiChipGroup } from '../ui/MuiChipGroup';
import { MuiTextField } from '../ui/MuiTextField';
import { MuiSelect } from '../ui/MuiSelect';
import { MuiDialog } from '../ui/MuiDialog';
import { MuiButton } from '../ui/MuiButton';
import { MuiIconButton } from '../ui/MuiIconButton';
import { MobileNavigation } from '../layout/MobileNavigation';

const toSvg = (Icon: React.ElementType, size = 'w-4 h-4') =>
  renderToStaticMarkup(<Icon className={size} />);

const toIconSvg = (Icon: React.ElementType, size = 14) =>
  renderToStaticMarkup(<Icon width={size} height={size} strokeWidth={2} />);

const materialHoldIcon = (name: 'pause' | 'play_arrow' | 'add') => {
  const paths = {
    pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
    play_arrow: 'M8 5v14l11-7z',
    add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  } as const;

  return (
    <svg
      className="matjark-hold-material-svg"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} fill="currentColor" />
    </svg>
  );
};

const materialCheckIcon = () => (
  <svg
    className="matjark-hold-material-svg"
    xmlns="http://www.w3.org/2000/svg"
    width="19"
    height="19"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor" />
  </svg>
);

const MCard = MaterialCard as React.ComponentType<any>;
const MBadge = MaterialBadge as React.ComponentType<any>;
const MBottomSheet = MaterialBottomSheet as React.ComponentType<any>;
const MButtonGroup = MaterialButtonGroup as React.ComponentType<any>;
const MButtonGroupItem = MaterialButtonGroupItem as React.ComponentType<any>;
const MSnackbar = MaterialSnackbar as React.ComponentType<any>;
const MProgress = MaterialProgress as React.ComponentType<any>;

const MOBILE_LANDSCAPE_QUERY = '(orientation: landscape) and (max-width: 900px) and (max-height: 500px) and (pointer: coarse)';
const TABLET_PORTRAIT_QUERY = '(orientation: portrait) and (min-width: 768px) and (max-width: 1100px) and (pointer: coarse)';
const MOBILE_POS_QUERY = `(max-width: 767px), ${MOBILE_LANDSCAPE_QUERY}, ${TABLET_PORTRAIT_QUERY}`;

type HeldSale = {
  id: string;
  name: string;
  createdAt: number;
  items: CartItem[];
  isTaxEnabled: boolean;
};

type HeldSaleStorage = {
  sales: HeldSale[];
  progressTotal: number;
  progressValue: number;
  nextSerial: number;
  activeId: string | null;
};

const HELD_SALES_STORAGE_KEY = 'matjark_pos_held_sales_v1';

type BarcodeDetectorResult = { rawValue?: string };
type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
};
type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
};

const loadHeldSaleStorage = (): HeldSaleStorage => {
  const empty: HeldSaleStorage = { sales: [], progressTotal: 0, progressValue: 0, nextSerial: 1, activeId: null };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(HELD_SALES_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<HeldSaleStorage>;
    const sales = Array.isArray(parsed.sales)
      ? parsed.sales.filter((sale): sale is HeldSale => Boolean(
          sale && typeof sale.id === 'string' && typeof sale.name === 'string' &&
          typeof sale.createdAt === 'number' && Array.isArray(sale.items)
        ))
      : [];
    const progressTotal = Math.max(sales.length, Number(parsed.progressTotal) || 0);
    const savedProgressValue = Number(parsed.progressValue);
    const progressValue = Number.isFinite(savedProgressValue)
      ? Math.min(100, Math.max(0, savedProgressValue))
      : progressTotal > 0
        ? Math.min(100, Math.max(0, ((progressTotal - sales.length) / progressTotal) * 100))
        : 0;
    return {
      sales,
      progressTotal,
      progressValue,
      nextSerial: Math.max(1, Number(parsed.nextSerial) || sales.length + 1),
      activeId: typeof parsed.activeId === 'string' && sales.some((sale) => sale.id === parsed.activeId)
        ? parsed.activeId
        : null,
    };
  } catch {
    return empty;
  }
};

const ProductCard = React.memo(({ product, availableStock, onAdd, onOutOfStockClick }: any) => {
  const isOutOfStock = availableStock <= 0;
  const lowStockLimit = Math.max(0, product.minStockAlert ?? 0);
  const stockColor = isOutOfStock || availableStock <= lowStockLimit
    ? 'error'
    : lowStockLimit > 0 && availableStock <= lowStockLimit * 2
      ? 'warning'
      : 'success';
  const hasRealImage = Boolean(product.imageUrl);
  const fallbackSvg = getProductPlaceholderSvg(product.name, product.category);

  const handleCardClick = () => {
    if (isOutOfStock) onOutOfStockClick(product);
    else onAdd(product);
  };

  const media = (
    <div className="matjark-pos-product-media" dir="rtl">
      <img src={hasRealImage ? product.imageUrl : fallbackSvg} alt={product.name} />
      <MBadge
        label={String(availableStock)}
        variant="large"
        color={stockColor}
        className="matjark-pos-product-stock-badge"
      />
    </div>
  );

  return (
    <div className="matjark-pos-product-tile" dir="rtl">
      <MCard
        variant="outlined"
        clickable={!isOutOfStock}
        interactive={!isOutOfStock}
        media={media}
        onClick={handleCardClick}
        className="matjark-pos-product-card"
        aria-label={`${product.name}، المتاح ${availableStock}`}
      />
      <h4 className="matjark-pos-product-name">
        <span className="matjark-pos-product-name-text">{product.name}</span>
      </h4>
    </div>
  );
});

export const CashierScreen: React.FC = () => {
  const {
    products,
    categories,
    cart,
    cartTotals,
    addToCart,
    addByBarcode,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    checkoutInvoice,
    settings,
    customers,
    isCartTaxEnabled,
    formatCurrency,
    replaceCart,
  } = useStore();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [snackbar, setSnackbar] = useState<{ id: number; message: string } | null>(null);
  const [holdStorage, setHoldStorage] = useState<HeldSaleStorage>(() => loadHeldSaleStorage());
  const [heldListOpen, setHeldListOpen] = useState(false);
  const [quickHoldOpen, setQuickHoldOpen] = useState(false);
  const [quickHoldName, setQuickHoldName] = useState('');
  const [quickHoldMode, setQuickHoldMode] = useState<'pause' | 'plus' | 'switch' | 'new'>('pause');
  const [quickHoldTargetId, setQuickHoldTargetId] = useState<string | null>(null);
  const [heldSaleCompleted, setHeldSaleCompleted] = useState(false);
  const [holdAddReturning, setHoldAddReturning] = useState(false);
  const [holdAddEntering, setHoldAddEntering] = useState(false);
  const [holdStateReady, setHoldStateReady] = useState(false);
  const [isMobilePos, setIsMobilePos] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_POS_QUERY).matches
  );
  const [isMobileLandscapePos, setIsMobileLandscapePos] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_LANDSCAPE_QUERY).matches
  );
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');

  const snackbarIdRef = useRef(0);
  const cartListHostRef = useRef<HTMLDivElement>(null);
  const cartSheetRef = useRef<HTMLElement | null>(null);
  const quickHoldInputRef = useRef<any>(null);
  const holdCompletionTimerRef = useRef<number | null>(null);
  const holdStorageRef = useRef(holdStorage);
  const scannerVideoRef = useRef<HTMLVideoElement>(null);
  const swipeStartYRef = useRef<number | null>(null);

  const showSnackbar = useCallback((message: string) => {
    const id = ++snackbarIdRef.current;
    setSnackbar({ id, message });
  }, []);

  const processBarcode = useCallback((rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;
    const found = products.find((product) => product.barcode === code);
    if (!found) {
      showSnackbar('الباركود (' + code + ') غير مسجل في المخزن.');
    } else if (found.stock <= 0) {
      showSnackbar('نفذت كمية "' + found.name + '" من المخزن.');
    } else {
      addByBarcode(code);
    }
    setBarcodeQuery('');
  }, [products, addByBarcode, showSnackbar]);

  const commitHoldStorage = useCallback((next: HeldSaleStorage) => {
    holdStorageRef.current = next;
    setHoldStorage(next);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(HELD_SALES_STORAGE_KEY, JSON.stringify(next));
      }
    } catch {
      showSnackbar('تعذر حفظ الفواتير المعلقة في مساحة التخزين.');
    }
  }, [showSnackbar]);

  useEffect(() => {
    const saved = holdStorageRef.current;
    if (saved.activeId) {
      const activeSale = saved.sales.find((sale) => sale.id === saved.activeId);
      if (activeSale) {
        replaceCart(activeSale.items);
      } else {
        commitHoldStorage({ ...saved, activeId: null });
      }
    }
    setHoldStateReady(true);
  }, [replaceCart, commitHoldStorage]);

  useEffect(() => {
    if (!holdStateReady || !holdStorage.activeId) return;
    const activeSale = holdStorage.sales.find((sale) => sale.id === holdStorage.activeId);
    if (!activeSale) return;
    if (
      JSON.stringify(activeSale.items) === JSON.stringify(cart) &&
      activeSale.isTaxEnabled === isCartTaxEnabled
    ) return;
    commitHoldStorage({
      ...holdStorage,
      sales: holdStorage.sales.map((sale) => sale.id === holdStorage.activeId
        ? { ...sale, items: cart, isTaxEnabled: isCartTaxEnabled }
        : sale),
    });
  }, [cart, isCartTaxEnabled, holdStateReady, holdStorage, commitHoldStorage]);

  useEffect(() => {
    if (!quickHoldOpen) return;
    const timer = window.setTimeout(() => {
      const host = quickHoldInputRef.current as (HTMLElement & { shadowRoot?: ShadowRoot }) | null;
      const input = host?.shadowRoot?.querySelector<HTMLInputElement>('input');
      if (input) {
        input.focus();
        input.select();
      } else {
        host?.focus?.();
      }
    }, 40);
    return () => window.clearTimeout(timer);
  }, [quickHoldOpen]);

  useEffect(() => () => {
    if (holdCompletionTimerRef.current !== null) {
      window.clearTimeout(holdCompletionTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_POS_QUERY);
    const landscapeQuery = window.matchMedia(MOBILE_LANDSCAPE_QUERY);
    const syncLayout = () => {
      setIsMobilePos(mobileQuery.matches);
      setIsMobileLandscapePos(landscapeQuery.matches);
    };
    syncLayout();
    mobileQuery.addEventListener('change', syncLayout);
    landscapeQuery.addEventListener('change', syncLayout);
    return () => {
      mobileQuery.removeEventListener('change', syncLayout);
      landscapeQuery.removeEventListener('change', syncLayout);
    };
  }, []);

  useEffect(() => {
    if (isMobileLandscapePos) setCartSheetOpen(false);
  }, [isMobileLandscapePos]);

  useEffect(() => {
    if (!cartSheetOpen || !isMobilePos || isMobileLandscapePos) return;

    const host = cartSheetRef.current as (HTMLElement & { shadowRoot: ShadowRoot | null }) | null;
    const sheetContainer = host?.shadowRoot?.querySelector<HTMLElement>('.mtrl-bottom-sheet__container');
    if (!sheetContainer) return;

    let originY: number | null = null;
    let lastY = 0;
    let lastMoveAt = 0;
    let velocity = 0;
    let dragging = false;
    let waitingForScrollTop = false;
    let scrollableAncestors: HTMLElement[] = [];

    const getPathElements = (event: Event): HTMLElement[] =>
      event.composedPath().filter((node): node is HTMLElement => node instanceof HTMLElement);

    const resetGesture = () => {
      originY = null;
      velocity = 0;
      dragging = false;
      waitingForScrollTop = false;
      scrollableAncestors = [];
      sheetContainer.style.transition = '';
      sheetContainer.style.transform = '';
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        resetGesture();
        return;
      }

      const path = getPathElements(event);
      const startedOnControl = path.some((node) =>
        node.matches('button, a, input, textarea, select, video, [role="button"], [contenteditable="true"], .mtrl-bottom-sheet__handle')
      );
      if (startedOnControl) {
        resetGesture();
        return;
      }

      const touch = event.touches[0];
      originY = touch.clientY;
      lastY = touch.clientY;
      lastMoveAt = performance.now();
      velocity = 0;
      dragging = false;
      scrollableAncestors = path.filter((node) => {
        if (node === sheetContainer || node.scrollHeight <= node.clientHeight + 1) return false;
        const overflowY = window.getComputedStyle(node).overflowY;
        return overflowY === 'auto' || overflowY === 'scroll';
      });
      waitingForScrollTop = scrollableAncestors.some((node) => node.scrollTop > 1);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (originY === null || event.touches.length !== 1) return;

      const y = event.touches[0].clientY;
      const now = performance.now();

      // Let the cart and held-invoice lists scroll normally until they reach the top.
      if (scrollableAncestors.some((node) => node.scrollTop > 1)) {
        waitingForScrollTop = true;
        lastY = y;
        lastMoveAt = now;
        velocity = 0;
        return;
      }

      // When a scrollable region reaches its top, start measuring the sheet drag there.
      if (waitingForScrollTop) {
        waitingForScrollTop = false;
        originY = y;
        lastY = y;
        lastMoveAt = now;
        return;
      }

      const distance = y - originY;
      if (distance < 8) return;

      if (!dragging) {
        dragging = true;
        sheetContainer.style.transition = 'none';
      }

      if (event.cancelable) event.preventDefault();
      sheetContainer.style.transform = `translateY(${Math.max(0, distance)}px)`;

      const elapsed = Math.max(now - lastMoveAt, 1);
      velocity = ((y - lastY) / elapsed) * 1000;
      lastY = y;
      lastMoveAt = now;
    };

    const finishGesture = (cancelled = false) => {
      if (dragging && !cancelled) {
        const distance = Math.max(0, lastY - (originY ?? lastY));
        const shouldClose = distance >= 56 || velocity >= 125;
        sheetContainer.style.transition = '';
        sheetContainer.style.transform = '';
        if (shouldClose) setCartSheetOpen(false);
      } else {
        sheetContainer.style.transition = '';
        sheetContainer.style.transform = '';
      }

      originY = null;
      velocity = 0;
      dragging = false;
      waitingForScrollTop = false;
      scrollableAncestors = [];
    };

    const handleTouchEnd = () => finishGesture();
    const handleTouchCancel = () => finishGesture(true);

    sheetContainer.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
    sheetContainer.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
    sheetContainer.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true });
    sheetContainer.addEventListener('touchcancel', handleTouchCancel, { capture: true, passive: true });

    return () => {
      sheetContainer.removeEventListener('touchstart', handleTouchStart, true);
      sheetContainer.removeEventListener('touchmove', handleTouchMove, true);
      sheetContainer.removeEventListener('touchend', handleTouchEnd, true);
      sheetContainer.removeEventListener('touchcancel', handleTouchCancel, true);
      resetGesture();
    };
  }, [cartSheetOpen, isMobilePos, isMobileLandscapePos]);

  useEffect(() => {
    if (!scannerOpen) return;
    let active = true;
    let stream: MediaStream | null = null;
    let animationFrame = 0;
    const video = scannerVideoRef.current;
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setScannerError('تشغيل الكاميرا يحتاج إلى فتح التطبيق عبر HTTPS أو localhost.');
      return;
    }
    if (!Detector) {
      setScannerError('المتصفح لا يدعم قراءة الباركود بالكاميرا. يمكنك إدخال الكود يدويًا هنا.');
      return;
    }
    if (!video) return;

    setScannerError('');
    const startScanner = async () => {
      try {
        const supported = Detector.getSupportedFormats
          ? await Detector.getSupportedFormats()
          : [];
        const requestedFormats = [
          'qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e',
          'code_128', 'code_39', 'code_93', 'codabar', 'itf',
        ];
        const formats = supported.length
          ? requestedFormats.filter((format) => supported.includes(format))
          : requestedFormats;
        if (formats.length === 0) {
          setScannerError('لا توجد صيغ باركود مدعومة في هذا المتصفح. يمكنك إدخال الكود يدويًا هنا.');
          return;
        }

        const detector = new Detector({ formats });
        const nextStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        });
        stream = nextStream;
        if (!active) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = nextStream;
        await video.play();

        const scanFrame = async () => {
          if (!active) return;
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            try {
              const results = await detector.detect(video);
              const value = results.find((result) => result.rawValue?.trim())?.rawValue?.trim();
              if (value) {
                processBarcode(value);
                setScannerOpen(false);
                return;
              }
            } catch {
              // A frame can be temporarily unreadable while the camera adjusts.
            }
          }
          if (active) animationFrame = window.requestAnimationFrame(() => void scanFrame());
        };
        void scanFrame();
      } catch {
        setScannerError('تعذر تشغيل الكاميرا. راجع إذن الكاميرا في المتصفح، أو أدخل الباركود يدويًا.');
      }
    };

    void startScanner();
    return () => {
      active = false;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      stream?.getTracks().forEach((track) => track.stop());
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [scannerOpen, processBarcode]);

  const openQuickHold = useCallback((mode: 'pause' | 'plus' | 'switch' | 'new', targetId: string | null = null) => {
    setQuickHoldName('');
    setQuickHoldMode(mode);
    setQuickHoldTargetId(targetId);
    setQuickHoldOpen(true);
  }, []);

  const holdCurrentSale = useCallback((typedName: string): string | null => {
    if (cart.length === 0) return null;
    const current = holdStorageRef.current;
    const existing = current.activeId
      ? current.sales.find((sale) => sale.id === current.activeId)
      : undefined;
    const now = Date.now();
    const cleanName = typedName.trim();
    let heldSale: HeldSale;
    let nextSales: HeldSale[];
    let nextSerial = current.nextSerial;
    let progressTotal = current.progressTotal;

    if (existing) {
      heldSale = {
        ...existing,
        name: cleanName || existing.name,
        items: cart,
        isTaxEnabled: isCartTaxEnabled,
      };
      nextSales = current.sales.map((sale) => sale.id === existing.id ? heldSale : sale);
    } else {
      const time = new Date(now).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      heldSale = {
        id: 'hold-' + now + '-' + Math.random().toString(36).slice(2, 7),
        name: cleanName || ('زبون #' + current.nextSerial + ' - الساعة ' + time),
        createdAt: now,
        items: cart,
        isTaxEnabled: isCartTaxEnabled,
      };
      nextSales = [...current.sales, heldSale];
      nextSerial = current.nextSerial + 1;
      progressTotal = current.sales.length === 0 ? 1 : Math.max(current.progressTotal, current.sales.length) + 1;
      setHoldAddEntering(true);
    }

    if (holdCompletionTimerRef.current !== null) {
      window.clearTimeout(holdCompletionTimerRef.current);
      holdCompletionTimerRef.current = null;
    }
    setHeldSaleCompleted(false);
    setHoldAddReturning(false);
    commitHoldStorage({
      ...current,
      sales: nextSales,
      progressTotal,
      nextSerial,
      activeId: null,
    });
    clearCart();
    return heldSale.id;
  }, [cart, isCartTaxEnabled, clearCart, commitHoldStorage]);

  const restoreHeldSale = useCallback((saleId: string) => {
    const current = holdStorageRef.current;
    const sale = current.sales.find((item) => item.id === saleId);
    if (!sale) return;
    if (holdCompletionTimerRef.current !== null) {
      window.clearTimeout(holdCompletionTimerRef.current);
      holdCompletionTimerRef.current = null;
    }
    setHeldSaleCompleted(false);
    setHoldAddReturning(false);
    replaceCart(sale.items);
    commitHoldStorage({ ...current, activeId: sale.id });
    setHeldListOpen(false);
  }, [replaceCart, commitHoldStorage]);

  const handleQuickHoldSave = useCallback(() => {
    const targetId = quickHoldTargetId;
    const savedId = holdCurrentSale(quickHoldName);
    if (!savedId) {
      showSnackbar('أضف أصنافًا إلى الفاتورة قبل تعليقها.');
      setQuickHoldOpen(false);
      return;
    }
    setQuickHoldOpen(false);
    setQuickHoldName('');
    setQuickHoldTargetId(null);
    if (quickHoldMode === 'plus' || quickHoldMode === 'new') {
      setHeldListOpen(true);
    } else if (quickHoldMode === 'switch' && targetId) {
      restoreHeldSale(targetId);
    } else {
      setHeldListOpen(false);
    }
  }, [quickHoldTargetId, holdCurrentSale, quickHoldName, quickHoldMode, restoreHeldSale, showSnackbar]);

  const handleSelectHeldSale = useCallback((saleId: string) => {
    if (holdStorageRef.current.activeId === saleId) {
      showSnackbar('هذه الفاتورة مفتوحة بالفعل في سلة البيع.');
      setHeldListOpen(false);
      return;
    }
    if (cart.length > 0) {
      openQuickHold('switch', saleId);
      return;
    }
    restoreHeldSale(saleId);
  }, [cart.length, openQuickHold, restoreHeldSale, showSnackbar]);

  const handleDeleteHeldSale = useCallback((saleId: string) => {
    const current = holdStorageRef.current;
    const nextSales = current.sales.filter((sale) => sale.id !== saleId);
    if (nextSales.length === current.sales.length) return;
    const wasActive = current.activeId === saleId;
    commitHoldStorage({
      ...current,
      sales: nextSales,
      progressTotal: nextSales.length === 0 ? 0 : current.progressTotal,
      progressValue: nextSales.length === 0 ? 0 : current.progressValue,
      activeId: wasActive ? null : current.activeId,
    });
    if (wasActive) clearCart();
    if (nextSales.length === 0) {
      setHeldListOpen(false);
      setHoldAddReturning(false);
      setHoldAddEntering(false);
      setHeldSaleCompleted(false);
    }
    showSnackbar('تم حذف الفاتورة المعلقة.');
  }, [commitHoldStorage, clearCart, showSnackbar]);

  const handleClearHeldSales = useCallback(() => {
    const current = holdStorageRef.current;
    if (current.sales.length === 0) return;
    if (!window.confirm('هل تريد حذف جميع الفواتير المعلقة؟ لا يمكن التراجع عن هذه الخطوة.')) return;
    commitHoldStorage({ ...current, sales: [], progressTotal: 0, progressValue: 0, activeId: null });
    if (current.activeId) clearCart();
    setHeldListOpen(false);
    setHeldSaleCompleted(false);
    setHoldAddReturning(false);
    setHoldAddEntering(false);
    if (holdCompletionTimerRef.current !== null) {
      window.clearTimeout(holdCompletionTimerRef.current);
      holdCompletionTimerRef.current = null;
    }
    showSnackbar('تم تفريغ الفواتير المعلقة.');
  }, [commitHoldStorage, clearCart, showSnackbar]);

  const handleHoldPlusClick = useCallback(() => {
    if (heldListOpen) {
      if (cart.length > 0) openQuickHold('new');
      else setHeldListOpen(false);
      return;
    }
    if (cart.length > 0) openQuickHold('plus');
    else setHeldListOpen(false);
  }, [heldListOpen, cart.length, openQuickHold]);

  const handleClearAction = useCallback(() => {
    if (heldListOpen) {
      handleClearHeldSales();
      return;
    }
    const activeId = holdStorageRef.current.activeId;
    if (activeId) {
      if (!window.confirm('هل تريد حذف الفاتورة المعلقة المفتوحة وتفريغ السلة؟')) return;
      handleDeleteHeldSale(activeId);
      return;
    }
    clearCart();
    showSnackbar('تم تفريغ سلة البيع.');
  }, [heldListOpen, handleClearHeldSales, handleDeleteHeldSale, clearCart, showSnackbar]);

  const handleHoldMainClick = useCallback(() => {
    if (heldSaleCompleted || holdAddReturning) return;
    if (holdStorageRef.current.sales.length > 0) {
      if (isMobilePos) {
        setHeldListOpen(true);
        setCartSheetOpen(true);
      } else {
        setHeldListOpen((open) => !open);
      }
      return;
    }
    if (cart.length > 0) openQuickHold('pause');
  }, [heldSaleCompleted, holdAddReturning, cart.length, openQuickHold, isMobilePos]);

  const handleHoldAddAnimationEnd = useCallback((event: React.AnimationEvent<HTMLDivElement>) => {
    if (['matjark-hold-add-enter', 'matjark-hold-add-enter-small'].includes(event.animationName)) {
      setHoldAddEntering(false);
      return;
    }
    if (
      !['matjark-hold-add-return', 'matjark-hold-add-return-small'].includes(event.animationName) ||
      !holdAddReturning
    ) return;
    setHoldAddReturning(false);
    setHeldSaleCompleted(true);
    if (holdCompletionTimerRef.current !== null) {
      window.clearTimeout(holdCompletionTimerRef.current);
    }
    holdCompletionTimerRef.current = window.setTimeout(() => {
      setHeldSaleCompleted(false);
      const latest = holdStorageRef.current;
      if (latest.sales.length === 0) {
        commitHoldStorage({ ...latest, progressTotal: 0, progressValue: 0, activeId: null });
      }
      holdCompletionTimerRef.current = null;
    }, 1000);
  }, [holdAddReturning, commitHoldStorage]);

  const handleSafeAdd = useCallback(
    (product: any) => {
      const existing = cart.find((item) => item.product.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      if (product.stock <= 0 || currentQty + 1 > product.stock) {
        showSnackbar(`الكمية المتاحة من "${product.name}" في المخزن هي (${product.stock}) فقط.`);
        return;
      }
      addToCart(product);
    },
    [cart, addToCart, showSnackbar]
  );

  const handleSafeUpdateQty = useCallback(
    (productId: string, newQty: number) => {
      const prod = products.find((p) => p.id === productId);
      if (prod && newQty > prod.stock) {
        showSnackbar(`لا يمكن تجاوز الكمية المتاحة في المخزن (${prod.stock}) لصنف "${prod.name}".`);
        return;
      }
      updateCartQuantity(productId, newQty);
    },
    [products, updateCartQuantity, showSnackbar]
  );

  useEffect(() => {
    const host = cartListHostRef.current;
    if (!host) return;

    const actionButtons: Array<ReturnType<typeof createIconButton>> = [];
    const makeActionButton = (
      Icon: React.ElementType,
      ariaLabel: string,
      variant: 'outlined' | 'tonal' | 'filled',
      onClick: () => void,
      extraClass = ''
    ) => {
      const button = createIconButton({
        icon: toIconSvg(Icon),
        ariaLabel,
        variant,
        class: `matjark-pos-cart-action ${extraClass}`.trim(),
      });
      button.on('click', onClick);
      actionButtons.push(button);
      return button.element;
    };

    const items = cart.map((item) => {
      const controls = document.createElement('div');
      controls.className = 'matjark-pos-cart-controls';
      controls.dir = 'ltr';

      const quantityControls = document.createElement('div');
      quantityControls.className = 'matjark-pos-quantity-controls';
      quantityControls.dir = 'ltr';
      const decreaseButton = makeActionButton(
        Minus,
        `إنقاص كمية ${item.product.name}`,
        'outlined',
        () => handleSafeUpdateQty(item.product.id, item.quantity - 1),
        'matjark-pos-cart-minus'
      );
      const increaseButton = makeActionButton(
        Plus,
        `زيادة كمية ${item.product.name}`,
        'filled',
        () => handleSafeUpdateQty(item.product.id, item.quantity + 1),
        'matjark-pos-cart-plus'
      );

      if (isMobileLandscapePos) {
        const quantityValue = document.createElement('span');
        quantityValue.className = 'matjark-pos-cart-quantity-value';
        quantityValue.textContent = String(item.quantity);
        quantityControls.append(decreaseButton, quantityValue, increaseButton);
      } else {
        quantityControls.append(decreaseButton, increaseButton);
      }

      controls.append(
        makeActionButton(
          Trash2,
          `حذف ${item.product.name}`,
          'tonal',
          () => removeFromCart(item.product.id),
          'matjark-pos-cart-delete'
        ),
        quantityControls
      );

      return {
        id: item.product.id,
        headline: item.product.name,
        supportingText: isMobileLandscapePos
          ? formatCurrency(item.unitPrice * item.quantity)
          : `${formatCurrency(item.unitPrice)} × ${item.quantity} = ${formatCurrency(item.unitPrice * item.quantity)}`,
        trailing: { type: 'custom' as const, content: controls },
      };
    });

    const list = createList({
      ariaLabel: 'أصناف سلة البيع',
      items,
      variant: 'segmented',
      trackSelection: false,
      class: 'matjark-pos-cart-list',
    });
    list.element.dir = 'rtl';

    host.replaceChildren(list.element);
    return () => {
      actionButtons.forEach((button) => button.destroy());
      list.destroy();
      list.element.remove();
    };
  }, [cart, formatCurrency, handleSafeUpdateQty, removeFromCart, isMobileLandscapePos]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const norm = normalizeArabicText(searchQuery);
      list = list.filter(
        (p) => p.barcode.includes(searchQuery.trim()) || normalizeArabicText(p.name).includes(norm)
      );
    }
    return list;
  }, [products, selectedCategory, searchQuery]);

  const cartQuantitiesByProduct = useMemo(
    () => new Map(cart.map((item) => [item.product.id, item.quantity])),
    [cart]
  );

  const openCheckoutModal = () => {
    setCartSheetOpen(false);
    setPaidAmount(cartTotals.grandTotal);
    setSelectedPayment('cash');
    setCheckoutModalOpen(true);
  };

  const handleConfirmPayment = () => {
    const cust = customers.find((c) => c.id === selectedCustomerId);
    const activeHeldId = holdStorageRef.current.activeId;
    const invoice = checkoutInvoice({
      paymentMethod: selectedPayment,
      amountPaid: Number(paidAmount),
      customerId: cust?.id,
      customerName: cust?.name,
      customerTaxNumber: cust?.taxNumber,
    });
    if (invoice) {
      if (activeHeldId) {
        const current = holdStorageRef.current;
        const remainingSales = current.sales.filter((sale) => sale.id !== activeHeldId);
        const nextProgressValue = remainingSales.length === 0
          ? 100
          : Math.min(
              100,
              current.progressValue + (100 - current.progressValue) / Math.max(1, current.sales.length)
            );
        commitHoldStorage({
          ...current,
          sales: remainingSales,
          progressValue: nextProgressValue,
          activeId: null,
        });
        if (remainingSales.length === 0) {
          setHeldSaleCompleted(false);
          setHoldAddReturning(true);
          if (holdCompletionTimerRef.current !== null) {
            window.clearTimeout(holdCompletionTimerRef.current);
            holdCompletionTimerRef.current = null;
          }
        }
      }
      setHeldListOpen(false);
      setCheckoutModalOpen(false);
      setLastInvoice(invoice);
      showSnackbar(`تم إصدار الفاتورة رقم (${invoice.invoiceNumber || ''}) بنجاح.`);
    }
  };

  const holdIndicator = (
            <div className="matjark-pos-hold-indicator">
              {(holdStorage.sales.length > 0 || holdAddReturning || heldSaleCompleted) && (
                <MProgress
                  variant="circular"
                  shape="wavy"
                  thickness={2.5}
                  size={52}
                  value={holdStorage.progressValue}
                  ariaLabel="نسبة الفواتير المعلقة المكتملة"
                  className={`matjark-pos-hold-progress${heldSaleCompleted ? ' matjark-pos-hold-progress--complete' : ''}`}
                />
              )}
              {heldSaleCompleted ? (
                <MuiIconButton
                  icon={materialCheckIcon()}
                  ariaLabel="اكتملت جميع الفواتير المعلقة"
                  variant="filled"
                  size="small"
                  className="matjark-hold-button matjark-hold-button--complete"
                  disabled
                />
              ) : holdStorage.sales.length > 0 || holdAddReturning ? (
                <>
                  <MuiIconButton
                    icon={materialHoldIcon('play_arrow')}
                    ariaLabel={heldListOpen ? "إغلاق قائمة الفواتير المعلقة" : "عرض الفواتير المعلقة"}
                    variant="filled"
                    size="extraSmall"
                    className="matjark-hold-button matjark-hold-button--play"
                    onClick={handleHoldMainClick}
                  />
                  {holdStorage.sales.length > 0 && (
                    <MBadge
                      label={String(holdStorage.sales.length)}
                      variant="large"
                      color="error"
                      className="matjark-pos-hold-badge"
                    />
                  )}
                </>
              ) : (
                <MuiIconButton
                  icon={materialHoldIcon('pause')}
                  ariaLabel="تعليق الفاتورة الحالية"
                  variant="filled"
                  size="extraSmall"
                  className="matjark-hold-button matjark-hold-button--pause"
                  disabled={cart.length === 0}
                  onClick={handleHoldMainClick}
                />
              )}
              <div
                className={`matjark-pos-hold-add${holdAddReturning ? ' matjark-pos-hold-add--returning' : holdStorage.sales.length > 0 ? ` matjark-pos-hold-add--visible${holdAddEntering ? ' matjark-pos-hold-add--entering' : ''}` : ''}`}
                aria-hidden={holdStorage.sales.length === 0}
                onAnimationEnd={handleHoldAddAnimationEnd}
              >
                <MuiIconButton
                  icon={materialHoldIcon('add')}
                  ariaLabel="تعليق الفاتورة الحالية وإضافتها للمعلقات"
                  variant="filled"
                  size="extraSmall"
                  className="matjark-hold-add-button"
                  disabled={holdStorage.sales.length === 0 || holdAddReturning || heldSaleCompleted}
                  onClick={handleHoldPlusClick}
                />
              </div>
            </div>
  );

  const searchField = (
    <div className="matjark-pos-search-field-wrap">
      <MuiTextField
        label={isMobileLandscapePos ? "بحث عن صنف..." : "بحث فوري باسم الصنف..."}
        type="text"
        density={isMobileLandscapePos ? "compact" : "default"}
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        startAdornment={<Search className="w-4 h-4" />}
        fullWidth
        className="matjark-pos-search-field"
      />
      {isMobilePos && (
        <button
          type="button"
          className="matjark-pos-search-camera"
          aria-label="مسح باركود أو QR بالكاميرا"
          onClick={() => {
            setScannerError('');
            setScannerOpen(true);
          }}
        >
          <Camera width={19} height={19} strokeWidth={2} />
        </button>
      )}
    </div>
  );

  const cartPanel = (
      <div
        className="mtrl-card matjark-pos-cart-panel w-full md:w-[340px] lg:w-[390px] h-[45%] md:h-full max-h-full min-h-0 min-w-0 flex flex-col bg-[var(--md-sys-color-surface-container)] rounded-3xl border border-[var(--md-sys-color-outline-variant)] overflow-hidden shrink-0"
        dir="rtl"
      >
        <div className="matjark-pos-cart-header px-3.5 py-2.5 border-b border-[var(--md-sys-color-outline-variant)]/70 flex items-center justify-between bg-[var(--md-sys-color-surface-container-low)] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] flex items-center justify-center">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
            <span className="text-[13px] font-bold text-[var(--md-sys-color-on-surface)]">سلة البيع</span>
            <MBadge label={String(cartTotals.unitsCount)} variant="large" color="primary" className="matjark-pos-cart-count-badge" />
          </div>
          <div className="matjark-pos-cart-header-actions flex items-center gap-1.5" dir="rtl">
{holdIndicator}            <MuiIconButton
              icon={<Trash2 width={18} height={18} className="matjark-hold-icon" />}
              ariaLabel="تفريغ أو حذف الفاتورة الحالية"
              variant="filled"
              size="small"
              className="matjark-hold-button matjark-hold-button--clear"
              disabled={!((heldListOpen && holdStorage.sales.length > 0) || (!heldListOpen && (cart.length > 0 || Boolean(holdStorage.activeId))))}
              onClick={handleClearAction}
            />

          </div>
        </div>

        {heldListOpen ? (
          <div className="matjark-pos-held-list flex-1 min-h-0 p-2.5 overflow-y-auto" dir="rtl">
            {holdStorage.sales.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--md-sys-color-outline)]">
                <Clock3 className="w-9 h-9 mb-2 opacity-50" />
                <p className="text-xs font-medium">لا توجد فواتير معلقة</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {holdStorage.sales
                  .slice()
                  .sort((a, b) => a.createdAt - b.createdAt)
                  .map((sale) => {
                    const isActiveSale = holdStorage.activeId === sale.id;
                    const unitsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                    const amount = sale.items.reduce((sum, item) => {
                      const netLine = Math.max(0, item.unitPrice * item.quantity - item.discount * item.quantity);
                      const taxRate = sale.isTaxEnabled ? (item.taxRate || settings.defaultTaxRate || 0.14) : 0;
                      return sum + netLine + netLine * taxRate;
                    }, 0);
                    return (
                      <div key={sale.id} className="matjark-held-sale-card">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] truncate">{sale.name}</span>
                            {isActiveSale && <span className="matjark-held-sale-active">قيد العمل</span>}
                          </div>
                          <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-1">
                            {new Date(sale.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                          <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-1">
                            {sale.items.length} صنف · {unitsCount} قطعة · {formatCurrency(amount)}
                          </p>
                        </div>
                        <div className="matjark-held-sale-actions">
                          <MuiButton
                            variant="outlined"
                            color="primary"
                            size="small"
                            disabled={isActiveSale}
                            onClick={() => handleSelectHeldSale(sale.id)}
                          >
                            {isActiveSale ? 'مفتوحة' : 'استرجاع'}
                          </MuiButton>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-0 text-[var(--md-sys-color-outline)]">
            <ShoppingCart className="w-9 h-9 mb-1.5 opacity-40" />
            <p className="text-xs font-medium">السلة فارغة، اضغط على أي صنف للإضافة</p>
          </div>
        ) : (
          <div
            ref={cartListHostRef}
            className="matjark-pos-cart-list-host flex-1 min-h-0 p-2.5 overflow-y-auto"
            dir="rtl"
          />
        )}

        {!heldListOpen && <div className="matjark-pos-cart-footer p-3 bg-[var(--md-sys-color-surface-container-low)] border-t border-[var(--md-sys-color-outline-variant)] space-y-2 shrink-0">
          <div className="matjark-pos-tax-row flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
              {settings.enableTax
                ? (settings.pricesIncludeTax
                  ? 'سعر الرف شامل ضريبة القيمة المضافة'
                  : 'تُضاف الضريبة إلى السعر المسجل')
                : 'الضريبة غير مفعّلة في إعدادات المتجر'}
            </span>
            {settings.enableTax && settings.pricesIncludeTax && (
              <span className="text-[11px] text-[var(--md-sys-color-outline)] whitespace-nowrap">
                لا تُضاف أي زيادة عند الدفع
              </span>
            )}
          </div>

          <div className="matjark-pos-divider" role="separator" />

          <div className="flex justify-between items-center">
            <span className="text-xs lg:text-sm font-bold text-[var(--md-sys-color-on-surface)]">الإجمالي النهائي:</span>
            <span className="text-sm lg:text-base font-extrabold text-[var(--md-sys-color-primary)] whitespace-nowrap">
              {formatCurrency(cartTotals.grandTotal)}
            </span>
          </div>

          <div className="matjark-pos-checkout-action">
            <MuiButton
              variant="contained"
              color="primary"
              size="medium"
              startIcon={<CreditCard width={19} height={19} />}
              fullWidth
              className="matjark-pos-checkout-button"
              disabled={cart.length === 0}
              onClick={openCheckoutModal}
            >
              إتمام الدفع
            </MuiButton>
          </div>
        </div>}
      </div>
  );

  const handlePosTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobilePos || isMobileLandscapePos || cartSheetOpen || event.touches.length !== 1) return;
    const startY = event.touches[0].clientY;
    if (startY >= window.innerHeight - 96) swipeStartYRef.current = startY;
  };

  const handlePosTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startY = swipeStartYRef.current;
    swipeStartYRef.current = null;
    if (startY === null || !isMobilePos || isMobileLandscapePos || cartSheetOpen) return;
    const endY = event.changedTouches[0]?.clientY ?? startY;
    if (startY - endY >= 48) {
      setHeldListOpen(false);
      setCartSheetOpen(true);
    }
  };

  const handlePosTouchCancel = () => {
    swipeStartYRef.current = null;
  };

  return (
    <div
      className="matjark-cashier-screen-layout"
      onTouchStart={handlePosTouchStart}
      onTouchEnd={handlePosTouchEnd}
      onTouchCancel={handlePosTouchCancel}
    >
    <div className="matjark-pos-root flex flex-col md:flex-row gap-3 lg:gap-4 h-full max-h-full w-full min-w-0 min-h-0 relative overflow-hidden" dir="rtl">
      {snackbar && (
        <MSnackbar
          key={snackbar.id}
          open
          message={snackbar.message}
          duration="short"
          dismissible
          position="center"
          queueBehavior="replace"
          onClose={() => {
            setSnackbar((current) => current?.id === snackbar.id ? null : current);
          }}
          className="matjark-pos-snackbar"
        />
      )}

      <div className="matjark-pos-products-column">
        <MobileNavigation
          cashierMode
          actionsAfterTitle
          actions={
            <div
              className={`matjark-mobile-cashier-actions${isMobileLandscapePos ? ' matjark-mobile-cashier-actions--landscape' : ''}`}
              dir="rtl"
            >
              {isMobileLandscapePos ? searchField : holdIndicator}
            </div>
          }
        />
        <div
          className="mtrl-card matjark-pos-products-panel flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--md-sys-color-surface)] rounded-3xl border border-[var(--md-sys-color-outline-variant)] overflow-hidden"
        >
        <div className="matjark-pos-field-grid p-3 lg:p-4 bg-[var(--md-sys-color-surface-container-low)] grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-b border-[var(--md-sys-color-outline-variant)] shrink-0">
          {!isMobileLandscapePos && (
            <>
              <MuiTextField
                label="امسح الباركود واضغط Enter..."
                type="text"
                value={barcodeQuery}
                onChange={(event) => setBarcodeQuery(event.target.value)}
                onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                  if (event.key === 'Enter') processBarcode(barcodeQuery);
                }}
                startAdornment={<Barcode className="w-4 h-4" />}
                fullWidth
                className="matjark-pos-barcode-field"
              />
              {searchField}
            </>
          )}
        </div>

        <div
          className="matjark-filter-chips-viewport px-3 lg:px-4 py-2.5 border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)] shrink-0"
          onWheel={(event) => {
            const chipsHost = event.currentTarget.querySelector<HTMLElement>('.matjark-filter-chips--scrollable');
            const scrollTarget = chipsHost?.shadowRoot?.querySelector<HTMLElement>('.mtrl-chips__container');
            if (!scrollTarget || scrollTarget.scrollWidth <= scrollTarget.clientWidth + 1) return;
            event.preventDefault();
            const delta = event.deltaY || event.deltaX;
            const direction = getComputedStyle(scrollTarget).direction;
            scrollTarget.scrollBy({ left: direction === 'rtl' ? -delta : delta, behavior: 'auto' });
          }}
        >
          <MuiChipGroup
            value={selectedCategory}
            onChange={setSelectedCategory}
            ariaLabel="تصنيفات المنتجات"
            scrollable
            className="matjark-filter-chips matjark-filter-chips--scrollable"
            options={[
              { value: 'all', label: 'الكل' },
              ...categories.map((category) => ({ value: category, label: category })),
            ]}
          />
        </div>

        <div className="matjark-pos-products-scroll flex-1 min-h-0 p-3 lg:p-4 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--md-sys-color-outline)]">
              <Search className="w-12 h-12 mb-2 opacity-40" />
              <p className="text-sm font-semibold">لا توجد أصناف مطابقة للبحث</p>
            </div>
          ) : (
            <div className="matjark-pos-product-grid grid gap-3.5 pt-1">
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  availableStock={Math.max(0, p.stock - (cartQuantitiesByProduct.get(p.id) ?? 0))}
                  onAdd={handleSafeAdd}
                  onOutOfStockClick={(prod: any) =>
                    showSnackbar(`نفذت كمية "${prod.name}" من المخزن ولا يمكن إضافتها.`)
                  }
                />
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
      {(!isMobilePos || isMobileLandscapePos) && cartPanel}

      {isMobilePos && (
        <>
          {!isMobileLandscapePos && (
            <>
          <button
            type="button"
            className="matjark-pos-mobile-summary"
            aria-label={`فتح سلة البيع، الإجمالي ${formatCurrency(cartTotals.grandTotal)}، عدد القطع ${cartTotals.unitsCount}`}
            onClick={() => {
              setHeldListOpen(false);
              setCartSheetOpen(true);
            }}
          >
            <span className="matjark-pos-mobile-summary-total">
              <span className="matjark-pos-mobile-summary-label">الإجمالي</span>
              <strong>{formatCurrency(cartTotals.grandTotal)}</strong>
            </span>
            <span className="matjark-pos-mobile-summary-count">
              <ShoppingCart width={16} height={16} />
              <span>{cartTotals.unitsCount} قطعة</span>
              <span className="matjark-pos-mobile-summary-open-label">فتح السلة</span>
              <ChevronUp width={17} height={17} />
            </span>
          </button>

          <MBottomSheet
            ref={cartSheetRef}
            open={cartSheetOpen}
            modal
            headline={heldListOpen ? 'الفواتير المعلقة' : 'سلة البيع'}
            expanded={cartSheetOpen}
            maxWidth={560}
            onClose={() => setCartSheetOpen(false)}
            className="matjark-pos-cart-sheet"
          >
            {cartPanel}
          </MBottomSheet>
            </>
          )}



          <MBottomSheet
            open={scannerOpen}
            modal
            headline="مسح الباركود وQR"
            expanded={scannerOpen}
            maxWidth={560}
            onClose={() => setScannerOpen(false)}
            className="matjark-pos-scanner-sheet"
          >
            <div className="matjark-pos-scanner-content" dir="rtl">
              <p className="matjark-pos-scanner-hint">
                {scannerError || 'وجّه الكاميرا إلى الباركود أو رمز QR وسيتم إضافة الصنف تلقائيًا.'}
              </p>
              {!scannerError && (
                <video
                  ref={scannerVideoRef}
                  className="matjark-pos-scanner-video"
                  autoPlay
                  playsInline
                  muted
                />
              )}
              {scannerError && (
                <MuiTextField
                  label="إدخال الباركود يدويًا"
                  value={barcodeQuery}
                  onChange={(event) => setBarcodeQuery(event.target.value)}
                  onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                    if (event.key === 'Enter') {
                      processBarcode(barcodeQuery);
                      setScannerOpen(false);
                    }
                  }}
                  fullWidth
                  className="matjark-pos-search-field"
                />
              )}
              <div className="matjark-pos-scanner-actions">
                <MuiButton variant="outlined" color="primary" size="small" onClick={() => setScannerOpen(false)}>
                  إغلاق
                </MuiButton>
              </div>
            </div>
          </MBottomSheet>
        </>
      )}

      <MuiDialog
        open={quickHoldOpen}
        title="تعليق الفاتورة"
        maxWidth="sm"
        className="matjark-quick-hold-dialog"
        onClose={() => setQuickHoldOpen(false)}
      >
        <div className="matjark-quick-hold-content">
          <div className="matjark-quick-hold-row">
            <MuiTextField
              ref={quickHoldInputRef}
              type="text"
              value={quickHoldName}
              onChange={(event) => setQuickHoldName(event.target.value)}
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleQuickHoldSave();
                }
              }}
              placeholder="اسم الزبون أو ملاحظة (اختياري)"
              className="matjark-quick-hold-input"
            />
            <MuiButton variant="contained" color="primary" size="small" onClick={handleQuickHoldSave}>
              حفظ سريع · Enter
            </MuiButton>
          </div>
          <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-2">
            اضغط Enter للحفظ السريع، أو اترك الاسم فارغًا ليُنشئ النظام اسمًا تلقائيًا.
          </p>
        </div>
      </MuiDialog>

      <MBottomSheet
        open={checkoutModalOpen}
        modal
        headline="إتمام عملية الدفع"
        expanded={checkoutModalOpen}
        maxWidth={9999}
        onClose={() => setCheckoutModalOpen(false)}
        className="matjark-pos-payment-sheet"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)] flex justify-between items-center">
            <span className="text-sm font-semibold">المبلغ المطلوب سداده:</span>
            <span className="text-lg font-extrabold text-[var(--md-sys-color-primary)] whitespace-nowrap">
              {formatCurrency(cartTotals.grandTotal)}
            </span>
          </div>

          <div>
            <MuiSelect
              label="العميل (اختياري)"
              value={selectedCustomerId}
              onChange={(event) => setSelectedCustomerId(event.target.value)}
              className="matjark-cashier-customer-select"
            >
              <option value="">عميل نقدي (بدون تحديد)</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </MuiSelect>
          </div>

          <div className="matjark-pos-payment-methods">
            <label className="block text-xs font-bold mb-2">طريقة الدفع:</label>
            <MButtonGroup
              kind="connected"
              selection="single"
              required
              value={selectedPayment}
              variant="outlined"
              shape="round"
              size="m"
              equalWidth
              aria-label="اختيار طريقة الدفع"
              dir="ltr"
              className="matjark-cashier-payment-group"
              onChange={(event: CustomEvent<{ value: string | string[] | null }>) => {
                const value = event.detail?.value;
                if (typeof value === 'string') setSelectedPayment(value as PaymentMethod);
              }}
            >
              <MButtonGroupItem value="wallet" label="محفظة" icon={toSvg(Smartphone)} />
              <MButtonGroupItem value="card" label="فيزا" icon={toSvg(CreditCard)} />
              <MButtonGroupItem value="cash" label="كاش" icon={toSvg(Banknote)} />
            </MButtonGroup>
          </div>

          <div>
            <MuiTextField
              label="المبلغ المستلم من العميل"
              type="number"
              density="compact"
              value={String(paidAmount)}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              className="matjark-cashier-payment-field"
            />
            {paidAmount > cartTotals.grandTotal && (
              <p className="text-xs font-bold text-emerald-500 mt-1.5 whitespace-nowrap">
                المتبقي للعميل (الباقي): {formatCurrency(paidAmount - cartTotals.grandTotal)}
              </p>
            )}
          </div>

        </div>
        <div className="matjark-pos-dialog-actions matjark-pos-payment-actions">
          <MuiButton variant="outlined" color="primary" size="small" onClick={() => setCheckoutModalOpen(false)}>
            إلغاء
          </MuiButton>
          <MuiButton variant="contained" color="primary" size="small" onClick={handleConfirmPayment}>
            تأكيد وإصدار الفاتورة
          </MuiButton>
        </div>
      </MBottomSheet>

      {lastInvoice && (
        <MuiDialog open={!!lastInvoice} title="معاينة وطباعة الفاتورة" maxWidth="md" className="matjark-invoice-dialog" onClose={() => setLastInvoice(null)}>
          <MCard variant="outlined" className="matjark-pos-invoice-card">
            <div className="matjark-pos-invoice-scroll">
              <ThermalReceipt invoice={lastInvoice} settings={settings} onClose={() => setLastInvoice(null)} />
            </div>
          </MCard>
        </MuiDialog>
      )}
    </div>
    </div>
  );
};
