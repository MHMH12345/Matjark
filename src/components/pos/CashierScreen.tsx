import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createIconButton, createList } from 'material';
import {
  Badge as MaterialBadge,
  BottomSheet as MaterialBottomSheet,
  ButtonGroup as MaterialButtonGroup,
  ButtonGroupItem as MaterialButtonGroupItem,
  Card as MaterialCard,
  Snackbar as MaterialSnackbar,
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
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PaymentMethod } from '../../types';
import { getProductPlaceholderSvg } from '../../utils/imageCompressor';
import { normalizeArabicText } from '../../utils/performance';
import { ThermalReceipt } from './ThermalReceipt';
import { MuiChipGroup } from '../ui/MuiChipGroup';
import { MuiTextField } from '../ui/MuiTextField';
import { MuiSwitch } from '../ui/MuiSwitch';
import { MuiSelect } from '../ui/MuiSelect';
import { MuiDialog } from '../ui/MuiDialog';
import { MuiButton } from '../ui/MuiButton';

const toSvg = (Icon: React.ElementType, size = 'w-4 h-4') =>
  renderToStaticMarkup(<Icon className={size} />);

const toIconSvg = (Icon: React.ElementType, size = 14) =>
  renderToStaticMarkup(<Icon width={size} height={size} strokeWidth={2} />);

const MCard = MaterialCard as React.ComponentType<any>;
const MBadge = MaterialBadge as React.ComponentType<any>;
const MBottomSheet = MaterialBottomSheet as React.ComponentType<any>;
const MButtonGroup = MaterialButtonGroup as React.ComponentType<any>;
const MButtonGroupItem = MaterialButtonGroupItem as React.ComponentType<any>;
const MSnackbar = MaterialSnackbar as React.ComponentType<any>;

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
    setIsCartTaxEnabled,
    formatCurrency,
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

  const snackbarIdRef = useRef(0);
  const cartListHostRef = useRef<HTMLDivElement>(null);

  const showSnackbar = useCallback((message: string) => {
    const id = ++snackbarIdRef.current;
    setSnackbar({ id, message });
  }, []);

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
      quantityControls.append(
        makeActionButton(
          Minus,
          `إنقاص كمية ${item.product.name}`,
          'outlined',
          () => handleSafeUpdateQty(item.product.id, item.quantity - 1),
          'matjark-pos-cart-minus'
        ),
        makeActionButton(
          Plus,
          `زيادة كمية ${item.product.name}`,
          'filled',
          () => handleSafeUpdateQty(item.product.id, item.quantity + 1),
          'matjark-pos-cart-plus'
        )
      );

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
        supportingText: `${formatCurrency(item.unitPrice)} × ${item.quantity} = ${formatCurrency(item.unitPrice * item.quantity)}`,
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
  }, [cart, formatCurrency, handleSafeUpdateQty, removeFromCart]);

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
    setPaidAmount(cartTotals.grandTotal);
    setSelectedPayment('cash');
    setCheckoutModalOpen(true);
  };

  const handleConfirmPayment = () => {
    const cust = customers.find((c) => c.id === selectedCustomerId);
    const invoice = checkoutInvoice({
      paymentMethod: selectedPayment,
      amountPaid: Number(paidAmount) || cartTotals.grandTotal,
      customerId: cust?.id,
      customerName: cust?.name,
      customerTaxNumber: cust?.taxNumber,
    });
    if (invoice) {
      setCheckoutModalOpen(false);
      setLastInvoice(invoice);
      showSnackbar(`تم إصدار الفاتورة رقم (${invoice.invoiceNumber || ''}) بنجاح.`);
    }
  };

  return (
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

      <div
        className="mtrl-card matjark-pos-products-panel flex-1 min-h-0 min-w-0 flex flex-col bg-[var(--md-sys-color-surface)] rounded-3xl border border-[var(--md-sys-color-outline-variant)] overflow-hidden"
      >
        <div className="matjark-pos-field-grid p-3 lg:p-4 bg-[var(--md-sys-color-surface-container-low)] grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-b border-[var(--md-sys-color-outline-variant)] shrink-0">
          <MuiTextField
            label="امسح الباركود واضغط Enter..."
            type="text"
            value={barcodeQuery}
            onChange={(event) => setBarcodeQuery(event.target.value)}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key !== 'Enter') return;
              const code = barcodeQuery.trim();
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
            }}
            startAdornment={<Barcode className="w-4 h-4" />}
            fullWidth
            className="matjark-pos-barcode-field"
          />
          <MuiTextField
            label="بحث فوري باسم الصنف..."
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            startAdornment={<Search className="w-4 h-4" />}
            fullWidth
            className="matjark-pos-search-field"
          />
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

        <div className="flex-1 min-h-0 p-3 lg:p-4 overflow-y-auto">
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
      <div
        className="mtrl-card matjark-pos-cart-panel w-full md:w-[340px] lg:w-[390px] h-[45%] md:h-full max-h-full min-h-0 min-w-0 flex flex-col bg-[var(--md-sys-color-surface-container)] rounded-3xl border border-[var(--md-sys-color-outline-variant)] overflow-hidden shrink-0"
        dir="rtl"
      >
        <div className="px-3.5 py-2.5 border-b border-[var(--md-sys-color-outline-variant)]/70 flex items-center justify-between bg-[var(--md-sys-color-surface-container-low)] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] flex items-center justify-center">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
            <span className="text-[13px] font-bold text-[var(--md-sys-color-on-surface)]">سلة البيع</span>
            <MBadge label={String(cartTotals.unitsCount)} variant="large" color="primary" className="matjark-pos-cart-count-badge" />
          </div>
          {cart.length > 0 && (
            <MuiButton
              variant="text"
              color="secondary"
              size="small"
              startIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => {
                clearCart();
                showSnackbar('تم تفريغ سلة البيع.');
              }}
            >
              تفريغ
            </MuiButton>
          )}
        </div>

        {cart.length === 0 ? (
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

        <div className="p-3 bg-[var(--md-sys-color-surface-container-low)] border-t border-[var(--md-sys-color-outline-variant)] space-y-2 shrink-0">
          <div className="matjark-pos-tax-row flex items-center justify-between gap-2">
            <MuiSwitch
              checked={isCartTaxEnabled}
              onChange={(event) => setIsCartTaxEnabled(event.target.checked)}
              label="ضريبة القيمة المضافة (14%)"
              className="matjark-pos-tax-switch"
            />
            <span className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] whitespace-nowrap">
              {formatCurrency(cartTotals.taxTotal)}
            </span>
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
              className="matjark-pos-checkout-button"
              disabled={cart.length === 0}
              onClick={openCheckoutModal}
            >
              إتمام الدفع
            </MuiButton>
          </div>
        </div>
      </div>

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
  );
};
