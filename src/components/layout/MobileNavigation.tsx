import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createNavigationBar } from 'material';
import { BottomSheet as MaterialBottomSheet } from 'material/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Menu, ShoppingCart, Package, FileText, Wallet, MoreHorizontal, Users, BarChart3, Settings, X } from 'lucide-react';
import { ActiveTab, useStore } from '../../context/StoreContext';

const MBottomSheet = MaterialBottomSheet as React.ComponentType<any>;
const iconMarkup = (Icon: React.ElementType) => renderToStaticMarkup(<Icon width={24} height={24} strokeWidth={2} />);

const MORE_DESTINATIONS: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
  { id: 'pos', label: 'الكاشير', icon: <ShoppingCart size={20} /> },
  { id: 'customers', label: 'العملاء', icon: <Users size={20} /> },
  { id: 'reports', label: 'التقارير', icon: <BarChart3 size={20} /> },
  { id: 'settings', label: 'الإعدادات', icon: <Settings size={20} /> },
];

const CASHIER_DESTINATIONS: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
  { id: 'inventory', label: 'المخزن', icon: <Package size={20} /> },
  { id: 'invoices', label: 'الفواتير', icon: <FileText size={20} /> },
  { id: 'accounting', label: 'الحسابات', icon: <Wallet size={20} /> },
  ...MORE_DESTINATIONS.filter((destination) => destination.id !== 'pos'),
];

type MobileNavigationProps = {
  cashierMode?: boolean;
  actions?: React.ReactNode;
  actionsAfterTitle?: boolean;
};

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ cashierMode = false, actions, actionsAfterTitle = false }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const cashierAppbarRef = useRef<HTMLElement>(null);
  const cashierActionsRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const { activeTab, setActiveTab, products } = useStore();

  const lowStockCount = useMemo(
    () => products.filter((product) => product.stock <= (product.minStockAlert ?? 5)).length,
    [products]
  );

  useEffect(() => {
    if (cashierMode || !hostRef.current) return;
    const activeMore = ['customers', 'reports', 'settings', 'performance'].includes(activeTab);
    const navigation = createNavigationBar({
      ariaLabel: 'التنقل الرئيسي',
      itemLayout: 'vertical',
      ripple: false,
      items: [
        { id: 'inventory', label: 'المخزن', icon: iconMarkup(Package), active: activeTab === 'inventory', badge: lowStockCount || undefined },
        { id: 'invoices', label: 'الفواتير', icon: iconMarkup(FileText), active: activeTab === 'invoices' },
        { id: 'accounting', label: 'الحسابات', icon: iconMarkup(Wallet), active: activeTab === 'accounting' },
        { id: 'more', label: 'المزيد', icon: iconMarkup(MoreHorizontal), active: activeMore },
      ],
    });

    // Keep the active indicator structurally attached to the real icon box.
    // The ripple is rendered inside this same indicator, so both follow the icon
    // whenever the icon slot moves instead of relying on independent offsets.
    navigation.element.querySelectorAll<HTMLElement>('.mtrl-navigation-bar__content').forEach((content) => {
      const indicator = content.querySelector<HTMLElement>('.mtrl-navigation-bar__indicator');
      const icon = content.querySelector<HTMLElement>('.mtrl-navigation-bar__icon');
      const label = content.querySelector<HTMLElement>('.mtrl-navigation-bar__label');
      if (!indicator || !icon || !label) return;

      const iconSlot = document.createElement('span');
      iconSlot.className = 'matjark-mobile-navigation-icon-slot';
      iconSlot.append(indicator, icon);
      content.insertBefore(iconSlot, label);
    });

    const handleNavigationPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const target = (event.target as Element | null)?.closest<HTMLElement>('.mtrl-navigation-bar__item');
      if (!target || target.getAttribute('aria-disabled') === 'true') return;

      const indicator = target.querySelector<HTMLElement>('.mtrl-navigation-bar__indicator');
      if (!indicator) return;

      const bounds = indicator.getBoundingClientRect();
      const diameter = Math.max(bounds.width, bounds.height) * 2;
      const ripple = document.createElement('span');
      ripple.className = 'matjark-mobile-navigation-ripple';
      ripple.setAttribute('aria-hidden', 'true');
      ripple.style.width = `${diameter}px`;
      ripple.style.height = `${diameter}px`;
      ripple.style.left = `${(bounds.width - diameter) / 2}px`;
      ripple.style.top = `${(bounds.height - diameter) / 2}px`;
      indicator.append(ripple);
    };

    const handleNavigationAnimationEnd = (event: AnimationEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.classList.contains('matjark-mobile-navigation-ripple')) {
        target.remove();
      }
    };

    const handleSelect = (event: { id?: string }) => {
      const id = event?.id;
      if (!id) return;
      if (id === 'more') {
        setMoreOpen(true);
        return;
      }
      setActiveTab(id as ActiveTab);
    };
    navigation.on('select', handleSelect);
    navigation.element.addEventListener('pointerdown', handleNavigationPointerDown);
    navigation.element.addEventListener('animationend', handleNavigationAnimationEnd);
    hostRef.current.replaceChildren(navigation.element);
    return () => {
      navigation.off('select', handleSelect);
      navigation.element.removeEventListener('pointerdown', handleNavigationPointerDown);
      navigation.element.removeEventListener('animationend', handleNavigationAnimationEnd);
      navigation.element.querySelectorAll('.matjark-mobile-navigation-ripple').forEach((ripple) => ripple.remove());
      navigation.destroy?.();
      hostRef.current?.replaceChildren();
    };
  }, [cashierMode, activeTab, lowStockCount, setActiveTab]);

  useEffect(() => {
    const appbar = cashierAppbarRef.current;
    const actionsElement = cashierActionsRef.current;
    if (
      !cashierMode ||
      !actionsAfterTitle ||
      !appbar ||
      !actionsElement ||
      !actionsElement.classList.contains('matjark-mobile-cashier-actions--landscape')
    ) {
      if (actionsElement) actionsElement.style.transform = '';
      return;
    }

    const centerSearchInAppbar = () => {
      // Clear the previous visual offset before measuring, so each update is
      // calculated from the real flex layout and never accumulates transforms.
      actionsElement.style.transform = 'none';
      const appbarBounds = appbar.getBoundingClientRect();
      const actionsBounds = actionsElement.getBoundingClientRect();
      const appbarCenter = appbarBounds.left + appbarBounds.width / 2;
      const actionsCenter = actionsBounds.left + actionsBounds.width / 2;
      const offset = appbarCenter - actionsCenter;
      actionsElement.style.transform = `translateX(${offset}px)`;
    };

    const observer = new ResizeObserver(centerSearchInAppbar);
    observer.observe(appbar);
    observer.observe(actionsElement);
    centerSearchInAppbar();

    return () => {
      observer.disconnect();
      actionsElement.style.transform = '';
    };
  }, [cashierMode, actionsAfterTitle]);

  const closeAndNavigate = (tab: ActiveTab) => {
    if (menuTriggerRef.current) menuTriggerRef.current.focus();
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setMoreOpen(false);
    setActiveTab(tab);
  };

  const closeMore = () => {
    if (menuTriggerRef.current) menuTriggerRef.current.focus();
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setMoreOpen(false);
  };
  const destinations = cashierMode ? CASHIER_DESTINATIONS : MORE_DESTINATIONS;

  return (
    <>
      {cashierMode ? (
        <header ref={cashierAppbarRef} className="matjark-mobile-cashier-appbar" dir="rtl">
          <button ref={menuTriggerRef} type="button" className="matjark-mobile-menu-trigger" aria-label="فتح قائمة التنقل" onClick={() => setMoreOpen(true)}>
            <Menu size={22} />
          </button>
          {actionsAfterTitle && <span className="matjark-mobile-cashier-title">الكاشير</span>}
          {actions && <div ref={cashierActionsRef} className="matjark-mobile-cashier-actions">{actions}</div>}
          {!actionsAfterTitle && <span className="matjark-mobile-cashier-title">الكاشير</span>}
        </header>
      ) : (
        <div ref={hostRef} className="matjark-mobile-navigation" dir="rtl" />
      )}
      <MBottomSheet
        open={moreOpen}
        modal
        headline={cashierMode ? 'التنقل بين الشاشات' : 'المزيد'}
        expanded={moreOpen}
        maxWidth={560}
        onClose={closeMore}
        className="matjark-mobile-navigation-sheet"
      >
        <div className="matjark-mobile-navigation-options" dir="rtl">
          {destinations.map((destination) => (
            <button key={destination.id} type="button" className="matjark-mobile-navigation-option" onClick={() => closeAndNavigate(destination.id)}>
              <span className="matjark-mobile-navigation-option-icon">{destination.icon}</span>
              <span>{destination.label}</span>
            </button>
          ))}
          {cashierMode && (
            <button type="button" className="matjark-mobile-navigation-option" onClick={closeMore}>
              <span className="matjark-mobile-navigation-option-icon"><X size={20} /></span>
              <span>العودة للكاشير</span>
            </button>
          )}
        </div>
      </MBottomSheet>
    </>
  );
};
